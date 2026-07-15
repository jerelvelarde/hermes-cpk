import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  icon?: ReactNode;
}) {
  const valueColor =
    tone === "positive"
      ? "text-[var(--color-positive)]"
      : tone === "negative"
        ? "text-[var(--color-negative)]"
        : "text-[var(--color-ink)]";

  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-white/60 bg-white/72 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-muted)]">{label}</p>
        {icon ? <span className="text-[var(--color-brand)]">{icon}</span> : null}
      </div>
      <p className={`mt-3 text-[clamp(1.75rem,5vw,2.25rem)] leading-none font-semibold tracking-tight ${valueColor}`}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-sm text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  );
}
