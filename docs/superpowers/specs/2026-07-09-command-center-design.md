# Command Center — Trace the Conversation (Design Spec)

- **Date:** 2026-07-09
- **Status:** Approved (design), ready for implementation plan
- **Related:** Notion plan "Command Center — Trace the Conversation"; analysis "Markus' AG-UI Work"

## 1. Problem & Goal

The Hermes AG-UI demo's wow-factor — Hermes editing its own source live from a
CopilotKit sidebar — is a black box to a viewer. Build a **standalone webpage
(the Command Center)** that:

1. **Shows service liveness** for the three moving parts — **AG-UI Server**
   (the adapter, `:8000`), **CopilotKit App** (the demo app, `:3000`), and
   **Hermes** (the agent + model, which runs *inside* the adapter, so "up"
   means the model is reachable, not just the port).
2. **Displays conversations** — this run and all future runs — as a clean,
   replayable timeline with a toggle to reveal the raw AG-UI protocol
   waterfall + per-event JSON.

**Ethos (non-negotiable):** built as thin layers on **Markus' AG-UI adapter**,
with **zero changes to Hermes core**. Everything we add lives in
`agui_adapter/` (fork) and a new standalone frontend app. This mirrors the
adapter's own "three thin layers" design and keeps it merge-clean.

## 2. Scope

**In scope (v1):**
- Deep `GET /health` on the adapter.
- A trace tee inside the adapter that captures the inbound `RunAgentInput` and
  every outbound AG-UI event to SQLite + live subscribers, without altering the
  primary CopilotKit stream.
- Adapter endpoints: `GET /runs`, `GET /runs/{id}`, `GET /trace/stream` (SSE).
- Demo app: trivial `GET /api/health`.
- Standalone `command-center/` Next.js app: status bar + conversation list +
  conversation view (clean replay with a protocol toggle).

**Out of scope (v1 — YAGNI):**
- Auth / multi-user.
- Analytics charts / metrics history beyond per-run.
- Precise client-side (App/Runtime hop) timing capture — the waterfall
  populates the AG-UI + Hermes lanes from the adapter; App/Runtime lanes are a
  later client-instrumentation add-on.
- A reverse-proxy interception layer (considered; rejected below).

## 3. Approach decision (recorded)

Two backend approaches were weighed:

- **A. Extend the adapter** (chosen) — add the trace tee + endpoints inside
  Markus' FastAPI app. One process; deep model-reachability health is trivial
  because the adapter self-reports. Still "thin layers, zero Hermes core
  changes."
- **B. Trace proxy sidecar** (rejected) — a separate service between CopilotKit
  and the adapter that tees the stream. Keeps the adapter byte-for-byte
  untouched, but cannot cheaply know whether the *model* is reachable, which
  undercuts the deep-health requirement.

Frontend location: **separate standalone app** (chosen) over embedding in the
demo app or the sidebar — it must stay up precisely when Hermes breaks the demo
app, and it monitors all three services from the outside.

## 4. Architecture overview

```
 Browser (demo app :3000)                         Command Center (:3100)
   │  CopilotSidebar                                 │ status bar · list · view
   ▼                                                 ▲   ▲          ▲
 /api/copilotkit ──RunAgentInput──▶ Adapter :8000    │   │          │
   ▲                                  │  _event_stream │   │          │
   └────────── SSE events ────────────┤  (tee)         │   │          │
                                      ├──▶ TraceSink ──┤   │          │
                                      │    ├─▶ SQLite ─┼───┘ /runs, /runs/{id}
                                      │    └─▶ live bus─┼──▶ /trace/stream (SSE)
                                      └──▶ GET /health ─┘   (polled by status bar)
```

The tee sits at `_event_stream` in `server.py`: every event object is recorded
to the `TraceSink` immediately before it is encoded + yielded to the CopilotKit
client. The sink writes to SQLite and pushes to an in-process live bus. **The
CopilotKit stream is never blocked or altered by tracing** — sink calls are
wrapped so any trace failure is logged and swallowed.

## 5. Backend (adapter — fork `hermes/agui_adapter/`)

### 5.1 New/changed files

| File | Role |
| --- | --- |
| `agui_adapter/trace_store.py` | **New.** SQLite schema + writer + query API. |
| `agui_adapter/trace_bus.py` | **New.** In-process pub/sub for live `/trace/stream` subscribers (set of `asyncio.Queue`s). |
| `agui_adapter/health.py` | **New.** Deep health checks (adapter / toolset / model reachability, with a short TTL cache on the model probe). |
| `agui_adapter/server.py` | **Changed.** Thread a `TraceSink` through `_event_stream`; replace shallow `/health`; add `/runs`, `/runs/{id}`, `/trace/stream`. |
| `agui_adapter/session.py` | **Read-only reference** for `AgentConfig` (toolsets, model, provider) used by health. No behavior change expected. |

### 5.2 SQLite store (`trace_store.py`)

- DB path from env `HERMES_AGUI_TRACE_DB` (default `./.hermes-trace/trace.db`,
  created on first use). WAL mode; one writer.
- Schema:
  ```sql
  CREATE TABLE runs (
    run_id      TEXT PRIMARY KEY,
    thread_id   TEXT,
    started_at  REAL,          -- epoch seconds (wall clock, set at RUN_STARTED)
    finished_at REAL,
    status      TEXT,          -- 'running' | 'finished' | 'error'
    model       TEXT,
    preview     TEXT,          -- first ~140 chars of the user's last message
    error       TEXT
  );
  CREATE TABLE events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT NOT NULL,
    seq         INTEGER NOT NULL,   -- monotonic per run, assigned by the sink
    ts          REAL NOT NULL,      -- monotonic clock (time.monotonic()) for ordering/latency
    wall        REAL NOT NULL,      -- epoch seconds for display
    hop         TEXT NOT NULL,      -- 'app' | 'agui' | 'hermes'  (see mapping)
    type        TEXT NOT NULL,      -- AG-UI event type or 'RUN_INPUT'
    payload     TEXT NOT NULL       -- JSON
  );
  CREATE INDEX idx_events_run ON events(run_id, seq);
  ```
- Writer API (sync, called from the run worker thread; guarded so failures
  never propagate to the run):
  - `record_run_started(run_id, thread_id, model, preview, wall)`
  - `record_event(run_id, seq, ts, wall, hop, type, payload_dict)`
  - `record_run_finished(run_id, status, wall, error=None)`
- Query API (sync, called from FastAPI endpoints):
  - `list_runs(limit=50, offset=0) -> [RunRow]` ordered `started_at DESC`.
  - `get_run(run_id) -> {run: RunRow, events: [EventRow]}` (events ordered by
    `seq`).

### 5.3 Event → hop mapping (`trace_store` constant)

| AG-UI event type | hop |
| --- | --- |
| `RUN_INPUT` (synthetic, the inbound `RunAgentInput`) | `app` |
| `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR` | `agui` |
| `TEXT_MESSAGE_START/CONTENT/END` | `hermes` |
| `REASONING_MESSAGE_START/CONTENT/END` (and reasoning variants) | `hermes` |
| `TOOL_CALL_START/ARGS/END`, `TOOL_CALL_RESULT` | `hermes` |
| `STATE_SNAPSHOT` | `hermes` |
| anything else | `hermes` (default) |

Unknown/future event types default to `hermes` so nothing is dropped. The
Runtime lane (hop `runtime`) is reserved for later client-side instrumentation.

### 5.4 Trace sink wiring (`server.py`)

- Add a `TraceSink` object created per run inside `_event_stream`, holding the
  `run_id`/`thread_id`, a `seq` counter, the store handle, and the live bus.
- At stream start: derive `preview` + `model` and call `record_run_started`,
  then `record_event(..., type="RUN_INPUT", hop="app", payload=<sanitized
  RunAgentInput>)`, and publish both to the bus.
- Wrap the two yield sites (the `RUN_STARTED` yield and the queue-drain loop) so
  each event object is passed through `sink.capture(event)` **before**
  `encoder.encode(...)`. `capture` assigns `seq`, stamps `time.monotonic()` +
  wall clock, maps hop, serializes payload via the event's `model_dump()`,
  writes to SQLite, and publishes to the bus.
- On terminal: `record_run_finished` with `finished`/`error` + publish a
  sentinel so live subscribers can close cleanly.
- **Isolation:** every `sink.*` call is wrapped in try/except that logs and
  continues. A trace bug must never turn a green run red.

### 5.5 Live bus (`trace_bus.py`)

- Module-level singleton. `subscribe() -> asyncio.Queue`, `unsubscribe(q)`,
  `publish(record: dict)`. Bounded queues (drop-oldest) so a slow browser can't
  balloon memory. Records are the same normalized shape written to SQLite plus
  a `kind` field (`"run_started" | "event" | "run_finished"`).

### 5.6 Deep health (`health.py` + `/health`)

`GET /health` returns:
```json
{
  "status": "ok",
  "adapter": {"ok": true, "version": "<adapter/hermes version>"},
  "toolset": {"loaded": ["hermes-acp"], "ok": true},
  "model": {
    "configured": true,
    "provider": "custom",
    "model": "gpt-5.4",
    "reachable": true,
    "checkedAt": 1751990400.0,
    "detail": "ok"        // or an error summary when unreachable
  }
}
```
- `adapter` / `toolset` are read from `AgentConfig` (cheap, always fresh).
- `model.reachable` is a **cheap, cached probe** (TTL ~30s, env
  `HERMES_AGUI_HEALTH_TTL`): attempt a minimal provider call (e.g. a
  short-timeout models-list or 1-token completion) using the same config the
  runs use. On failure, `reachable=false` + `detail` carries a short reason
  (auth, connection, timeout). The probe must have its own timeout (~3s) so
  `/health` stays fast. Never raises — degrades to `reachable=false`.
- HTTP status is always 200 (the body carries the truth); the UI colors pills
  from the JSON, not the status code.

### 5.7 New read endpoints

- `GET /runs?limit=&offset=` → `{runs: [...], total}`.
- `GET /runs/{run_id}` → `{run, events}` (full replay payload).
- `GET /trace/stream?runId=` (SSE) → subscribes to the live bus; if `runId`
  given, filters to that run; emits normalized records as SSE `data:` frames.
  Uses the same `EventEncoder`/SSE conventions as the main endpoint. Closes on
  client disconnect (unsubscribe in a `finally`).
- **CORS:** the Command Center runs on a different origin (`:3100`), so add
  `fastapi.middleware.cors.CORSMiddleware` allowing the Command Center origin
  (env `HERMES_AGUI_CC_ORIGIN`, default `http://localhost:3100`) for the read
  endpoints. The main `POST /` is same-origin via the Next.js proxy and
  unaffected.

## 6. Demo app health (`expense-tracker-live/`)

Add `app/api/health/route.ts` → `GET` returns
`{ ok: true, app: "expense-tracker-live", ts }`. This is what the Command
Center polls to light the "CopilotKit App" pill. No other demo-app changes.

## 7. Frontend (`command-center/` — new standalone Next.js app)

Same proven toolchain family as the demo app (Next 15.5.x App Router +
Turbopack, Tailwind v4, TypeScript). **No CopilotKit dependency** — this app
only *reads* trace data over HTTP/SSE.

### 7.1 Config

- Runs on port **3100** (`.claude/launch.json` entry `command-center`).
- Env `NEXT_PUBLIC_ADAPTER_URL` (default `http://localhost:8000`) and
  `NEXT_PUBLIC_DEMO_APP_URL` (default `http://localhost:3000`).

### 7.2 Files

| File | Role |
| --- | --- |
| `app/layout.tsx`, `app/globals.css` | Shell + theme (dark, "mission control" aesthetic). |
| `app/page.tsx` | The Command Center page (status bar + split: list ‖ view). |
| `lib/api.ts` | Typed fetchers: `getHealth()`, `getDemoHealth()`, `listRuns()`, `getRun(id)`; `openTraceStream(onRecord)` (EventSource). |
| `lib/types.ts` | `HealthReport`, `RunRow`, `TraceEvent`, `Hop`, mapping shared with backend shapes. |
| `lib/reconstruct.ts` | Fold an ordered `TraceEvent[]` into a readable conversation model (messages, reasoning blocks, tool cards with args/results, state snapshots). |
| `components/StatusBar.tsx` | Three `ServicePill`s; polls `/health` + demo `/api/health` every ~4s. |
| `components/ServicePill.tsx` | Green/amber/red pill + tooltip with detail (e.g. model unreachable reason). |
| `components/ConversationList.tsx` | Left column; rows from `listRuns()`; live run pinned/animated at top. |
| `components/ConversationView.tsx` | Main column; header + `ReplayView` / `ProtocolView` toggle. |
| `components/ReplayView.tsx` | Clean human-readable timeline from `reconstruct.ts`. |
| `components/ProtocolView.tsx` | AG-UI event waterfall (lanes: App · AG-UI · Hermes) + `EventInspector`. |
| `components/EventInspector.tsx` | Selected event → pretty JSON + hop/type/timing. |
| `components/ToolCard.tsx` | Reused pattern from the demo app's `ToolCallCard` (icon per tool, arg summary, result). |

### 7.3 Behavior

- **On load:** `listRuns()` fills the list; `getHealth()`/`getDemoHealth()`
  fill the status bar; `openTraceStream()` starts listening for live records.
- **Selecting a past run:** `getRun(id)` → reconstruct → render replay;
  protocol toggle swaps to the waterfall over the same events.
- **Live run:** a `run_started` record pins a new row at the top and auto-opens
  it; `event` records append to both the replay and the waterfall in real time;
  `run_finished` flips its status pill.
- **Adapter down:** status pill red; list falls back to the last successful
  `listRuns()` (cached in state); stream shows "reconnecting…" and retries with
  backoff.

## 8. Data flow (end to end)

1. User sends a message in the demo app sidebar → CopilotKit → adapter `POST /`.
2. `_event_stream` starts: sink records `RUN_INPUT` + `run_started` (SQLite +
   bus); `RUN_STARTED` captured, then every live event captured as it streams
   to CopilotKit.
3. Command Center: status bar polling shows all-green; the live run pops into
   the list and streams into the open view (replay + optional waterfall).
4. Run ends → `run_finished` → SQLite row closed, list row updated, replay
   final; the run is now permanently replayable via `/runs/{id}`.

## 9. Error handling

- **Trace tee failure** → logged + swallowed; run continues, CopilotKit stream
  intact (the core invariant).
- **Model unreachable** → `/health` `model.reachable=false` + reason; Hermes
  pill red with tooltip; runs that then fail are stored with `status="error"`
  and the error text.
- **SQLite write failure** → logged; live bus still delivers (degrade to
  live-only, no history for that run).
- **Command Center ↔ adapter network loss** → pills red, cached list retained,
  SSE auto-reconnect with backoff.

## 10. Testing

- **Backend unit:** `trace_store` round-trip (write run + events, read back
  ordered); event→hop mapping table; `health` probe returns `reachable=false`
  cleanly on a forced provider error; sink isolation (a raising store does not
  propagate out of `capture`).
- **Backend integration:** launch the adapter (test config), drive a real run
  via `drive-hermes.py`, then assert: `GET /runs` lists it, `GET /runs/{id}`
  returns ordered events incl. `RUN_INPUT` + `RUN_FINISHED`, `/trace/stream`
  delivered live frames during the run, `/health` shape is correct. Reuse the
  existing `adapter.env` / `run-adapter.sh` harness.
- **Frontend:** `tsc --noEmit` clean; `reconstruct.ts` unit-folded against a
  captured fixture `events[]`; preview verify (pills reflect a killed vs live
  adapter; list renders; replay + protocol toggle work) via the Preview tools.

## 11. Milestones (for the implementation plan)

1. **Backend M1** — `trace_store.py` + `trace_bus.py` + sink wiring in
   `_event_stream`; verify SQLite rows via `drive-hermes.py`.
2. **Backend M2** — deep `/health` (`health.py`) + `/runs`, `/runs/{id}`,
   `/trace/stream` + CORS.
3. **Demo app** — `/api/health` route.
4. **Frontend M3** — app scaffold, `lib/` (types, api, reconstruct),
   `StatusBar` + pills against live `/health`.
5. **Frontend M4** — `ConversationList` + `ConversationView` +
   `ReplayView` (clean replay of history & live).
6. **Frontend M5** — `ProtocolView` waterfall + `EventInspector` + toggle.
7. **Integration** — end-to-end via a real run; `.claude/launch.json` entry;
   README run steps.

## 12. Open questions (non-blocking; sane defaults chosen)

- **Reasoning tokens in the trace:** captured and stored (hop `hermes`); the
  ProtocolView shows them, ReplayView collapses them behind a "show reasoning"
  affordance. Revisit before any public recording.
- **Model reachability probe cost:** default to a cached models-list/1-token
  probe with a 30s TTL; if the provider makes even that costly, fall back to
  "configured + last-run-succeeded" inference.
