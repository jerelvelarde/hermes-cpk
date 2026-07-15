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
