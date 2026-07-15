export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const valueColor =
    tone === "positive"
      ? "text-[var(--color-positive)]"
      : tone === "negative"
        ? "text-[var(--color-negative)]"
        : "text-[var(--color-ink)]";
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
      <p className="text-sm font-medium text-[var(--color-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
