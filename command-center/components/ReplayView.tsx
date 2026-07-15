"use client";

import { useState } from "react";
import type { Item } from "@/lib/reconstruct";
import { ToolCard } from "./ToolCard";
import { HermesMark, CopilotKitMark } from "./Brand";

export function ReplayView({ items }: { items: Item[] }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (items.length === 0) {
    return <div className="p-6 text-sm text-[var(--muted)]">No conversation content yet.</div>;
  }

  const ordered = [...items].sort((a, b) => a.seq - b.seq);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6">
      <label className="flex cursor-pointer select-none items-center gap-2 self-end chrome text-[var(--muted)]">
        <input
          type="checkbox"
          checked={showReasoning}
          onChange={(e) => setShowReasoning(e.target.checked)}
          className="accent-[var(--hermes)]"
        />
        reasoning
      </label>

      {ordered.map((item, i) => {
        const key = `${item.kind}-${item.seq}-${i}`;
        switch (item.kind) {
          case "user":
            return (
              <div key={key} className="flex items-end justify-end gap-2.5">
                <div
                  className="max-w-[78%] rounded-2xl rounded-br-md border px-4 py-2.5 text-sm text-white"
                  style={{
                    background: "color-mix(in oklab, var(--copilot) 82%, black)",
                    borderColor: "color-mix(in oklab, var(--copilot) 55%, transparent)",
                  }}
                >
                  {item.text}
                </div>
                <span className="mb-0.5 shrink-0"><CopilotKitMark size={22} /></span>
              </div>
            );
          case "assistant":
            return (
              <div key={key} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0"><HermesMark size={22} /></span>
                <div className="max-w-[82%]">
                  <div className="mb-1 chrome" style={{ color: "var(--hermes)" }}>Hermes</div>
                  <div
                    className="whitespace-pre-wrap rounded-2xl rounded-tl-md border px-4 py-2.5 text-sm text-[var(--text)]"
                    style={{
                      borderColor: "color-mix(in oklab, var(--hermes) 24%, var(--line))",
                      background: "color-mix(in oklab, var(--hermes) 4%, var(--panel))",
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              </div>
            );
          case "reasoning":
            if (!showReasoning) return null;
            return (
              <div key={key} className="flex items-start gap-2.5 pl-[34px]">
                <div
                  className="max-w-[82%] whitespace-pre-wrap rounded-xl border border-dashed px-4 py-2 text-xs italic text-[var(--muted)]"
                  style={{ borderColor: "color-mix(in oklab, var(--hermes) 18%, var(--line))" }}
                >
                  {item.text}
                </div>
              </div>
            );
          case "tool":
            return (
              <div key={key} className="pl-[34px]">
                <ToolCard name={item.name} args={item.args} result={item.result} />
              </div>
            );
          case "state":
            return (
              <div key={key} className="pl-[34px]">
                <details className="rounded-xl border border-[var(--line)] bg-[var(--panel-raised)] px-3 py-2 text-sm">
                  <summary className="cursor-pointer chrome text-[var(--muted)]">state snapshot</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-[var(--panel)] p-2 font-mono text-[11px] text-[var(--text)]">
                    {JSON.stringify(item.snapshot, null, 2)}
                  </pre>
                </details>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
