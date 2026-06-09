export type HuntStreamEvent =
  | { type: "log"; text: string }
  | { type: "step"; step: number; status: "running" | "done" }
  | { type: "heartbeat"; elapsedSec: number; phase: "streaming" | "waiting" | "polling" }
  | {
      type: "handoff";
      agentId: string;
      runId: string;
      logCursor: number;
      elapsedSec: number;
      startedAt: number;
    }
  | { type: "report"; markdown: string }
  | { type: "error"; message: string };

export type HuntPollResponse = {
  status: "running" | "finished" | "error" | "cancelled";
  events: HuntStreamEvent[];
  logCursor: number;
  elapsedSec: number;
  error?: string;
};

export function encodeEvent(event: HuntStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
