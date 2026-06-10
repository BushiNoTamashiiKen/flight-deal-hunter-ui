import { isValidCloudAgentId, isValidRunId } from "@/lib/hunt-async";
import { conversationToFullText } from "@/lib/hunt-conversation-logs";
import { buildReportMarkdown, flushStepMarkers } from "@/lib/hunt-report";
import { huntErrorMessage } from "@/lib/hunt-error-message";
import { logger } from "@/lib/logger";
import { allowHuntPoll } from "@/lib/rate-limit-hunt";
import { trimmedCursorApiKey } from "@/lib/cursor-agent-options";
import type { HuntPollResponse, HuntStreamEvent } from "@/lib/stream-events";

import type { Run } from "@cursor/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The SDK polls the Cursor API via global fetch — Next's Data Cache must not freeze run status. */
export const fetchCache = "force-no-store";
export const maxDuration = 26;

const NO_STORE = { "Cache-Control": "no-store" } as const;
const WAIT_BUDGET_MS = 8_000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function parseLogCursor(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function stepEventsFromText(text: string, seenSteps: Set<number>): HuntStreamEvent[] {
  const events: HuntStreamEvent[] = [];
  flushStepMarkers(text, seenSteps, (step) => {
    events.push({ type: "step", step, status: "done" });
  });
  return events;
}

function runLooksTerminal(run: Run): boolean {
  if (run.status !== "running") return true;
  return typeof run.result === "string" && run.result.trim().length > 0;
}

async function resolveRunResultText(run: Run): Promise<{
  resultText?: string;
  terminalStatus: "finished" | "error" | "cancelled";
}> {
  if (run.status === "cancelled") {
    return { terminalStatus: "cancelled" };
  }

  let resultText = typeof run.result === "string" ? run.result : undefined;

  if (run.supports("wait")) {
    try {
      const result = await Promise.race([
        run.wait(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), WAIT_BUDGET_MS)),
      ]);
      if (result) {
        if (result.status === "error") {
          return {
            terminalStatus: "error",
            resultText:
              typeof result.result === "string" ? result.result : resultText,
          };
        }
        if (result.status === "cancelled") {
          return { terminalStatus: "cancelled" };
        }
        if (typeof result.result === "string" && result.result.length > 0) {
          resultText = result.result;
        }
      }
    } catch (err) {
      logger.warn("hunt poll wait failed", {
        message: huntErrorMessage(err, "wait failed"),
      });
    }
  }

  return { resultText, terminalStatus: "finished" };
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!allowHuntPoll(ip)) {
    return jsonResponse({ error: "Too many requests. Try again shortly." }, 429);
  }

  const apiKey = trimmedCursorApiKey();
  if (!apiKey) {
    return jsonResponse({ error: "Live hunt polling requires CURSOR_API_KEY." }, 503);
  }

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId")?.trim() ?? "";
  const runId = url.searchParams.get("runId")?.trim() ?? "";
  const logCursor = parseLogCursor(url.searchParams.get("logCursor"));
  const startedAt = parseLogCursor(url.searchParams.get("startedAt"));

  if (!isValidCloudAgentId(agentId) || !isValidRunId(runId)) {
    return jsonResponse({ error: "Invalid agentId or runId." }, 400);
  }

  const elapsedSec = startedAt > 0 ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  let Agent: typeof import("@cursor/sdk").Agent;
  try {
    Agent = (await import("@cursor/sdk")).Agent;
  } catch (err) {
    const msg = huntErrorMessage(err, "Could not load @cursor/sdk.");
    return jsonResponse({ error: msg }, 500);
  }

  try {
    const run = await Agent.getRun(runId, {
      runtime: "cloud",
      agentId,
      apiKey,
    });

    if (!runLooksTerminal(run)) {
      const body: HuntPollResponse = {
        status: "running",
        events: [{ type: "heartbeat", elapsedSec, phase: "polling" }],
        logCursor,
        elapsedSec,
      };
      if (url.searchParams.get("debug") === "1") {
        return jsonResponse(
          {
            ...body,
            debug: {
              sdkStatus: run.status,
              resultType: typeof run.result,
              resultLen: typeof run.result === "string" ? run.result.length : -1,
              createdAt: run.createdAt ?? null,
            },
          },
          200
        );
      }
      return jsonResponse(body, 200);
    }

    if (run.status === "cancelled") {
      const body: HuntPollResponse = {
        status: "cancelled",
        events: [{ type: "error", message: "Agent run was cancelled." }],
        logCursor,
        elapsedSec,
        error: "Agent run was cancelled.",
      };
      return jsonResponse(body, 200);
    }

    const { resultText, terminalStatus } = await resolveRunResultText(run);

    if (terminalStatus === "cancelled") {
      const body: HuntPollResponse = {
        status: "cancelled",
        events: [{ type: "error", message: "Agent run was cancelled." }],
        logCursor,
        elapsedSec,
        error: "Agent run was cancelled.",
      };
      return jsonResponse(body, 200);
    }

    if (terminalStatus === "error") {
      const body: HuntPollResponse = {
        status: "error",
        events: [
          {
            type: "error",
            message:
              resultText?.trim() || "Agent run ended with an error.",
          },
        ],
        logCursor,
        elapsedSec,
        error: "Agent run failed.",
      };
      return jsonResponse(body, 200);
    }

    let markerText = resultText ?? "";
    if (!markerText && run.supports("conversation")) {
      try {
        const turns = await Promise.race([
          run.conversation(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
        ]);
        if (turns) {
          markerText = conversationToFullText(turns);
        }
      } catch (err) {
        logger.warn("hunt poll conversation read failed", {
          message: huntErrorMessage(err, "conversation failed"),
          runId: runId.slice(0, 12),
        });
      }
    }

    const reportMd = buildReportMarkdown(markerText, resultText);
    const seenSteps = new Set<number>();
    const events: HuntStreamEvent[] = [
      ...stepEventsFromText(markerText, seenSteps),
      { type: "log", text: "[status] Ranked report ready." },
    ];

    if (reportMd.trim().length > 0) {
      events.push({ type: "report", markdown: reportMd });
    } else {
      events.push({
        type: "error",
        message: "Hunt finished but the ranked report was empty. Retry the search.",
      });
    }

    const body: HuntPollResponse = {
      status: reportMd.trim().length > 0 ? "finished" : "error",
      events,
      logCursor,
      elapsedSec,
      ...(reportMd.trim().length === 0 ? { error: "Empty report." } : {}),
    };
    logger.info("hunt poll finished", {
      runId: runId.slice(0, 12),
      elapsedSec,
      reportChars: reportMd.length,
    });
    return jsonResponse(body, 200);
  } catch (err) {
    const msg = huntErrorMessage(err, "Could not poll hunt status.");
    logger.error("hunt poll error", { message: msg, agentId: agentId.slice(0, 12) });
    return jsonResponse({ error: msg }, 502);
  }
}
