"use client";

// Renders a single reconstructed Hermes tool call in the ReplayView. Ported
// from expense-tracker-live/components/ToolCallCard.tsx — the difference is the
// Command Center works from stored trace data (args as a raw JSON string,
// result as text) rather than live CopilotKit action state. Tool calls are the
// Hermes agent acting, so they carry the Hermes gold accent.

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
function summarize(argsJson: string): string {
  if (!argsJson) return "";
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(argsJson);
  } catch {
    return argsJson.length > 80 ? argsJson.slice(0, 80) + "…" : argsJson;
  }
  if (!parsed) return "";
  const a = parsed as Record<string, string>;
  const val =
    a.path ?? a.file_path ?? a.command ?? a.pattern ?? a.query ?? a.regex ?? a.content;
  if (typeof val === "string") return val.length > 80 ? val.slice(0, 80) + "…" : val;
  const first = Object.values(parsed)[0];
  return typeof first === "string" ? first.slice(0, 80) : "";
}

export function ToolCard({
  name,
  args,
  result,
}: {
  name: string;
  args: string;
  result?: string;
}) {
  const running = result == null;
  const summary = summarize(args);

  return (
    <div
      className="my-1.5 rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: "color-mix(in oklab, var(--hermes) 22%, var(--line))",
        background: "color-mix(in oklab, var(--hermes) 4%, var(--panel-raised))",
        borderLeft: "3px solid color-mix(in oklab, var(--hermes) 70%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden>{ICONS[name] ?? "🛠️"}</span>
        <span className="font-medium text-[var(--text)]">{name || "tool"}</span>
        {summary && (
          <code
            className="truncate rounded px-1.5 py-0.5 font-mono text-xs"
            style={{ background: "var(--panel)", color: "var(--hermes)" }}
          >
            {summary}
          </code>
        )}
        <span className="ml-auto shrink-0">
          {running ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--hermes)] border-t-transparent" />
          ) : (
            <span style={{ color: "var(--hermes)" }}>✓</span>
          )}
        </span>
      </div>
      {!running && result && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-[var(--muted)]">result</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--panel)] p-2 text-xs text-[var(--text)]">
            {result.length > 1200 ? result.slice(0, 1200) + "\n…" : result}
          </pre>
        </details>
      )}
    </div>
  );
}
