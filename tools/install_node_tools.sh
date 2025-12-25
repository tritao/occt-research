\
#!/usr/bin/env bash
set -euo pipefail

PREFIX="${1:?usage: install_node_tools.sh <prefix>}"
BIN="$PREFIX/bin"
mkdir -p "$BIN"

need_nodesource=false
if ! command -v node >/dev/null 2>&1; then
  need_nodesource=true
else
  major="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [ "${major:-0}" -lt 18 ]; then
    need_nodesource=true
  fi
fi

if $need_nodesource; then
  echo "[node] Installing Node.js 20.x from NodeSource (apt)..."
  sudo apt update
  sudo apt install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "[node] Installing Backlog.md + Codex CLI into $PREFIX ..."
npm install -g --prefix "$PREFIX" backlog.md @openai/codex

echo "[node] OK. Binaries should be in: $BIN"
echo "      Add to PATH: export PATH=\"$(pwd)/.local/bin:$PATH\""
