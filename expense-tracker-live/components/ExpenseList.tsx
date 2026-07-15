import { CATEGORY_COLOR, currency, formatDate } from "@/lib/analytics";
import type { Expense } from "@/lib/expenses";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">Activity</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Recent transactions</h2>
        </div>
        <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand)]">
          {expenses.length} shown
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-line)]">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-4 px-5 py-4">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-semibold text-white"
              style={{ background: CATEGORY_COLOR[expense.category] }}
              aria-hidden
            >
              {expense.merchant.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-[var(--color-ink)]">{expense.merchant}</p>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                  {expense.category}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[var(--color-muted)]">{expense.description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-[var(--color-ink)]">{currency(expense.amount)}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{formatDate(expense.date)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
