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
  date: string;
  merchant: string;
  description: string;
  category: Category;
  amount: number;
}

export const MONTHLY_BUDGET = 3200;

export const EXPENSES: Expense[] = [
  { id: "e01", date: "2026-07-08", merchant: "Blue Bottle", description: "Cold brew and croissant", category: "Food", amount: 12.75 },
  { id: "e02", date: "2026-07-08", merchant: "Muni", description: "Clipper card reload", category: "Transport", amount: 25.0 },
  { id: "e03", date: "2026-07-07", merchant: "Whole Foods", description: "Groceries for the week", category: "Food", amount: 94.18 },
  { id: "e04", date: "2026-07-07", merchant: "Netflix", description: "Monthly subscription", category: "Entertainment", amount: 15.99 },
  { id: "e05", date: "2026-07-06", merchant: "Chevron", description: "Gas fill-up", category: "Transport", amount: 57.22 },
  { id: "e06", date: "2026-07-06", merchant: "Amazon", description: "USB-C dock for desk setup", category: "Shopping", amount: 41.6 },
  { id: "e07", date: "2026-07-05", merchant: "PG&E", description: "Electric bill", category: "Utilities", amount: 131.84 },
  { id: "e08", date: "2026-07-05", merchant: "Sweetgreen", description: "Lunch after gym", category: "Food", amount: 17.34 },
  { id: "e09", date: "2026-07-04", merchant: "One Medical", description: "Virtual urgent care", category: "Health", amount: 49.0 },
  { id: "e10", date: "2026-07-04", merchant: "Spotify", description: "Family plan renewal", category: "Entertainment", amount: 16.99 },
  { id: "e11", date: "2026-07-03", merchant: "Landlord LLC", description: "July rent", category: "Housing", amount: 2100.0 },
  { id: "e12", date: "2026-07-03", merchant: "Sonic", description: "Home internet", category: "Utilities", amount: 79.99 },
  { id: "e13", date: "2026-07-02", merchant: "Equinox", description: "Monthly membership", category: "Health", amount: 185.0 },
  { id: "e14", date: "2026-07-02", merchant: "Target", description: "Kitchen storage bins", category: "Shopping", amount: 26.47 },
  { id: "e15", date: "2026-07-01", merchant: "AMC Theatres", description: "Movie tickets for two", category: "Entertainment", amount: 37.5 },
  { id: "e16", date: "2026-06-30", merchant: "Trader Joe's", description: "Snacks and fruit", category: "Food", amount: 43.12 },
  { id: "e17", date: "2026-06-29", merchant: "Uber", description: "Ride home from airport", category: "Transport", amount: 46.8 },
  { id: "e18", date: "2026-06-28", merchant: "Walgreens", description: "Prescription pickup", category: "Health", amount: 22.15 },
  { id: "e19", date: "2026-06-27", merchant: "Nike", description: "Running socks and tee", category: "Shopping", amount: 68.0 },
  { id: "e20", date: "2026-06-26", merchant: "Chipotle", description: "Dinner burrito bowl", category: "Food", amount: 14.65 }
];
