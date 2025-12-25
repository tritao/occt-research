#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v just >/dev/null 2>&1; then
  echo "[bootstrap] 'just' not found; installing via apt..."
  sudo apt update
  sudo apt install -y just
fi

just bootstrap
