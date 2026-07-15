"use client";

import { useEffect, useState } from "react";
import type { RunRow, TraceEvent } from "@/lib/types";
import { getRun } from "@/lib/api";
import { reconstruct } from "@/lib/reconstruct";
import { ReplayView } from "./ReplayView";
import { ProtocolView } from "./ProtocolView";
import { FlowView } from "./FlowView";

type Mode = "replay" | "flow" | "protocol";

export function ConversationView({
  runId,
  run,
  liveEvents,
}: {
  runId?: string;
  run?: RunRow;
  liveEvents?: TraceEvent[];
}) {
  const [mode, setMode] = useState<Mode>("replay");
  const [fetchedEvents, setFetchedEvents] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const isLive = !!liveEvents;

  useEffect(() => {
    if (isLive || !runId) {
      setFetchedEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRun(runId)
      .then((r) => {
        if (!cancelled) setFetchedEvents(r.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setFetchedEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, isLive]);

  if (!runId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
        <span className="text-2xl">
          <span style={{ color: "var(--copilot-2)" }}>⇄</span>{" "}
          <span style={{ color: "var(--hermes)" }}>☤</span>
        </span>
        Select a conversation to trace it end to end.
      </div>
    );
  }

  const events = isLive ? liveEvents! : fetchedEvents;
  const items = reconstruct(events);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--panel)_75%,transparent)] px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text)]">
            {run?.preview || runId}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-[var(--muted)]">
            {isLive && (
              <span className="inline-block h-1.5 w-1.5 rounded-full live-dot" style={{ background: "var(--copilot)", color: "var(--copilot)" }} />
            )}
            <span style={isLive ? { color: "var(--copilot-2)" } : undefined}>
              {isLive ? "live" : run?.status ?? ""}
            </span>
            <span className="text-[var(--faint)]">·</span>
            <span>{events.length} events</span>
          </div>
        </div>
        <div className="flex rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 text-xs">
          {(["replay", "flow", "protocol"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="rounded-md px-3 py-1 capitalize transition-colors"
                style={
                  active
                    ? {
                        background: "color-mix(in oklab, var(--copilot) 18%, var(--panel-raised))",
                        color: "var(--text)",
                        boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--copilot) 45%, transparent)",
                      }
                    : { color: "var(--muted)" }
                }
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-[var(--muted)]">Loading…</div>
        ) : mode === "replay" ? (
          <div className="h-full overflow-y-auto">
            <ReplayView items={items} />
          </div>
        ) : mode === "flow" ? (
          <FlowView events={events} isLive={isLive} />
        ) : (
          <ProtocolView events={events} />
        )}
      </div>
    </div>
  );
}
