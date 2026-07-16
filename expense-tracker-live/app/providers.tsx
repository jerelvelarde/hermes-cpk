"use client";

import {
  CopilotKitProvider,
  CopilotChat,
  useAgentContext,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { ToolCallCard } from "@/components/ToolCallCard";
import { DiffCard } from "@/components/DiffCard";
import { PdfViewer } from "@/components/PdfViewer";
import { GroupedMessageView } from "@/components/GroupedMessageView";
import {
  byCategory,
  budgetRemaining,
  categoryBreakdown,
  currency,
  monthLabel,
  recentExpenses,
  totalThisMonth,
} from "@/lib/analytics";
import { MONTHLY_BUDGET } from "@/lib/expenses";

// Grounding: replaces V1 useCopilotReadable. Same {description, value} shape.
function LedgerContext() {
  useAgentContext({
    description: "Ledger dashboard data currently shown to the user",
    value: {
      month: monthLabel(),
      monthlyBudget: currency(MONTHLY_BUDGET),
      spentThisMonth: currency(totalThisMonth()),
      remaining: currency(budgetRemaining()),
      categories: byCategory().map((item) => ({
        category: item.category,
        amount: currency(item.amount),
        share: `${item.share}%`,
      })),
      recentTransactions: recentExpenses(6).map((expense) => ({
        merchant: expense.merchant,
        category: expense.category,
        amount: currency(expense.amount),
        date: expense.date,
        description: expense.description,
      })),
      categorySummary: categoryBreakdown(),
    },
  });
  return null;
}

// Last-known content per file, seeded from OpenClaw's own read_file results so a
// write_file can be diffed against what the file was before the edit.
const fileCache = new Map<string, string>();

function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "content" in v && typeof (v as { content: unknown }).content === "string") {
    return (v as { content: string }).content;
  }
  return v == null ? "" : String(v);
}

// V2 wildcard tool renderer (useRenderTool). Note the V2 render-prop shape:
// the tool args come in as `parameters` (not `args`), and `result` is a string.
function ToolRenderer() {
  useRenderTool(
    {
      name: "*",
      render: ({
        name,
        parameters,
        status,
        result,
      }: {
        name: string;
        toolCallId: string;
        parameters: Record<string, unknown>;
        status: "inProgress" | "executing" | "complete";
        result?: string;
      }) => {
        const a = (parameters ?? {}) as Record<string, unknown>;

        // A PDF the agent created/opened → inline viewer (new tab / modal).
        const pathStr = a?.path != null ? String(a.path) : "";
        if (pathStr.toLowerCase().endsWith(".pdf")) {
          return <PdfViewer path={pathStr} />;
        }

        if (name === "read_file" && a?.path != null) {
          if (status === "complete") {
            const text = asText(result);
            if (text) fileCache.set(String(a.path), text);
          }
          return <ToolCallCard name={name} args={a} status={status} result={result} />;
        }
        if (name === "write_file" && a?.path != null) {
          const path = String(a.path);
          return (
            <DiffCard
              kind="write"
              path={path}
              oldText={fileCache.get(path) ?? null}
              newText={asText(a.content)}
              status={status}
            />
          );
        }
        if (name === "patch" && a?.path != null) {
          const path = String(a.path);
          return (
            <DiffCard
              kind="patch"
              path={path}
              oldText={a.old_string != null ? String(a.old_string) : ""}
              newText={a.new_string != null ? String(a.new_string) : ""}
              status={status}
            />
          );
        }
        return <ToolCallCard name={name} args={a} status={status} result={result} />;
      },
    },
    [],
  );
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" showDevConsole={false}>
      <LedgerContext />
      <ToolRenderer />
      {/* Docked two-pane: the app owns the left column (and adapts to its
          width via container queries on .cc-canvas); the V2 chat is a fixed
          right column, so it never overlays the dashboard. */}
      <div className="flex h-screen w-full overflow-hidden">
        <div className="cc-canvas min-w-0 flex-1 overflow-y-auto">{children}</div>
        <aside className="flex w-[27rem] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)]">
          <header className="cc-chat-header">
            <span className="cc-chat-dot" aria-hidden />
            <span>CopilotKit × OpenClaw</span>
            <span className="cc-chat-sub">AG-UI · gpt-5.4</span>
          </header>
          <div className="min-h-0 flex-1" data-copilotkit>
            <CopilotChat
              agentId="default"
              labels={{
                welcomeMessageText:
                  "Hi — I'm OpenClaw, running inside this CopilotKit app. Tell me to change how Financial Ledger looks or works and watch it update live.",
              }}
              // Fold ALL of the turn's tool calls into a single dropdown
              // (reasoning + prose still render inline). See GroupedMessageView.
              chatView={{ messageView: { children: GroupedMessageView } }}
            />
          </div>
        </aside>
      </div>
    </CopilotKitProvider>
  );
}
