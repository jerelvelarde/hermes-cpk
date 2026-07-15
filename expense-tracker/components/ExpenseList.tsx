import { CATEGORY_COLOR, currency, formatDate } from "@/lib/analytics";
import type { Expense } from "@/lib/expenses";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
        <h2 className="text-base font-semibold">Recent transactions</h2>
        <span className="text-sm text-[var(--color-muted)]">{expenses.length} shown</span>
      </div>
      <ul className="divide-y divide-[var(--color-line)]">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ background: CATEGORY_COLOR[e.category] }}
              aria-hidden
            >
              {e.merchant.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{e.merchant}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">{e.description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">{currency(e.amount)}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {e.category} · {formatDate(e.date)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
