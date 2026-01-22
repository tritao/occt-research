#!/usr/bin/env python3
import argparse, json, re
from pathlib import Path

CLASS_RE = re.compile(r"^\s*(class|struct)\s+([A-Za-z_]\w*)\b", re.MULTILINE)
HEADER_EXTS = {".hxx", ".hpp", ".h"}
SOURCE_EXTS = {".cxx", ".cpp", ".cc", ".c"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--occt", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    occt = Path(args.occt).resolve()
    src = occt / "src"
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        occt_label = str(occt.relative_to(repo_root))
    except ValueError:
        occt_label = str(occt)

    packages = {}
    header_to_pkg = {}

    for pkg_dir in sorted(p for p in src.iterdir() if p.is_dir()):
        pkg = pkg_dir.name
        headers, sources, classes = [], [], []
        for f in pkg_dir.rglob("*"):
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            rel = str(f.relative_to(occt))
            if ext in HEADER_EXTS:
                headers.append(rel)
                header_to_pkg[f.name] = pkg
                try:
                    txt = f.read_text(errors="ignore")
                    for m in CLASS_RE.finditer(txt):
                        classes.append(m.group(2))
                except Exception:
                    pass
            elif ext in SOURCE_EXTS:
                sources.append(rel)

        if headers or sources:
            packages[pkg] = {
                "headers": headers,
                "sources": sources,
                "class_names": sorted(set(classes)),
                "n_headers": len(headers),
                "n_sources": len(sources),
                "n_classes": len(set(classes)),
            }

    data = {
        "occt_root": occt_label,
        "n_packages": len(packages),
        "packages": packages,
        "header_to_pkg": header_to_pkg,
    }

    (out_dir / "packages.json").write_text(json.dumps(data, indent=2) + "\n")

    # human summary
    lines = ["# OCCT package scan", f"- root: `{occt_label}`", f"- packages: **{len(packages)}**", ""]
    top = sorted(packages.items(), key=lambda kv: kv[1]["n_sources"], reverse=True)[:60]
    lines.append("## Top packages by source files")
    for pkg, info in top:
        lines.append(f"- `{pkg}`: {info['n_sources']} sources, {info['n_headers']} headers, {info['n_classes']} class/struct decls")
    (out_dir / "packages.md").write_text("\n".join(lines) + "\n")

if __name__ == "__main__":
    main()
