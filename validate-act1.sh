#!/usr/bin/env bash
# Act 1 validation: drive a real headless Hermes build run and typecheck the
# result. Proves the guided build (skill + prompt) produces a working app.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# LLM creds (same file the adapter uses).
set -a; # shellcheck disable=SC1091
source "$ROOT/adapter.env"; set +a

if [[ "${OPENAI_API_KEY:-}" == "sk-REPLACE-ME" || -z "${OPENAI_API_KEY:-}" ]]; then
  echo "!! Set OPENAI_API_KEY in adapter.env first." >&2
  exit 1
fi

HERMES="$ROOT/hermes/.venv/bin/hermes"
MODEL="${HERMES_AGUI_MODEL:-gpt-4o}"

echo ">> Act 1 — Hermes builds the app (model: $MODEL, toolset: hermes-acp)"
echo "   working dir: $ROOT  (Hermes will create expense-tracker-live/)"
cd "$ROOT"
"$HERMES" -z "$(cat "$ROOT/BUILD-PROMPT.txt")" \
  -t hermes-acp -m "$MODEL" --provider openai < /dev/null

APP="$ROOT/expense-tracker-live"
if [[ -d "$APP" ]]; then
  echo ">> Built. Installing + typechecking $APP"
  pnpm --dir "$APP" install
  pnpm --dir "$APP" exec tsc --noEmit && echo "✅ Act 1: Hermes-built app typechecks clean."
else
  echo "!! expected $APP was not created — inspect the transcript above." >&2
  exit 1
fi
