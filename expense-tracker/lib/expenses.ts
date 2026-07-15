// Domain model + seed data for Ledger. Deterministic (authored around TODAY)
// so charts and "this month" math stay stable whenever the demo runs.
// The Hermes agent edits this file live to add expenses, categories, or fields.

export const TODAY = "2026-07-08";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Health",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  description: string;
  category: Category;
  amount: number; // USD
}

export const MONTHLY_BUDGET = 3200;

export const EXPENSES: Expense[] = [
  { id: "e01", date: "2026-07-07", merchant: "Blue Bottle", description: "Cold brew + pastry", category: "Food", amount: 11.5 },
  { id: "e02", date: "2026-07-07", merchant: "Lyft", description: "Ride to office", category: "Transport", amount: 18.2 },
  { id: "e03", date: "2026-07-06", merchant: "Whole Foods", description: "Weekly groceries", category: "Food", amount: 96.34 },
  { id: "e04", date: "2026-07-05", merchant: "Netflix", description: "Monthly subscription", category: "Entertainment", amount: 15.99 },
  { id: "e05", date: "2026-07-05", merchant: "Shell", description: "Gas fill-up", category: "Transport", amount: 52.4 },
  { id: "e06", date: "2026-07-04", merchant: "Amazon", description: "USB-C hub", category: "Shopping", amount: 34.99 },
  { id: "e07", date: "2026-07-03", merchant: "PG&E", description: "Electricity bill", category: "Utilities", amount: 128.7 },
  { id: "e08", date: "2026-07-03", merchant: "Sweetgreen", description: "Lunch", category: "Food", amount: 16.75 },
  { id: "e09", date: "2026-07-02", merchant: "Equinox", description: "Gym membership", category: "Health", amount: 185.0 },
  { id: "e10", date: "2026-07-02", merchant: "Spotify", description: "Family plan", category: "Entertainment", amount: 16.99 },
  { id: "e11", date: "2026-07-01", merchant: "Landlord LLC", description: "July rent", category: "Housing", amount: 2100.0 },
  { id: "e12", date: "2026-07-01", merchant: "Comcast", description: "Internet", category: "Utilities", amount: 79.99 },
  { id: "e13", date: "2026-06-30", merchant: "Trader Joe's", description: "Snacks + coffee", category: "Food", amount: 42.18 },
  { id: "e14", date: "2026-06-29", merchant: "Uber", description: "Airport ride", category: "Transport", amount: 44.6 },
  { id: "e15", date: "2026-06-28", merchant: "AMC Theatres", description: "Movie night x2", category: "Entertainment", amount: 38.5 },
  { id: "e16", date: "2026-06-27", merchant: "Walgreens", description: "Prescription", category: "Health", amount: 24.3 },
  { id: "e17", date: "2026-06-26", merchant: "Nike", description: "Running shoes", category: "Shopping", amount: 119.99 },
  { id: "e18", date: "2026-06-25", merchant: "Chipotle", description: "Dinner", category: "Food", amount: 14.85 },
  { id: "e19", date: "2026-06-24", merchant: "BART", description: "Transit reload", category: "Transport", amount: 40.0 },
  { id: "e20", date: "2026-06-23", merchant: "IKEA", description: "Desk lamp", category: "Shopping", amount: 29.99 },
];
