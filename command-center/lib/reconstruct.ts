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
