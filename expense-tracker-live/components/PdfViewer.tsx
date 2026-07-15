"use client";

import { useEffect, useState } from "react";

// Inline PDF preview with two actions: open in a new tab, or open in a modal.
// `path` is a file inside the app dir; it's served as binary by /api/pdf.
export function PdfViewer({ path, title }: { path: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const src = `/api/pdf?path=${encodeURIComponent(path)}`;
  const name = title || path.split("/").pop() || "document.pdf";

  // Close the modal on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-sm">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
        <span aria-hidden>📄</span>
        <span className="truncate font-medium text-[var(--color-ink)]">{name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[var(--color-line)] px-2 py-1 text-xs font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
          >
            Open in new tab
          </a>
          <button
            onClick={() => setOpen(true)}
            className="rounded-md px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-brand)" }}
          >
            Open in modal
          </button>
        </div>
      </div>

      {/* Inline preview */}
      <iframe
        src={`${src}#toolbar=0&view=FitH`}
        title={name}
        className="h-64 w-full bg-white"
      />

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
              <span aria-hidden>📄</span>
              <span className="truncate font-semibold text-[var(--color-ink)]">{name}</span>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-md border border-[var(--color-line)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
              >
                Open in new tab
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:bg-black/5 hover:text-[var(--color-ink)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <iframe src={`${src}#view=FitH`} title={name} className="min-h-0 flex-1 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
