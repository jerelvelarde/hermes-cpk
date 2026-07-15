"use client";

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Category } from "@/lib/expenses";

export function CategoryChart({
  data,
}: {
  data: { category: Category; amount: number; share: number; color: string }[];
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">Breakdown</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Spending by category</h2>
        </div>
        <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand)]">
          This month
        </span>
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-center gap-6">
        <div className="mx-auto aspect-square w-full max-w-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={64}
                outerRadius={96}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  value.toLocaleString("en-US", { style: "currency", currency: "USD" })
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 space-y-3">
          {data.map((item) => (
            <div key={item.category} className="rounded-2xl bg-[var(--color-surface-muted)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="font-medium text-[var(--color-ink)]">{item.category}</span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-[var(--color-ink)]">
                  {item.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
                <span>{item.share}% of monthly spend</span>
                <span>{item.amount > 500 ? "Heavy" : item.amount > 100 ? "Medium" : "Light"} spend</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
