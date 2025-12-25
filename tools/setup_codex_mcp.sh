\
#!/usr/bin/env bash
set -euo pipefail

OCCT_DIR="${1:?usage: setup_codex_mcp.sh <occt_dir> <build_dir> <local_prefix>}"
BUILD_DIR="${2:?usage: setup_codex_mcp.sh <occt_dir> <build_dir> <local_prefix>}"
LOCAL="${3:?usage: setup_codex_mcp.sh <occt_dir> <build_dir> <local_prefix>}"

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex] codex not on PATH. Did you run: source ./env.sh ?"
  exit 2
fi

if ! command -v backlog >/dev/null 2>&1; then
  echo "[codex] backlog not on PATH. Did you run: source ./env.sh ?"
  exit 2
fi

if ! command -v mcp-language-server >/dev/null 2>&1; then
  echo "[codex] mcp-language-server not on PATH. Did you run: source ./env.sh ?"
  exit 2
fi

CLANGD_BIN="${LOCAL}/bin/clangd"
if [ ! -x "$CLANGD_BIN" ]; then
  # fallback to PATH
  CLANGD_BIN="$(command -v clangd || true)"
fi
if [ -z "${CLANGD_BIN:-}" ]; then
  echo "[codex] clangd not found. Run: just clangd"
  exit 2
fi

abs_occt="$(realpath "$OCCT_DIR")"
abs_build="$(realpath "$BUILD_DIR")"
abs_clangd="$(realpath "$CLANGD_BIN")"

echo "[codex] Adding Backlog.md MCP server..."
# From Backlog.md docs: codex mcp add backlog backlog mcp start
codex mcp add backlog backlog mcp start || true

echo "[codex] Adding clangd/LSP MCP server (occt-lsp)..."
# Use mcp-language-server as MCP<->LSP bridge
codex mcp add occt-lsp mcp-language-server \
  --workspace "$abs_occt" \
  --lsp "$abs_clangd" \
  -- \
  --compile-commands-dir="$abs_build" || true

echo "[codex] Done. In Codex, run /mcp to verify connections."
