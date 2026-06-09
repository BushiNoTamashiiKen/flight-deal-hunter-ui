import type { ConversationStep, ConversationTurn } from "@cursor/sdk";

function toolNameFromStep(step: ConversationStep): string | undefined {
  if (step.type !== "toolCall") return undefined;
  const message = step.message as { type?: string };
  return typeof message.type === "string" ? message.type : "tool";
}

function stepToLogLines(step: ConversationStep): string[] {
  if (step.type === "assistantMessage") {
    const text = step.message.text.trim();
    return text ? [text] : [];
  }
  if (step.type === "thinkingMessage") {
    const text = step.message.text.trim();
    return text ? [`[thinking] ${text}`] : [];
  }
  if (step.type === "toolCall") {
    const name = toolNameFromStep(step);
    const message = step.message as { result?: { status?: string } };
    const status =
      message.result?.status === "success"
        ? "completed"
        : message.result
          ? "error"
          : "running";
    return [`[tool] ${name} → ${status}`];
  }
  return [];
}

/** Stable log lines from a run conversation — used for poll diffs. */
export function conversationToLogLines(turns: ConversationTurn[]): string[] {
  const lines: string[] = [];
  for (const turn of turns) {
    if (turn.type === "agentConversationTurn") {
      for (const step of turn.turn.steps) {
        lines.push(...stepToLogLines(step));
      }
    } else if (turn.type === "shellConversationTurn") {
      const cmd = turn.turn.shellCommand?.command?.trim();
      if (cmd) lines.push(`[shell] ${cmd}`);
    }
  }
  return lines;
}

export function conversationToFullText(turns: ConversationTurn[]): string {
  return conversationToLogLines(turns).join("\n");
}
