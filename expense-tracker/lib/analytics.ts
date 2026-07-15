import { EXPENSES, TODAY, MONTHLY_BUDGET, type Category, type Expense } from "./expenses";

export function currency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const thisMonth = TODAY.slice(0, 7); // "2026-07"

export function monthExpenses(): Expense[] {
  return EXPENSES.filter((e) => e.date.startsWith(thisMonth));
}

export function totalThisMonth(): number {
  return monthExpenses().reduce((sum, e) => sum + e.amount, 0);
}

export function budgetRemaining(): number {
  return MONTHLY_BUDGET - totalThisMonth();
}

export function byCategory(): { category: Category; amount: number }[] {
  const map = new Map<Category, number>();
  for (const e of monthExpenses()) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function recentExpenses(limit = 8): Expense[] {
  return [...EXPENSES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export const CATEGORY_COLOR: Record<Category, string> = {
  Food: "var(--color-cat-food)",
  Transport: "var(--color-cat-transport)",
  Housing: "var(--color-cat-housing)",
  Entertainment: "var(--color-cat-entertainment)",
  Utilities: "var(--color-cat-utilities)",
  Shopping: "var(--color-cat-shopping)",
  Health: "var(--color-cat-health)",
};
