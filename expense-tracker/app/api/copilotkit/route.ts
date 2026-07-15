import { NextRequest, NextResponse } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HermesAgent } from "@ag-ui/hermes";

// The chat sidebar is powered by the Hermes agent running as a separate
// process — the AG-UI adapter from the hermes-agent repo (`python -m
// agui_adapter`), launched from THIS app's directory so its coding tools edit
// this app. Hermes serves every run from a single endpoint (POST /), so we
// register one HermesAgent as "default".
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

const runtime = new CopilotRuntime({
  agents: {
    default: new HermesAgent({ url: `${AGENT_URL}/` }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime,
  });
  return handleRequest(req);
};

// Lightweight health probe: confirms the adapter is reachable at AGENT_URL.
export const GET = async () => {
  let agent = "unknown";
  try {
    const res = await fetch(`${AGENT_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    agent = res.ok ? "reachable" : `error (${res.status})`;
  } catch (e) {
    agent = `unreachable (${(e as Error).message})`;
  }
  return NextResponse.json({ status: "ok", agent_url: AGENT_URL, agent });
};
