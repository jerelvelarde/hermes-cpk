import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime/v2";
import { HermesAgent } from "@ag-ui/hermes";

// CopilotKit V2 talks to the runtime over REST sub-paths (/info,
// /agent/:id/run, …), so this is a catch-all whose basePath matches the
// client's runtimeUrl. The runtime still just proxies to the OpenClaw AG-UI
// adapter — CopilotKit does no LLM work itself. (The transport class is still
// named HermesAgent upstream in @ag-ui/hermes; that package name is external.)
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

const copilotRuntime = new CopilotRuntime({
  agents: { default: new HermesAgent({ url: `${AGENT_URL}/` }) },
});

const app = createCopilotEndpoint({ runtime: copilotRuntime, basePath: "/api/copilotkit" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (req: Request) => app.fetch(req);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
