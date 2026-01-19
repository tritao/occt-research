#!/usr/bin/env python3
import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Lane:
    slug: str
    focus: str
    entry_packages: list[str]
    anchor_symbols: list[tuple[str, str]]


LANE_HEADER_RE = re.compile(r"^##\s+lane:([a-z0-9-]+)\s*$")
FOCUS_RE = re.compile(r"^Focus:\s*(.+?)\s*$")
BACKTICK_TOKEN_RE = re.compile(r"`([^`]+)`")
MANUAL_BLOCK_RE_TEMPLATE = r"<!--\s*MANUAL:{name}:BEGIN\s*-->(?P<body>.*?)<!--\s*MANUAL:{name}:END\s*-->"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def parse_lanes(lanes_md: str) -> list[Lane]:
    lines = lanes_md.splitlines()
    lanes: list[Lane] = []

    current_slug: str | None = None
    current_focus: str = ""
    entry_packages: list[str] = []
    anchor_symbols: list[tuple[str, str]] = []
    mode: str | None = None

    def flush():
        nonlocal current_slug, current_focus, entry_packages, anchor_symbols, mode
        if current_slug is None:
            return
        lanes.append(
            Lane(
                slug=current_slug,
                focus=current_focus.strip(),
                entry_packages=entry_packages[:],
                anchor_symbols=anchor_symbols[:],
            )
        )
        current_slug = None
        current_focus = ""
        entry_packages = []
        anchor_symbols = []
        mode = None

    for line in lines:
        header_match = LANE_HEADER_RE.match(line)
        if header_match:
            flush()
            current_slug = header_match.group(1)
            continue

        if current_slug is None:
            continue

        focus_match = FOCUS_RE.match(line)
        if focus_match:
            current_focus = focus_match.group(1)
            continue

        if line.strip() == "Entry packages:":
            mode = "entry"
            continue

        if line.strip() == "Anchor symbols (examples):":
            mode = "anchor"
            continue

        if line.strip() == "Map evidence:":
            mode = None
            continue

        if line.startswith("## "):
            mode = None
            continue

        if mode == "entry":
            if not line.lstrip().startswith("-"):
                continue
            for token in BACKTICK_TOKEN_RE.findall(line):
                entry_packages.append(token)
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

    flush()
    return lanes


def parse_backlog_frontmatter(task_path: Path) -> dict[str, str]:
    text = read_text(task_path)
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    fm = parts[1]
    out: dict[str, str] = {}
    for line in fm.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key in {"id", "title", "status"}:
            out[key] = value
    # labels are YAML list; parse minimally
    labels: list[str] = []
    in_labels = False
    for line in fm.splitlines():
        if line.strip() == "labels:":
            in_labels = True
            continue
        if in_labels:
            if re.match(r"^\s*-\s+", line):
                labels.append(line.split("-", 1)[1].strip().strip("'").strip('"'))
            else:
                in_labels = False
    if labels:
        out["labels"] = ",".join(labels)
    return out


def find_lane_tasks(repo: Path, lane_slug: str) -> list[dict[str, str]]:
    tasks_dir = repo / "backlog" / "tasks"
    if not tasks_dir.exists():
        return []
    tasks = []
    for task_path in sorted(tasks_dir.glob("*.md")):
        fm = parse_backlog_frontmatter(task_path)
        labels = set((fm.get("labels") or "").split(",")) if fm.get("labels") else set()
        if f"lane:{lane_slug}" in labels:
            fm["path"] = str(task_path.relative_to(repo))
            tasks.append(fm)
    return tasks


def rel_exists(repo: Path, rel: str) -> bool:
    return (repo / rel).is_file()


def extract_manual_block(existing_text: str, name: str, default_body: str) -> str:
    pattern = re.compile(MANUAL_BLOCK_RE_TEMPLATE.format(name=re.escape(name)), re.DOTALL)
    match = pattern.search(existing_text)
    if match:
        body = match.group("body")
        return f"<!-- MANUAL:{name}:BEGIN -->{body}<!-- MANUAL:{name}:END -->"
    return f"<!-- MANUAL:{name}:BEGIN -->\n{default_body.rstrip()}\n<!-- MANUAL:{name}:END -->"


def write_global_overview(repo: Path, lanes: list[Lane]) -> None:
    out_path = repo / "notes" / "overview.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    existing = read_text(out_path) if out_path.exists() else ""

    lines: list[str] = []
    lines.append("# Overview")
    lines.append("")
    lines.append("_Generated by `tools/gen_overview_pages.py`. Edit only inside `MANUAL:*` blocks._")
    lines.append("")
    lines.append("This is a human-first navigator across lanes and artifacts.")
    lines.append("")
    lines.append("Key references:")
    lines.append("- `notes/maps/lanes.md` (lane definitions)")
    lines.append("- `notes/maps/provenance.md` (maps provenance; generated by `just maps`)")
    lines.append("- `backlog/docs/workflow.md` (workflow + quality gates)")
    lines.append("")
    lines.append("## Lanes")
    lines.append("")
    lines.append("| Lane | Focus | Map | Dossier | Repro | Backlog |")
    lines.append("|---|---|---|---|---|---|")

    for lane in lanes:
        map_path = f"notes/maps/lane-{lane.slug}.md"
        dossier_path = f"notes/dossiers/lane-{lane.slug}.md"
        repro_path = f"repros/lane-{lane.slug}/README.md"
        hub_path = f"maps/hub-{lane.slug}.md"

        map_cell = f"`{map_path}`" if rel_exists(repo, map_path) else "(missing)"
        dossier_cell = f"`{dossier_path}`" if rel_exists(repo, dossier_path) else "(missing)"
        repro_cell = f"`{repro_path}`" if rel_exists(repo, repro_path) else "(missing)"

        tasks = find_lane_tasks(repo, lane.slug)
        if tasks:
            statuses = sorted({t.get("status", "?") for t in tasks})
            backlog_cell = f"{', '.join(statuses)} ({len(tasks)})"
        else:
            backlog_cell = "(none)"

        focus = lane.focus or "(no focus summary)"
        lines.append(
            f"| `{lane.slug}` ([overview]({hub_path})) | {focus} | {map_cell} | {dossier_cell} | {repro_cell} | {backlog_cell} |"
        )

    lines.append("")
    lines.append(extract_manual_block(existing, "OVERVIEW_NOTES", default_body="- Notes: TODO"))
    lines.append("")
    lines.append("## Recommended reading order (per lane)")
    lines.append("")
    lines.append("1) Start with the lane overview (`notes/maps/hub-<lane>.md`).")
    lines.append("2) Read the lane map (`notes/maps/lane-<lane>.md`) to learn where to look.")
    lines.append("3) Read the dossier (`notes/dossiers/lane-<lane>.md`) for the under-the-hood story.")
    lines.append("4) If you need concreteness, run the repro (`repros/lane-<lane>/README.md`) and compare oracle outputs.")
    lines.append("")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_lane_hubs(repo: Path, lanes: list[Lane]) -> None:
    out_dir = repo / "notes" / "maps"
    out_dir.mkdir(parents=True, exist_ok=True)

    for lane in lanes:
        out_path = out_dir / f"hub-{lane.slug}.md"
        existing = read_text(out_path) if out_path.exists() else ""
        map_path = f"notes/maps/lane-{lane.slug}.md"
        dossier_path = f"notes/dossiers/lane-{lane.slug}.md"
        repro_path = f"repros/lane-{lane.slug}/README.md"
        walkthrough_path = f"notes/walkthroughs/{lane.slug}.md"
        walkthrough_cases_path = f"notes/walkthroughs/{lane.slug}-cases.md"

        tasks = find_lane_tasks(repo, lane.slug)
        statuses: dict[str, int] = {}
        for t in tasks:
            st = t.get("status", "?") or "?"
            statuses[st] = statuses.get(st, 0) + 1

        lines: list[str] = []
        lines.append(f"# Lane overview: {lane.slug}")
        lines.append("")
        lines.append("_Generated by `tools/gen_overview_pages.py`. Edit only inside `MANUAL:*` blocks._")
        lines.append("")
        lines.append(f"Focus: {lane.focus or '(no focus summary)'}")
        lines.append("")
        lines.append("## Lane overview")
        lines.append("")
        lines.append(
            extract_manual_block(
                existing,
                "LANE_OVERVIEW",
                default_body=(
                    "- Boundary (in/out of scope): TODO\n"
                    "- Canonical scenario: TODO\n"
                    "- Observable outputs: TODO\n"
                    "- Key invariants/tolerances to remember: TODO"
                ),
            )
        )
        lines.append("")
        lines.append("## 10k-ft spine")
        lines.append("")
        lines.append("5–10 symbols max, higher-level than the dossier spine:")
        lines.append(extract_manual_block(existing, "LANE_SPINE", default_body="- TODO"))
        lines.append("")
        lines.append("## Quick links")
        lines.append("")
        lines.append(f"- Lane map: `{map_path}`" if rel_exists(repo, map_path) else f"- Lane map: `{map_path}` (missing)")
        lines.append(
            f"- Dossier: `{dossier_path}`" if rel_exists(repo, dossier_path) else f"- Dossier: `{dossier_path}` (missing)"
        )
        if rel_exists(repo, walkthrough_path):
            lines.append(f"- Walkthrough: `{walkthrough_path}`")
        if rel_exists(repo, walkthrough_cases_path):
            lines.append(f"- Walkthrough cases: `{walkthrough_cases_path}`")
        lines.append(f"- Repro: `{repro_path}`" if rel_exists(repo, repro_path) else f"- Repro: `{repro_path}` (missing)")
        lines.append("")
        lines.append("## Generated references")
        lines.append("")
        lines.append("<details>")
        lines.append("<summary>Packages and anchor symbols</summary>")
        lines.append("")
        lines.append("### Entry packages")
        lines.append("")
        if lane.entry_packages:
            for pkg in lane.entry_packages:
                lines.append(f"- `{pkg}`")
        else:
            lines.append("- (none listed in `notes/maps/lanes.md`)")
        lines.append("")
        lines.append("### Anchor symbols (examples)")
        lines.append("")
        if lane.anchor_symbols:
            for path, sym in lane.anchor_symbols[:12]:
                if sym:
                    lines.append(f"- `{path}` — `{sym}`")
                else:
                    lines.append(f"- `{path}`")
        else:
            lines.append("- (none listed in `notes/maps/lanes.md`)")
        lines.append("")
        lines.append("</details>")
        lines.append("")
        lines.append("## Backlog")
        lines.append("")
        if statuses:
            parts = [f"{k} ({v})" for k, v in sorted(statuses.items())]
            lines.append(f"- Statuses: {', '.join(parts)}")
            lines.append(f"- Total tasks: {len(tasks)}")
        else:
            lines.append("- (none)")
        lines.append("")

        out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: .)")
    args = ap.parse_args()

    repo = Path(args.root).resolve()
    lanes_path = repo / "notes" / "maps" / "lanes.md"
    if not lanes_path.is_file():
        print(f"[error] Missing lane definitions: {lanes_path}", file=sys.stderr)
        return 2

    lanes = parse_lanes(read_text(lanes_path))
    if not lanes:
        print("[error] No lanes found in notes/maps/lanes.md", file=sys.stderr)
        return 2

    write_global_overview(repo, lanes)
    write_lane_hubs(repo, lanes)
    print(f"[ok] Wrote notes/overview.md and {len(lanes)} lane hubs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
