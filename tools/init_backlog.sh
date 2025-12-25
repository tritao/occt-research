\
#!/usr/bin/env bash
set -euo pipefail

# Requires backlog CLI on PATH (installed by just node-tools)
if ! command -v backlog >/dev/null 2>&1; then
  echo "[backlog] backlog not on PATH. Did you run: source ./env.sh ?"
  exit 2
fi

# Initialize in a non-interactive way using safe defaults if possible.
# Backlog.md supports --defaults for non-interactive setup.
if [ -d "./backlog" ]; then
  echo "[backlog] backlog/ already exists; re-running init to ensure config is present..."
  backlog init --defaults || true
else
  backlog init "OCCT Research" --defaults || backlog init "OCCT Research"
fi

# Update agent instructions (adds backlog-specific guidance if supported)
backlog agents --update-instructions || true

echo "[backlog] OK. Try: backlog board view"
