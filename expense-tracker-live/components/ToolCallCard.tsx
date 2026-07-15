"use client";

// Renders a single Hermes tool call inside the CopilotKit chat. Hermes' tools
// (search_files, read_file, patch, terminal, todo, …) execute SERVER-SIDE and
// arrive as AG-UI TOOL_CALL_* / TOOL_CALL_RESULT events; CopilotKit's default
// UI shows just a name, so we register this via a wildcard useCopilotAction
// ({ name: "*" }) to surface what the agent actually did.

import { InlineLocationChip } from "@/components/InlineLocationChip";

type Status = "inProgress" | "executing" | "complete";

const ICONS: Record<string, string> = {
  search_files: "🔎",
  read_file: "📖",
  write_file: "✍️",
  patch: "🔧",
  terminal: "⌥",
  todo: "✓",
  web_search: "🌐",
  delegate_task: "🤝",
};

// Pull the most meaningful argument out of a tool call for a one-line summary.
function summarize(args: Record<string, unknown> | undefined): string {
  if (!args) return "";
  const a = args as Record<string, string>;
  const val =
    a.command ?? a.pattern ?? a.query ?? a.regex ?? a.content;
  if (typeof val === "string") return val.length > 80 ? val.slice(0, 80) + "…" : val;
  const first = Object.values(args)[0];
  return typeof first === "string" ? first.slice(0, 80) : "";
}

export function ToolCallCard({
  name,
  args,
  status,
  result,
}: {
  name: string;
  args?: Record<string, unknown>;
  status: Status;
  result?: unknown;
}) {
  const running = status !== "complete";
  const location =
    typeof args?.path === "string"
      ? args.path
      : typeof args?.file_path === "string"
        ? args.file_path
        : "";
  const summary = summarize(args);
  const resultText =
    typeof result === "string" ? result : result != null ? JSON.stringify(result) : "";

  return (
    <div className="my-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden>{ICONS[name] ?? "🛠️"}</span>
        <span className="font-medium">{name}</span>
        {location && <InlineLocationChip path={location} />}
        {summary && (
          <code className="truncate rounded bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-xs text-[var(--color-ink)]">
            {summary}
          </code>
        )}
        <span className="ml-auto shrink-0">
          {running ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
          ) : (
            <span className="text-[var(--color-positive)]">✓</span>
          )}
        </span>
      </div>
      {!running && resultText && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-[var(--color-muted)]">result</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--color-canvas)] p-2 text-xs">
            {resultText.length > 1200 ? resultText.slice(0, 1200) + "\n…" : resultText}
          </pre>
        </details>
      )}
    </div>
  );
}
