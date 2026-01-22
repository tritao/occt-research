#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import textwrap
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen


VIEW_URL_DEFAULT = "https://github.com/orgs/FreeCAD/projects/32/views/1"
REPO_DEFAULT = "FreeCAD/FreeCAD"


def slugify(s: str, *, max_len: int = 80) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    if not s:
        return "issue"
    if len(s) <= max_len:
        return s
    return s[:max_len].rstrip("-")


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": "occt-research/fillets-export"})
    with urlopen(req, timeout=60) as fp:  # noqa: S310 (trusted URL)
        data = fp.read()
    return data.decode("utf-8", errors="replace")


def gh_api_json(path: str) -> Any:
    proc = subprocess.run(
        ["gh", "api", path],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"gh api {path} failed with exit {proc.returncode}")
    return json.loads(proc.stdout)


def extract_issue_numbers(html: str, repo: str) -> list[int]:
    owner, name = repo.split("/", 1)
    pat = re.compile(rf"/{re.escape(owner)}/{re.escape(name)}/issues/(\d+)")
    nums = {int(m) for m in pat.findall(html)}
    return sorted(nums)


def format_issue_md(*, issue: dict[str, Any], repo: str, source_url: str, extracted_at: str) -> str:
    number = issue.get("number")
    title = issue.get("title") or ""
    url = issue.get("html_url") or ""
    state = issue.get("state") or ""
    created_at = issue.get("created_at") or ""
    updated_at = issue.get("updated_at") or ""
    closed_at = issue.get("closed_at")
    comments = issue.get("comments")

    labels = [x.get("name") for x in (issue.get("labels") or []) if isinstance(x, dict)]
    assignees = [x.get("login") for x in (issue.get("assignees") or []) if isinstance(x, dict)]
    milestone = (issue.get("milestone") or {}).get("title") if isinstance(issue.get("milestone"), dict) else None

    body = issue.get("body") or ""

    meta_lines = [
        f"- Repo: `{repo}`",
        f"- Issue: `#{number}`",
        f"- URL: {url}",
        f"- State: `{state}`",
        f"- Created: `{created_at}`",
        f"- Updated: `{updated_at}`",
    ]
    if closed_at:
        meta_lines.append(f"- Closed: `{closed_at}`")
    if isinstance(comments, int):
        meta_lines.append(f"- Comments: `{comments}`")
    if milestone:
        meta_lines.append(f"- Milestone: `{milestone}`")
    if labels:
        meta_lines.append(f"- Labels: {', '.join(f'`{x}`' for x in labels)}")
    if assignees:
        meta_lines.append(f"- Assignees: {', '.join(f'`{x}`' for x in assignees)}")

    meta_lines.append(f"- Source: {source_url}")
    meta_lines.append(f"- Extracted: `{extracted_at}`")

    header = f"# #{number} — {title}\n"
    meta = "\n".join(meta_lines) + "\n"

    body_block = "## Body\n\n"
    if body.strip():
        body_block += body.strip() + "\n"
    else:
        body_block += "_(empty)_\n"

    return header + "\n" + meta + "\n" + body_block


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--view-url", default=VIEW_URL_DEFAULT)
    ap.add_argument("--repo", default=REPO_DEFAULT)
    ap.add_argument(
        "--out-dir",
        default="notes/issues/freecad",
        help="Output directory for markdown files (default: notes/issues/freecad)",
    )
    ap.add_argument("--limit", type=int, default=0, help="If set, only export first N issues")
    args = ap.parse_args()

    extracted_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    html = fetch_text(args.view_url)
    numbers = extract_issue_numbers(html, args.repo)
    if args.limit and args.limit > 0:
        numbers = numbers[: args.limit]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    failures: list[str] = []
    written: list[tuple[int, str]] = []

    for n in numbers:
        try:
            issue = gh_api_json(f"repos/{args.repo}/issues/{n}")
            md = format_issue_md(issue=issue, repo=args.repo, source_url=args.view_url, extracted_at=extracted_at)
            filename = f"{n:05d}-{slugify(issue.get('title') or '')}.md"
            (out_dir / filename).write_text(md, encoding="utf-8")
            written.append((n, filename))
        except Exception as e:  # noqa: BLE001
            failures.append(f"#{n}: {e}")

    index_lines = [
        "# FreeCAD Project 32 (view 1): fillet/chamfer issues",
        "",
        f"- Source: {args.view_url}",
        f"- Repo: `{args.repo}`",
        f"- Extracted: `{extracted_at}`",
        f"- Issues found in view HTML: `{len(extract_issue_numbers(html, args.repo))}`",
        f"- Issues exported: `{len(written)}`",
        "",
        "## Issues",
        "",
    ]

    for n, filename in sorted(written, key=lambda t: t[0]):
        index_lines.append(f"- `#{n}`: `{filename}`")

    if failures:
        index_lines += ["", "## Failures", ""]
        index_lines += [f"- {x}" for x in failures]

    (out_dir / "README.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    if failures:
        msg = textwrap.dedent(
            f"""\
            Export completed with failures.
            Output: {out_dir}
            Exported: {len(written)} / {len(numbers)}
            """
        ).strip()
        print(msg)
        for f in failures[:20]:
            print(" -", f)
        return 1

    print(f"Exported {len(written)} issues to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
