"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Category } from "@/lib/expenses";

export function CategoryChart({
  data,
}: {
  data: { category: Category; amount: number; color: string }[];
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
      <h2 className="text-base font-semibold">Spending by category</h2>
      <p className="text-sm text-[var(--color-muted)]">This month</p>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.category} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-2">
          {data.map((d) => (
            <li key={d.category} className="flex items-center gap-3 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
              <span className="flex-1">{d.category}</span>
              <span className="font-medium tabular-nums">
                {d.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
