#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import tempfile
from pathlib import Path


LINK_RE = re.compile(r"\]\(([^)]+)\)")


def rewrite_internal_markdown_links(md: str) -> str:
    def rewrite_target(target: str) -> str:
        if "://" in target:
            return target
        if target.startswith(("mailto:", "tel:", "#")):
            return target

        base = target
        suffix = ""
        for sep in ("#", "?"):
            if sep in base:
                base, rest = base.split(sep, 1)
                suffix = sep + rest
                break

        if base.endswith("/README.md") or base.endswith("/readme.md"):
            base = base[: -len("/README.md")] + "/readme/"
        elif base.endswith(".md"):
            base = base[: -len(".md")] + "/"

        return base + suffix

    def repl(match: re.Match[str]) -> str:
        target = match.group(1).strip()
        return f"]({rewrite_target(target)})"

    return LINK_RE.sub(repl, md)


def strip_section(md: str, heading: str) -> str:
    """
    Remove a markdown section by exact heading line (e.g. "## Backlog tasks"),
    up to (but not including) the next heading of same or higher level.
    """
    lines = md.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        if lines[i].rstrip("\n") != heading:
            i += 1
            continue

        level = len(heading.split(" ", 1)[0])  # number of '#'
        start = i
        i += 1
        while i < len(lines):
            line = lines[i]
            if line.startswith("#"):
                hashes = len(line) - len(line.lstrip("#"))
                if hashes <= level and line[hashes : hashes + 1] == " ":
                    break
            i += 1

        del lines[start:i]
        # trim extra blank lines where the section was removed
        while start < len(lines) and lines[start].strip() == "":
            del lines[start]
        if start > 0 and lines[start - 1].strip() == "":
            while start < len(lines) and lines[start].strip() == "":
                del lines[start]
        i = start

    return "".join(lines)


def copy_file(src: Path, dst: Path, *, tmp_root: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    text = src.read_text(encoding="utf-8", errors="replace")
    text = rewrite_internal_markdown_links(text)

    if not text.startswith("---\n"):
        title = None
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("# "):
                title = line[len("# ") :].strip()
                break
        if not title:
            title = dst.stem.replace("-", " ").strip() or "Document"
        # YAML frontmatter accepts JSON scalars; JSON encoding avoids quoting pitfalls.
        text = f"---\ntitle: {json.dumps(title)}\n---\n\n{text}"

    # Starlight will render the frontmatter title as the page heading.
    # Many repo docs also include an H1 (`# ...`) as the first line, which would
    # otherwise show the title twice. Strip the first H1 after frontmatter.
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            frontmatter = text[: end + len("\n---\n")]
            body = text[end + len("\n---\n") :]
            body_lines = body.splitlines(keepends=True)
            for i, line in enumerate(body_lines):
                if line.startswith("# "):
                    del body_lines[i]
                    if i < len(body_lines) and body_lines[i].strip() == "":
                        del body_lines[i]
                    body = "".join(body_lines)
                    text = frontmatter + body
                    break

    # Site-specific pruning: keep backlog tracking out of the rendered docs.
    text = strip_section(text, "## Backlog tasks")

    # Write atomically to avoid transient partial reads during Astro's file-watching.
    # Keep temp files OUT of the docs tree so Starlight doesn't accidentally index them.
    tmp_root.mkdir(parents=True, exist_ok=True)
    target_mode = 0o644
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=tmp_root,
            prefix="sync-",
            suffix=".tmp",
            delete=False,
        ) as f:
            tmp_path = Path(f.name)
            f.write(text)
        os.chmod(tmp_path, target_mode)
        os.replace(tmp_path, dst)
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


def copy_glob(root: Path, pattern: str, dest_root: Path, *, tmp_root: Path) -> int:
    count = 0
    for src in sorted(root.glob(pattern)):
        if not src.is_file():
            continue
        rel = src.relative_to(root)
        copy_file(src, dest_root / rel, tmp_root=tmp_root)
        count += 1
    return count


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: .)")
    ap.add_argument("--site", default="site", help="starlight site dir (default: site)")
    ap.add_argument(
        "--dest-subdir",
        default="occt",
        help="subdirectory under site docs to populate (default: occt)",
    )
    ap.add_argument(
        "--clean",
        action="store_true",
        help="delete and recreate destination subdir before syncing",
    )
    args = ap.parse_args()

    repo_root = Path(args.root).resolve()
    site_root = (repo_root / args.site).resolve()

    docs_root = site_root / "src" / "content" / "docs"
    if not docs_root.is_dir():
        raise SystemExit(f"Missing Starlight docs dir: {docs_root}")

    dest_root = docs_root / args.dest_subdir
    if args.clean and dest_root.exists():
        shutil.rmtree(dest_root)
    dest_root.mkdir(parents=True, exist_ok=True)
    tmp_root = site_root / ".sync_tmp"

    # Landing page for the OCCT section.
    overview_src = repo_root / "notes" / "overview.md"
    overview_dst = dest_root / "index.md"
    if not overview_src.is_file():
        raise SystemExit(f"Missing source overview: {overview_src}")
    copy_file(overview_src, overview_dst, tmp_root=tmp_root)

    copied = 0
    copied += copy_glob(repo_root / "notes", "maps/*.md", dest_root, tmp_root=tmp_root)
    copied += copy_glob(repo_root / "notes", "dossiers/*.md", dest_root, tmp_root=tmp_root)
    copied += copy_glob(
        repo_root / "notes" / "walkthroughs",
        "*.md",
        dest_root / "walkthroughs",
        tmp_root=tmp_root,
    )
    copied += copy_glob(repo_root / "repros", "*/README.md", dest_root / "repros", tmp_root=tmp_root)
    copied += copy_glob(repo_root / "backlog", "docs/*.md", dest_root / "backlog", tmp_root=tmp_root)

    print(f"[ok] Synced {copied + 1} markdown files into {dest_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
