#!/usr/bin/env python3
import argparse, json, re
from collections import defaultdict
from pathlib import Path

INC_RE = re.compile(r'^\s*#\s*include\s*[<"]([^">]+)[">]')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--occt", required=True)
    ap.add_argument("--packages_json", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    occt = Path(args.occt).resolve()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(Path(args.packages_json).read_text())
    pkgs = data["packages"]
    header_to_pkg = data["header_to_pkg"]

    edges = defaultdict(lambda: defaultdict(int))

    def pkg_of_header(header_name: str):
        return header_to_pkg.get(Path(header_name).name)

    for pkg, info in pkgs.items():
        files = info["headers"] + info["sources"]
        for rel in files:
            p = occt / rel
            try:
                txt = p.read_text(errors="ignore").splitlines()
            except Exception:
                continue
            for line in txt:
                m = INC_RE.match(line)
                if not m:
                    continue
                inc = m.group(1)
                target = pkg_of_header(inc)
                if target and target != pkg:
                    edges[pkg][target] += 1

    dot = ["digraph occt_includes {", "  rankdir=LR;"]
    for a, outs in edges.items():
        for b, w in outs.items():
            dot.append(f'  "{a}" -> "{b}" [label="{w}"];')
    dot.append("}")
    (out_dir / "include_graph.dot").write_text("\n".join(dot) + "\n")

    heavy = []
    for a, outs in edges.items():
        for b, w in outs.items():
            heavy.append((w, a, b))
    heavy.sort(reverse=True)
    lines = ["# Heaviest package → package include edges", ""]
    for w, a, b in heavy[:120]:
        lines.append(f"- `{a}` → `{b}`: **{w}**")
    (out_dir / "include_graph.md").write_text("\n".join(lines) + "\n")

if __name__ == "__main__":
    main()
