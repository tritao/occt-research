#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def fail(msg: str) -> None:
    print(f"[FAIL] {msg}")


def ok(msg: str) -> None:
    print(f"[OK] {msg}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: .)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    wt_dir = root / "notes" / "walkthroughs"
    if not wt_dir.is_dir():
        fail(f"missing walkthroughs dir: {wt_dir}")
        return 1

    walkthroughs = sorted(p for p in wt_dir.glob("*.md") if p.is_file())
    mains = [p for p in walkthroughs if not p.name.endswith("-cases.md")]
    cases = [p for p in walkthroughs if p.name.endswith("-cases.md")]

    errors: list[str] = []

    # 1) Every main walkthrough should have a matching casebook.
    for p in mains:
        expected = p.with_name(p.stem + "-cases.md")
        if not expected.is_file():
            errors.append(f"{p.relative_to(root)}: missing casebook {expected.relative_to(root)}")

    # 2) Main walkthroughs must not contain a "Run the repro" section.
    for p in mains:
        text = p.read_text(encoding="utf-8", errors="replace")
        if "## Run the repro" in text:
            errors.append(f"{p.relative_to(root)}: contains forbidden heading '## Run the repro'")

    # 3) Casebooks must contain run.sh + golden json pointer.
    for p in cases:
        text = p.read_text(encoding="utf-8", errors="replace")
        if "bash repros/" not in text:
            errors.append(f"{p.relative_to(root)}: missing 'bash repros/.../run.sh' command")
        if "repros/" not in text or "/golden/" not in text or ".json" not in text:
            errors.append(f"{p.relative_to(root)}: missing oracle JSON path under repros/.../golden/...json")

    if errors:
        for e in errors:
            fail(e)
        fail(f"{len(errors)} issues found.")
        return 1

    ok(f"{len(mains)} walkthroughs and {len(cases)} casebooks look consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

