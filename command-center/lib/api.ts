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
