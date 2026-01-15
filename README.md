# OCCT Research Bootstrap (Linux Mint / apt)

This repo skeleton bootstraps a repeatable OCCT reverse-engineering + documentation workflow:

- installs system deps (apt)
- installs local tools into `./.local/bin` (Codex CLI, Backlog.md, clangd, mcp-language-server)
- clones OCCT and checks out the latest stable `V7_*` tag (no beta/rc/dev)
- builds a lean OCCT config with Ninja and emits `compile_commands.json`
- generates dependency maps (CMake target graph + include graph + package scan) into `notes/maps/`
- initializes Backlog.md inside this repo
- prepares Codex prompts + agent instructions for a “tasks → dossiers → repros” loop

## Quick start

```bash
# 1) unzip, then:
cd occt-research-bootstrap

# 2) one command bootstrap (will ask for sudo for apt packages)
./bootstrap.sh

# 3) make tools available in your shell
source ./env.sh

# 4) (first time only) login to Codex interactively
codex

# 5) wire MCP servers (Backlog + clangd/LSP) into Codex config
just codex-mcp

# 6) view the task board
backlog board view
# or: backlog browser
```

## Optional: clangd index

If you want faster symbol search, build a clangd index after configuration:

```bash
just clangd-index
```

## What gets created

- `occt/` (OCCT source checkout)
- `build-occt/` (CMake build dir with `compile_commands.json`)
- `.local/` (local tool installs; add via `source env.sh`)
- `notes/maps/` (graphs + summaries)
- `notes/maps/provenance.md` (OCCT version + build/tool provenance for generated maps)
- `notes/dossiers/` (your algorithm writeups)
- `repros/` (runnable repro scripts and READMEs)

## How to use Codex productively (recommended prompt protocol)

Use Backlog.md as the source-of-truth task system, and make Codex work in a strict loop:

1. **Task selection**: tell Codex which backlog task IDs to work on.
2. **Planning**: require Codex to add an “Implementation plan” to each task file *before writing code*.
3. **Execution**: Codex edits only `notes/`, `tools/`, `backlog/`, `prompts/` (never `occt/`).
4. **Verification**: run the repro or regeneration targets (`just maps`, `just build-occt`) and paste results into the task notes / dossier.

Starter prompts are in `prompts/` (see `prompts/README.md`).

## Notes

- clangd is installed locally by downloading the latest LLVM release tarball for Linux x86_64 from GitHub Releases.
- If GitHub rate limits or the download fails, you can fall back to apt clangd:
  `sudo apt install clangd` (and then update `just codex-mcp` to point at that clangd).
