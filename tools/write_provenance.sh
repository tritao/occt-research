#!/usr/bin/env bash
set -euo pipefail

OCCT_DIR="${1:?usage: write_provenance.sh <occt_dir> <build_dir> <out_dir>}"
BUILD_DIR="${2:?usage: write_provenance.sh <occt_dir> <build_dir> <out_dir>}"
OUT_DIR="${3:?usage: write_provenance.sh <occt_dir> <build_dir> <out_dir>}"

mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/provenance.md"

have() { command -v "$1" >/dev/null 2>&1; }

rg_compat() {
  if have rg; then
    rg "$@"
  else
    grep -nE "$@"
  fi
}

occt_git() {
  if [ -d "$OCCT_DIR/.git" ] && have git; then
    git -C "$OCCT_DIR" "$@" 2>/dev/null || true
  fi
}

cmake_cache_get() {
  local key="$1"
  local cache="$BUILD_DIR/CMakeCache.txt"
  if [ -f "$cache" ]; then
    rg_compat -n "^[^#]*${key}:" "$cache" 2>/dev/null | head -n 1 | sed 's/^[0-9]*://'
  fi
}

{
  echo "# Provenance"
  echo
  echo "- generated_at: \`$(date -Is)\`"
  echo "- repo_root: \`$(pwd)\`"
  echo
  echo "## OCCT checkout"
  echo
  echo "- occt_dir: \`$OCCT_DIR\`"
  echo "- head: \`$(occt_git rev-parse --short=12 HEAD)\`"
  echo "- describe: \`$(occt_git describe --tags --dirty --always)\`"
  echo "- remote: \`$(occt_git config --get remote.origin.url)\`"
  echo
  echo "## Build configuration (best effort)"
  echo
  echo "- build_dir: \`$BUILD_DIR\`"
  if [ -f "$BUILD_DIR/CMakeCache.txt" ]; then
    echo "- cmake_cache: \`$BUILD_DIR/CMakeCache.txt\`"
    echo "- CMAKE_GENERATOR: \`$(cmake_cache_get CMAKE_GENERATOR | sed 's/^[^=]*=//')\`"
    echo "- CMAKE_BUILD_TYPE: \`$(cmake_cache_get CMAKE_BUILD_TYPE | sed 's/^[^=]*=//')\`"
    echo "- CMAKE_C_COMPILER: \`$(cmake_cache_get CMAKE_C_COMPILER | sed 's/^[^=]*=//')\`"
    echo "- CMAKE_CXX_COMPILER: \`$(cmake_cache_get CMAKE_CXX_COMPILER | sed 's/^[^=]*=//')\`"
    echo "- BUILD_MODULE_* (enabled/disabled):"
    rg_compat -n "^[^#]*BUILD_MODULE_[A-Za-z0-9_]+:" "$BUILD_DIR/CMakeCache.txt" 2>/dev/null \
      | sed 's/^[0-9]*://; s/^[^:]*:BOOL=/- /' \
      | sort || true
  else
    echo "- cmake_cache: (missing)"
  fi
  echo
  echo "## Tool versions"
  echo
  if [ -f /etc/os-release ]; then
    echo "- os_release: \`$(. /etc/os-release && echo "${PRETTY_NAME:-unknown}")\`"
  fi
  echo "- uname: \`$(uname -a)\`"
  have cmake && echo "- cmake: \`$(cmake --version | head -n 1)\`"
  have ninja && echo "- ninja: \`$(ninja --version)\`"
  have python3 && echo "- python3: \`$(python3 --version)\`"
  have clangd && echo "- clangd: \`$(clangd --version | head -n 1)\`"
  have gcc && echo "- gcc: \`$(gcc --version | head -n 1)\`"
  have g++ && echo "- g++: \`$(g++ --version | head -n 1)\`"
} >"$OUT_FILE"

echo "[maps] Wrote provenance: $OUT_FILE"
