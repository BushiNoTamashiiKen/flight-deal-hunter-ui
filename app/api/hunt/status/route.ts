import {
  conversationToFullText,
  conversationToLogLines,
} from "@/lib/hunt-conversation-logs";
import { isValidCloudAgentId, isValidRunId } from "@/lib/hunt-async";
import { buildReportMarkdown, flushStepMarkers } from "@/lib/hunt-report";
import { huntErrorMessage } from "@/lib/hunt-error-message";
import { logger } from "@/lib/logger";
import { allowHuntRequest } from "@/lib/rate-limit-hunt";
import { trimmedCursorApiKey } from "@/lib/cursor-agent-options";
import type { HuntPollResponse, HuntStreamEvent } from "@/lib/stream-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

const NO_STORE = { "Cache-Control": "no-store" } as const;

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

function eventsFromLogSlice(lines: string[], start: number): HuntStreamEvent[] {
  return lines.slice(start).map((text) => ({ type: "log" as const, text }));
}

function stepEventsFromText(text: string, seenSteps: Set<number>): HuntStreamEvent[] {
  const events: HuntStreamEvent[] = [];
  flushStepMarkers(text, seenSteps, (step) => {
    events.push({ type: "step", step, status: "done" });
  });
  return events;
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!allowHuntRequest(ip)) {
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

    if (run.status === "running") {
      // conversation() can block until the run finishes — keep polls fast while running.
      const body: HuntPollResponse = {
        status: "running",
        events: [{ type: "heartbeat", elapsedSec, phase: "polling" }],
        logCursor,
        elapsedSec,
      };
      return jsonResponse(body, 200);
    }

    const seenSteps = new Set<number>();
    let conversationLines: string[] = [];
    let conversationText = "";

    if (run.supports("conversation")) {
      try {
        const turns = await run.conversation();
        conversationLines = conversationToLogLines(turns);
        conversationText = conversationToFullText(turns);
      } catch (err) {
        logger.warn("hunt poll conversation read failed", {
          message: huntErrorMessage(err, "conversation failed"),
          runId: runId.slice(0, 12),
        });
      }
    }

    const newLogEvents = eventsFromLogSlice(conversationLines, logCursor);
    const stepEvents = stepEventsFromText(conversationText, seenSteps);
    const events: HuntStreamEvent[] = [...newLogEvents, ...stepEvents];

    if (run.status === "cancelled") {
      const body: HuntPollResponse = {
        status: "cancelled",
        events,
        logCursor: conversationLines.length,
        elapsedSec,
        error: "Agent run was cancelled.",
      };
      return jsonResponse(body, 200);
    }

    let resultText = run.result;
    if (run.supports("wait") && run.status !== "cancelled") {
      try {
        const result = await run.wait();
        if (typeof result.result === "string" && result.result.length > 0) {
          resultText = result.result;
        }
        if (result.status === "error") {
          const body: HuntPollResponse = {
            status: "error",
            events: [
              ...events,
              {
                type: "error",
                message:
                  typeof result.result === "string" && result.result.trim()
                    ? result.result.trim()
                    : "Agent run ended with an error.",
              },
            ],
            logCursor: conversationLines.length,
            elapsedSec,
            error: "Agent run failed.",
          };
          return jsonResponse(body, 200);
        }
      } catch (err) {
        logger.warn("hunt poll wait failed", {
          message: huntErrorMessage(err, "wait failed"),
          runId: runId.slice(0, 12),
        });
      }
    }

    const reportMd = buildReportMarkdown(conversationText, resultText);
    const body: HuntPollResponse = {
      status: "finished",
      events: [...events, { type: "report", markdown: reportMd }],
      logCursor: conversationLines.length,
      elapsedSec,
    };
    logger.info("hunt poll finished", { runId: runId.slice(0, 12), elapsedSec });
    return jsonResponse(body, 200);
  } catch (err) {
    const msg = huntErrorMessage(err, "Could not poll hunt status.");
    logger.error("hunt poll error", { message: msg, agentId: agentId.slice(0, 12) });
    return jsonResponse({ error: msg }, 502);
  }
}
