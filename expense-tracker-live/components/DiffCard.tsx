"use client";

import { useMemo, useState } from "react";
import { lineDiff, diffStats } from "@/lib/diff";
import { InlineLocationChip } from "@/components/InlineLocationChip";

type Kind = "write" | "patch";
type Status = "inProgress" | "executing" | "complete";

const MAX_ROWS = 40;

// Human-in-the-loop edit card: when OpenClaw writes/patches a file, show the
// red/green diff and offer an Undo that reverts the change on disk (which
// hot-reloads the app back).
export function DiffCard({
  kind,
  path,
  oldText,
  newText,
  status,
}: {
  kind: Kind;
  path: string;
  oldText: string | null;
  newText: string;
  status: Status;
}) {
  const lines = useMemo(() => lineDiff(oldText ?? "", newText), [oldText, newText]);
  const { add, del } = diffStats(lines);
  const [expanded, setExpanded] = useState(false);
  const [undoState, setUndoState] = useState<"idle" | "reverting" | "reverted" | "error">("idle");

  const running = status !== "complete";
  const canUndo = !running && (kind === "patch" ? true : oldText != null);
  const shown = expanded ? lines : lines.slice(0, MAX_ROWS);
  const hidden = lines.length - shown.length;

  async function undo() {
    setUndoState("reverting");
    try {
      if (kind === "patch") {
        const r = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        const { content } = (await r.json()) as { content: string | null };
        if (content == null) throw new Error("could not read file");
        const reverted = content.replace(newText, oldText ?? "");
        await fetch("/api/file", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path, content: reverted }),
        });
      } else {
        await fetch("/api/file", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path, content: oldText ?? "" }),
        });
      }
      setUndoState("reverted");
    } catch {
      setUndoState("error");
    }
  }

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] bg-[color-mix(in_oklab,var(--color-brand)_4%,white)] text-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span aria-hidden>{kind === "patch" ? "🩹" : "📝"}</span>
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          {running ? "Editing" : "Edited"}
        </span>
        <InlineLocationChip path={path} />
        <span className="ml-auto flex items-center gap-2 font-mono text-xs">
          {add > 0 && <span className="text-[var(--color-brand)] dark:text-[var(--color-brand-soft)]">+{add}</span>}
          {del > 0 && <span className="text-red-500">−{del}</span>}
          {running ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
          ) : (
            <span className="text-[var(--color-brand)] dark:text-[var(--color-brand-soft)]">✓</span>
          )}
        </span>
      </div>

      <div className="max-h-64 overflow-auto border-t border-[color-mix(in_oklab,var(--color-brand)_15%,transparent)] bg-black/[0.03] font-mono text-[11px] leading-relaxed dark:bg-black/20">
        {shown.map((l, i) => (
          <div
            key={i}
            className={
              l.type === "add"
                ? "whitespace-pre-wrap bg-emerald-500/10 px-3 text-emerald-800 dark:text-emerald-200"
                : l.type === "del"
                  ? "whitespace-pre-wrap bg-red-500/10 px-3 text-red-700 dark:text-red-300"
                  : "whitespace-pre-wrap px-3 text-neutral-500"
            }
          >
            <span className="mr-2 select-none opacity-50">
              {l.type === "add" ? "+" : l.type === "del" ? "−" : " "}
            </span>
            {l.text || " "}
          </div>
        ))}
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full px-3 py-1 text-left text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            … {hidden} more lines
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[color-mix(in_oklab,var(--color-brand)_15%,transparent)] px-3 py-2">
        {undoState === "reverted" ? (
          <span className="font-mono text-xs text-neutral-500">↩ reverted</span>
        ) : undoState === "error" ? (
          <span className="font-mono text-xs text-red-500">undo failed</span>
        ) : (
          <button
            onClick={undo}
            disabled={!canUndo || undoState === "reverting"}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-200"
            title={canUndo ? "Revert this edit on disk" : "No prior snapshot to restore"}
          >
            {undoState === "reverting" ? "Reverting…" : "Undo"}
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          {kind === "patch" ? "openclaw · patch" : "openclaw · write_file"}
        </span>
      </div>
    </div>
  );
}
