\
#!/usr/bin/env bash
set -euo pipefail

OCCT_DIR="${1:?usage: gen_maps.sh <occt_dir> <build_dir> <out_dir>}"
BUILD_DIR="${2:?usage: gen_maps.sh <occt_dir> <build_dir> <out_dir>}"
OUT_DIR="${3:?usage: gen_maps.sh <occt_dir> <build_dir> <out_dir>}"

mkdir -p "$OUT_DIR"

echo "[maps] 1) package scan"
python3 ./tools/occt_scan_packages.py --occt "$OCCT_DIR" --out "$OUT_DIR"

echo "[maps] 2) include graph"
python3 ./tools/occt_include_graph.py --occt "$OCCT_DIR" --packages_json "$OUT_DIR/packages.json" --out "$OUT_DIR"

echo "[maps] 3) CMake target graph (toolkits + full)"
cmake --graphviz="$OUT_DIR/cmake-targets.dot" "$BUILD_DIR" || true
python3 ./tools/filter_toolkits_dot.py "$OUT_DIR/cmake-targets.dot" "$OUT_DIR/toolkits.dot" || true

echo "[maps] 4) render svgs"
if command -v dot >/dev/null 2>&1; then
  dot -Tsvg "$OUT_DIR/include_graph.dot" -o "$OUT_DIR/include_graph.svg" || true
  dot -Tsvg "$OUT_DIR/toolkits.dot" -o "$OUT_DIR/toolkits.svg" || true
  dot -Tsvg "$OUT_DIR/cmake-targets.dot" -o "$OUT_DIR/cmake-targets.svg" || true
fi

echo "[maps] Done: $OUT_DIR"
