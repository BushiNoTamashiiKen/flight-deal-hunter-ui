import { MAX_POLL_MS, POLL_INTERVAL_MS } from "@/lib/hunt-async";
import type { HuntPollResponse, HuntStreamEvent } from "@/lib/stream-events";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollHuntUntilDone(args: {
  agentId: string;
  runId: string;
  startedAt: number;
  logCursor: number;
  onEvents: (events: HuntStreamEvent[]) => void;
  signal?: AbortSignal;
}): Promise<"finished" | "error" | "cancelled" | "timeout"> {
  const deadline = Date.now() + MAX_POLL_MS;
  let logCursor = args.logCursor;

  while (Date.now() < deadline) {
    if (args.signal?.aborted) return "timeout";

    const params = new URLSearchParams({
      agentId: args.agentId,
      runId: args.runId,
      logCursor: String(logCursor),
      startedAt: String(args.startedAt),
    });

    let res: Response;
    try {
      res = await fetch(`/api/hunt/status?${params.toString()}`, {
        method: "GET",
        signal: args.signal,
      });
    } catch {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (res.status === 429) {
      await sleep(POLL_INTERVAL_MS * 2);
      continue;
    }

    if (!res.ok) {
      let msg = `Poll failed (${res.status}).`;
      try {
        const payload = (await res.json()) as { error?: string };
        if (payload.error) msg = payload.error;
      } catch {
        /* ignore */
      }
      args.onEvents([{ type: "error", message: msg }]);
      return "error";
    }

    let body: HuntPollResponse;
    try {
      body = (await res.json()) as HuntPollResponse;
    } catch {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (body.events.length > 0) {
      const ordered = [...body.events].sort((a, b) => {
        if (a.type === "report") return -1;
        if (b.type === "report") return 1;
        return 0;
      });
      args.onEvents(ordered);
    }
    logCursor = body.logCursor;

    if (body.status === "finished") return "finished";
    if (body.status === "error") return "error";
    if (body.status === "cancelled") return "cancelled";

    await sleep(POLL_INTERVAL_MS);
  }

  args.onEvents([
    {
      type: "error",
      message: "Hunt timed out after 15 minutes. Retry with narrower dates or fewer destinations.",
    },
  ]);
  return "timeout";
}
