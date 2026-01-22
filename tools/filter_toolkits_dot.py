#!/usr/bin/env python3
import re, sys
from pathlib import Path

TK_NODE = re.compile(r'"(TK[A-Za-z0-9_]+)"')

def main(inp: str, out: str):
    text = Path(inp).read_text(errors="ignore").splitlines()
    keep = set()
    edges = []
    for line in text:
        ms = TK_NODE.findall(line)
        if ms:
            for m in ms:
                keep.add(m)
        if "->" in line and len(ms) >= 2:
            edges.append((ms[0], ms[1]))
    out_lines = ["digraph toolkits {", "  rankdir=LR;"]
    for tk in sorted(keep):
        out_lines.append(f'  "{tk}";')
    for a,b in edges:
        if a in keep and b in keep:
            out_lines.append(f'  "{a}" -> "{b}";')
    out_lines.append("}")
    Path(out).write_text("\n".join(out_lines) + "\n")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: filter_toolkits_dot.py <in.dot> <out.dot>")
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2])
