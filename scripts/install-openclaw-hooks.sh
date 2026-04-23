#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
NOTIFY_SCRIPT="$REPO_ROOT/scripts/notify-feishu-update.sh"

if [[ ! -f "$NOTIFY_SCRIPT" ]]; then
  echo "Missing script: $NOTIFY_SCRIPT"
  exit 1
fi

mkdir -p "$HOOKS_DIR"
chmod +x "$NOTIFY_SCRIPT"

cat <<'EOF' > "$HOOKS_DIR/post-commit"
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
"$REPO_ROOT/scripts/notify-feishu-update.sh" commit
EOF

cat <<'EOF' > "$HOOKS_DIR/post-merge"
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
"$REPO_ROOT/scripts/notify-feishu-update.sh" merge
EOF

chmod +x "$HOOKS_DIR/post-commit" "$HOOKS_DIR/post-merge"

echo "OpenClaw Feishu hooks installed:"
echo "- $HOOKS_DIR/post-commit"
echo "- $HOOKS_DIR/post-merge"
echo
echo "Before use, set these env vars in your shell profile:"
echo "  export OPENCLAW_FEISHU_TARGET='your-feishu-chat-id-or-target'"
echo "Optional:"
echo "  export OPENCLAW_FEISHU_ACCOUNT='your-feishu-account-id'"
echo "  export OPENCLAW_NOTIFY_CHANNEL='feishu'"
