#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-commit}"
RANGE_START="${2:-}"
RANGE_END="${3:-HEAD}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ -z "${OPENCLAW_FEISHU_TARGET:-}" ]]; then
  exit 0
fi

CHANNEL="${OPENCLAW_NOTIFY_CHANNEL:-feishu}"
TARGET="${OPENCLAW_FEISHU_TARGET}"
ACCOUNT="${OPENCLAW_FEISHU_ACCOUNT:-}"
DRY_RUN="${OPENCLAW_NOTIFY_DRY_RUN:-0}"

build_range() {
  if [[ -n "$RANGE_START" ]]; then
    echo "${RANGE_START}..${RANGE_END}"
    return
  fi

  if [[ "$MODE" == "merge" && -n "${ORIG_HEAD:-}" ]]; then
    echo "ORIG_HEAD..HEAD"
    return
  fi

  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    echo "HEAD~1..HEAD"
    return
  fi

  echo ""
}

DIFF_RANGE="$(build_range)"

if [[ -z "$DIFF_RANGE" ]]; then
  RAW_CHANGES="$(git show --name-status --pretty="" HEAD)"
else
  RAW_CHANGES="$(git diff --name-status "$DIFF_RANGE")"
fi

is_target_path() {
  local path="$1"
  [[ "$path" =~ ^(src/|docs/|README\.md$|AGENTS\.md$) ]]
}

ADDED_FILES=()
MODIFIED_FILES=()
DELETED_FILES=()

while IFS=$'\t' read -r status path1 path2; do
  [[ -z "${status:-}" ]] && continue

  status_type="${status:0:1}"
  selected_path="$path1"

  # Rename/copy entries include old and new paths; new path is in path2.
  if [[ "$status_type" == "R" || "$status_type" == "C" ]]; then
    selected_path="${path2:-$path1}"
  fi

  if ! is_target_path "$selected_path"; then
    continue
  fi

  case "$status_type" in
    A)
      ADDED_FILES+=("$selected_path")
      ;;
    M|R|C|T)
      MODIFIED_FILES+=("$selected_path")
      ;;
    D)
      DELETED_FILES+=("$selected_path")
      ;;
    *)
      MODIFIED_FILES+=("$selected_path")
      ;;
  esac
done <<< "$RAW_CHANGES"

TOTAL_CHANGED_COUNT=$(( ${#ADDED_FILES[@]} + ${#MODIFIED_FILES[@]} + ${#DELETED_FILES[@]} ))
if [[ "$TOTAL_CHANGED_COUNT" -eq 0 ]]; then
  exit 0
fi

BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"
LATEST_COMMIT="$(git log -1 --pretty=format:'%h %s')"
UPDATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"
ADDED_TEXT="$(printf '%s\n' "${ADDED_FILES[@]-}" | sed '/^$/d')"
MODIFIED_TEXT="$(printf '%s\n' "${MODIFIED_FILES[@]-}" | sed '/^$/d')"
DELETED_TEXT="$(printf '%s\n' "${DELETED_FILES[@]-}" | sed '/^$/d')"

count_lines() {
  local text="$1"
  if [[ -z "$text" ]]; then
    echo 0
  else
    printf '%s\n' "$text" | wc -l | tr -d ' '
  fi
}

ADDED_COUNT="$(count_lines "$ADDED_TEXT")"
MODIFIED_COUNT="$(count_lines "$MODIFIED_TEXT")"
DELETED_COUNT="$(count_lines "$DELETED_TEXT")"

if [[ "$ADDED_COUNT" -eq 0 ]]; then
  ADDED_PREVIEW="新增(0): 无"
else
  ADDED_PREVIEW="新增(${ADDED_COUNT}):
$(printf '%s\n' "$ADDED_TEXT" | head -n 6)"
fi

if [[ "$MODIFIED_COUNT" -eq 0 ]]; then
  MODIFIED_PREVIEW="修改(0): 无"
else
  MODIFIED_PREVIEW="修改(${MODIFIED_COUNT}):
$(printf '%s\n' "$MODIFIED_TEXT" | head -n 6)"
fi

if [[ "$DELETED_COUNT" -eq 0 ]]; then
  DELETED_PREVIEW="删除(0): 无"
else
  DELETED_PREVIEW="删除(${DELETED_COUNT}):
$(printf '%s\n' "$DELETED_TEXT" | head -n 6)"
fi

MESSAGE="Publisher_demo 检测到代码/文档更新
分支: ${BRANCH_NAME}
最新提交: ${LATEST_COMMIT}
时间: ${UPDATED_AT}
本次更新文件总数: ${TOTAL_CHANGED_COUNT}

${ADDED_PREVIEW}

${MODIFIED_PREVIEW}

${DELETED_PREVIEW}"

if [[ -n "$ACCOUNT" ]]; then
  SEND_CMD=(
    openclaw message send
    --channel "$CHANNEL"
    --account "$ACCOUNT"
    --target "$TARGET"
    --message "$MESSAGE"
  )
else
  SEND_CMD=(
    openclaw message send
    --channel "$CHANNEL"
    --target "$TARGET"
    --message "$MESSAGE"
  )
fi

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[dry-run] channel=${CHANNEL} target=${TARGET}"
  echo "$MESSAGE"
  exit 0
fi

"${SEND_CMD[@]}" >/dev/null
