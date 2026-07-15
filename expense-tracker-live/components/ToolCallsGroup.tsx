"use client";

import type { ComponentProps } from "react";
import { CopilotChatToolCallsView } from "@copilotkit/react-core/v2";

// Collapses ALL of a message's tool calls into one disclosure — like the V2
// "Thought for a few seconds" block — while the individual tool renders
// (ToolCallCard / DiffCard / PdfViewer, via useRenderTool) still show inside.
export function ToolCallsGroup(props: ComponentProps<typeof CopilotChatToolCallsView>) {
  const calls = (props.message as { toolCalls?: unknown[] } | undefined)?.toolCalls ?? [];
  const n = calls.length;
  if (!n) return null;

  return (
    <details className="cc-tools">
      <summary className="cc-tools-summary">
        <span className="cc-tools-chevron" aria-hidden>▸</span>
        <span className="cc-tools-icon" aria-hidden>🔧</span>
        Used {n} tool{n > 1 ? "s" : ""}
      </summary>
      <div className="cc-tools-body">
        <CopilotChatToolCallsView {...props} />
      </div>
    </details>
  );
}
