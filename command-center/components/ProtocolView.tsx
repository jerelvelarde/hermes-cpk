"use client";

import { useMemo, useState } from "react";
import type { Hop, TraceEvent } from "@/lib/types";
import { EventInspector } from "./EventInspector";

// Hop colors carry the brand story: the CopilotKit side is indigo, the
// transport is lighter indigo, Hermes is gold.
const HOP_COLOR: Record<Hop, string> = {
  app: "var(--copilot)",
  runtime: "var(--copilot-2)",
  agui: "var(--copilot-2)",
  hermes: "var(--hermes)",
};

const HOP_LABEL: Record<Hop, string> = {
  app: "APP", runtime: "RUNTIME", agui: "AG-UI", hermes: "HERMES",
};

interface Segment {
  hop: Hop;
  type: string;
  firstSeq: number;
  count: number;
  firstTs: number;
  lastTs: number;
}

export function ProtocolView({ events }: { events: TraceEvent[] }) {
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);

  const ordered = useMemo(() => [...events].sort((a, b) => a.seq - b.seq), [events]);
  const t0 = ordered.length ? ordered[0].ts : 0;

  // Fold consecutive same-(hop,type) events into one node with a count, so the
  // waterfall reads as phases instead of 160 identical chips.
  const segments = useMemo(() => {
    const segs: Segment[] = [];
    for (const e of ordered) {
      const last = segs[segs.length - 1];
      if (last && last.type === e.type && last.hop === e.hop) {
        last.count += 1;
        last.lastTs = e.ts;
      } else {
        segs.push({ hop: e.hop, type: e.type, firstSeq: e.seq, count: 1, firstTs: e.ts, lastTs: e.ts });
      }
    }
    return segs;
  }, [ordered]);

  const selected = ordered.find((e) => e.seq === selectedSeq) ?? null;

  const hops: Hop[] = ["app", "agui", "hermes"];

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-auto px-5 py-4">
        {/* Legend */}
        <div className="mb-4 flex items-center gap-4 chrome text-[var(--faint)]">
          {hops.map((h) => (
            <span key={h} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: HOP_COLOR[h] }} />
              {HOP_LABEL[h]}
            </span>
          ))}
          <span className="ml-auto normal-case tracking-normal">{ordered.length} events · {segments.length} phases</span>
        </div>

        <div className="flex flex-col">
          {segments.map((s, i) => {
            const color = HOP_COLOR[s.hop];
            const dt = Math.max(0, Math.round((s.firstTs - t0) * 1000));
            const span = Math.max(0, Math.round((s.lastTs - s.firstTs) * 1000));
            const active = selected?.seq === s.firstSeq || (selected != null && selected.seq >= s.firstSeq && selected.seq < s.firstSeq + s.count);
            const isFirst = i === 0;
            const isLast = i === segments.length - 1;
            return (
              <div key={`${s.firstSeq}-${s.type}`} className="flex gap-3">
                <div className="w-14 shrink-0 pt-2 text-right font-mono text-[10px] tabular-nums text-[var(--faint)]">
                  +{dt}
                </div>
                {/* Spine column */}
                <div className="relative flex w-4 shrink-0 justify-center">
                  <span
                    className="absolute w-px"
                    style={{
                      top: isFirst ? "14px" : 0,
                      bottom: isLast ? "auto" : 0,
                      height: isLast ? "14px" : undefined,
                      background: "var(--line)",
                    }}
                  />
                  <span
                    className="absolute top-[9px] h-2.5 w-2.5 rounded-full ring-2"
                    style={{ background: color, color, boxShadow: `0 0 7px ${color}`, ["--tw-ring-color" as string]: "var(--bg)" }}
                  />
                </div>
                {/* Card */}
                <button
                  onClick={() => setSelectedSeq(s.firstSeq)}
                  className="mb-1.5 flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all hover:translate-x-0.5"
                  style={{
                    borderColor: active ? color : "var(--line)",
                    background: active ? `color-mix(in oklab, ${color} 12%, var(--panel-raised))` : "var(--panel-raised)",
                    boxShadow: active ? `inset 2px 0 0 ${color}` : `inset 2px 0 0 color-mix(in oklab, ${color} 45%, transparent)`,
                  }}
                >
                  <span className="chrome shrink-0" style={{ color }}>{HOP_LABEL[s.hop]}</span>
                  <span className="font-mono text-[12px] text-[var(--text)]">{s.type}</span>
                  {s.count > 1 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                      style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
                    >
                      ×{s.count}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--faint)]">
                    {s.count > 1 ? `${span}ms` : `#${s.firstSeq}`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-[38%] min-w-[300px] border-l border-[var(--line)] glass">
        {selected ? (
          <EventInspector event={selected} firstTs={t0} color={HOP_COLOR[selected.hop]} hopLabel={HOP_LABEL[selected.hop]} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
            Select a phase to inspect its raw AG-UI payload.
          </div>
        )}
      </div>
    </div>
  );
}
