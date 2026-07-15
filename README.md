# Hermes × CopilotKit — self-modifying app demo

A Next.js + CopilotKit **expense tracker** ("Ledger") whose in-app assistant is
the **Hermes agent** itself, connected over the **AG-UI protocol**. You chat in
the sidebar and Hermes — the same coding agent — rewrites the app's source live.
Save, hot-reload, watch it change. No code typed by hand.

## How it fits together

```
┌───────────────────────────────┐        edits files in ./expense-tracker
│  Hermes agent (hermes-acp      │◀──────────────────────────────┐
│  toolset: read/write/patch)    │                               │
└───────────────┬───────────────┘                               │
                │ run on a worker thread                         │
┌───────────────▼───────────────┐                               │
│  Hermes AG-UI adapter          │  POST /  ·  SSE               │
│  python -m agui_adapter :8000  │  (launched FROM the app dir)  │
└───────────────▲───────────────┘                               │
                │ AG-UI protocol (HermesAgent = HttpAgent)       │
┌───────────────┴───────────────┐                               │
│  Next.js + CopilotKit  :3000   │                               │
│  /api/copilotkit               │                               │
│    → CopilotRuntime            │                               │
│    → HermesAgent(url :8000/)   │                               │
│  <CopilotSidebar>  ────────────┼── you type here ──────────────┘
└────────────────────────────────┘
```

The trick that makes it *self*-modifying: the adapter is started **from inside
`expense-tracker/`**, so the Hermes agent inherits that working directory and its
file tools edit this very app.

## Sources this is built on

- Hermes fork branch `mme/hermes-ag-ui-support` (cloned into `./hermes/`) —
  ships the `agui_adapter/` package.
- AG-UI PR [#2111](https://github.com/ag-ui-protocol/ag-ui/pull/2111) — the
  `@ag-ui/hermes` client (`HermesAgent`), installed from its pkg.pr.new build.
- CopilotKit PR [#5822](https://github.com/CopilotKit/CopilotKit/pull/5822) —
  the runtime wiring pattern (`api/copilotkit/route.ts`), CopilotKit 1.61.2 /
  `@ag-ui/*` 0.0.57.

## The demo is two acts

- **Act 1 — Hermes builds the app.** In Hermes Desktop (or headless CLI) you say
  *"build me an expense tracker and include yourself in it."* Hermes scaffolds the
  Next.js + CopilotKit app and wires it to its own AG-UI server. Reliability comes
  from the **`copilotkit-hermes-app` skill** (in `skills/`, installed to
  `~/.hermes/skills/`), which pins the fiddly AG-UI wiring. Prompt lives in
  `BUILD-PROMPT.md` / `.txt`. Validate headlessly with `./validate-act1.sh`.
- **Act 2 — Hermes modifies it live.** You open the app, chat in the sidebar, and
  the same agent rewrites the source you're looking at. This is the `expense-tracker/`
  reference app (below), which also serves as the golden output + fallback for Act 1.

## One-time setup (already done)

- `./hermes/` — fork cloned; `uv venv --python 3.11 .venv` + `uv pip install -e ".[all,agui]"`.
- `./expense-tracker/` — `pnpm install`; typechecks clean; dashboard renders.
- Adapter boots and serves `/health`.

## Run it (2 terminals)

1. **Add your key.** Edit `adapter.env` → set `OPENAI_API_KEY` (OpenAI frontier
   is pre-configured; `HERMES_AGUI_MODEL=gpt-4o`, bump to a stronger coding
   model if you like).

2. **Terminal A — Hermes AG-UI adapter:**
   ```bash
   ./run-adapter.sh
   ```
   (starts `python -m agui_adapter` on :8000, working dir = `expense-tracker/`.)

3. **Terminal B — the app:**
   ```bash
   pnpm --dir expense-tracker dev
   ```
   Open http://localhost:3000. The sidebar is open by default.

   Or run both at once: `./run-all.sh`.

## Demo script (what to type in the sidebar)

- *"What did I spend the most on this month?"* — grounded answer from the app's
  data (via `useCopilotReadable`), no code change.
- *"Add a dark mode toggle to the dashboard."* — Hermes edits the components →
  hot reload → toggle appears.
- *"Change the brand color from indigo to emerald."* — Hermes edits
  `app/globals.css` (one `--color-brand` value) → whole app re-themes live.
- *"Add a 'Subscriptions' category and a couple of sample expenses."* — Hermes
  edits `lib/expenses.ts` → chart + list update.

## Health check

`curl http://localhost:3000/api/copilotkit` → `agent: "reachable"` once the
adapter is up.

## Troubleshooting

- **`agent: unreachable`** — the adapter isn't running; start Terminal A.
- **401 / auth errors in the adapter log** — bad/placeholder `OPENAI_API_KEY`.
- **Chat connects but edits don't apply** — confirm the adapter was launched via
  `run-adapter.sh` (i.e. with cwd = `expense-tracker/`) so Hermes edits the app.
