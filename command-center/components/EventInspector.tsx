"use client";

import type { TraceEvent } from "@/lib/types";

export function EventInspector({
  event,
  firstTs,
  color = "var(--copilot)",
  hopLabel,
}: {
  event: TraceEvent;
  firstTs?: number;
  color?: string;
  hopLabel?: string;
}) {
  const deltaMs =
    firstTs != null ? Math.max(0, Math.round((event.ts - firstTs) * 1000)) : Math.round(event.ts * 1000);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="chrome rounded px-1.5 py-1"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            {hopLabel ?? event.hop}
          </span>
          <span className="font-mono text-[12px] font-medium text-[var(--text)]">{event.type}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] tabular-nums text-[var(--faint)]">
          <span>+{deltaMs}ms</span>
          <span className="h-1 w-1 rounded-full bg-[var(--faint)]" />
          <span>seq #{event.seq}</span>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[var(--text)]">
        {JSON.stringify(event.payload, null, 2)}
      </pre>
    </div>
  );
}
