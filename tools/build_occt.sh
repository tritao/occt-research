\
#!/usr/bin/env bash
set -euo pipefail

OCCT_DIR="${1:?usage: build_occt.sh <occt_dir> <build_dir>}"
BUILD_DIR="${2:?usage: build_occt.sh <occt_dir> <build_dir>}"

mkdir -p "$BUILD_DIR"

# Lean build: focus on kernel modules; disable heavyweight modules
# BUILD_MODULE_* options are supported by OCCT CMake. See OCCT build docs.
cmake -S "$OCCT_DIR" -B "$BUILD_DIR" -G Ninja \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DBUILD_MODULE_Draw=OFF \
  -DBUILD_MODULE_Visualization=OFF \
  -DBUILD_MODULE_Inspector=OFF \
  -DBUILD_MODULE_DETools=OFF \
  -DBUILD_MODULE_Samples=OFF \
  -DBUILD_MODULE_ApplicationFramework=OFF || true

# Re-run without optional module toggles if the above failed due to unknown options
if [ ! -f "$BUILD_DIR/build.ninja" ]; then
  echo "[occt] First configure failed (maybe option mismatch). Retrying with minimal flags..."
  cmake -S "$OCCT_DIR" -B "$BUILD_DIR" -G Ninja \
    -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
fi

cmake --build "$BUILD_DIR" -j"$(nproc)"

# Symlink compile DB to repo root for tooling
root="$(cd "$(dirname "$BUILD_DIR")" && pwd)"
ln -sf "$BUILD_DIR/compile_commands.json" "$root/compile_commands.json"

echo "[occt] Build complete."
