"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveRecord, RunRow, TraceEvent } from "@/lib/types";
import { listRuns, openTraceStream } from "@/lib/api";
import { StatusBar } from "@/components/StatusBar";
import { ConversationList } from "@/components/ConversationList";
import { ConversationView } from "@/components/ConversationView";

export default function CommandCenterPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [liveEventsByRun, setLiveEventsByRun] = useState<Record<string, TraceEvent[]>>({});
  const selectedRef = useRef<string | undefined>(undefined);
  selectedRef.current = selectedId;

  // Initial history load. Kept in state so we degrade to cached history if the
  // adapter later goes down.
  useEffect(() => {
    listRuns()
      .then((r) => setRuns(r.runs ?? []))
      .catch(() => {});
  }, []);

  // Live stream subscription.
  useEffect(() => {
    const close = openTraceStream((rec: LiveRecord) => {
      if (rec.kind === "run_started") {
        const row: RunRow = {
          run_id: rec.run_id,
          thread_id: rec.thread_id,
          started_at: rec.wall,
          finished_at: null,
          status: "running",
          model: rec.model,
          preview: rec.preview,
          error: null,
        };
        setRuns((prev) => {
          const without = prev.filter((r) => r.run_id !== rec.run_id);
          return [row, ...without];
        });
        setLiveEventsByRun((prev) => ({ ...prev, [rec.run_id]: prev[rec.run_id] ?? [] }));
        // Auto-select the newly live run.
        setSelectedId(rec.run_id);
      } else if (rec.kind === "event") {
        const { kind, ...event } = rec;
        setLiveEventsByRun((prev) => {
          const existing = prev[rec.run_id] ?? [];
          return { ...prev, [rec.run_id]: [...existing, event as TraceEvent] };
        });
      } else if (rec.kind === "run_finished") {
        setRuns((prev) =>
          prev.map((r) =>
            r.run_id === rec.run_id
              ? { ...r, status: rec.status, error: rec.error, finished_at: Date.now() / 1000 }
              : r,
          ),
        );
      }
    });
    return close;
  }, []);

  const selectedRun = runs.find((r) => r.run_id === selectedId);
  // A run is "live" if it's currently running and we hold its streamed events.
  const isLive = !!selectedId && selectedRun?.status === "running" && !!liveEventsByRun[selectedId];
  const liveEvents = isLive ? liveEventsByRun[selectedId!] : undefined;

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)]">
      <StatusBar />
      <div className="flex min-h-0 flex-1">
        <aside className="w-[320px] shrink-0 border-r border-[var(--line)] bg-[var(--panel)]">
          <ConversationList runs={runs} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <main className="min-w-0 flex-1">
          <ConversationView
            runId={selectedId}
            run={selectedRun}
            liveEvents={liveEvents}
          />
        </main>
      </div>
    </div>
  );
}
