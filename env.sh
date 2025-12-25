# Source this in your shell to use local tools
#   source ./env.sh
export OCCT_RESEARCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$OCCT_RESEARCH_ROOT/.local/bin:$PATH"
