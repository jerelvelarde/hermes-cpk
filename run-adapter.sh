#!/usr/bin/env bash
# Launch the Hermes AG-UI adapter for the self-modifying demo.
#
# The adapter is started FROM the expense-tracker directory on purpose: the
# Hermes agent inherits this process's working directory, so its file tools
# (read_file/write_file/patch under the `hermes-acp` toolset) edit THIS app.
# That is what makes the app self-modifying — you chat in the sidebar and
# Hermes rewrites the source you're looking at.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Workspace the adapter's agent operates in (its file tools edit here).
# Defaults to the reference app; pass a dir to point it elsewhere (e.g. Act 1
# builds into a fresh empty dir): ./run-adapter.sh expense-tracker-live
APP_DIR="${1:-$ROOT/expense-tracker}"
case "$APP_DIR" in /*) : ;; *) APP_DIR="$ROOT/$APP_DIR" ;; esac
mkdir -p "$APP_DIR"
PY="$ROOT/hermes/.venv/bin/python"

# --- LLM config -------------------------------------------------------------
# Load secrets from adapter.env (gitignored). See adapter.env.example.
if [[ -f "$ROOT/adapter.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/adapter.env"
  set +a
fi

export PORT="${PORT:-8000}"
export HERMES_AGUI_HOST="${HERMES_AGUI_HOST:-127.0.0.1}"
# Coding toolset: files + terminal + search — powers self-modification.
export HERMES_AGUI_TOOLSETS="${HERMES_AGUI_TOOLSETS:-hermes-acp}"
# Don't stall live edits on interactive approval prompts.
export HERMES_YOLO="${HERMES_YOLO:-1}"

if [[ -z "${OPENAI_API_KEY:-${HERMES_AGUI_API_KEY:-}}" ]]; then
  echo "!! No LLM key set. Copy adapter.env.example -> adapter.env and fill it in." >&2
  exit 1
fi

echo ">> Hermes AG-UI adapter"
echo "   workspace : $APP_DIR   (Hermes edits files here)"
echo "   model     : ${HERMES_AGUI_MODEL:-<hermes config default>}"
echo "   listening : http://$HERMES_AGUI_HOST:$PORT/"
cd "$APP_DIR"
exec "$PY" -m agui_adapter
