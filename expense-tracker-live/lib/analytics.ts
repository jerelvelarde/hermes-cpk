import { EXPENSES, MONTHLY_BUDGET, TODAY, type Category, type Expense } from "./expenses";

export function currency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function monthLabel(): string {
  return new Date(`${TODAY}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

const thisMonth = TODAY.slice(0, 7);

export function monthExpenses(): Expense[] {
  return EXPENSES.filter((expense) => expense.date.startsWith(thisMonth));
}

export function totalThisMonth(): number {
  return monthExpenses().reduce((sum, expense) => sum + expense.amount, 0);
}

export function budgetRemaining(): number {
  return MONTHLY_BUDGET - totalThisMonth();
}

export function byCategory(): { category: Category; amount: number; share: number }[] {
  const total = totalThisMonth();
  const map = new Map<Category, number>();

  for (const expense of monthExpenses()) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
  }

  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function recentExpenses(limit = 8): Expense[] {
  return [...EXPENSES]
    .sort((a, b) => (b.date === a.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
    .slice(0, limit);
}

export function categoryBreakdown() {
  return byCategory().map((item) => `${item.category}: ${currency(item.amount)} (${item.share}%)`);
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
