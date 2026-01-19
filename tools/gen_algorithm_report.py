#!/usr/bin/env python3
import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path


LANE_HEADER_RE = re.compile(r"^##\s+lane:([a-z0-9-]+)\s*$")
FOCUS_RE = re.compile(r"^Focus:\s*(.+?)\s*$")
BACKTICK_TOKEN_RE = re.compile(r"`([^`]+)`")
DOT_EDGE_RE = re.compile(r'^\s*"([^"]+)"\s*->\s*"([^"]+)"\s*\[label="(\d+)"\];\s*$')


@dataclass(frozen=True)
class LaneDef:
    slug: str
    focus: str
    entry_packages: list[str]
    anchor_symbols: list[tuple[str, str]]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def parse_lane(lanes_md: str, lane_slug: str) -> LaneDef:
    lines = lanes_md.splitlines()
    in_lane = False
    focus = ""
    entry_packages: list[str] = []
    anchor_symbols: list[tuple[str, str]] = []
    mode: str | None = None

    for line in lines:
        header = LANE_HEADER_RE.match(line)
        if header:
            in_lane = header.group(1) == lane_slug
            mode = None
            continue
        if not in_lane:
            continue

        m = FOCUS_RE.match(line)
        if m:
            focus = m.group(1).strip()
            continue

        if line.strip() == "Entry packages:":
            mode = "entry"
            continue
        if line.strip() == "Anchor symbols (examples):":
            mode = "anchor"
            continue
        if line.startswith("## "):
            mode = None
            continue

        if mode == "entry":
            if not line.lstrip().startswith("-"):
                continue
            entry_packages.extend(BACKTICK_TOKEN_RE.findall(line))
            continue

        if mode == "anchor":
            if not line.lstrip().startswith("-"):
                continue
            tokens = BACKTICK_TOKEN_RE.findall(line)
            if len(tokens) >= 2:
                anchor_symbols.append((tokens[0], tokens[1]))
            elif len(tokens) == 1:
                anchor_symbols.append((tokens[0], ""))
            continue

    if not focus and not entry_packages and not anchor_symbols:
        raise SystemExit(f"Lane not found or empty: {lane_slug!r}")
    return LaneDef(slug=lane_slug, focus=focus, entry_packages=entry_packages, anchor_symbols=anchor_symbols)


def load_packages(repo: Path) -> dict:
    data = json.loads(read_text(repo / "notes" / "maps" / "packages.json"))
    return data["packages"]


def load_include_graph_edges(repo: Path) -> list[tuple[str, str, int]]:
    dot_path = repo / "notes" / "maps" / "include_graph.core.dot"
    if not dot_path.is_file():
        return []
    edges: list[tuple[str, str, int]] = []
    for line in read_text(dot_path).splitlines():
        m = DOT_EDGE_RE.match(line)
        if not m:
            continue
        src, dst, w = m.group(1), m.group(2), int(m.group(3))
        edges.append((src, dst, w))
    return edges


def guess_repro_json(repo: Path, lane_slug: str) -> Path | None:
    lane_dir = repo / "repros" / f"lane-{lane_slug}" / "golden"
    if not lane_dir.is_dir():
        return None
    for p in sorted(lane_dir.glob("*.json")):
        if p.is_file():
            return p
    return None


def extract_occt_version_from_json(json_path: Path) -> str:
    try:
        obj = json.loads(read_text(json_path))
    except Exception:
        return ""
    if isinstance(obj, dict):
        meta = obj.get("meta")
        if isinstance(meta, dict):
            v = meta.get("occt_version")
            if isinstance(v, str) and v:
                return v
        v = obj.get("occt_version")
        if isinstance(v, str) and v:
            return v
    return ""


def extract_enum_values(repo: Path, rel_header: str) -> list[str]:
    """
    Very small heuristic to extract enumerator identifiers from a C++ enum header.
    Intended for simple OCCT enum headers like ChFiDS_ErrorStatus.hxx.
    """
    path = repo / rel_header
    if not path.is_file():
        return []
    text = read_text(path)
    # Find the first `enum Name { ... };` block.
    m = re.search(r"\benum\b\s+\w*\s*\{(?P<body>[\s\S]*?)\}", text)
    if not m:
        return []
    body = m.group("body")
    values: list[str] = []
    for line in body.splitlines():
        line = line.split("//", 1)[0].strip()
        if not line:
            continue
        # Trim trailing commas and assignments.
        token = line.rstrip(",").split("=", 1)[0].strip()
        if re.match(r"^[A-Za-z_]\w*$", token):
            values.append(token)
    return values


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: .)")
    ap.add_argument("--lane", required=True, help="lane slug (e.g. fillets, booleans)")
    ap.add_argument("--title", default="", help="report title override")
    ap.add_argument(
        "--out",
        default="",
        help="output path (default: notes/dossiers/algorithm-<lane>.md)",
    )
    ap.add_argument(
        "--enum-header",
        default="",
        help="relative header to extract enum values from (e.g. occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx)",
    )
    args = ap.parse_args()

    repo = Path(args.root).resolve()
    lanes_path = repo / "notes" / "maps" / "lanes.md"
    if not lanes_path.is_file():
        raise SystemExit(f"Missing lane definitions: {lanes_path}")

    lane = parse_lane(read_text(lanes_path), args.lane)
    pkgs = load_packages(repo)
    edges = load_include_graph_edges(repo)

    repro_json = guess_repro_json(repo, lane.slug)
    occt_version = extract_occt_version_from_json(repro_json) if repro_json else ""

    title = args.title.strip() or f"Algorithm: {lane.slug}"
    out_path = Path(args.out) if args.out else repo / "notes" / "dossiers" / f"algorithm-{lane.slug}.md"
    if not out_path.is_absolute():
        out_path = (repo / out_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    enum_header = args.enum_header.strip()
    if not enum_header and lane.slug == "fillets":
        enum_header = "occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx"
    enum_values = extract_enum_values(repo, enum_header) if enum_header else []

    # include graph summaries
    lane_pkgs = set(lane.entry_packages)
    inbound = [(w, src, dst) for (src, dst, w) in edges if dst in lane_pkgs and src not in lane_pkgs]
    outbound = [(w, src, dst) for (src, dst, w) in edges if src in lane_pkgs and dst not in lane_pkgs]
    internal = [(w, src, dst) for (src, dst, w) in edges if src in lane_pkgs and dst in lane_pkgs and src != dst]

    lines: list[str] = []
    lines.append(f"# Dossier: {title}")
    lines.append("")
    lines.append("Status: draft")
    lines.append("")
    lines.append("## Purpose")
    lines.append("")
    lines.append(
        "Produce a human-first, debuggable explanation of this algorithm, anchored in OCCT source files and runnable repro outputs."
    )
    lines.append("")
    lines.append("## Provenance (required)")
    lines.append("")
    lines.append(f"- OCCT version: {occt_version or 'see `notes/maps/provenance.md`'}")
    if repro_json:
        lines.append(f"- Evidence repro/oracle: `{repro_json.relative_to(repo)}`")
    lines.append("- Maps provenance: `notes/maps/provenance.md`")
    lines.append("")
    lines.append("## Scenario + observable outputs (required)")
    lines.append("")
    lines.append("- Scenario: (describe one concrete, runnable scenario for this algorithm)")
    lines.append("- Observable outputs: (oracle fields, error/status codes, topology counts, bboxes, timings)")
    lines.append("- Success criteria: (what “good” looks like + tolerances)")
    lines.append("")
    lines.append("## Spine (call chain) (required)")
    lines.append("")
    if lane.anchor_symbols:
        for i, (path, sym) in enumerate(lane.anchor_symbols[:10], 1):
            lines.append(f"{i}) `{path}` — `{sym}`")
    else:
        lines.append("1) (add 5–15 key symbols in approximate execution order)")
    lines.append("")
    lines.append("## High-level pipeline")
    lines.append("")
    lines.append(lane.focus or "(lane focus missing)")
    lines.append("")
    lines.append("Suggested phase breakdown (fill in and anchor to code):")
    lines.append("1) Inputs + parameterization")
    lines.append("2) Pre-analysis / contour building")
    lines.append("3) Core computation (walking/solving/intersection/etc.)")
    lines.append("4) Special cases / fallbacks")
    lines.append("5) Topology reconstruction + validation")
    lines.append("")
    lines.append("## Key classes/files")
    lines.append("")
    lines.append("Entry packages:")
    if lane.entry_packages:
        lines.append("- " + ", ".join(f"`{p}`" for p in lane.entry_packages))
    else:
        lines.append("- (none)")
    lines.append("")
    lines.append("Package footprint (from `notes/maps/packages.json`):")
    for p in lane.entry_packages:
        pkg = pkgs.get(p)
        if not pkg:
            lines.append(f"- `{p}`: (missing from packages.json)")
            continue
        lines.append(f"- `{p}`: {pkg.get('n_sources', 0)} sources, {pkg.get('n_headers', 0)} headers, {pkg.get('n_classes', 0)} classes")
    lines.append("")
    lines.append("## Core data structures + invariants")
    lines.append("")
    lines.append("- Structure: (name) (`occt/src/...`) — what it stores")
    lines.append("  - Invariants: (what must hold, what breaks it)")
    lines.append("")
    if enum_header and enum_values:
        lines.append("Enum-like diagnostic surface:")
        lines.append(f"- `{enum_header}`:")
        for v in enum_values:
            lines.append(f"  - `{v}`")
        lines.append("")
    lines.append("## Tolerance / robustness behaviors (observed)")
    lines.append("")
    lines.append("- (list the tolerances/epsilons, how they’re propagated, and what the fallback paths are)")
    lines.append("")
    lines.append("## Failure modes + diagnostics (recommended)")
    lines.append("")
    lines.append("- (map each failure mode to a status/exception and to the phase where it occurs)")
    lines.append("")
    lines.append("Include graph evidence (optional, size proxy):")
    if internal:
        for w, src, dst in sorted(internal, reverse=True)[:10]:
            lines.append(f"- `{src}` -> `{dst}`: {w}")
    if outbound:
        lines.append("")
        lines.append("Largest outbound edges from lane packages:")
        for w, src, dst in sorted(outbound, reverse=True)[:10]:
            lines.append(f"- `{src}` -> `{dst}`: {w}")
    lines.append("")
    lines.append("## Compare to papers / alternatives")
    lines.append("")
    lines.append("- Alternative A: (brief)")
    lines.append("- Alternative B: (brief)")
    lines.append("- Tradeoffs: (robustness vs exactness vs performance)")
    lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[ok] Wrote {out_path.relative_to(repo)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

