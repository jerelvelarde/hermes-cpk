import { describe, it, expect } from "vitest";
import { reconstruct } from "./reconstruct";
import type { TraceEvent } from "./types";

const ev = (seq: number, type: string, payload: any): TraceEvent =>
  ({ run_id: "r", seq, ts: seq, wall: seq, hop: "hermes", type, payload });

describe("reconstruct", () => {
  it("folds text deltas into one assistant message", () => {
    const items = reconstruct([
      ev(0, "RUN_INPUT", { messages: [{ role: "user", content: "hi" }] }),
      ev(1, "TEXT_MESSAGE_START", { messageId: "m1" }),
      ev(2, "TEXT_MESSAGE_CONTENT", { delta: "Hel" }),
      ev(3, "TEXT_MESSAGE_CONTENT", { delta: "lo" }),
      ev(4, "TEXT_MESSAGE_END", { messageId: "m1" }),
    ]);
    expect(items.find((i) => i.kind === "assistant")?.text).toBe("Hello");
    expect(items.find((i) => i.kind === "user")?.text).toBe("hi");
  });

  it("builds a tool card from start/args/end + result", () => {
    const items = reconstruct([
      ev(0, "TOOL_CALL_START", { toolCallId: "t1", toolCallName: "write_file" }),
      ev(1, "TOOL_CALL_ARGS", { toolCallId: "t1", delta: '{"path":"a.ts"}' }),
      ev(2, "TOOL_CALL_END", { toolCallId: "t1" }),
      ev(3, "TOOL_CALL_RESULT", { toolCallId: "t1", content: "ok" }),
    ]);
    const tool = items.find((i) => i.kind === "tool");
    expect(tool?.name).toBe("write_file");
    expect(tool?.args).toContain("a.ts");
    expect(tool?.result).toBe("ok");
  });
});
