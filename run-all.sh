#!/usr/bin/env bash
# Run the whole demo: Hermes AG-UI adapter (:8000) + Next.js app (:3000).
# Ctrl-C stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$ROOT/run-adapter.sh" &
ADAPTER_PID=$!
trap 'kill "$ADAPTER_PID" 2>/dev/null || true' EXIT INT TERM

# Give the adapter a moment to bind :8000 before the app health-probes it.
sleep 2
pnpm --dir "$ROOT/expense-tracker" dev
