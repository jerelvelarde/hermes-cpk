import { StatCard } from "@/components/StatCard";
import { CategoryChart } from "@/components/CategoryChart";
import { ExpenseList } from "@/components/ExpenseList";
import {
  byCategory,
  budgetRemaining,
  currency,
  recentExpenses,
  totalThisMonth,
  CATEGORY_COLOR,
} from "@/lib/analytics";
import { MONTHLY_BUDGET } from "@/lib/expenses";

export default function Home() {
  const spent = totalThisMonth();
  const remaining = budgetRemaining();
  const pctUsed = Math.round((spent / MONTHLY_BUDGET) * 100);
  const cats = byCategory().map((c) => ({ ...c, color: CATEGORY_COLOR[c.category] }));
  const top = cats[0];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[var(--color-brand)]" />
          <h1 className="text-xl font-semibold tracking-tight">Ledger</h1>
        </div>
        <p className="mt-2 text-[var(--color-muted)]">
          July 2026 · your spending at a glance
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Spent this month" value={currency(spent)} hint={`${pctUsed}% of budget`} />
        <StatCard
          label="Budget remaining"
          value={currency(remaining)}
          tone={remaining >= 0 ? "positive" : "negative"}
          hint={`of ${currency(MONTHLY_BUDGET)}`}
        />
        <StatCard label="Top category" value={top?.category ?? "—"} hint={top ? currency(top.amount) : ""} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryChart data={cats} />
        <ExpenseList expenses={recentExpenses(8)} />
      </section>
    </main>
  );
}
