"use client";

import { CopilotKit, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { byCategory, currency, totalThisMonth, budgetRemaining } from "@/lib/analytics";
import { MONTHLY_BUDGET } from "@/lib/expenses";
import { ToolCallCard } from "@/components/ToolCallCard";

// Grounds the assistant in what's currently on screen, so a question like
// "what did I spend the most on this month?" is answered from real data —
// separate from Hermes's ability to edit the app's source.
function LedgerContext() {
  useCopilotReadable({
    description: "The user's Ledger expense summary for the current month",
    value: {
      monthlyBudget: currency(MONTHLY_BUDGET),
      spentThisMonth: currency(totalThisMonth()),
      remaining: currency(budgetRemaining()),
      byCategory: byCategory().map((c) => ({ category: c.category, amount: currency(c.amount) })),
    },
  });
  return null;
}

// Wildcard renderer: paints every Hermes server-side tool call as a branded
// card in the chat instead of the default name-only row.
function ToolRenderer() {
  useCopilotAction({
    name: "*",
    render: ({
      name,
      args,
      status,
      result,
    }: {
      name: string;
      args: Record<string, unknown>;
      status: "inProgress" | "executing" | "complete";
      result?: unknown;
    }) => (
      <ToolCallCard name={name} args={args} status={status} result={result} />
    ),
  });
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="default">
      <LedgerContext />
      <ToolRenderer />
      {children}
      <CopilotSidebar
        defaultOpen
        clickOutsideToClose={false}
        labels={{
          title: "Hermes",
          initial:
            "Hi — I'm the Hermes agent, and I'm running inside this app. Ask me about your spending, or tell me to change how Ledger looks or works and watch it update live.",
        }}
      />
    </CopilotKit>
  );
}
