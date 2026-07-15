"use client";

import { Check, Copy, Folder } from "lucide-react";
import { useState } from "react";

export function InlineLocationChip({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--color-brand)_20%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-brand-soft)_65%,white)] px-2 py-1 text-xs text-[var(--color-ink)] shadow-sm">
      <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" aria-hidden />
      <span className="truncate font-mono">{path}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-white/70 hover:text-[var(--color-brand)]"
        title={copied ? "Copied" : "Copy location"}
        aria-label={copied ? `Copied ${path}` : `Copy ${path}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
