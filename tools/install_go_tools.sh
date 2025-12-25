\
#!/usr/bin/env bash
set -euo pipefail

PREFIX="${1:?usage: install_go_tools.sh <prefix>}"
mkdir -p "$PREFIX/bin"

if ! command -v go >/dev/null 2>&1; then
  echo "[go] Go not found. Installing via apt..."
  sudo apt update
  sudo apt install -y golang-go
fi

echo "[go] Installing mcp-language-server into $PREFIX/bin ..."
GOBIN="$PREFIX/bin" go install github.com/isaacphi/mcp-language-server@latest

echo "[go] OK. mcp-language-server installed."
