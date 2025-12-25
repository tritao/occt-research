\
#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-occt}"

if [ -d "$DEST/.git" ]; then
  echo "[occt] Already cloned: $DEST"
else
  echo "[occt] Cloning OCCT..."
  git clone https://github.com/Open-Cascade-SAS/OCCT.git "$DEST"
fi

cd "$DEST"
git fetch --tags --quiet || true

# Choose latest stable tag V* (exclude beta/rc/dev)
tag="$(git tag -l 'V[0-9]*' \
  | grep -Ev '(beta|rc|dev)' \
  | sort -V \
  | tail -n1 || true)"

if [ -n "$tag" ]; then
  echo "[occt] Checking out latest stable tag: $tag"
  git checkout -q "$tag"
else
  echo "[occt] No stable V* tag found; staying on default branch."
fi

echo "[occt] HEAD: $(git rev-parse --short HEAD)"
