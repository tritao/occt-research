#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPRO_DIR="$ROOT/repros/lane-brep-geometry-bridge"

# build-occt/env.sh assumes unset variables may be referenced; avoid nounset failures.
set +u
source "$ROOT/build-occt/env.sh" i
set -u

mkdir -p "$REPRO_DIR/build" "$REPRO_DIR/golden"

cxx="${CXX:-g++}"
"$cxx" -std=c++17 -O2 -g \
  -I"$CSF_OCCTIncludePath" \
  "$REPRO_DIR/bridge.cpp" \
  -L"$CSF_OCCTLibPath" \
  -lTKMesh -lTKTopAlgo -lTKGeomAlgo -lTKBRep -lTKGeomBase -lTKPrim -lTKG3d -lTKG2d -lTKMath -lTKernel \
  -o "$REPRO_DIR/build/bridge"

"$REPRO_DIR/build/bridge" > "$REPRO_DIR/golden/bridge.json"
echo "wrote $REPRO_DIR/golden/bridge.json"
