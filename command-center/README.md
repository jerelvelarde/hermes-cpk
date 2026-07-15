# Hermes Command Center

A standalone observability webpage for the Hermes AG-UI demo. It shows:

- **Service liveness** for the three moving parts — **AG-UI Server** (the
  adapter), **CopilotKit App** (the demo app), and **Hermes** (the agent +
  model; "up" means the model is actually reachable, not just the port).
- **Conversations** — this run and every past run — in three views:
  - **Replay** — a clean chat timeline (messages, reasoning, tool/file-edit cards).
  - **Flow** — a 4-node graph (App ⇄ CopilotKit Runtime ⇄ AG-UI ⇄ Hermes) that
    animates each event as a pulse travelling the pipeline — indigo requests in,
    gold tokens streaming back. Plays live, or scrub/replay a past run.
  - **Protocol** — the raw AG-UI event waterfall (spine + phases) with a
    per-event JSON inspector.

It is built entirely as thin layers on Markus' AG-UI adapter — **zero Hermes
core changes**. The adapter tees every run's events to SQLite + a live SSE
stream; this app only *reads* over HTTP/SSE.

## Architecture

```
Demo app (:3000) ──RunAgentInput──▶ Adapter (:8000) ──▶ gpt-5.4 + hermes-acp
   ▲  CopilotSidebar                   │ _event_stream (tee)
   └────────── SSE events ─────────────┤
                                       ├──▶ SQLite (.hermes-trace/trace.db)
                                       └──▶ live bus ──▶ /trace/stream (SSE)
                                       │
Command Center (:3100) reads:  /health · /runs · /runs/{id} · /trace/stream
```

Adapter endpoints (added in `hermes/agui_adapter/`):
- `GET /health` — deep: adapter up · toolset loaded · **model reachable** (cached probe).
- `GET /runs` — list past conversations.
- `GET /runs/{id}` — full ordered event list for replay.
- `GET /trace/stream` — live SSE of `run_started` / `event` / `run_finished`.

## Run recipe (3 processes)

From the repo root (`hermes-cpk/`):

```bash
# 1. AG-UI adapter — started FROM the demo app dir so Hermes' file tools edit it.
#    Loads adapter.env (OPENAI_API_KEY, HERMES_AGUI_MODEL=gpt-5.4, toolset=hermes-acp).
export HERMES_AGUI_TRACE_DB="$PWD/.hermes-trace/trace.db"
./run-adapter.sh expense-tracker-live

# 2. Demo app (CopilotKit sidebar + self-modifying source)
pnpm --dir expense-tracker-live dev        # http://localhost:3000

# 3. Command Center
pnpm --dir command-center dev              # http://localhost:3100
```

Then chat in the demo sidebar (or `python drive-hermes.py "…"`) and watch the
run appear live in the Command Center.

## Environment variables

| Var | Where | Default | Purpose |
| --- | --- | --- | --- |
| `HERMES_AGUI_TRACE_DB` | adapter | `./.hermes-trace/trace.db` | SQLite trace file (set to an absolute path so it lives outside the self-modified app dir). |
| `HERMES_AGUI_CC_ORIGIN` | adapter | `http://localhost:3100` | CORS origin allowed to read the trace endpoints. |
| `HERMES_AGUI_HEALTH_TTL` | adapter | `30` | Seconds to cache the model-reachability probe. |
| `CC_ORIGIN` | demo app | `*` | CORS origin for the demo app's `/api/health`. |
| `NEXT_PUBLIC_ADAPTER_URL` | command-center | `http://localhost:8000` | Adapter base URL. |
| `NEXT_PUBLIC_DEMO_APP_URL` | command-center | `http://localhost:3000` | Demo app base URL (for the CopilotKit App pill). |

## Notes

- The top level of `hermes-cpk/` is **not** a git repo, so the demo-app and
  command-center changes are unversioned here. The adapter changes are
  committed in the `hermes/` fork repo.
- Verify live edits with `pnpm --dir command-center typecheck` (`tsc --noEmit`);
  do **not** run `pnpm build` while `next dev` is running (corrupts `.next`).
- Design + plan: `docs/superpowers/specs/2026-07-09-command-center-design.md`
  and `docs/superpowers/plans/2026-07-09-command-center.md`.
