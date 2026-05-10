/**
 * NDJSON stream using Web Streams (`ReadableStream`).
 * Netlify Next Runtime v5 supports App Router streaming when `runtime = 'nodejs'`.
 *
 * Netlify Pro tops out around **26s** per synchronous serverless invocation — demo
 * mode completes well inside that budget. Live Cursor agent runs can exceed it;
 * hosting then requires enqueue + poll/Background Functions (non-streaming), or
 * self-host (Docker/VPS) without that ceiling.
 */
import { demoHuntStream } from "@/lib/demo-run";
import { buildFlightDealHunterPrompt } from "@/lib/hunt-prompt";
import { intakeSchema } from "@/lib/intake-schema";
import { summarizeIntakeForLog } from "@/lib/intake-log-summary";
import { logger } from "@/lib/logger";
import { extractTaggedReport } from "@/lib/parse-report";
import { allowHuntRequest } from "@/lib/rate-limit-hunt";
import { encodeEvent } from "@/lib/stream-events";

import type { IntakeValues } from "@/lib/intake-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Honored on Vercel / long-timeout hosts; Netlify clamps via netlify.toml + plan. */
export const maxDuration = 300;

const MAX_BODY_BYTES = 32 * 1024;

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

async function readJsonBodyLimited(request: Request): Promise<
  | { ok: true; json: unknown }
  | { ok: false; status: number; message: string }
> {
  const lenHeader = request.headers.get("content-length");
  if (lenHeader) {
    const n = Number.parseInt(lenHeader, 10);
    if (!Number.isNaN(n) && n > MAX_BODY_BYTES) {
      return { ok: false, status: 413, message: "Request body too large." };
    }
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, status: 413, message: "Request body too large." };
  }

  try {
    const json = JSON.parse(raw) as unknown;
    return { ok: true, json };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body." };
  }
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!allowHuntRequest(ip)) {
    logger.warn("hunt rate limited", { ipPrefix: ip.slice(0, 12) });
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await readJsonBodyLimited(request);
  if (!body.ok) {
    return Response.json({ error: body.message }, { status: body.status });
  }

  const parsed = intakeSchema.safeParse(body.json);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const intake = parsed.data;
  logger.info("hunt start", summarizeIntakeForLog(intake));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (line: string) => controller.enqueue(encoder.encode(line));

      if (!process.env.CURSOR_API_KEY) {
        try {
          for await (const chunk of demoHuntStream()) {
            push(chunk);
          }
        } catch (err) {
          logger.error("demo stream failed", {
            message: err instanceof Error ? err.message : String(err),
          });
          push(
            encodeEvent({
              type: "error",
              message: err instanceof Error ? err.message : "Demo stream failed.",
            })
          );
        } finally {
          controller.close();
        }
        return;
      }

      await runLiveAgent(controller, intake);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}

async function runLiveAgent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  intake: IntakeValues
): Promise<void> {
  const { Agent, CursorAgentError } = await import("@cursor/sdk");

  const encoder = new TextEncoder();
  const push = (line: string) => controller.enqueue(encoder.encode(line));

  let agent: Awaited<ReturnType<typeof Agent.create>> | undefined;
  try {
    try {
      agent = await Agent.create({
        apiKey: process.env.CURSOR_API_KEY,
        model: { id: "composer-2" },
        local: {
          cwd: process.cwd(),
          settingSources: [],
        },
        name: "Skyflint flight-deal-hunter",
      });
    } catch (err) {
      const msg =
        err instanceof CursorAgentError
          ? `${err.message} (retryable=${String(err.isRetryable)})`
          : err instanceof Error
            ? err.message
            : "Could not start Cursor agent.";
      logger.error("agent create failed", { message: msg });
      push(encodeEvent({ type: "error", message: msg }));
      return;
    }

    const prompt = buildFlightDealHunterPrompt(intake);
    let run;
    try {
      run = await agent.send(prompt);
    } catch (err) {
      const msg =
        err instanceof CursorAgentError ? err.message : "Send failed for Cursor agent run.";
      logger.error("agent send failed", { message: msg });
      push(encodeEvent({ type: "error", message: msg }));
      return;
    }

    let buffer = "";
    const seenSteps = new Set<number>();

    const flushStepMarkers = (text: string) => {
      const re = /\[\[SKYFLINT_STEP_DONE:(\d+)\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const step = Number(m[1]);
        if (!seenSteps.has(step)) {
          seenSteps.add(step);
          push(encodeEvent({ type: "step", step, status: "done" }));
        }
      }
    };

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text") {
              buffer += block.text;
              flushStepMarkers(buffer);
              push(encodeEvent({ type: "log", text: block.text }));
            }
          }
        } else if (event.type === "thinking") {
          push(encodeEvent({ type: "log", text: `[thinking] ${event.text}` }));
        } else if (event.type === "tool_call") {
          push(
            encodeEvent({
              type: "log",
              text: `[tool] ${event.name} → ${event.status}`,
            })
          );
        }
      }
    }

    const result = await run.wait();

    if (result.status === "error") {
      push(
        encodeEvent({
          type: "log",
          text: `Run ended with status error (run id: ${result.id}).`,
        })
      );
    }

    const merged =
      buffer +
      (typeof result.result === "string" && result.result.length > 0 ? `\n${result.result}` : "");

    let reportMd = extractTaggedReport(merged)?.trim();
    if (!reportMd) {
      reportMd =
        typeof result.result === "string" && result.result.trim().length > 0
          ? result.result.trim()
          : merged.trim();
    }

    push(encodeEvent({ type: "report", markdown: reportMd }));
    logger.info("hunt live run finished", { status: result.status });
  } catch (err) {
    const msg =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unexpected agent failure.";
    logger.error("hunt live run error", { message: msg });
    push(encodeEvent({ type: "error", message: msg }));
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
    controller.close();
  }
}
