# Video Brief — `hermes-cpk-explainer`

> The wow-factor this video sells: **you don't rebuild connections or integrations — a CopilotKit app just connects to Hermes running on your machine, and the same agent edits the app's own source live.**

---

## 1. Metadata

- **Type**: `ag-ui-explainer` (45–60s)
- **Voice**: `copilotkit-org`
- **Deadline**: `<YYYY-MM-DD>` — **GAP: not supplied.** Audio plan assumes no voiceover so any deadline is safe.
- **Owner**: Jerel (jerel@copilotkit.ai)
- **Reviewers**: Uli (technical accuracy — AG-UI framing), Eli (marketing)

## 2. Receipts (filled — no fakes)

- **Demo URL**: `http://localhost:3000` — Financial Ledger, the self-editing CopilotKit app (Hermes in the sidebar).
- **Demo URL**: `http://localhost:3100` — Command Center, the live App→AG-UI→Hermes trace/flow graph.
- **Code snippet**: `expense-tracker-live/app/api/copilotkit/route.ts` — `CopilotRuntime` + `new HermesAgent({ url })` (the entire integration).
- **Code snippet**: `run-adapter.sh` — `./run-adapter.sh <app-dir>` launches the adapter on `:8000`.
- **Screenshot / capture**: the Financial Ledger accent-color self-edit + `DiffCard`, and the Command Center Flow graph pulsing (both recorded live this session).
- **Benchmark**: 0 lines of bespoke bridge/integration code — a CopilotKit app connects to Hermes by pointing at the adapter URL; the adapter itself is thin layers on Hermes with **zero core changes**.

## 3. Surfaces and aspect-ratio variants

| Variant ID | Surface | Aspect ratio | Resolution | Max duration | File size cap | Subtitles |
|---|---|---|---|---|---|---|
| `variant-a` | x | 9:16 | 1080×1920 | 140s | 512 MB | **baked-in (required)** |
| `variant-b` | linkedin | 9:16 | 1080×1920 | 90s | 200 MB | **baked-in (required)** |

Both variants are 9:16, so they share one render pass. **YouTube Shorts** can reuse `variant-a` as-is (9:16, ≤60s — this video is 48s, under the cap). Canonical variant: `variant-a` (X).

## 4. Duration

- **Target total duration (seconds)**: 48
- **Total frames at 30fps**: 1440
- **Editorial range for `ag-ui-explainer`**: 45–60 s
- **Tightest surface cap**: 60 s (YouTube Shorts, if reused)
- **Final**: 48 s (inside the editorial range and under every surface cap)

## 5. Scene-by-scene outline

| # | Scene primitive | Start | End | Dur (s) | On-screen content | Motion |
|---|---|---|---|---|---|---|
| 1 | `title-card` | 0 | 90 | 3 | "Connect an agent to your app. No glue code." · sub: "Hermes × CopilotKit over AG-UI" | Fade-in 10f, hold |
| 2 | `terminal-cap` | 90 | 240 | 5 | `./run-adapter.sh expense-tracker-live` → `Hermes AG-UI adapter · listening :8000` | Prompt fade-in, command types in, output fade |
| 3 | `code-cut` | 240 | 540 | 10 | `route.ts`: `CopilotRuntime` + `new HermesAgent({ url })` (≤12 lines) | Fade-in 10f; highlight-pulse the `HermesAgent` line (f30–70) |
| 4 | `browser-capture` | 540 | 840 | 10 | Financial Ledger — type "change the accent to indigo" → dashboard recolors + `DiffCard` appears | 1.0→1.05× scale-zoom on the sidebar edit |
| 5 | `browser-capture` | 840 | 1140 | 10 | Command Center — Flow graph pulsing App → CopilotKit → AG-UI → Hermes and streaming back | 1.0→1.05× scale-zoom on the graph |
| 6 | `code-cut` | 1140 | 1350 | 7 | `AGENT_URL` one-liner — pointing a *different* CopilotKit app at the same adapter | Fade-in 10f; highlight-pulse the URL line |
| 7 | `close-cta` | 1350 | 1440 | 3 | "Build it: Hermes × CopilotKit" · `<canonical URL — TODO>` | Fade-in 10f, hold |

**Sum check**: 90 + 150 + 300 + 300 + 300 + 210 + 90 = **1440 frames = 48 s** ✓
**Signature in-scene motion**: 1.05× scale-zoom on both `browser-capture` scenes (one signature, repeated). `code-cut` uses the highlight pulse; no third motion signature.

## 6. Audio plan

- **Audio plan**: `music-with-subtitles`
- **Subtitles**: baked-in (required for X and LinkedIn) — subtitles carry the full narrative since both surfaces autoplay muted.
- **Music**: minimal ambient-electronic / low-BPM build (no lyric, no orchestral, no lo-fi loop).
- **Music license source**: **Epidemic Sound** (candidate) — **manual user step**, license before mix.
- **Voiceover**: none (keeps any deadline safe; VO would need ≥3 business days).

**Subtitle script (one idea per line):**
1. "Connect an agent to your app."
2. "Hermes runs on your machine and speaks AG-UI."
3. "The whole integration: point CopilotKit at Hermes. No custom bridge."
4. "Chat in the app — the same agent edits the app's own code, live."
5. "Nothing to rebuild. Watch every message flow to Hermes and back."
6. "New app? Same one line. The integration never changes."
7. "Build it: Hermes × CopilotKit."

## 7. On-screen copy (kill-list spot check)

- **Title-card (Scene 1)**: "Connect an agent to your app. No glue code."
- **Mid-video (Scene 6 highlight)**: "New app? Same one line."
- **Close-CTA**: "Build it: Hermes × CopilotKit"

None contain: `we are thrilled`, `we are excited`, 🚀, 🔥, `10x`, `game-changing`, `revolutionary`, `next-generation`, `disruptive`. ✓ Clean.

## 8. Success criteria

- [ ] Both variants (A, B) have a matching `<Composition>` registration.
- [ ] Both variants render without errors via the integration ticket.
- [ ] Both variants respect their file-size cap.
- [ ] Both X and LinkedIn variants have baked-in subtitles.
- [ ] On-screen copy passes the kill-list (Section 7). ✓
- [ ] Audio licensing resolved (Epidemic Sound) or plan downgraded to `silent-with-subtitles`.
- [ ] Two browser-capture recordings produced (Financial Ledger self-edit; Command Center flow).
- [ ] Owner sign-off.

## 9. Open questions / gaps

- **Close-CTA URL** — `ag-ui-explainer` requires a canonical doc/article URL for the CTA. None public yet. Candidates: the `hermes-cpk` repo, AG-UI adapter PR #2111, or a CopilotKit AG-UI docs page. **Pick one before render.**
- **Deadline** — not supplied; assumed no VO. Confirm so audio stays `music-with-subtitles`.
- **Two `browser-capture` clips must be recorded** — ≤10s each: (1) Financial Ledger accent edit + DiffCard, (2) Command Center Flow graph. Mask nothing sensitive (no PII on these screens).
- **Audio license** — Epidemic Sound subscription to be confirmed under the marketing account (manual, user-owned).
- **Remotion not installed** — the composition starter lives outside `app/`; the engineering ticket to install Remotion is not filed. See Section 10.
- **Surfaces assumed** (X + LinkedIn 9:16) — confirm; add a 16:9 blog/hero cut if the video should also embed on the site.

## 10. Composition starter file

- **Path**: `docs/video/hermes-cpk-explainer.composition.tsx`
- **Status**: `starter code — not installed`
- **Integration spec**: `.claude/skills/remotion-video/references/remotion-integration.md`

The starter is a paste-target for the future engineering ticket. Until that ticket lands and Remotion is added to a real app, the starter lives outside any `app/` directory.

---

## Where this brief goes

- Share with: engineering (integration ticket), Eli (marketing review), Uli (AG-UI accuracy).
- Pair with: the `hermes-cpk` demo, the "Markus' AG-UI Work" Notion analysis, and the Command Center plan page.
