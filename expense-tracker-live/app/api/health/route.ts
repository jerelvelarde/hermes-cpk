import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The Command Center runs on a different origin (:3100) and polls this from the
// browser, so allow cross-origin reads. Read-only liveness ping — safe to open.
const CORS = {
  "Access-Control-Allow-Origin": process.env.CC_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET() {
  return NextResponse.json(
    { ok: true, app: "expense-tracker-live", ts: Date.now() },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
