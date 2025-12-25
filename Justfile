\
# OCCT Research Bootstrap - Linux Mint / apt
# Run:
#   ./bootstrap.sh
# or:
#   just bootstrap

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

ROOT := `pwd`
LOCAL := "{{ROOT}}/.local"
BIN := "{{LOCAL}}/bin"
CACHE := "{{ROOT}}/.cache"
OCCT_DIR := "{{ROOT}}/occt"
BUILD_DIR := "{{ROOT}}/build-occt"
MAPS_DIR := "{{ROOT}}/notes/maps"

default: bootstrap

# --- High level -------------------------------------------------------------

bootstrap: deps local-dirs node-tools go-tools clangd occt-clone occt-build maps backlog-init
	@echo ""
	@echo "Bootstrap complete."
	@echo "Next:"
	@echo "  source ./env.sh"
	@echo "  codex               # login once"
	@echo "  just codex-mcp      # register MCP servers"
	@echo "  backlog board view  # start task-driven workflow"
	@echo ""

# --- System deps ------------------------------------------------------------

deps:
	sudo apt update
	sudo apt install -y \
	  git curl ca-certificates xz-utils unzip \
	  python3 python3-venv python3-pip \
	  cmake ninja-build build-essential pkg-config \
	  graphviz \
	  tcl-dev tk-dev \
	  libx11-dev libxext-dev libxi-dev libxmu-dev \
	  libgl1-mesa-dev libglu1-mesa-dev \
	  libfreetype6-dev libfontconfig1-dev \
	  golang-go
	@echo "System deps installed."

local-dirs:
	mkdir -p "{{BIN}}" "{{CACHE}}" "{{MAPS_DIR}}" "{{ROOT}}/notes/dossiers" "{{ROOT}}/oracles"
	@echo "Local dirs ready: {{LOCAL}}"

# --- Node tools: Backlog.md + Codex CLI ------------------------------------

node-tools:
	./tools/install_node_tools.sh "{{LOCAL}}"

# --- Go tools: mcp-language-server -----------------------------------------

go-tools:
	./tools/install_go_tools.sh "{{LOCAL}}"

# --- clangd (local download from LLVM GitHub releases) ----------------------

clangd:
	python3 ./tools/install_clangd_local.py --prefix "{{LOCAL}}" --cache "{{CACHE}}/llvm"

# --- OCCT -------------------------------------------------------------------

occt-clone:
	./tools/clone_occt.sh "{{OCCT_DIR}}"

occt-build:
	./tools/build_occt.sh "{{OCCT_DIR}}" "{{BUILD_DIR}}"

maps:
	./tools/gen_maps.sh "{{OCCT_DIR}}" "{{BUILD_DIR}}" "{{MAPS_DIR}}"

# --- Backlog ----------------------------------------------------------------

backlog-init:
	./tools/init_backlog.sh

# --- Codex MCP wiring -------------------------------------------------------

codex-mcp:
	./tools/setup_codex_mcp.sh "{{OCCT_DIR}}" "{{BUILD_DIR}}" "{{LOCAL}}"
