#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


TASKS_DIR = Path("backlog/tasks")
LANES_MD = Path("notes/maps/lanes.md")

SECTION_RE_TEMPLATE = r"<!--\s*SECTION:{name}:BEGIN\s*-->(?P<body>.*?)<!--\s*SECTION:{name}:END\s*-->"


@dataclass(frozen=True)
class Lane:
    slug: str
    focus: str


@dataclass
class Task:
    path: Path
    frontmatter: dict[str, object]
    body: str

    @property
    def id(self) -> str:
        return str(self.frontmatter.get("id", "")).strip()

    @property
    def title(self) -> str:
        return str(self.frontmatter.get("title", "")).strip()

    @property
    def status(self) -> str:
        return str(self.frontmatter.get("status", "")).strip()

    @property
    def labels(self) -> list[str]:
        v = self.frontmatter.get("labels", [])
        return [str(x) for x in v] if isinstance(v, list) else []


def now_stamp() -> str:
    return dt.datetime.now().replace(microsecond=0).isoformat(sep=" ")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_text = parts[1]
    body = parts[2].lstrip("\n")
    fm: dict[str, object] = {}

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


def yaml_quote(s: str) -> str:
    # Keep simple: use single quotes when needed.
    if s == "" or any(c in s for c in [":", "#", "\n", "'"]) or s.strip() != s:
        return "'" + s.replace("'", "''") + "'"
    return s


def render_frontmatter(data: dict[str, object]) -> str:
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
                lines.append(f"  - {yaml_quote(str(item))}")
        else:
            lines.append(f"{key}: {yaml_quote(str(val))}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def extract_section(text: str, name: str) -> str | None:
    pat = re.compile(SECTION_RE_TEMPLATE.format(name=re.escape(name)), re.DOTALL)
    m = pat.search(text)
    return None if not m else m.group("body").strip("\n")


def replace_section(text: str, name: str, new_body: str) -> str:
    pat = re.compile(SECTION_RE_TEMPLATE.format(name=re.escape(name)), re.DOTALL)
    replacement = f"<!-- SECTION:{name}:BEGIN -->\n{new_body.rstrip()}\n<!-- SECTION:{name}:END -->"
    if pat.search(text):
        return pat.sub(replacement, text, count=1)
    # Insert after the header if present; else append.
    header = f"## {name.title().replace('_', ' ')}"
    if header in text:
        return text.replace(header, header + "\n\n" + replacement, 1)
    return text.rstrip() + "\n\n" + replacement + "\n"


LANE_HEADER_RE = re.compile(r"^##\s+lane:([a-z0-9-]+)\s*$")
FOCUS_RE = re.compile(r"^Focus:\s*(.+?)\s*$")


def parse_lanes(text: str) -> list[Lane]:
    lines = text.splitlines()
    lanes: list[Lane] = []
    slug: str | None = None
    focus = ""

    def flush():
        nonlocal slug, focus
        if slug is None:
            return
        lanes.append(Lane(slug=slug, focus=focus.strip()))
        slug = None
        focus = ""

    for line in lines:
        m = LANE_HEADER_RE.match(line)
        if m:
            flush()
            slug = m.group(1)
            continue
        if slug is None:
            continue
        m2 = FOCUS_RE.match(line)
        if m2:
            focus = m2.group(1)
            continue
        if line.startswith("## "):
            # next lane or unrelated section
            continue

    flush()
    return lanes


def load_tasks() -> list[Task]:
    if not TASKS_DIR.exists():
        return []
    tasks: list[Task] = []
    for p in sorted(TASKS_DIR.glob("*.md")):
        text = read_text(p)
        fm, body = parse_frontmatter(text)
        if fm:
            tasks.append(Task(path=p, frontmatter=fm, body=body))
    return tasks


SYNC_KEY_RE = re.compile(r"^task_sync_key:\s*(.+?)\s*$", re.MULTILINE)


def task_sync_key(task: Task) -> str | None:
    desc = extract_section(task.body, "DESCRIPTION")
    if not desc:
        return None
    m = SYNC_KEY_RE.search(desc)
    return None if not m else m.group(1).strip()


def next_base_task_number(tasks: list[Task]) -> int:
    max_n = 0
    for t in tasks:
        m = re.match(r"^task-(\d+)$", t.id)
        if m:
            max_n = max(max_n, int(m.group(1)))
    return max_n + 1


def next_child_index(tasks: list[Task], parent_id: str) -> int:
    base_match = re.match(r"^task-(\d+)$", parent_id)
    if not base_match:
        return 1
    base = base_match.group(1)
    max_i = 0
    for t in tasks:
        m = re.match(rf"^task-{re.escape(base)}\.(\d+)$", t.id)
        if m:
            max_i = max(max_i, int(m.group(1)))
    return max_i + 1


def find_by_labels(tasks: list[Task], lane_slug: str, type_label: str) -> Task | None:
    want_lane = f"lane:{lane_slug}"
    want_type = f"type:{type_label}"
    for t in tasks:
        labs = set(t.labels)
        if want_lane in labs and want_type in labs:
            return t
    return None


def find_by_sync_key(tasks: list[Task], key: str) -> Task | None:
    for t in tasks:
        if task_sync_key(t) == key:
            return t
    return None


def validation_ok_map(level: str) -> dict[str, bool]:
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
        return {}
    data = json.loads(out)
    ok_by_path: dict[str, bool] = {}
    for r in data.get("results", []):
        ok_by_path[str(r.get("path"))] = bool(r.get("ok"))
    return ok_by_path


def path_exists(rel_path: str) -> bool:
    return Path(rel_path).is_file()


def golden_nonempty(lane_slug: str) -> bool:
    golden_dir = Path(f"repros/lane-{lane_slug}/golden")
    if not golden_dir.is_dir():
        return False
    for p in golden_dir.rglob("*"):
        if p.is_file():
            return True
    return False


def compute_status_map_lane(lane_slug: str, ok_map: dict[str, bool]) -> str:
    p = f"notes/maps/lane-{lane_slug}.md"
    if Path(p).is_file() and ok_map.get(p, False):
        return "Done"
    return "To Do"


def compute_status_dossier_lane(lane_slug: str, ok_map: dict[str, bool]) -> str:
    p = f"notes/dossiers/lane-{lane_slug}.md"
    if Path(p).is_file() and ok_map.get(p, False):
        return "Done"
    return "To Do"


def compute_status_repro_lane(lane_slug: str, ok_map: dict[str, bool]) -> str:
    readme = f"repros/lane-{lane_slug}/README.md"
    if not Path(readme).is_file():
        return "To Do"
    if not ok_map.get(readme, False):
        return "In Progress"
    return "Done" if golden_nonempty(lane_slug) else "In Progress"


def compute_status_lane_parent(children: list[str]) -> str:
    if all(s == "Done" for s in children):
        return "Done"
    if any(s in {"Done", "In Progress"} for s in children):
        return "In Progress"
    return "To Do"


def canonical_description(sync_key: str, lane_slug: str, type_label: str) -> str:
    lines = [
        f"task_sync_key: {sync_key}",
        "",
        "Source of truth: `notes/maps/lanes.md`.",
        "",
    ]
    if type_label == "lane":
        lines.extend(
            [
                "This is a parent lane task grouping map/dossier/repro tasks.",
                "",
                "Expected artifacts:",
                f"- `notes/maps/lane-{lane_slug}.md`",
                f"- `notes/dossiers/lane-{lane_slug}.md`",
                f"- `repros/lane-{lane_slug}/README.md`",
            ]
        )
    elif type_label == "map":
        lines.extend(
            [
                "Execute via `prompts/backlog/map_task.md`.",
                "",
                "Primary artifact:",
                f"- `notes/maps/lane-{lane_slug}.md`",
            ]
        )
    elif type_label == "dossier":
        lines.extend(
            [
                "Execute via `prompts/backlog/dossier_task.md`.",
                "",
                "Primary artifact:",
                f"- `notes/dossiers/lane-{lane_slug}.md`",
            ]
        )
    elif type_label == "repro-oracle":
        lines.extend(
            [
                "Execute via `prompts/backlog/repro_oracle_task.md`.",
                "",
                "Primary artifacts:",
                f"- `repros/lane-{lane_slug}/README.md`",
                f"- `repros/lane-{lane_slug}/golden/`",
            ]
        )
    return "\n".join(lines)


def ensure_task(
    *,
    tasks: list[Task],
    lane_slug: str,
    type_label: str,
    parent_id: str | None,
    dependencies: list[str],
    desired_status: str,
    write: bool,
) -> Task:
    sync_key = f"lane:{lane_slug}/type:{type_label}"
    t = find_by_sync_key(tasks, sync_key)
    if t is None:
        # try infer by labels if key missing
        if type_label == "repro-oracle":
            # repro tasks are labeled with both type:repro and type:oracle in existing scheme
            inferred = None
            for cand in tasks:
                labs = set(cand.labels)
                if f"lane:{lane_slug}" in labs and "type:repro" in labs and "type:oracle" in labs:
                    inferred = cand
                    break
            t = inferred
        else:
            t = find_by_labels(tasks, lane_slug, type_label)

    if t is None:
        # create new task file
        created = now_stamp()
        if parent_id and re.match(r"^task-\d+$", parent_id):
            tid = f"{parent_id}.{next_child_index(tasks, parent_id)}"
        else:
            tid = f"task-{next_base_task_number(tasks)}"

        labels = [f"lane:{lane_slug}"]
        if type_label == "repro-oracle":
            labels.extend(["type:repro", "type:oracle"])
        else:
            labels.append(f"type:{type_label}")

        fm: dict[str, object] = {
            "id": tid,
            "title": "",
            "status": desired_status,
            "assignee": [],
            "created_date": created,
            "updated_date": created,
            "labels": labels,
            "dependencies": dependencies,
        }
        if parent_id:
            fm["parent_task_id"] = parent_id

        title = (
            f"Lane: {lane_slug}"
            if type_label == "lane"
            else f"Map: {lane_slug}"
            if type_label == "map"
            else f"Dossier: {lane_slug}"
            if type_label == "dossier"
            else f"Repro+Oracle: {lane_slug}"
        )
        fm["title"] = title

        body = "\n".join(
            [
                "## Description",
                "",
                "<!-- SECTION:DESCRIPTION:BEGIN -->",
                canonical_description(sync_key, lane_slug, type_label),
                "<!-- SECTION:DESCRIPTION:END -->",
                "",
                "## Implementation Notes",
                "",
                "<!-- SECTION:NOTES:BEGIN -->",
                "",
                "<!-- SECTION:NOTES:END -->",
                "",
            ]
        )
        filename = TASKS_DIR / f"{tid} - {title.replace(':', '').replace('/', '-')}.md"
        if write:
            write_text(filename, render_frontmatter(fm) + body)
        new_task = Task(path=filename, frontmatter=fm, body=body)
        tasks.append(new_task)
        return new_task

    # update existing task (frontmatter + description block)
    t.frontmatter["updated_date"] = now_stamp()
    t.frontmatter["status"] = desired_status
    t.frontmatter["dependencies"] = dependencies
    if parent_id:
        t.frontmatter["parent_task_id"] = parent_id

    labs = set(t.labels)
    labs.add(f"lane:{lane_slug}")
    if type_label == "repro-oracle":
        labs.add("type:repro")
        labs.add("type:oracle")
    else:
        labs.add(f"type:{type_label}")
    t.frontmatter["labels"] = sorted(labs)

    title = (
        f"Lane: {lane_slug}"
        if type_label == "lane"
        else f"Map: {lane_slug}"
        if type_label == "map"
        else f"Dossier: {lane_slug}"
        if type_label == "dossier"
        else f"Repro+Oracle: {lane_slug}"
    )
    t.frontmatter["title"] = title

    desc = canonical_description(sync_key, lane_slug, type_label)
    t.body = replace_section(t.body, "DESCRIPTION", desc)
    if write:
        write_text(t.path, render_frontmatter(t.frontmatter) + t.body)
    return t


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not LANES_MD.is_file():
        print(f"[error] Missing lane definitions: {LANES_MD}", file=sys.stderr)
        return 2

    lanes = parse_lanes(read_text(LANES_MD))
    if not lanes:
        print("[error] No lanes found in notes/maps/lanes.md", file=sys.stderr)
        return 2

    tasks = load_tasks()
    ok_map = validation_ok_map("baseline")

    # Ensure tasks per lane.
    write = not args.dry_run
    for lane in lanes:
        lane_slug = lane.slug

        map_status = compute_status_map_lane(lane_slug, ok_map)
        dossier_status = compute_status_dossier_lane(lane_slug, ok_map)
        repro_status = compute_status_repro_lane(lane_slug, ok_map)
        lane_status = compute_status_lane_parent([map_status, dossier_status, repro_status])

        lane_task = ensure_task(
            tasks=tasks,
            lane_slug=lane_slug,
            type_label="lane",
            parent_id=None,
            dependencies=[],
            desired_status=lane_status,
            write=write,
        )
        map_task = ensure_task(
            tasks=tasks,
            lane_slug=lane_slug,
            type_label="map",
            parent_id=lane_task.id,
            dependencies=[],
            desired_status=map_status,
            write=write,
        )
        dossier_task = ensure_task(
            tasks=tasks,
            lane_slug=lane_slug,
            type_label="dossier",
            parent_id=lane_task.id,
            dependencies=[map_task.id],
            desired_status=dossier_status,
            write=write,
        )
        ensure_task(
            tasks=tasks,
            lane_slug=lane_slug,
            type_label="repro-oracle",
            parent_id=lane_task.id,
            dependencies=[dossier_task.id],
            desired_status=repro_status,
            write=write,
        )

    if args.dry_run:
        print(f"[ok] Dry-run: would sync backlog tasks for {len(lanes)} lanes.")
    else:
        print(f"[ok] Synced backlog tasks for {len(lanes)} lanes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
