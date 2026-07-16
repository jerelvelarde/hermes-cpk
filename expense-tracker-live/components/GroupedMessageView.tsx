"use client";

import type { ReactElement } from "react";
import { CopilotChatToolCallsView } from "@copilotkit/react-core/v2";

// An assistant turn streams as many messages — interleaved reasoning
// (role "reasoning", id "think-…"), several tool messages (role "assistant" with
// toolCalls, id "tc-…") + their results (role "tool"), then the final prose
// (role "assistant" with content). Rendered one-per-message that becomes a wall
// of repeated "Thought for X" and "Used 1 tool" rows. We take over the
// message-view body and fold, for the WHOLE turn:
//   • all reasoning → one collapsed "💭 Thought" dropdown
//   • all tool calls → one collapsed "🔧 Used N tools" dropdown
// Prose, the turn indicator, and interrupts render inline, in order.
//
// Elements are wrapped (memoized), so we match them to their source message by
// React `key`, which the view sets to the message id (optionally suffixed with
// "-custom-before" / "-custom-after").

type MessageLike = {
  id: string;
  role?: string;
  content?: unknown; // string for reasoning/assistant; can be a parts array for user
  toolCalls?: unknown[];
};

type MessageViewChildrenProps = {
  isRunning: boolean;
  messages: MessageLike[];
  messageElements: ReactElement[];
  interruptElement: ReactElement | null;
};

const baseKey = (k: string) => k.replace(/-custom-(before|after)$/, "");

function isToolMessage(m: MessageLike): boolean {
  return m?.role === "assistant" && Array.isArray(m.toolCalls) && m.toolCalls.length > 0;
}

export function GroupedMessageView({
  messages,
  messageElements,
  interruptElement,
}: MessageViewChildrenProps) {
  const toolById = new Map<string, MessageLike>();
  const reasoningIds = new Set<string>();
  const reasoningMsgs: MessageLike[] = [];
  for (const m of messages) {
    if (isToolMessage(m)) toolById.set(String(m.id), m);
    else if (m?.role === "reasoning") {
      reasoningIds.add(String(m.id));
      reasoningMsgs.push(m);
    }
  }

  const passthrough: ReactElement[] = [];
  const toolOrder: string[] = [];
  let toolAnchor = -1;
  let reasoningAnchor = -1;

  for (const el of messageElements) {
    const key = el.key != null ? baseKey(String(el.key)) : "";
    if (toolById.has(key)) {
      if (toolAnchor === -1) toolAnchor = passthrough.length;
      if (!toolOrder.includes(key)) toolOrder.push(key);
      continue;
    }
    if (reasoningIds.has(key)) {
      if (reasoningAnchor === -1) reasoningAnchor = passthrough.length;
      continue; // reasoning is rendered from message content, not its element
    }
    passthrough.push(el);
  }

  // One consolidated "Thought" dropdown (collapsed), built from reasoning text.
  let reasoningNode: ReactElement | null = null;
  if (reasoningMsgs.length) {
    const text = reasoningMsgs
      .map((m) => (typeof m.content === "string" ? m.content.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
    reasoningNode = (
      <details className="cc-tools" key="reasoning-group">
        <summary className="cc-tools-summary">
          <span className="cc-tools-chevron" aria-hidden>▸</span>
          <span className="cc-tools-icon" aria-hidden>💭</span>
          Thought{reasoningMsgs.length > 1 ? ` · ${reasoningMsgs.length} steps` : ""}
        </summary>
        <div className="cc-tools-body cc-reasoning-body">{text || "…"}</div>
      </details>
    );
  }

  // One consolidated "Used N tools" dropdown (collapsed).
  let toolsNode: ReactElement | null = null;
  if (toolOrder.length) {
    const total = toolOrder.reduce((n, id) => n + (toolById.get(id)?.toolCalls?.length ?? 0), 0);
    toolsNode = (
      <details className="cc-tools" key="tool-group">
        <summary className="cc-tools-summary">
          <span className="cc-tools-chevron" aria-hidden>▸</span>
          <span className="cc-tools-icon" aria-hidden>🔧</span>
          Used {total} tool{total > 1 ? "s" : ""}
        </summary>
        <div className="cc-tools-body">
          {toolOrder.map((id) => (
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
  }

  // Both groups sit together at the start of the agent's working section, in a
  // consistent order — think first, then act.
  const anchors = [reasoningAnchor, toolAnchor].filter((a) => a >= 0);
  const groupAnchor = anchors.length ? Math.min(...anchors) : -1;

  const out: ReactElement[] = [];
  for (let i = 0; i <= passthrough.length; i++) {
    if (i === groupAnchor) {
      if (reasoningNode) out.push(reasoningNode);
      if (toolsNode) out.push(toolsNode);
    }
    if (i < passthrough.length) out.push(passthrough[i]);
  }
  if (groupAnchor < 0 || groupAnchor > passthrough.length) {
    if (reasoningNode) out.push(reasoningNode);
    if (toolsNode) out.push(toolsNode);
  }

  if (interruptElement) out.push(interruptElement);

  return <>{out}</>;
}
