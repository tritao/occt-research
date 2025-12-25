\
#!/usr/bin/env python3

import argparse, json, os, re, shutil, sys, tarfile, urllib.request
from pathlib import Path

GITHUB_LATEST = "https://api.github.com/repos/llvm/llvm-project/releases/latest"

PATTERNS = [
    re.compile(r"clang\+llvm-.*x86_64-linux-gnu-ubuntu-.*\.tar\.xz$"),
    re.compile(r"clang\+llvm-.*x86_64-linux-gnu.*\.tar\.xz$"),
    re.compile(r"LLVM-.*-Linux-X64\.tar\.xz$"),
]

def http_json(url: str):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "occt-research-bootstrap"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))

def download(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return
    print(f"[clangd] downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "occt-research-bootstrap"})
    with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)

def extract(txz: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    marker = out_dir / ".extracted"
    if marker.exists():
        return
    print(f"[clangd] extracting {txz.name} -> {out_dir}")
    with tarfile.open(txz, "r:xz") as tf:
        tf.extractall(out_dir)
    marker.write_text("ok\n")

def find_clangd(prefix_dir: Path):
    # llvm tarballs usually contain one top-level directory
    for p in prefix_dir.rglob("bin/clangd"):
        return p
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefix", required=True, help="Local prefix (e.g. ./ .local)")
    ap.add_argument("--cache", required=True, help="Cache dir (e.g. .cache/llvm)")
    args = ap.parse_args()

    prefix = Path(args.prefix).resolve()
    cache = Path(args.cache).resolve()
    bin_dir = prefix / "bin"
    llvm_root = prefix / "llvm"
    bin_dir.mkdir(parents=True, exist_ok=True)
    llvm_root.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)

    try:
        rel = http_json(GITHUB_LATEST)
    except Exception as e:
        print(f"[clangd] ERROR: could not query GitHub releases: {e}")
        print("[clangd] Fallback: install clangd via apt: sudo apt install clangd")
        return 2

    tag = rel.get("tag_name") or "unknown"
    assets = rel.get("assets") or []
    chosen = None
    for pat in PATTERNS:
        for a in assets:
            name = a.get("name", "")
            if pat.search(name):
                chosen = a
                break
        if chosen:
            break

    if not chosen:
        print(f"[clangd] ERROR: couldn't find a suitable Linux x86_64 tarball in latest release {tag}.")
        print("[clangd] Fallback: install clangd via apt: sudo apt install clangd")
        return 2

    name = chosen["name"]
    url = chosen["browser_download_url"]

    archive = cache / name
    download(url, archive)

    dest = llvm_root / tag
    extract(archive, dest)

    clangd_path = find_clangd(dest)
    if not clangd_path:
        print("[clangd] ERROR: extracted archive but couldn't locate bin/clangd")
        return 2

    # Symlink for convenience
    link = bin_dir / "clangd"
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(clangd_path)

    (llvm_root / "LATEST").write_text(tag + "\n")
    print(f"[clangd] Installed clangd: {clangd_path}")
    print(f"[clangd] Symlinked: {link}")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
