"use client";

import { Led } from "./Brand";

export type PillState = "ok" | "warn" | "err" | "unknown";
export type Brand = "copilot" | "hermes" | "neutral";

const LED: Record<PillState, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  err: "var(--err)",
  unknown: "var(--faint)",
};

const BRAND_COLOR: Record<Brand, string> = {
  copilot: "var(--copilot)",
  hermes: "var(--hermes)",
  neutral: "var(--muted)",
};

export function ServicePill({
  label,
  state,
  detail,
  brand = "neutral",
  mark,
}: {
  label: string;
  state: PillState;
  detail?: string;
  brand?: Brand;
  mark?: React.ReactNode;
}) {
  const brandColor = BRAND_COLOR[brand];
  const live = state === "ok";
  return (
    <div
      title={detail}
      className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 transition-colors"
      style={{
        borderColor: `color-mix(in oklab, ${brandColor} 26%, var(--line))`,
        background: `color-mix(in oklab, ${brandColor} 6%, var(--panel-raised))`,
      }}
    >
      {mark && <span className="shrink-0">{mark}</span>}
      <div className="flex flex-col leading-none">
        <span className="chrome text-[var(--muted)]">{label}</span>
        <span className="mt-1 font-mono text-[11px] tracking-wide text-[var(--text)]">
          {detail ?? "—"}
        </span>
      </div>
      <Led color={LED[state]} live={live} />
    </div>
  );
}
