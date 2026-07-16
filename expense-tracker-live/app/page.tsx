import { ArrowUpRight, CircleDollarSign, Sparkles, Wallet } from "lucide-react";
import { BudgetProgress } from "@/components/BudgetProgress";
import { CategoryChart } from "@/components/CategoryChart";
import { ExpenseList } from "@/components/ExpenseList";
import { StatCard } from "@/components/StatCard";
import {
  byCategory,
  budgetRemaining,
  currency,
  monthLabel,
  recentExpenses,
  totalThisMonth,
  CATEGORY_COLOR,
} from "@/lib/analytics";
import { MONTHLY_BUDGET } from "@/lib/expenses";

export default function Home() {
  const spent = totalThisMonth();
  const remaining = budgetRemaining();
  const budgetUsedPercent = Math.round((spent / MONTHLY_BUDGET) * 100);
  const categories = byCategory().map((item) => ({
    ...item,
    color: CATEGORY_COLOR[item.category],
  }));
  const topCategory = categories[0];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 md:px-10 lg:px-12">
      <div className="cc-shell">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[calc(var(--radius-card)+8px)] border border-[var(--color-line)] bg-[linear-gradient(135deg,var(--color-surface),var(--color-brand-soft))] shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="cc-hero p-6 lg:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-sm text-[var(--color-muted)] backdrop-blur">
                  <Sparkles className="h-4 w-4 text-[var(--color-brand)]" />
                  Self-editing finance dashboard
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-brand)] text-white shadow-lg shadow-[color-mix(in_oklab,var(--color-brand)_28%,transparent)]">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Financial Ledger</h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{monthLabel()} spending, budget, and the story behind every swipe.</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
                  <StatCard
                    label="Spent so far"
                    value={currency(spent)}
                    hint={`${budgetUsedPercent}% of ${currency(MONTHLY_BUDGET)}`}
                    icon={<CircleDollarSign className="h-5 w-5" />}
                  />
                  <StatCard
                    label="Left to spend"
                    value={currency(remaining)}
                    hint={remaining >= 0 ? "Still under target" : "You are over budget"}
                    tone={remaining >= 0 ? "positive" : "negative"}
                    icon={<ArrowUpRight className="h-5 w-5" />}
                  />
                  <StatCard
                    label="Biggest spend"
                    value={topCategory?.category ?? "—"}
                    hint={topCategory ? currency(topCategory.amount) : "No expenses yet"}
                  />
                </div>
              </div>
              <BudgetProgress spent={spent} budget={MONTHLY_BUDGET} />
            </div>
          </div>

          <div className="cc-split">
            <CategoryChart data={categories} />
            <ExpenseList expenses={recentExpenses(10)} />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
            <p className="text-sm font-medium text-[var(--color-muted)]">Live CopilotKit × OpenClaw sidebar</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Change Financial Ledger without leaving the page</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Open the sidebar on the right and ask OpenClaw to restyle cards, add features, tweak seeded data,
              or reshape the dashboard. The app is wired to the OpenClaw AG-UI adapter in this folder.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
              <li>• “Make the dashboard dark mode by default.”</li>
              <li>• “Add a merchants filter above recent transactions.”</li>
              <li>• “Raise my monthly budget to $3,800 and add a travel category.”</li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-muted)]">Category snapshot</p>
                <h2 className="mt-1 text-lg font-semibold">Where the money is going</h2>
              </div>
              <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand)]">
                {categories.length} categories
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <div key={category.category}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                      <span className="font-medium text-[var(--color-ink)]">{category.category}</span>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1 text-right">
                      <span className="font-semibold tabular-nums text-[var(--color-ink)]">{currency(category.amount)}</span>
                      <span className="text-[var(--color-muted)]">{category.share}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-brand-soft)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(category.share, 6)}%`, background: category.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
