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
  const startedPolling = Date.now();
  const deadline = startedPolling + MAX_POLL_MS;
  let logCursor = args.logCursor;
  /** Poll fast early (reports can land quickly), back off on long runs. */
  const pollInterval = () =>
    Date.now() - startedPolling < 3 * 60 * 1000 ? POLL_INTERVAL_MS : POLL_INTERVAL_MS * 3;
  /** Netlify functions can 5xx transiently (cold starts) — only give up after a streak. */
  const MAX_CONSECUTIVE_FAILURES = 4;
  let consecutiveFailures = 0;

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
      await sleep(pollInterval());
      continue;
    }

    if (res.status === 429) {
      await sleep(pollInterval() * 2);
      continue;
    }

    if (!res.ok) {
      consecutiveFailures += 1;
      if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
        await sleep(pollInterval() * 2);
        continue;
      }
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
    consecutiveFailures = 0;

    let body: HuntPollResponse;
    try {
      body = (await res.json()) as HuntPollResponse;
    } catch {
      await sleep(pollInterval());
      continue;
    }

    if (body.events.length > 0) {
      args.onEvents(body.events);
    }
    logCursor = body.logCursor;

    if (body.status === "finished") return "finished";
    if (body.status === "error") return "error";
    if (body.status === "cancelled") return "cancelled";

    await sleep(pollInterval());
  }

  args.onEvents([
    {
      type: "error",
      message: "Hunt timed out after 30 minutes. Retry with narrower dates or fewer destinations.",
    },
  ]);
  return "timeout";
}
