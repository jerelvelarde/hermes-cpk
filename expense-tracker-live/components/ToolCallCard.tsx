"use client";

// One OpenClaw tool call, rendered as a COMPACT ROW for the grouped
// "Used N tools" dropdown. OpenClaw's tools (search_files, read_file, terminal,
// todo, …) run server-side and arrive as AG-UI TOOL_CALL_* events; the wildcard
// renderer in providers.tsx routes edits to <DiffCard> and PDFs to <PdfViewer>,
// and everything else here. Each row is a one-liner (icon · name · path · arg ·
// status); if there's a result it becomes a click-to-expand disclosure.

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
  const val = a.command ?? a.pattern ?? a.query ?? a.regex ?? a.content;
  const pick = typeof val === "string" ? val : (Object.values(args).find((v) => typeof v === "string") as string | undefined);
  if (!pick) return "";
  const oneLine = pick.replace(/\s+/g, " ").trim();
  return oneLine.length > 72 ? oneLine.slice(0, 72) + "…" : oneLine;
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

  const row = (
    <div className="flex min-w-0 items-center gap-2 py-1.5">
      <span className="shrink-0 text-[13px] leading-none" aria-hidden>
        {ICONS[name] ?? "🛠️"}
      </span>
      <span className="shrink-0 text-[13px] font-medium text-[var(--color-ink)]">{name}</span>
      {location && <InlineLocationChip path={location} />}
      {summary && (
        <code className="min-w-0 flex-1 truncate rounded bg-[var(--color-canvas)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-muted)]">
          {summary}
        </code>
      )}
      <span className="ml-auto shrink-0 text-xs">
        {running ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
        ) : (
          <span className="text-[var(--color-positive)]">✓</span>
        )}
      </span>
    </div>
  );

  const border = "border-b border-[color-mix(in_oklab,var(--color-line)_65%,transparent)] last:border-b-0";

  // With a result → click-to-expand disclosure; otherwise a plain compact row.
  if (!running && resultText) {
    return (
      <details className={`group/tool ${border}`}>
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          {row}
        </summary>
        <pre className="mb-1.5 ml-6 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-canvas)] p-2 text-[11px] text-[var(--color-ink)]">
          {resultText.length > 1200 ? resultText.slice(0, 1200) + "\n…" : resultText}
        </pre>
      </details>
    );
  }
  return <div className={border}>{row}</div>;
}
