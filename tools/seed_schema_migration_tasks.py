#!/usr/bin/env python3
import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


TASKS_DIR = Path("backlog/tasks")
SCHEMAS_DIR = Path("tools/schemas")


SECTION_RE_TEMPLATE = r"<!--\s*SECTION:{name}:BEGIN\s*-->(?P<body>.*?)<!--\s*SECTION:{name}:END\s*-->"
AC_RE_TEMPLATE = r"<!--\s*AC:BEGIN\s*-->(?P<body>.*?)<!--\s*AC:END\s*-->"


def now_stamp() -> str:
    return dt.datetime.now().replace(microsecond=0).isoformat(sep=" ")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def schema_fingerprint() -> str:
    files = sorted(SCHEMAS_DIR.glob("*.json"))
    h = hashlib.sha256()
    for f in files:
        h.update(str(f).encode("utf-8"))
        h.update(b"\0")
        h.update(f.read_bytes())
        h.update(b"\0")
    return h.hexdigest()[:12]


def run_validator(level: str) -> dict:
    cmd = [
        sys.executable,
        "tools/validate_md_types.py",
        "--root",
        ".",
        "--level",
        level,
        "--format",
        "json",
    ]
    proc = subprocess.run(cmd, text=True, capture_output=True, check=False)
    out = (proc.stdout or "").strip()
    if not out:
        raise RuntimeError(f"Validator produced no JSON output. stderr:\n{proc.stderr}")
    return json.loads(out)


def slugify_path(rel_path: str) -> str:
    s = rel_path.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] if len(s) > 60 else s


def extract_section(text: str, section_name: str) -> str | None:
    pat = re.compile(SECTION_RE_TEMPLATE.format(name=re.escape(section_name)), re.DOTALL)
    m = pat.search(text)
    if not m:
        return None
    return m.group("body").strip("\n")


def replace_section(text: str, section_name: str, new_body: str) -> str:
    pat = re.compile(SECTION_RE_TEMPLATE.format(name=re.escape(section_name)), re.DOTALL)
    replacement = f"<!-- SECTION:{section_name}:BEGIN -->\n{new_body.rstrip()}\n<!-- SECTION:{section_name}:END -->"
    if pat.search(text):
        return pat.sub(replacement, text, count=1)
    # If missing, append a new section at end.
    return text.rstrip() + "\n\n" + replacement + "\n"


def replace_acceptance(text: str, new_body: str) -> str:
    pat = re.compile(AC_RE_TEMPLATE, re.DOTALL)
    replacement = f"<!-- AC:BEGIN -->\n{new_body.rstrip()}\n<!-- AC:END -->"
    if pat.search(text):
        return pat.sub(replacement, text, count=1)
    return text.rstrip() + "\n\n## Acceptance Criteria\n" + replacement + "\n"


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_text = parts[1]
    body = parts[2].lstrip("\n")
    fm: dict[str, object] = {}

    # Minimal YAML subset parser sufficient for our generated tasks.
    key_re = re.compile(r"^([a-zA-Z0-9_]+):\s*(.*)\s*$")
    lines = fm_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = key_re.match(line)
        if not m:
            i += 1
            continue
        key, raw = m.groups()
        raw = raw.strip()
        if raw == "[]":
            fm[key] = []
            i += 1
            continue
        if raw == "":
            # possibly list
            values: list[str] = []
            j = i + 1
            while j < len(lines) and re.match(r"^\s+-\s+", lines[j]):
                values.append(lines[j].split("-", 1)[1].strip().strip("'").strip('"'))
                j += 1
            fm[key] = values
            i = j
            continue
        fm[key] = raw.strip("'").strip('"')
        i += 1

    return fm, body


def render_frontmatter(data: dict[str, object]) -> str:
    # Keep key ordering similar to other tasks.
    order = [
        "id",
        "title",
        "status",
        "assignee",
        "created_date",
        "updated_date",
        "labels",
        "dependencies",
        "parent_task_id",
    ]
    lines = ["---"]
    for key in order:
        if key not in data:
            continue
        val = data[key]
        if isinstance(val, list):
            lines.append(f"{key}:")
            for item in val:
                lines.append(f"  - {json.dumps(item)}".replace('"', "'"))
        else:
            if isinstance(val, str) and (":" in val or val.strip() != val):
                lines.append(f"{key}: {json.dumps(val)}".replace('"', "'"))
            else:
                lines.append(f"{key}: {val}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def list_existing_tasks() -> list[Path]:
    if not TASKS_DIR.exists():
        return []
    return sorted(p for p in TASKS_DIR.glob("*.md") if p.is_file())

SCHEMA_TARGET_RE = re.compile(r"^schema_migration_target:\s*(.+?)\s*$", re.MULTILINE)
SCHEMA_LEVEL_RE = re.compile(r"^schema_migration_level:\s*(.+?)\s*$", re.MULTILINE)


def find_task_by_schema_target(level: str, target: str) -> Path | None:
    candidates: list[Path] = []
    for p in list_existing_tasks():
        txt = read_text(p)
        _, body = parse_frontmatter(txt)
        desc = extract_section(body, "DESCRIPTION") or body
        m_t = SCHEMA_TARGET_RE.search(desc)
        m_l = SCHEMA_LEVEL_RE.search(desc)
        if not m_t or not m_l:
            continue
        if m_l.group(1).strip() != level:
            continue
        if m_t.group(1).strip() != target:
            continue
        candidates.append(p)
    if not candidates:
        return None

    def sort_key(path: Path):
        fm, _ = parse_frontmatter(read_text(path))
        tid = str(fm.get("id", ""))
        m = re.match(r"^task-(\d+)(?:\.(\d+))?$", tid)
        if m:
            a = int(m.group(1))
            b = int(m.group(2) or 0)
            return (0, a, b, str(path))
        return (1, 0, 0, str(path))

    return sorted(candidates, key=sort_key)[0]


def find_task_by_marker(marker: str) -> Path | None:
    for p in list_existing_tasks():
        if marker in read_text(p):
            return p
    return None


def next_base_task_number() -> int:
    max_n = 0
    for p in list_existing_tasks():
        fm, _ = parse_frontmatter(read_text(p))
        tid = str(fm.get("id", ""))
        m = re.match(r"^task-(\d+)", tid)
        if m:
            max_n = max(max_n, int(m.group(1)))
    return max_n + 1


def next_child_index(parent_id: str) -> int:
    base_match = re.match(r"^task-(\d+)$", parent_id)
    if not base_match:
        return 1
    base = base_match.group(1)
    max_i = 0
    for p in list_existing_tasks():
        fm, _ = parse_frontmatter(read_text(p))
        tid = str(fm.get("id", ""))
        m = re.match(rf"^task-{re.escape(base)}\.(\d+)$", tid)
        if m:
            max_i = max(max_i, int(m.group(1)))
    return max_i + 1


def lane_label_for_path(rel_path: str) -> str | None:
    m = re.match(r"^notes/maps/lane-([a-z0-9-]+)\.md$", rel_path)
    if m:
        return f"lane:{m.group(1)}"
    m = re.match(r"^notes/dossiers/lane-([a-z0-9-]+)\.md$", rel_path)
    if m:
        return f"lane:{m.group(1)}"
    m = re.match(r"^repros/lane-([a-z0-9-]+)/README\.md$", rel_path)
    if m:
        return f"lane:{m.group(1)}"
    return None


def kind_label(kind: str) -> str:
    return f"kind:{kind}"


def make_parent_task(level: str, fingerprint: str) -> tuple[str, Path]:
    marker = f"schema_migration_level: {level}"
    existing = find_task_by_marker(marker)
    if existing:
        fm, body = parse_frontmatter(read_text(existing))
        task_id = str(fm.get("id"))
        fm["updated_date"] = now_stamp()
        fm["title"] = f"Schema migration ({level})"
        fm["labels"] = sorted(set((fm.get("labels") or []) + ["schema-migration"]))  # type: ignore[operator]

        desc = "\n".join(
            [
                "Schema migration meta-task (auto-managed).",
                "",
                f"- schema_migration_level: {level}",
                f"- schema_fingerprint: {fingerprint}",
                "",
                "Run:",
                f"- `just validate-md-{level}`" if level in {"baseline", "strict"} else f"- `python3 tools/validate_md_types.py --level {level}`",
                "- `python3 tools/seed_schema_migration_tasks.py --level strict`",
            ]
        )
        body2 = replace_section(body, "DESCRIPTION", desc)
        out = render_frontmatter(fm) + body2
        write_text(existing, out)
        return task_id, existing

    base_n = next_base_task_number()
    task_id = f"task-{base_n}"
    filename = TASKS_DIR / f"task-{base_n} - Schema-migration-{level}.md"
    created = now_stamp()
    fm = {
        "id": task_id,
        "title": f"Schema migration ({level})",
        "status": "In Progress",
        "assignee": [],
        "created_date": created,
        "updated_date": created,
        "labels": ["schema-migration"],
        "dependencies": [],
    }
    desc = "\n".join(
        [
            "Schema migration meta-task (auto-managed).",
            "",
            f"- schema_migration_level: {level}",
            f"- schema_fingerprint: {fingerprint}",
            "",
            "Run:",
            f"- `just validate-md-{level}`" if level in {"baseline", "strict"} else f"- `python3 tools/validate_md_types.py --level {level}`",
            "- `python3 tools/seed_schema_migration_tasks.py --level strict`",
        ]
    )
    ac = "\n".join(
        [
            f"- [ ] #1 All targeted docs pass `{level}` validation",
            f"- [ ] #2 Task list reflects current `{level}` failures (seed script rerun)",
        ]
    )
    plan = "\n".join(
        [
            "1) Run validator to get current failures.",
            "2) Generate/update per-file tasks with the seeder.",
            "3) Fix files until validation passes.",
        ]
    )
    body = "\n".join(
        [
            "## Description",
            "",
            "<!-- SECTION:DESCRIPTION:BEGIN -->",
            desc,
            "<!-- SECTION:DESCRIPTION:END -->",
            "",
            "## Acceptance Criteria",
            "<!-- AC:BEGIN -->",
            ac,
            "<!-- AC:END -->",
            "",
            "## Implementation Plan",
            "",
            "<!-- SECTION:PLAN:BEGIN -->",
            plan,
            "<!-- SECTION:PLAN:END -->",
            "",
            "## Implementation Notes",
            "",
            "<!-- SECTION:NOTES:BEGIN -->",
            "",
            "<!-- SECTION:NOTES:END -->",
            "",
        ]
    )
    write_text(filename, render_frontmatter(fm) + body)
    return task_id, filename


def make_or_update_child_task(
    *,
    parent_id: str,
    level: str,
    fingerprint: str,
    rel_path: str,
    kind: str,
    errors: list[str],
    is_failing: bool,
) -> tuple[str, Path]:
    existing = find_task_by_schema_target(level, rel_path)

    lane_label = lane_label_for_path(rel_path)
    labels = ["schema-migration", kind_label(kind)]
    if lane_label:
        labels.append(lane_label)

    status = "To Do" if is_failing else "Done"
    title = f"Schema migrate ({level}): {rel_path}"

    desc_lines = [
        "Schema migration task (auto-managed).",
        "",
        f"schema_migration_target: {rel_path}",
        f"schema_migration_kind: {kind}",
        f"schema_migration_level: {level}",
        f"schema_fingerprint: {fingerprint}",
        "",
        "Validation:",
        f"- baseline: `just validate-md`",
        f"- strict: `just validate-md-strict`",
        "",
        "Current validator errors:",
    ]
    if errors:
        desc_lines.extend([f"- {e}" for e in errors])
    else:
        desc_lines.append("- (none)")
    desc = "\n".join(desc_lines)

    ac = "\n".join(
        [
            f"- [ ] #1 `{rel_path}` passes `{level}` validation",
        ]
    )
    plan = "\n".join(
        [
            "1) Add/adjust the required headings/sections for this document type.",
            f"2) Re-run `python3 tools/validate_md_types.py --root . --level {level}`.",
            "3) Mark task Done.",
        ]
    )

    if existing:
        fm, body = parse_frontmatter(read_text(existing))
        task_id = str(fm.get("id"))
        fm["title"] = title
        fm["status"] = status
        fm["updated_date"] = now_stamp()
        fm["labels"] = labels
        fm["parent_task_id"] = parent_id
        body2 = replace_section(body, "DESCRIPTION", desc)
        body2 = replace_acceptance(body2, ac)
        if extract_section(body2, "PLAN") is None:
            body2 = replace_section(body2, "PLAN", plan)
        out = render_frontmatter(fm) + body2
        write_text(existing, out)
        return task_id, existing

    child_i = next_child_index(parent_id)
    base_match = re.match(r"^task-(\d+)$", parent_id)
    if base_match:
        task_id = f"{parent_id}.{child_i}"
        filename = TASKS_DIR / f"{task_id} - Schema-migrate-{slugify_path(rel_path)}.md"
    else:
        # Fallback if parent_id isn't numeric
        base_n = next_base_task_number()
        task_id = f"task-{base_n}"
        filename = TASKS_DIR / f"{task_id} - Schema-migrate-{slugify_path(rel_path)}.md"

    created = now_stamp()
    fm = {
        "id": task_id,
        "title": title,
        "status": status,
        "assignee": [],
        "created_date": created,
        "updated_date": created,
        "labels": labels,
        "dependencies": [],
        "parent_task_id": parent_id,
    }
    body = "\n".join(
        [
            "## Description",
            "",
            "<!-- SECTION:DESCRIPTION:BEGIN -->",
            desc,
            "<!-- SECTION:DESCRIPTION:END -->",
            "",
            "## Acceptance Criteria",
            "<!-- AC:BEGIN -->",
            ac,
            "<!-- AC:END -->",
            "",
            "## Implementation Plan",
            "",
            "<!-- SECTION:PLAN:BEGIN -->",
            plan,
            "<!-- SECTION:PLAN:END -->",
            "",
            "## Implementation Notes",
            "",
            "<!-- SECTION:NOTES:BEGIN -->",
            "",
            "<!-- SECTION:NOTES:END -->",
            "",
        ]
    )
    write_text(filename, render_frontmatter(fm) + body)
    return task_id, filename


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--level", choices=["strict"], default="strict")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    level = args.level
    fingerprint = schema_fingerprint()
    report = run_validator(level)
    results = report.get("results", [])

    failing = [r for r in results if not r.get("ok")]

    parent_id, parent_path = make_parent_task(level, fingerprint)

    created_or_updated: list[tuple[str, str]] = []
    for r in failing:
        rel_path = r["path"]
        kind = r["kind"]
        errors = r.get("errors", [])
        _, task_path = make_or_update_child_task(
            parent_id=parent_id,
            level=level,
            fingerprint=fingerprint,
            rel_path=rel_path,
            kind=kind,
            errors=errors,
            is_failing=True,
        )
        created_or_updated.append((rel_path, str(task_path)))

    # Also mark any existing tasks for this fingerprint+level whose target now passes as Done.
    for p in list_existing_tasks():
        txt = read_text(p)
        if f"schema_migration_level: {level}" not in txt:
            continue
        fm, body = parse_frontmatter(txt)
        target = None
        m = re.search(r"schema_migration_target:\s*(.+)\s*$", body, re.MULTILINE)
        if m:
            target = m.group(1).strip()
        if not target:
            continue
        # Determine current ok status from validator results
        res = next((rr for rr in results if rr.get("path") == target), None)
        if res and res.get("ok") and fm.get("status") != "Done":
            fm["status"] = "Done"
            fm["updated_date"] = now_stamp()
            out = render_frontmatter(fm) + body
            write_text(p, out)

    print(f"[ok] Schema seeding complete: level={level}, fingerprint={fingerprint}")
    print(f"[ok] Parent task: {parent_id} ({parent_path})")
    print(f"[ok] Failing docs: {len(failing)}")
    if failing:
        for rel_path, task_path in created_or_updated[:25]:
            print(f"- {rel_path} -> {task_path}")
        if len(created_or_updated) > 25:
            print(f"... ({len(created_or_updated) - 25} more)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
