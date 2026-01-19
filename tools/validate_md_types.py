#!/usr/bin/env python3
import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import jsonschema


@dataclass(frozen=True)
class DocType:
    kind: str
    schema_path: Path


DOC_TYPES = [
    DocType(kind="dossier", schema_path=Path("tools/schemas/md_dossier.schema.json")),
    DocType(kind="algorithm-dossier", schema_path=Path("tools/schemas/md_algorithm_dossier.schema.json")),
    DocType(kind="lane-map", schema_path=Path("tools/schemas/md_lane_map.schema.json")),
    DocType(kind="repro-readme", schema_path=Path("tools/schemas/md_repro_readme.schema.json")),
]


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def detect_kind(rel_path: str) -> str | None:
    if rel_path.startswith("notes/dossiers/algorithm-") and rel_path.endswith(".md"):
        return "algorithm-dossier"
    if rel_path.startswith("notes/dossiers/") and rel_path.endswith(".md"):
        return "dossier"
    if rel_path.startswith("notes/maps/lane-") and rel_path.endswith(".md"):
        return "lane-map"
    if rel_path.startswith("repros/") and rel_path.endswith("/README.md"):
        return "repro-readme"
    return None


def extract_headings(md_text: str) -> list[str]:
    headings: list[str] = []
    for line in md_text.splitlines():
        match = HEADING_RE.match(line)
        if not match:
            continue
        level_marks, title = match.groups()
        normalized = f"{level_marks} {title.strip()}"
        headings.append(normalized)
    return headings


def schema_for_kind(kind: str, level: str) -> Path:
    for doc_type in DOC_TYPES:
        if doc_type.kind == kind:
            if level == "strict":
                name = doc_type.schema_path.name
                if name.endswith(".schema.json"):
                    strict_name = name[: -len(".schema.json")] + ".strict.schema.json"
                    return doc_type.schema_path.with_name(strict_name)
                return doc_type.schema_path.with_name(doc_type.schema_path.stem + ".strict.schema.json")
            return doc_type.schema_path
    raise ValueError(f"Unknown kind: {kind}")


def load_schema(schema_path: Path) -> dict:
    return json.loads(schema_path.read_text(encoding="utf-8"))


def validate_doc(instance: dict, schema: dict) -> list[str]:
    validator = jsonschema.Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    messages: list[str] = []
    for err in errors:
        location = ".".join(str(p) for p in err.path) if err.path else "(root)"
        messages.append(f"{location}: {err.message}")
    return messages


def collect_files(root: Path) -> list[Path]:
    candidates: list[Path] = []
    candidates.extend(root.glob("notes/dossiers/*.md"))
    candidates.extend(root.glob("notes/maps/lane-*.md"))
    candidates.extend(root.glob("repros/*/README.md"))
    return sorted(set(p for p in candidates if p.is_file()))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: .)")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    ap.add_argument("--level", choices=["baseline", "strict"], default="baseline")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = collect_files(root)

    results = []
    failed = 0

    for file_path in files:
        rel_path = str(file_path.relative_to(root))
        kind = detect_kind(rel_path)
        if kind is None:
            continue

        schema_path = root / schema_for_kind(kind, args.level)
        schema = load_schema(schema_path)

        md_text = file_path.read_text(encoding="utf-8", errors="replace")
        headings = extract_headings(md_text)
        title = headings[0].lstrip("#").strip() if headings else ""

        instance = {
            "kind": kind,
            "path": rel_path,
            "title": title,
            "headings": headings,
        }

        errors = validate_doc(instance, schema)
        ok = len(errors) == 0
        if not ok:
            failed += 1

        results.append(
            {
                "path": rel_path,
                "kind": kind,
                "ok": ok,
                "errors": errors,
            }
        )

    if args.format == "json":
        print(json.dumps({"failed": failed, "results": results}, indent=2))
    else:
        for r in results:
            if r["ok"]:
                continue
            print(f"[FAIL] {r['path']} ({r['kind']})")
            for msg in r["errors"]:
                print(f"  - {msg}")
        if failed == 0:
            print(f"[OK] Validated {len(results)} documents.")
        else:
            print(f"[FAIL] {failed} documents failed validation.")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
