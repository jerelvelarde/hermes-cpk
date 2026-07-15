# Act 1 — the prompt you give Hermes (Desktop or CLI)

Paste this into Hermes Desktop (or run it via the CLI, see below). Hermes will
discover the `copilotkit-hermes-app` skill and follow its wiring.

---

> Build me a **personal expense tracker** web app called **Ledger**, in a new
> folder `expense-tracker-live/`. Use Next.js (App Router, TypeScript, Tailwind).
> It should have a clean dashboard: total spent this month vs. a monthly budget,
> a "spending by category" chart, and a recent-transactions list. Seed it with
> ~20 realistic sample expenses in an editable `lib/` module.
>
> **Most important: include yourself in it.** Add a CopilotKit chat sidebar that
> connects to your own Hermes AG-UI adapter, so I can open the app and ask you,
> right there in the sidebar, to change how it looks and works — and see the code
> update live. Follow the `copilotkit-hermes-app` skill for the exact AG-UI
> wiring. When you're done, typecheck it and tell me how to run it.

---

## Driving it from the CLI (headless, for validation)

```bash
cd ~/Projects/hermes-agent/hermes-cpk
# uses the fork's hermes with coding tools; reads OpenAI creds from adapter.env
set -a; source adapter.env; set +a
hermes/.venv/bin/hermes -z "$(cat BUILD-PROMPT.txt)" \
  -t hermes-acp -m "$HERMES_AGUI_MODEL" --provider openai
```

(Or let it use the configured default model by dropping `-m/--provider`.)
