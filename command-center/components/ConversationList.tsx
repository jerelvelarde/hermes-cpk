"use client";

import type { RunRow } from "@/lib/types";

const STATUS_COLOR: Record<RunRow["status"], string> = {
  running: "var(--copilot)",
  finished: "var(--ok)",
  error: "var(--err)",
};

function relativeTime(startedAt: number): string {
  if (!startedAt) return "";
  const deltaMs = Date.now() - startedAt * 1000;
  const sec = Math.max(0, Math.round(deltaMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export function ConversationList({
  runs,
  selectedId,
  onSelect,
}: {
  runs: RunRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  // Running runs pinned at the top, then most recent by start time.
  const ordered = [...runs].sort((a, b) => {
    const ra = a.status === "running" ? 1 : 0;
    const rb = b.status === "running" ? 1 : 0;
    if (ra !== rb) return rb - ra;
    return (b.started_at || 0) - (a.started_at || 0);
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="glass sticky top-0 z-10 border-b border-[var(--line)] px-4 py-3 chrome text-[var(--muted)]">
        Conversations
      </div>
      {ordered.length === 0 && (
        <div className="px-4 py-6 text-sm text-[var(--muted)]">No runs yet.</div>
      )}
      {ordered.map((run) => {
        const active = run.run_id === selectedId;
        const live = run.status === "running";
        const dot = STATUS_COLOR[run.status];
        return (
          <button
            key={run.run_id}
            onClick={() => onSelect(run.run_id)}
            className="relative flex flex-col gap-1 border-b border-[var(--line)] px-4 py-3 pl-5 text-left transition-colors hover:bg-[var(--panel-raised)]"
            style={active ? { background: "var(--panel-raised)" } : undefined}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[3px]"
                style={{ background: "linear-gradient(var(--copilot), var(--hermes))" }}
              />
            )}
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${live ? "live-dot" : ""}`}
                style={{ background: dot, boxShadow: live ? `0 0 8px ${dot}` : undefined }}
              />
              <span className="truncate text-sm text-[var(--text)]">{run.preview || run.run_id}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-4 font-mono text-[10px] tabular-nums text-[var(--muted)]">
              <span style={live ? { color: "var(--copilot-2)" } : undefined}>
                {live ? "live" : run.status}
              </span>
              <span className="text-[var(--faint)]">·</span>
              <span>{relativeTime(run.started_at)}</span>
              {run.model && (
                <>
                  <span className="text-[var(--faint)]">·</span>
                  <span className="truncate">{run.model}</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
