"use client";

import type { ReactElement } from "react";
import { CopilotChatToolCallsView } from "@copilotkit/react-core/v2";

// The whole assistant turn streams as many messages — reasoning, several
// tool-only messages, then prose. The per-message `toolCallsView` slot would
// render one "Used 1 tool" disclosure per message. Instead we take over the
// message-view body (`messageView.children`) so we can pull EVERY tool-bearing
// message out of the flow and fold them all into ONE dropdown, while reasoning
// ("Thought for …"), the turn indicator, and the assistant's prose still render
// inline in order.
//
// NOTE: `messageElements` is NOT index-aligned with `messages` — internally it's
// `deduplicatedMessages.flatMap(renderBlock)`, so one message can emit several
// elements (its bubble + an IntelligenceIndicator). We therefore match on each
// element's React `key`, which the view sets to the source `message.id`.

type AssistantLike = {
  id: string;
  role?: string;
  toolCalls?: unknown[];
};

type MessageViewChildrenProps = {
  isRunning: boolean;
  messages: AssistantLike[];
  messageElements: ReactElement[];
  interruptElement: ReactElement | null;
};

function isToolMessage(m: AssistantLike): boolean {
  return m?.role === "assistant" && Array.isArray(m.toolCalls) && m.toolCalls.length > 0;
}

export function GroupedMessageView({
  messages,
  messageElements,
  interruptElement,
}: MessageViewChildrenProps) {
  // id -> message, for every tool-bearing assistant message
  const toolById = new Map<string, AssistantLike>();
  for (const m of messages) {
    if (isToolMessage(m)) toolById.set(String(m.id), m);
  }

  const out: ReactElement[] = [];
  const groupOrder: string[] = []; // tool message ids in render order
  let anchor = -1; // index in `out` where the single dropdown belongs

  for (const el of messageElements) {
    const key = el.key != null ? String(el.key) : "";
    if (toolById.has(key)) {
      if (anchor === -1) anchor = out.length; // right after whatever preceded the first tool
      if (!groupOrder.includes(key)) groupOrder.push(key);
      continue; // don't render inline — it goes inside the dropdown
    }
    out.push(el);
  }

  if (groupOrder.length) {
    const total = groupOrder.reduce(
      (n, id) => n + (toolById.get(id)?.toolCalls?.length ?? 0),
      0,
    );
    const group = (
      <details className="cc-tools" key="tool-group">
        <summary className="cc-tools-summary">
          <span className="cc-tools-chevron" aria-hidden>
            ▸
          </span>
          <span className="cc-tools-icon" aria-hidden>
            🔧
          </span>
          Used {total} tool{total > 1 ? "s" : ""}
        </summary>
        <div className="cc-tools-body">
          {groupOrder.map((id) => (
            <CopilotChatToolCallsView
              key={id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              message={toolById.get(id) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              messages={messages as any}
            />
          ))}
        </div>
      </details>
    );
    out.splice(anchor >= 0 ? anchor : out.length, 0, group);
  }

  if (interruptElement) out.push(interruptElement);

  return <>{out}</>;
}
