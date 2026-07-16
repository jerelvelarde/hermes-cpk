export function BudgetProgress({ spent, budget }: { spent: number; budget: number }) {
  const ratio = budget === 0 ? 0 : spent / budget;
  const progress = Math.min(Math.max(ratio * 100, 0), 100);
  const overBudget = spent > budget;

  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-[var(--color-muted)]">Budget cap</p>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[clamp(1.75rem,5vw,2.25rem)] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-ink)]">
          ${budget.toLocaleString("en-US")}
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            overBudget
              ? "bg-[color-mix(in_oklab,var(--color-negative)_14%,white)] text-[var(--color-negative)]"
              : "bg-[color-mix(in_oklab,var(--color-positive)_14%,white)] text-[var(--color-positive)]"
          }`}
        >
          {overBudget ? "Over budget" : "Healthy"}
        </span>
      </div>
      <div className="mt-5 h-3 rounded-full bg-white">
        <div
          className={`h-full rounded-full ${overBudget ? "bg-[var(--color-negative)]" : "bg-[var(--color-brand)]"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
        <span>{spent.toLocaleString("en-US", { style: "currency", currency: "USD" })} spent</span>
        <span>{Math.round(ratio * 100)}% used</span>
      </div>
    </div>
  );
}
