export type HuntStreamEvent =
  | { type: "log"; text: string }
  | { type: "step"; step: number; status: "running" | "done" }
  | { type: "report"; markdown: string }
  | { type: "error"; message: string };

export function encodeEvent(event: HuntStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
