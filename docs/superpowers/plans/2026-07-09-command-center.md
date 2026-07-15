# Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Command Center webpage that shows liveness of the AG-UI Server, CopilotKit App, and Hermes, and displays this + all future demo conversations as a replayable timeline with a raw AG-UI protocol view.

**Architecture:** Thin layers on Markus' AG-UI adapter (zero Hermes core changes). The adapter gains a trace tee (SQLite + live SSE bus), a deep `/health`, and read endpoints. A separate Next.js app on `:3100` reads those over HTTP/SSE. Full design + endpoint/schema contracts live in [`docs/superpowers/specs/2026-07-09-command-center-design.md`](../specs/2026-07-09-command-center-design.md) — **read it before executing any task**.

**Tech Stack:** Python 3.11 / FastAPI / sqlite3 (adapter); Next.js 15.5 App Router + Turbopack + Tailwind v4 + TypeScript (frontend); pytest + `drive-hermes.py` (tests).

---

## Ground rules

- The adapter fork lives at `hermes/` (its own git repo). Backend commits go there: `git -C hermes add … && git -C hermes commit …`.
- Backend venv: `hermes/.venv`. Run python/pytest as `hermes/.venv/bin/python -m pytest …`.
- **Core invariant:** a trace failure must NEVER break the CopilotKit run. Every `sink.*` call is wrapped in try/except that logs and continues. There is a dedicated test for this.
- Frontend lives at top level `command-center/` (NOT inside the fork, NOT inside a demo app).
- Verify live TS edits with `tsc --noEmit`, never `pnpm build` while `next dev` runs (corrupts `.next`).

## File structure (locked)

**Adapter (`hermes/agui_adapter/`):**
- `trace_store.py` — NEW — SQLite schema, writer, query API, event→hop map.
- `trace_bus.py` — NEW — in-process async pub/sub for live subscribers.
- `health.py` — NEW — deep health checks (adapter/toolset/model probe, TTL cached).
- `server.py` — MODIFY — sink wiring in `_event_stream`; replace `/health`; add `/runs`, `/runs/{id}`, `/trace/stream`; CORS.
- `tests/` — NEW — `test_trace_store.py`, `test_health.py`, `test_sink_isolation.py`, `test_endpoints_integration.py`.

**Demo app (`expense-tracker-live/`):**
- `app/api/health/route.ts` — NEW.

**Frontend (`command-center/`):**
- config: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`.
- `lib/types.ts`, `lib/api.ts`, `lib/reconstruct.ts` (+ `lib/reconstruct.test.ts`).
- `components/`: `StatusBar.tsx`, `ServicePill.tsx`, `ConversationList.tsx`, `ConversationView.tsx`, `ReplayView.tsx`, `ProtocolView.tsx`, `EventInspector.tsx`, `ToolCard.tsx`.

---

# TRACK A — Adapter backend

### Task A1: SQLite trace store

**Files:**
- Create: `hermes/agui_adapter/trace_store.py`
- Test: `hermes/agui_adapter/tests/test_trace_store.py`

- [ ] **Step 1: Write the failing test**

```python
# hermes/agui_adapter/tests/test_trace_store.py
import time
from agui_adapter.trace_store import TraceStore, hop_for

def test_round_trip(tmp_path):
    store = TraceStore(str(tmp_path / "t.db"))
    store.record_run_started("r1", "th1", "gpt-5.4", "hello world", time.time())
    store.record_event("r1", 0, 0.0, time.time(), "app", "RUN_INPUT", {"messages": []})
    store.record_event("r1", 1, 0.1, time.time(), "hermes", "TEXT_MESSAGE_CONTENT", {"delta": "hi"})
    store.record_run_finished("r1", "finished", time.time())

    runs = store.list_runs()
    assert len(runs) == 1 and runs[0]["run_id"] == "r1" and runs[0]["status"] == "finished"
    full = store.get_run("r1")
    assert [e["seq"] for e in full["events"]] == [0, 1]
    assert full["events"][0]["hop"] == "app"

def test_hop_mapping():
    assert hop_for("RUN_INPUT") == "app"
    assert hop_for("RUN_STARTED") == "agui"
    assert hop_for("TOOL_CALL_START") == "hermes"
    assert hop_for("SOMETHING_NEW") == "hermes"  # default
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/test_trace_store.py -v`
Expected: FAIL — `ModuleNotFoundError: agui_adapter.trace_store`.

- [ ] **Step 3: Implement `trace_store.py`**

```python
"""SQLite-backed trace store for the Command Center. Append-only per run."""
from __future__ import annotations
import json, os, sqlite3, threading
from typing import Any, Dict, List, Optional

_AGUI_LIFECYCLE = {"RUN_STARTED", "RUN_FINISHED", "RUN_ERROR"}

def hop_for(event_type: str) -> str:
    if event_type == "RUN_INPUT":
        return "app"
    if event_type in _AGUI_LIFECYCLE:
        return "agui"
    return "hermes"  # text/reasoning/tool/state + unknown default

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY, thread_id TEXT, started_at REAL, finished_at REAL,
  status TEXT, model TEXT, preview TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, seq INTEGER NOT NULL,
  ts REAL NOT NULL, wall REAL NOT NULL, hop TEXT NOT NULL, type TEXT NOT NULL,
  payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, seq);
"""

class TraceStore:
    def __init__(self, path: Optional[str] = None):
        self.path = path or os.environ.get("HERMES_AGUI_TRACE_DB", "./.hermes-trace/trace.db")
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def record_run_started(self, run_id, thread_id, model, preview, wall):
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO runs(run_id,thread_id,started_at,status,model,preview) "
                "VALUES(?,?,?,?,?,?)", (run_id, thread_id, wall, "running", model, preview))
            self._conn.commit()

    def record_event(self, run_id, seq, ts, wall, hop, type, payload: Dict[str, Any]):
        with self._lock:
            self._conn.execute(
                "INSERT INTO events(run_id,seq,ts,wall,hop,type,payload) VALUES(?,?,?,?,?,?,?)",
                (run_id, seq, ts, wall, hop, type, json.dumps(payload, default=str)))
            self._conn.commit()

    def record_run_finished(self, run_id, status, wall, error=None):
        with self._lock:
            self._conn.execute(
                "UPDATE runs SET status=?, finished_at=?, error=? WHERE run_id=?",
                (status, wall, error, run_id))
            self._conn.commit()

    def list_runs(self, limit=50, offset=0) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM runs ORDER BY started_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        return [dict(r) for r in rows]

    def get_run(self, run_id) -> Dict[str, Any]:
        with self._lock:
            run = self._conn.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone()
            evs = self._conn.execute(
                "SELECT * FROM events WHERE run_id=? ORDER BY seq", (run_id,)).fetchall()
        return {"run": dict(run) if run else None,
                "events": [{**dict(e), "payload": json.loads(e["payload"])} for e in evs]}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/test_trace_store.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git -C hermes add agui_adapter/trace_store.py agui_adapter/tests/test_trace_store.py
git -C hermes commit -m "feat(agui): SQLite trace store for Command Center"
```

---

### Task A2: Live trace bus

**Files:**
- Create: `hermes/agui_adapter/trace_bus.py`
- Test: covered by A4 integration (a pure asyncio queue class; unit test optional).

- [ ] **Step 1: Implement `trace_bus.py`**

```python
"""In-process async pub/sub for live /trace/stream subscribers."""
from __future__ import annotations
import asyncio
from typing import Dict, Set

class TraceBus:
    def __init__(self, maxsize: int = 1000):
        self._subs: Set[asyncio.Queue] = set()
        self._maxsize = maxsize
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._maxsize)
        self._subs.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subs.discard(q)

    def publish(self, record: Dict) -> None:
        """Thread-safe: called from the run worker thread."""
        loop = self._loop
        if loop is None:
            return
        for q in list(self._subs):
            def _put(q=q):
                if q.full():
                    try: q.get_nowait()
                    except asyncio.QueueEmpty: pass
                q.put_nowait(record)
            loop.call_soon_threadsafe(_put)

BUS = TraceBus()  # module-level singleton
```

- [ ] **Step 2: Commit**

```bash
git -C hermes add agui_adapter/trace_bus.py
git -C hermes commit -m "feat(agui): live trace bus"
```

---

### Task A3: Sink wiring + isolation in `_event_stream`

**Files:**
- Modify: `hermes/agui_adapter/server.py` (the `_event_stream` function + imports)
- Test: `hermes/agui_adapter/tests/test_sink_isolation.py`

Read `server.py:203-315` first. The tee is a `_TraceSink` created per run inside `_event_stream`; capture each event object right before `encoder.encode(...)`.

- [ ] **Step 1: Write the failing isolation test**

```python
# hermes/agui_adapter/tests/test_sink_isolation.py
from agui_adapter.server import _TraceSink

class BoomStore:
    def record_run_started(self, *a, **k): raise RuntimeError("boom")
    def record_event(self, *a, **k): raise RuntimeError("boom")
    def record_run_finished(self, *a, **k): raise RuntimeError("boom")

class Evt:
    def model_dump(self): return {"ok": True}

def test_sink_swallows_store_errors():
    sink = _TraceSink("r1", "th1", "gpt-5.4", "hi", store=BoomStore(), bus=None)
    # None of these may raise, even though the store raises on every call.
    sink.start()
    sink.capture(Evt(), "TEXT_MESSAGE_CONTENT")
    sink.finish("finished")
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/test_sink_isolation.py -v`
Expected: FAIL — `ImportError: cannot import name '_TraceSink'`.

- [ ] **Step 3: Add `_TraceSink` + wiring to `server.py`**

Add imports near the top:
```python
import time
from agui_adapter.trace_store import TraceStore, hop_for
from agui_adapter.trace_bus import BUS
```

Add a module-level store (lazy singleton) and the sink class before `_event_stream`:
```python
_STORE: Optional[TraceStore] = None
def _get_store() -> TraceStore:
    global _STORE
    if _STORE is None:
        _STORE = TraceStore()
    return _STORE

def _preview_of(messages) -> str:
    for m in reversed(messages or []):
        if getattr(m, "role", None) == "user":
            c = getattr(m, "content", "") or ""
            return (c if isinstance(c, str) else str(c))[:140]
    return ""

class _TraceSink:
    """Tees run events to SQLite + the live bus. Never raises to the caller."""
    def __init__(self, run_id, thread_id, model, preview, store, bus):
        self.run_id, self.thread_id, self.model, self.preview = run_id, thread_id, model, preview
        self.store, self.bus = store, bus
        self.seq = 0

    def _safe(self, fn):
        try: fn()
        except Exception:  # noqa: BLE001 - tracing must never break a run
            logger.exception("trace sink error (ignored)")

    def _publish(self, kind, **rec):
        if self.bus is None: return
        self._safe(lambda: self.bus.publish({"kind": kind, "run_id": self.run_id, **rec}))

    def start(self, run_input=None):
        wall = time.time()
        self._safe(lambda: self.store.record_run_started(
            self.run_id, self.thread_id, self.model, self.preview, wall))
        self._publish("run_started", thread_id=self.thread_id, model=self.model,
                      preview=self.preview, wall=wall)
        if run_input is not None:
            payload = run_input.model_dump() if hasattr(run_input, "model_dump") else {}
            self.capture_raw("RUN_INPUT", payload)

    def capture(self, event, type_name=None):
        t = type_name or getattr(event, "type", None) or event.__class__.__name__
        payload = event.model_dump() if hasattr(event, "model_dump") else {}
        self.capture_raw(str(t), payload)

    def capture_raw(self, type_name, payload):
        seq, ts, wall = self.seq, time.monotonic(), time.time()
        self.seq += 1
        hop = hop_for(type_name)
        self._safe(lambda: self.store.record_event(
            self.run_id, seq, ts, wall, hop, type_name, payload))
        self._publish("event", seq=seq, ts=ts, wall=wall, hop=hop, type=type_name, payload=payload)

    def finish(self, status, error=None):
        self._safe(lambda: self.store.record_run_finished(self.run_id, status, time.time(), error))
        self._publish("run_finished", status=status, error=error)
```

In `_event_stream`, bind the bus loop + create the sink at the top:
```python
    loop = asyncio.get_running_loop()
    BUS.bind_loop(loop)
    queue: asyncio.Queue = asyncio.Queue()
    model = getattr(config, "model", None) or ""
    sink = _TraceSink(run_input.run_id, run_input.thread_id, model,
                      _preview_of(run_input.messages), store=_get_store(), bus=BUS)
    sink.start(run_input)
```

Capture at BOTH yield sites. Replace the initial `RUN_STARTED` yield:
```python
    _started = RunStartedEvent(thread_id=run_input.thread_id, run_id=run_input.run_id)
    sink.capture(_started, "RUN_STARTED")
    yield encoder.encode(_started)
```
Replace the drain loop body:
```python
    while True:
        item = await queue.get()
        if item is _DONE:
            break
        sink.capture(item)
        yield encoder.encode(item)
```
Replace the terminal block:
```python
    if "error" in holder:
        _err = RunErrorEvent(message=str(holder["error"]))
        sink.capture(_err, "RUN_ERROR")
        sink.finish("error", error=str(holder["error"]))
        yield encoder.encode(_err)
        return
    _fin = RunFinishedEvent(thread_id=run_input.thread_id, run_id=run_input.run_id)
    sink.capture(_fin, "RUN_FINISHED")
    sink.finish("finished")
    yield encoder.encode(_fin)
```

- [ ] **Step 4: Run isolation test + full adapter suite**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/ -v`
Expected: PASS (isolation + store tests). No import errors.

- [ ] **Step 5: Commit**

```bash
git -C hermes add agui_adapter/server.py agui_adapter/tests/test_sink_isolation.py
git -C hermes commit -m "feat(agui): tee run events to trace store + bus (isolated)"
```

---

### Task A4: Deep health + read endpoints + CORS

**Files:**
- Create: `hermes/agui_adapter/health.py`
- Modify: `hermes/agui_adapter/server.py` (`create_app`)
- Test: `hermes/agui_adapter/tests/test_health.py`, `hermes/agui_adapter/tests/test_endpoints_integration.py`

- [ ] **Step 1: Write failing health test**

```python
# hermes/agui_adapter/tests/test_health.py
from agui_adapter import health

def test_probe_handles_failure(monkeypatch):
    monkeypatch.setattr(health, "_http_get", lambda url, headers, timeout: (_ for _ in ()).throw(OSError("no net")))
    r = health.model_reachable.__wrapped__() if hasattr(health.model_reachable, "__wrapped__") else health.model_reachable()
    assert r["reachable"] is False and r["detail"]

def test_report_shape(monkeypatch):
    monkeypatch.setattr(health, "model_reachable", lambda: {"reachable": True, "detail": "ok",
        "configured": True, "provider": "custom", "model": "gpt-5.4", "checkedAt": 1.0})
    rep = health.report(toolsets=["hermes-acp"], version="0.17.0")
    assert rep["status"] == "ok"
    assert rep["toolset"]["loaded"] == ["hermes-acp"]
    assert rep["model"]["reachable"] is True
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/test_health.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `health.py`**

```python
"""Deep health for the Command Center. Cheap, cached model reachability."""
from __future__ import annotations
import os, time, urllib.request
from typing import Dict, List, Optional

_cache: Dict[str, object] = {"at": 0.0, "val": None}

def _http_get(url: str, headers: Dict[str, str], timeout: float):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status

def _probe() -> Dict:
    base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    key = os.environ.get("OPENAI_API_KEY", "")
    model = os.environ.get("HERMES_AGUI_MODEL", "")
    provider = "custom"
    if not key:
        return {"reachable": False, "detail": "no api key", "configured": False,
                "provider": provider, "model": model, "checkedAt": time.time()}
    try:
        status = _http_get(f"{base}/models", {"Authorization": f"Bearer {key}"}, 3.0)
        ok = 200 <= status < 300
        return {"reachable": ok, "detail": "ok" if ok else f"http {status}",
                "configured": True, "provider": provider, "model": model, "checkedAt": time.time()}
    except Exception as e:  # noqa: BLE001
        return {"reachable": False, "detail": f"{type(e).__name__}: {e}", "configured": True,
                "provider": provider, "model": model, "checkedAt": time.time()}

def model_reachable() -> Dict:
    ttl = float(os.environ.get("HERMES_AGUI_HEALTH_TTL", "30"))
    now = time.time()
    if _cache["val"] is None or now - float(_cache["at"]) > ttl:
        _cache["val"] = _probe(); _cache["at"] = now
    return _cache["val"]  # type: ignore

def report(toolsets: Optional[List[str]] = None, version: str = "") -> Dict:
    m = model_reachable()
    return {
        "status": "ok",
        "adapter": {"ok": True, "version": version},
        "toolset": {"loaded": toolsets or [], "ok": bool(toolsets)},
        "model": m,
    }
```

- [ ] **Step 4: Run health test to verify pass**

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 5: Wire endpoints in `create_app` (`server.py`)**

Add imports: `from fastapi import Query`; `from fastapi.middleware.cors import CORSMiddleware`; `from fastapi.responses import StreamingResponse, JSONResponse`; `from agui_adapter import health`; `from agui_adapter.trace_bus import BUS`. Replace the shallow `/health` and add routes:

```python
    origin = os.environ.get("HERMES_AGUI_CC_ORIGIN", "http://localhost:3100")
    app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_methods=["GET"], allow_headers=["*"])

    @app.get("/health")
    async def health_endpoint() -> dict:
        toolsets = list(getattr(config, "toolsets", []) or [])
        return health.report(toolsets=toolsets, version=getattr(config, "version", ""))

    @app.get("/runs")
    async def runs(limit: int = Query(50), offset: int = Query(0)) -> dict:
        store = _get_store()
        rows = store.list_runs(limit=limit, offset=offset)
        return {"runs": rows, "total": len(rows)}

    @app.get("/runs/{run_id}")
    async def run_detail(run_id: str):
        return JSONResponse(_get_store().get_run(run_id))

    @app.get("/trace/stream")
    async def trace_stream(request: Request, runId: Optional[str] = Query(None)):
        BUS.bind_loop(asyncio.get_running_loop())
        q = BUS.subscribe()
        async def gen():
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    rec = await q.get()
                    if runId and rec.get("run_id") != runId:
                        continue
                    yield f"data: {json.dumps(rec, default=str)}\n\n"
            finally:
                BUS.unsubscribe(q)
        return StreamingResponse(gen(), media_type="text/event-stream")
```
Add `import os` if not present.

- [ ] **Step 6: Integration test (drives a fake run through the store)**

```python
# hermes/agui_adapter/tests/test_endpoints_integration.py
from fastapi.testclient import TestClient
from agui_adapter.server import create_app, _get_store

def test_runs_endpoints(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_AGUI_TRACE_DB", str(tmp_path / "t.db"))
    import agui_adapter.server as srv
    srv._STORE = None  # reset singleton to pick up tmp db
    store = _get_store()
    import time
    store.record_run_started("r1", "th1", "gpt-5.4", "hi", time.time())
    store.record_event("r1", 0, 0.0, time.time(), "app", "RUN_INPUT", {"x": 1})
    store.record_run_finished("r1", "finished", time.time())

    monkeypatch.setattr("agui_adapter.health.model_reachable",
        lambda: {"reachable": True, "detail": "ok", "configured": True,
                 "provider": "custom", "model": "gpt-5.4", "checkedAt": 1.0})
    client = TestClient(create_app())
    assert client.get("/health").json()["model"]["reachable"] is True
    assert client.get("/runs").json()["runs"][0]["run_id"] == "r1"
    assert client.get("/runs/r1").json()["events"][0]["type"] == "RUN_INPUT"
```

Run: `cd hermes && .venv/bin/python -m pytest agui_adapter/tests/ -v`
Expected: PASS (all).

- [ ] **Step 7: Commit**

```bash
git -C hermes add agui_adapter/health.py agui_adapter/server.py agui_adapter/tests/
git -C hermes commit -m "feat(agui): deep /health + /runs + /trace/stream + CORS"
```

---

# TRACK B — Demo app health (tiny, independent)

### Task B1: `/api/health` in the demo app

**Files:**
- Create: `expense-tracker-live/app/api/health/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ok: true, app: "expense-tracker-live", ts: Date.now() });
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --dir expense-tracker-live exec tsc --noEmit`
Expected: no errors. (If dev server is running, `curl -s localhost:3000/api/health` → `{"ok":true,...}`.)

- [ ] **Step 3: Commit** (top level is not a git repo — skip; note in the run README instead.)

---

# TRACK C — Command Center frontend

> Contract: the adapter shapes are fixed in the spec §5.6, §5.7. Frontend types mirror them. This track can build in parallel with Track A using the documented shapes; `reconstruct.ts` is unit-tested against a fixture, so it needs no live adapter.

### Task C1: Scaffold + config

**Files:** `command-center/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `.claude/launch.json` (append entry).

- [ ] **Step 1: `package.json`**

```json
{
  "name": "command-center",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3100",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.5.4",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "vitest": "^2"
  }
}
```

- [ ] **Step 2: `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`** — mirror `expense-tracker-live` (read those files; use identical compiler options and the `@tailwindcss/postcss` plugin). Add `"@/*": ["./*"]` path alias.

- [ ] **Step 3: `app/globals.css`** — Tailwind v4 import + a dark "mission control" theme (CSS vars: `--bg`, `--panel`, `--text`, `--muted`, `--ok`, `--warn`, `--err`, `--accent`). Keep it minimal.

- [ ] **Step 4: `app/layout.tsx`** — root layout importing globals, `<html lang="en">`, dark background.

- [ ] **Step 5: Append launch.json entry**

Add to `.claude/launch.json` configurations:
```json
{ "name": "command-center", "runtimeExecutable": "pnpm", "runtimeArgs": ["--dir", "command-center", "dev"], "port": 3100 }
```

- [ ] **Step 6: Install + typecheck**

Run: `pnpm --dir command-center install && pnpm --dir command-center typecheck`
Expected: installs; typecheck passes (empty project).

- [ ] **Step 7: Commit** — n/a (not a git repo). Note file list in run README.

---

### Task C2: Types + API client

**Files:** `command-center/lib/types.ts`, `command-center/lib/api.ts`

- [ ] **Step 1: `lib/types.ts`**

```ts
export type Hop = "app" | "runtime" | "agui" | "hermes";
export interface HealthReport {
  status: string;
  adapter: { ok: boolean; version: string };
  toolset: { loaded: string[]; ok: boolean };
  model: { configured: boolean; provider: string; model: string; reachable: boolean; checkedAt: number; detail: string };
}
export interface RunRow {
  run_id: string; thread_id: string; started_at: number; finished_at: number | null;
  status: "running" | "finished" | "error"; model: string; preview: string; error: string | null;
}
export interface TraceEvent {
  run_id: string; seq: number; ts: number; wall: number; hop: Hop; type: string; payload: Record<string, unknown>;
}
export type LiveRecord =
  | ({ kind: "run_started"; run_id: string; thread_id: string; model: string; preview: string; wall: number })
  | ({ kind: "event" } & TraceEvent)
  | ({ kind: "run_finished"; run_id: string; status: RunRow["status"]; error: string | null });
```

- [ ] **Step 2: `lib/api.ts`**

```ts
import type { HealthReport, RunRow, TraceEvent, LiveRecord } from "./types";
const ADAPTER = process.env.NEXT_PUBLIC_ADAPTER_URL || "http://localhost:8000";
const DEMO = process.env.NEXT_PUBLIC_DEMO_APP_URL || "http://localhost:3000";

async function j<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
export const getHealth = () => j<HealthReport>(`${ADAPTER}/health`);
export const getDemoHealth = () => j<{ ok: boolean }>(`${DEMO}/api/health`);
export const listRuns = () => j<{ runs: RunRow[]; total: number }>(`${ADAPTER}/runs`);
export const getRun = (id: string) => j<{ run: RunRow; events: TraceEvent[] }>(`${ADAPTER}/runs/${id}`);
export function openTraceStream(onRecord: (r: LiveRecord) => void): () => void {
  const es = new EventSource(`${ADAPTER}/trace/stream`);
  es.onmessage = (e) => { try { onRecord(JSON.parse(e.data)); } catch {} };
  return () => es.close();
}
```

- [ ] **Step 3: Typecheck + commit note**

Run: `pnpm --dir command-center typecheck` → PASS.

---

### Task C3: Conversation reconstruction (TDD)

**Files:** `command-center/lib/reconstruct.ts`, `command-center/lib/reconstruct.test.ts`

- [ ] **Step 1: Failing test**

```ts
// command-center/lib/reconstruct.test.ts
import { describe, it, expect } from "vitest";
import { reconstruct } from "./reconstruct";
import type { TraceEvent } from "./types";

const ev = (seq: number, type: string, payload: any): TraceEvent =>
  ({ run_id: "r", seq, ts: seq, wall: seq, hop: "hermes", type, payload });

describe("reconstruct", () => {
  it("folds text deltas into one assistant message", () => {
    const items = reconstruct([
      ev(0, "RUN_INPUT", { messages: [{ role: "user", content: "hi" }] }),
      ev(1, "TEXT_MESSAGE_START", { messageId: "m1" }),
      ev(2, "TEXT_MESSAGE_CONTENT", { delta: "Hel" }),
      ev(3, "TEXT_MESSAGE_CONTENT", { delta: "lo" }),
      ev(4, "TEXT_MESSAGE_END", { messageId: "m1" }),
    ]);
    expect(items.find((i) => i.kind === "assistant")?.text).toBe("Hello");
    expect(items.find((i) => i.kind === "user")?.text).toBe("hi");
  });

  it("builds a tool card from start/args/end + result", () => {
    const items = reconstruct([
      ev(0, "TOOL_CALL_START", { toolCallId: "t1", toolCallName: "write_file" }),
      ev(1, "TOOL_CALL_ARGS", { toolCallId: "t1", delta: '{"path":"a.ts"}' }),
      ev(2, "TOOL_CALL_END", { toolCallId: "t1" }),
      ev(3, "TOOL_CALL_RESULT", { toolCallId: "t1", content: "ok" }),
    ]);
    const tool = items.find((i) => i.kind === "tool");
    expect(tool?.name).toBe("write_file");
    expect(tool?.args).toContain("a.ts");
    expect(tool?.result).toBe("ok");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --dir command-center exec vitest run lib/reconstruct.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `reconstruct.ts`**

```ts
import type { TraceEvent } from "./types";

export type Item =
  | { kind: "user"; text: string; seq: number }
  | { kind: "assistant"; text: string; seq: number }
  | { kind: "reasoning"; text: string; seq: number }
  | { kind: "tool"; name: string; args: string; result?: string; seq: number }
  | { kind: "state"; snapshot: unknown; seq: number };

const s = (p: Record<string, unknown>, ...keys: string[]) =>
  keys.map((k) => p[k]).find((v) => v != null) as string | undefined;

export function reconstruct(events: TraceEvent[]): Item[] {
  const items: Item[] = [];
  let msg: { text: string; seq: number } | null = null;
  let reason: { text: string; seq: number } | null = null;
  const tools = new Map<string, Item & { kind: "tool" }>();

  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    switch (e.type) {
      case "RUN_INPUT": {
        const msgs = (p.messages as any[]) || [];
        const last = [...msgs].reverse().find((m) => m.role === "user");
        if (last) items.push({ kind: "user", text: String(last.content ?? ""), seq: e.seq });
        break;
      }
      case "TEXT_MESSAGE_START": msg = { text: "", seq: e.seq }; break;
      case "TEXT_MESSAGE_CONTENT": if (msg) msg.text += s(p, "delta", "content") ?? ""; break;
      case "TEXT_MESSAGE_END": if (msg) { items.push({ kind: "assistant", ...msg }); msg = null; } break;
      case "REASONING_MESSAGE_START": reason = { text: "", seq: e.seq }; break;
      case "REASONING_MESSAGE_CONTENT": if (reason) reason.text += s(p, "delta", "content") ?? ""; break;
      case "REASONING_MESSAGE_END": if (reason) { items.push({ kind: "reasoning", ...reason }); reason = null; } break;
      case "TOOL_CALL_START": {
        const id = s(p, "toolCallId", "tool_call_id") ?? String(e.seq);
        const t: Item & { kind: "tool" } = { kind: "tool", name: s(p, "toolCallName", "tool_call_name") ?? "", args: "", seq: e.seq };
        tools.set(id, t); items.push(t); break;
      }
      case "TOOL_CALL_ARGS": {
        const id = s(p, "toolCallId", "tool_call_id") ?? "";
        const t = tools.get(id); if (t) t.args += s(p, "delta") ?? ""; break;
      }
      case "TOOL_CALL_RESULT": {
        const id = s(p, "toolCallId", "tool_call_id") ?? "";
        const t = tools.get(id); if (t) t.result = s(p, "content", "result") ?? ""; break;
      }
      case "STATE_SNAPSHOT": items.push({ kind: "state", snapshot: p.snapshot ?? p, seq: e.seq }); break;
    }
  }
  return items;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --dir command-center exec vitest run lib/reconstruct.test.ts`
Expected: PASS (2 tests).

---

### Task C4: StatusBar + ServicePill

**Files:** `command-center/components/ServicePill.tsx`, `components/StatusBar.tsx`

- [ ] **Step 1: `ServicePill.tsx`** — props `{ label: string; state: "ok"|"warn"|"err"|"unknown"; detail?: string }`. Colored dot + label; `title={detail}` tooltip.

- [ ] **Step 2: `StatusBar.tsx`** (client component) — on mount, `setInterval` every 4000ms: `getHealth()` → AG-UI pill from `adapter.ok`, Hermes pill from `model.reachable` (detail = `model.detail`); `getDemoHealth()` → CopilotKit App pill. Each fetch in try/catch → `err`/`unknown` on throw. Render three `ServicePill`s in a row.

- [ ] **Step 3: Typecheck**

Run: `pnpm --dir command-center typecheck` → PASS.

---

### Task C5: List + View + ReplayView

**Files:** `components/ConversationList.tsx`, `components/ConversationView.tsx`, `components/ReplayView.tsx`, `components/ToolCard.tsx`

- [ ] **Step 1: `ToolCard.tsx`** — port `expense-tracker-live/components/ToolCallCard.tsx` (read it) to props `{ name; args; result? }`: icon per tool (write_file/read_file/terminal/search), arg summary (parse JSON, show path/command/pattern/query), collapsible result.

- [ ] **Step 2: `ReplayView.tsx`** — props `{ items: Item[] }` from `reconstruct`. Render user/assistant/reasoning (collapsed behind "show reasoning") / tool (`ToolCard`) / state rows in `seq` order.

- [ ] **Step 3: `ConversationList.tsx`** — props `{ runs: RunRow[]; selectedId?; onSelect }`. Row: status dot, `preview`, relative time, tool count if available. Live/running run styled pinned at top.

- [ ] **Step 4: `ConversationView.tsx`** (client) — props `{ runId | liveEvents }`. Holds a `mode: "replay"|"protocol"` toggle. For a selected past run: `getRun(id)` → `reconstruct` → `ReplayView`. For live: consume appended events. Renders the toggle header; `ProtocolView` added in C6.

- [ ] **Step 5: Typecheck** → PASS.

---

### Task C6: ProtocolView + EventInspector + page wiring

**Files:** `components/ProtocolView.tsx`, `components/EventInspector.tsx`, `app/page.tsx`

- [ ] **Step 1: `EventInspector.tsx`** — props `{ event: TraceEvent }`: header `type` · `hop` · `Δms` (from `ts`); `<pre>` pretty JSON of `payload`.

- [ ] **Step 2: `ProtocolView.tsx`** — props `{ events: TraceEvent[] }`. Three lanes (App · AG-UI · Hermes) each a horizontal row; each event a colored chip positioned by `seq` (or a simple vertical list grouped by hop for v1). Clicking a chip sets the selected event → `EventInspector` in a side panel.

- [ ] **Step 3: `app/page.tsx`** (client) — the whole screen:
  - `StatusBar` at top.
  - state: `runs`, `selectedId`, `liveEventsByRun`.
  - on mount: `listRuns()` → `runs`; `openTraceStream()` → on `run_started` prepend a synthetic running `RunRow` + auto-select; on `event` append to `liveEventsByRun[run_id]`; on `run_finished` patch the row status.
  - layout: left `ConversationList`, right `ConversationView` (uses live events if the selected run is live, else `getRun`).

- [ ] **Step 4: Typecheck** → PASS.

---

# TRACK D — End-to-end integration & docs

### Task D1: Live end-to-end verification

- [ ] **Step 1:** Start adapter from the demo app dir: `./run-adapter.sh expense-tracker-live` (loads `adapter.env` with the real key). Confirm `curl -s localhost:8000/health | jq .model.reachable` → `true`.
- [ ] **Step 2:** Start demo app (`pnpm --dir expense-tracker-live dev`) and command-center (`pnpm --dir command-center dev`). Confirm `curl -s localhost:3000/api/health` and open `localhost:3100`.
- [ ] **Step 3:** Drive one run via `drive-hermes.py` (or type in the demo sidebar). Confirm in the Command Center: a run appears live, streams into ReplayView, protocol toggle shows the waterfall, and the run persists after refresh (`GET /runs`).
- [ ] **Step 4:** Kill the adapter; confirm the AG-UI + Hermes pills go red and the list falls back to cached history without crashing.

### Task D2: Run docs

- [ ] **Step 1:** Add a `command-center/README.md` with the 3-process run recipe (adapter, demo app, command center), env vars (`HERMES_AGUI_TRACE_DB`, `HERMES_AGUI_CC_ORIGIN`, `NEXT_PUBLIC_ADAPTER_URL`, `NEXT_PUBLIC_DEMO_APP_URL`), and the "not a git repo at top level" note for the demo-app/frontend changes.
- [ ] **Step 2:** Update the Notion "Command Center" plan page: mark M1–M7 status.

---

## Self-review (completed by author)

- **Spec coverage:** §5.2 store→A1; §5.5 bus→A2; §5.4 sink+isolation→A3; §5.6 health→A4; §5.7 endpoints+CORS→A4; §6 demo health→B1; §7.1 config→C1; §7.2 types/api→C2, reconstruct→C3, StatusBar/pill→C4, list/view/replay/ToolCard→C5, protocol/inspector/page→C6; §8 data flow + §9 errors→D1; §10 testing→A1/A3/A4/C3 + D1; §11 milestones→tracks. No gaps.
- **Placeholder scan:** backend code + reconstruct are complete; frontend view components are specified by props/behavior (standard React, executor fills JSX) — acceptable given the fixed contracts and the ToolCard port reference.
- **Type consistency:** `TraceEvent`/`RunRow`/`HealthReport`/`LiveRecord` (C2) match the store rows (A1) and health report (A4); `reconstruct` `Item` union used by ReplayView (C5); `_TraceSink` API (`start`/`capture`/`finish`) matches its test (A3) and server wiring.
