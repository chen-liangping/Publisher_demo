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
SHORTSTAT="$(git diff --shortstat "${DIFF_RANGE:-HEAD~1..HEAD}" 2>/dev/null || true)"

path_to_topic() {
  local path="$1"
  local lower_path
  lower_path="$(printf '%s' "$path" | tr '[:upper:]' '[:lower:]')"

  if [[ "$path" == *"游戏下线"* || "$lower_path" == *"offline"* ]]; then
    echo "游戏下线"
    return
  fi
  if [[ "$lower_path" == *"mongodb"* || "$path" == *"数据库"* || "$lower_path" == *"database"* ]]; then
    echo "数据库权限管理"
    return
  fi
  if [[ "$path" == *"负载均衡"* || "$lower_path" == *"loadbalancer"* ]]; then
    echo "负载均衡"
    return
  fi
  if [[ "$lower_path" == *"notification"* || "$lower_path" == *"notice"* || "$path" == *"通知"* || "$lower_path" == *"nofication"* ]]; then
    echo "通知公告"
    return
  fi
  if [[ "$lower_path" == *"alert"* || "$path" == *"告警"* ]]; then
    echo "告警"
    return
  fi
  if [[ "$lower_path" == *"gift"* || "$path" == *"礼包"* || "$path" == *"道具"* ]]; then
    echo "礼包与道具"
    return
  fi
  if [[ "$lower_path" == *"deployment"* || "$path" == *"部署"* ]]; then
    echo "应用部署"
    return
  fi
  if [[ "$lower_path" == *"virtualmachine"* || "$path" == *"虚拟机"* ]]; then
    echo "虚拟机管理"
    return
  fi
  if [[ "$lower_path" == *"container"* || "$path" == *"容器"* ]]; then
    echo "容器服务"
    return
  fi
  if [[ "$lower_path" == *"/admin/" ]]; then
    echo "管理后台"
    return
  fi
  if [[ "$path" =~ ^docs/ ]]; then
    echo "产品文档"
    return
  fi
  if [[ "$path" == "README.md" || "$path" == "AGENTS.md" ]]; then
    echo "项目说明"
    return
  fi
  echo "平台功能"
}

summarize_topics() {
  local -a files=("$@")
  local -a topics=()
  local f
  for f in "${files[@]-}"; do
    [[ -z "$f" ]] && continue
    topics+=("$(path_to_topic "$f")")
  done

  if [[ "${#topics[@]}" -eq 0 ]]; then
    echo ""
    return
  fi

  printf '%s\n' "${topics[@]}" | awk '!seen[$0]++' | head -n 3 | paste -sd '、' -
}

ADDED_TOPICS="$(summarize_topics "${ADDED_FILES[@]-}")"
MODIFIED_TOPICS="$(summarize_topics "${MODIFIED_FILES[@]-}")"
DELETED_TOPICS="$(summarize_topics "${DELETED_FILES[@]-}")"

if [[ -n "$ADDED_TOPICS" ]]; then
  ADDED_SUMMARY="新增了${ADDED_TOPICS}相关功能与页面内容。"
else
  ADDED_SUMMARY="本次没有新增模块，主要是在现有功能上迭代。"
fi

if [[ -n "$MODIFIED_TOPICS" ]]; then
  MODIFIED_SUMMARY="调整了${MODIFIED_TOPICS}的业务逻辑与UI交互细节。"
else
  MODIFIED_SUMMARY="本次没有明显的逻辑改动。"
fi

if [[ -n "$DELETED_TOPICS" ]]; then
  DELETED_SUMMARY="下线/移除了${DELETED_TOPICS}的部分旧内容。"
else
  DELETED_SUMMARY="本次没有删除功能。"
fi

MESSAGE="Publisher_demo 检测到代码/文档更新
分支: ${BRANCH_NAME}
最新提交: ${LATEST_COMMIT}
时间: ${UPDATED_AT}

本次更新总结（人话版）:
- ${ADDED_SUMMARY}
- ${MODIFIED_SUMMARY}
- ${DELETED_SUMMARY}

变更规模: ${SHORTSTAT:-有代码变动（未统计到行级摘要）}"

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
