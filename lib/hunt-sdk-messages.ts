import { encodeEvent } from "@/lib/stream-events";

import type { SDKMessage } from "@cursor/sdk";

export function pushSdkMessage(
  push: (line: string) => void,
  event: SDKMessage,
  flushStepMarkers: (text: string) => void,
  onAssistantText: (text: string) => void
): void {
  if (event.type === "assistant") {
    for (const block of event.message.content) {
      if (block.type === "text") {
        onAssistantText(block.text);
        flushStepMarkers(block.text);
        push(encodeEvent({ type: "log", text: block.text }));
      }
    }
    return;
  }

  if (event.type === "thinking") {
    push(encodeEvent({ type: "log", text: `[thinking] ${event.text}` }));
    return;
  }

  if (event.type === "tool_call") {
    push(
      encodeEvent({
        type: "log",
        text: `[tool] ${event.name} → ${event.status}`,
      })
    );
    return;
  }

  if (event.type === "status") {
    const detail = event.message ? `: ${event.message}` : "";
    push(encodeEvent({ type: "log", text: `[status] ${event.status}${detail}` }));
    return;
  }

  if (event.type === "task") {
    const parts = [event.status, event.text].filter(Boolean).join(" — ");
    if (parts) push(encodeEvent({ type: "log", text: `[task] ${parts}` }));
    return;
  }

  if (event.type === "request") {
    push(
      encodeEvent({
        type: "log",
        text: `[request] Agent paused for approval (id: ${event.request_id}). Cloud runs should auto-approve — if this persists, retry the hunt.`,
      })
    );
  }
}
