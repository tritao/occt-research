#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


ISSUE_HEADER_RE = re.compile(r"^#\s+#(\d+)\s+—\s+(.*)\s*$")
LABELS_LINE_RE = re.compile(r"^- Labels:\s+(.*)\s*$", re.M)


@dataclass(frozen=True)
class IssueRef:
    number: int
    title: str
    path: Path


def extract_labels(text: str) -> list[str]:
    m = LABELS_LINE_RE.search(text)
    if not m:
        return []
    # Labels are rendered as backticked comma-separated entries.
    return re.findall(r"`([^`]+)`", m.group(1))


def classify_issue(text: str) -> str:
    labels = extract_labels(text)
    topics = [l for l in labels if l.lower().startswith("topic:")]

    # Primary: use Topic: labels.
    has_fillet_topic = any("fillet" in t.lower() for t in topics)
    has_chamfer_topic = any("chamfer" in t.lower() for t in topics)
    if has_fillet_topic and has_chamfer_topic:
        return "fillet-chamfer"
    if has_fillet_topic:
        return "fillet"
    if has_chamfer_topic:
        return "chamfer"

    # Fallback: keyword scan for fillet/chamfer when Topic labels are absent or unrelated.
    t = text.lower()
    has_fillet = bool(re.search(r"\bfillet\b|\bfilleting\b|brepfillet|makefillet", t))
    has_chamfer = bool(re.search(r"\bchamfer\b|brepchamfer|makechamfer", t))
    if has_fillet and has_chamfer:
        return "fillet-chamfer"
    if has_fillet:
        return "fillet"
    if has_chamfer:
        return "chamfer"
    return "other"


def parse_issue(md_path: Path) -> IssueRef | None:
    text = md_path.read_text(encoding="utf-8", errors="replace")
    first = text.splitlines()[0] if text else ""
    m = ISSUE_HEADER_RE.match(first)
    if not m:
        return None
    return IssueRef(number=int(m.group(1)), title=m.group(2).strip(), path=md_path)


def write_index(dir_path: Path, title: str, issues: list[IssueRef]) -> None:
    lines: list[str] = [f"# {title}", ""]
    lines.append(f"- Issues: `{len(issues)}`")
    lines.append("")
    lines.append("## List")
    lines.append("")
    for it in sorted(issues, key=lambda x: x.number):
        rel = it.path.name
        lines.append(f"- `#{it.number}`: `{rel}` — {it.title}")
    (dir_path / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dir",
        default="notes/issues/freecad",
        help="Directory containing exported markdown files (default: notes/issues/freecad)",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned moves without changing files",
    )
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    base = Path(args.dir).resolve()
    if not base.is_dir():
        raise SystemExit(f"Missing dir: {base}")
    try:
        base_label = str(base.relative_to(repo_root))
    except ValueError:
        base_label = str(base)

    # Gather all issue markdown files recursively, excluding README.md files.
    issue_paths = [p for p in base.rglob("*.md") if p.is_file() and p.name != "README.md"]
    issues: list[IssueRef] = []
    skipped: list[Path] = []

    for p in issue_paths:
        ref = parse_issue(p)
        if not ref:
            skipped.append(p)
            continue
        issues.append(ref)

    if skipped:
        print(f"[WARN] Skipping {len(skipped)} markdown files without expected header")

    # Compute desired destination folder per issue.
    moves: list[tuple[IssueRef, Path]] = []
    buckets: dict[str, list[IssueRef]] = {"fillet": [], "chamfer": [], "fillet-chamfer": [], "other": []}

    for it in issues:
        text = it.path.read_text(encoding="utf-8", errors="replace")
        topic = classify_issue(text)
        buckets[topic].append(it)

        dst_dir = base / topic
        dst_path = dst_dir / it.path.name
        if it.path.resolve() != dst_path.resolve():
            moves.append((it, dst_path))

    # Create dirs first.
    for topic in ("fillet", "chamfer", "fillet-chamfer", "other"):
        dst_dir = base / topic
        if args.dry_run:
            continue
        dst_dir.mkdir(parents=True, exist_ok=True)

    # Apply moves.
    for it, dst in moves:
        if args.dry_run:
            print(f"[DRY] {it.path.relative_to(base)} -> {dst.relative_to(base)}")
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        it.path.replace(dst)

    # Re-scan within each topic for index generation (after moves).
    def gather(dir_name: str) -> list[IssueRef]:
        d = base / dir_name
        if not d.is_dir():
            return []
        out: list[IssueRef] = []
        for p in sorted(d.glob("*.md")):
            if p.name == "README.md":
                continue
            ref = parse_issue(p)
            if ref:
                out.append(ref)
        return out

    fillet = gather("fillet")
    chamfer = gather("chamfer")
    both = gather("fillet-chamfer")
    other = gather("other")

    if not args.dry_run:
        write_index(base / "fillet", "Fillet Issues", fillet)
        write_index(base / "chamfer", "Chamfer Issues", chamfer)
        write_index(base / "fillet-chamfer", "Fillet + Chamfer Issues", both)
        write_index(base / "other", "Other Issues (in this project view)", other)

        # Overwrite the top-level README with a navigational index.
        top = [
            "# FreeCAD Project 32 (view 1): exported issues",
            "",
            f"- Root: `{base_label}`",
            f"- Total issues: `{len(issues)}`",
            "",
            "## Topics",
            "",
            f"- Fillet: `{len(fillet)}` → `fillet/README.md`",
            f"- Chamfer: `{len(chamfer)}` → `chamfer/README.md`",
            f"- Fillet+Chamfer: `{len(both)}` → `fillet-chamfer/README.md`",
            f"- Other: `{len(other)}` → `other/README.md`",
            "",
            "## Notes",
            "",
            "- Classification is keyword-based over title/body/labels; adjust rules in `tools/organize_freecad_project_issues.py` if needed.",
        ]
        (base / "README.md").write_text("\n".join(top) + "\n", encoding="utf-8")

    print(
        "Done. "
        f"total={len(issues)} fillet={len(fillet)} chamfer={len(chamfer)} "
        f"fillet-chamfer={len(both)} other={len(other)} moves={len(moves)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
