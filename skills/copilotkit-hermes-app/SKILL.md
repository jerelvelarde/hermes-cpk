---
name: copilotkit-hermes-app
description: Build a Next.js web app with a CopilotKit chat sidebar wired to THIS Hermes agent over the AG-UI protocol — so the user can chat inside the app and have you (Hermes) modify the app's own source live. Use when the user asks to build a web app and "include yourself", "add a chat/copilot to it", "make it self-modifying", or connect an app to the Hermes AG-UI adapter.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Web, CopilotKit, AG-UI, Next.js, Self-Modifying, Frontend]
    related_skills: [claude-code, codebase-inspection]
---

# Build a self-modifying CopilotKit app wired to Hermes (AG-UI)

Use this when the user asks you to build a web app and **"include yourself in
it"** — i.e. the finished app should have a chat sidebar that talks to *you*
(this Hermes agent) so the user can ask you to change the app while it runs, and
watch the code update live.

The **only** way this works: the app connects to a **Hermes AG-UI adapter**
(`python -m agui_adapter`, HTTP/SSE on `POST /`), and that adapter is launched
**from the app's own directory** so your file tools edit that app.

## What you are building

A Next.js (App Router) + CopilotKit app where:
- the UI is whatever the user asked for (e.g. an expense tracker), and
- a `<CopilotSidebar>` is wired through `/api/copilotkit` → CopilotKit
  `CopilotRuntime` → `HermesAgent` (`@ag-ui/hermes`) → the adapter at
  `http://localhost:8000/`.

```
you (Hermes, hermes-acp file tools)  ── edits ──▶  ./the-app
        ▲ run on a worker thread
python -m agui_adapter  :8000  (launched FROM ./the-app)
        ▲ AG-UI (SSE)
Next.js + CopilotKit  :3000   /api/copilotkit → CopilotRuntime → HermesAgent
        ▲ <CopilotSidebar>  ◀── user types here
```

## Load-bearing wiring — copy these EXACTLY (do not improvise versions)

These specifics are the parts that break if guessed. The app UI is yours to
design; this wiring is not.

### `package.json` (dependencies block)

```json
"dependencies": {
  "@ag-ui/client": "0.0.57",
  "@ag-ui/core": "0.0.57",
  "@ag-ui/hermes": "https://pkg.pr.new/ag-ui-protocol/ag-ui/@ag-ui/hermes@2111",
  "@copilotkit/react-core": "1.62.3",
  "@copilotkit/react-ui": "1.62.3",
  "@copilotkit/runtime": "1.62.3",
  "next": "15.5.4",
  "openai": "^5.23.2",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

- `@ag-ui/hermes` is a **pkg.pr.new URL**, NOT a normal npm package. Keep it verbatim.
- `openai` is a **required** transitive peer of `@copilotkit/runtime` even though
  we use `ExperimentalEmptyAdapter` — omitting it makes `/api/copilotkit` fail to
  compile (`Module not found: Can't resolve 'openai'`).
- CopilotKit `1.62.3` and `@ag-ui/*` `0.0.57` are a matched set (1.62.3 still
  pins `@ag-ui/*` at 0.0.57). Don't bump `@ag-ui/*`.

### `next.config.ts`

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  transpilePackages: ["@ag-ui/hermes", "@ag-ui/client", "@ag-ui/core"],
};
export default nextConfig;
```

### `app/api/copilotkit/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HermesAgent } from "@ag-ui/hermes";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";
const runtime = new CopilotRuntime({
  agents: { default: new HermesAgent({ url: `${AGENT_URL}/` }) },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime,
  });
  return handleRequest(req);
};

export const GET = async () => {
  let agent = "unknown";
  try {
    const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(3000) });
    agent = res.ok ? "reachable" : `error (${res.status})`;
  } catch (e) {
    agent = `unreachable (${(e as Error).message})`;
  }
  return NextResponse.json({ status: "ok", agent_url: AGENT_URL, agent });
};
```

### `app/providers.tsx` (client component that wraps the app)

```tsx
"use client";
import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

// Surface Hermes' SERVER-SIDE tool calls (search_files, read_file, patch,
// terminal, …) in the chat. Without this, CopilotKit shows only the tool name
// + "Done"; this wildcard renderer paints each call with its key argument,
// status, and (collapsed) result. Style the card to match the app.
function ToolRenderer() {
  useCopilotAction({
    name: "*",
    render: ({
      name,
      args,
      status,
      result,
    }: {
      name: string;
      args: Record<string, unknown>;
      status: "inProgress" | "executing" | "complete";
      result?: unknown;
    }) => {
      const arg = (args?.path ?? args?.command ?? args?.pattern ?? args?.query ?? "") as string;
      return (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", margin: "6px 0", fontSize: 14 }}>
          <strong>{name}</strong>{arg ? <code style={{ marginLeft: 8 }}>{String(arg).slice(0, 80)}</code> : null}
          {" "}{status === "complete" ? "✓" : "…"}
          {status === "complete" && result != null && (
            <details><summary style={{ cursor: "pointer", fontSize: 12 }}>result</summary>
              <pre style={{ maxHeight: 160, overflow: "auto", fontSize: 12 }}>
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    },
  });
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="default">
      <ToolRenderer />
      {children}
      <CopilotSidebar
        defaultOpen
        clickOutsideToClose={false}
        labels={{
          title: "Hermes",
          initial:
            "Hi — I'm the Hermes agent, running inside this app. Tell me to change how it looks or works and watch it update live.",
        }}
      />
    </CopilotKit>
  );
}
```

The wildcard `useCopilotAction({ name: "*" })` is the v1 catch-all tool renderer.
(The CopilotKit v2 API — `@copilotkit/react-core/v2` `useDefaultRenderTool` — does
the same; use the v1 form shown here since the app uses `<CopilotSidebar>`.)

Render `<Providers>` in `app/layout.tsx`, and in `app/globals.css` add:
`@import "@copilotkit/react-ui/styles.css";` (after `@import "tailwindcss";`).

To ground the assistant in the app's data, register a `useCopilotReadable`
(from `@copilotkit/react-core`) in a small client component inside `<CopilotKit>`.

### `.env.local`

```
AGENT_URL=http://localhost:8000
```

## Build steps

1. Scaffold the Next.js app (App Router, TypeScript, Tailwind v4). You can write
   files directly rather than running an interactive `create-next-app`.
2. Write the wiring files above verbatim.
3. Build the requested UI (pages, components, seed data in `lib/`). Keep data in
   an editable `lib/*.ts` module so later live edits are easy.
4. `pnpm install`.
5. `pnpm exec tsc --noEmit` — must pass clean before declaring done.

## Running it (tell the user)

The chat sidebar only comes alive when a Hermes AG-UI adapter is running **from
the app directory**:

```bash
cd <the-app>
PORT=8000 HERMES_AGUI_TOOLSETS=hermes-acp \
  OPENAI_BASE_URL=... OPENAI_API_KEY=... HERMES_AGUI_MODEL=... \
  hermes-agui           # or: python -m agui_adapter
# in another terminal:
pnpm dev                # http://localhost:3000
```

Verify: `curl http://localhost:3000/api/copilotkit` → `"agent":"reachable"`.

## Gotchas

- **When making a LIVE edit to an already-running app, verify with
  `pnpm exec tsc --noEmit` — NOT `pnpm build`.** Running `next build` while the
  user's `next dev` server is live clobbers the shared `.next` directory and
  makes the running app 500 (ENOENT on build manifests). The dev server's HMR
  already reflects your change; a full production build is both unnecessary and
  destructive mid-session. (Use `pnpm build` only for a from-scratch build when
  no dev server is running.)
- **Launch the adapter from the app dir** — the agent inherits that cwd, which is
  what lets your file tools edit the app. Launch it elsewhere and edits land in
  the wrong place.
- **Keep the `@ag-ui/hermes` pkg.pr.new URL and the `openai` dep.** Both are easy
  to "clean up" and both break the build if removed.
- **Toolset `hermes-acp`** gives the adapter's agent its file/terminal tools.
- A known-good reference implementation lives at
  `~/Projects/hermes-agent/hermes-cpk/expense-tracker` — read it if unsure.
