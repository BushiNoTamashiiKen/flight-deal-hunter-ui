/**
 * NDJSON stream using Web Streams (`ReadableStream`).
 * Netlify Next Runtime v5 supports App Router streaming when `runtime = 'nodejs'`.
 *
 * Netlify Pro tops out around **26s** per synchronous serverless invocation — demo
 * mode completes well inside that budget. Live Cursor agent runs can exceed it;
 * hosting then requires enqueue + poll/Background Functions (non-streaming), or
 * self-host (Docker/VPS) without that ceiling.
 */
import {
  cloudRepoEnvDocs,
  isManagedServerlessHost,
  trimmedCloudRepoUrl,
  trimmedCursorApiKey,
} from "@/lib/cursor-agent-options";
import { demoHuntStream } from "@/lib/demo-run";
import { buildFlightDealHunterPrompt } from "@/lib/hunt-prompt";
import { intakeSchema } from "@/lib/intake-schema";
import { summarizeIntakeForLog } from "@/lib/intake-log-summary";
import { normalizeHuntIntakeJson } from "@/lib/normalize-hunt-intake";
import { logger } from "@/lib/logger";
import { huntErrorMessage } from "@/lib/hunt-error-message";
import { extractTaggedReport } from "@/lib/parse-report";
import { allowHuntRequest } from "@/lib/rate-limit-hunt";
import { encodeEvent } from "@/lib/stream-events";

import type { IntakeValues } from "@/lib/intake-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Honored on Vercel / long-timeout hosts; Netlify clamps via netlify.toml + plan. */
export const maxDuration = 300;

const MAX_BODY_BYTES = 32 * 1024;

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Avoid double-close rejects from ReadableStream controllers. */
function safeClose(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close();
  } catch {
    // already closed
  }
}

function buildSkyflintAgentCreateInput(apiKey: string) {
  const name = "Skyflint flight-deal-hunter";
  const model = { id: "composer-2" as const };

  if (isManagedServerlessHost()) {
    const repoUrl = trimmedCloudRepoUrl();
    if (!repoUrl) {
      throw new Error(`${cloudRepoEnvDocs} must be set for live hunts on Netlify/Vercel/Lambda`);
    }
    return {
      apiKey,
      name,
      model,
      cloud: {
        repos: [{ url: repoUrl }],
        autoCreatePR: false as const,
        skipReviewerRequest: true as const,
      },
    };
  }

  return {
    apiKey,
    name,
    model,
    local: {
      cwd: process.cwd(),
    },
  };
}

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
    return jsonResponse({ error: "Too many requests. Try again shortly." }, 429);
  }

  const body = await readJsonBodyLimited(request);
  if (!body.ok) {
    return jsonResponse({ error: body.message }, body.status);
  }

  const parsed = intakeSchema.safeParse(normalizeHuntIntakeJson(body.json));
  if (!parsed.success) {
    return jsonResponse(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      422
    );
  }

  const intake = parsed.data;
  logger.info("hunt start", summarizeIntakeForLog(intake));

  const apiKeyForLive = trimmedCursorApiKey();

  /** Local Cursor agents cannot run inside managed serverless hosts — use a cloud repo. */
  if (apiKeyForLive && isManagedServerlessHost() && !trimmedCloudRepoUrl()) {
    return jsonResponse(
      {
        error:
          `Live hunts on Netlify/Vercel need a Cursor cloud agent. Set env ${cloudRepoEnvDocs} ` +
          "to an HTTPS Git URL for a repository your API key can access (Skyflint or a fork), then redeploy. " +
          "Without CURSOR_API_KEY the app stays in demo mode.",
        code: "CURSOR_CLOUD_REPO_URL_REQUIRED",
      },
      503
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (line: string) => controller.enqueue(encoder.encode(line));

      try {
        const keyForStream = trimmedCursorApiKey();

        if (!keyForStream) {
          try {
            for await (const chunk of demoHuntStream()) {
              push(chunk);
            }
          } catch (err) {
            const msg = huntErrorMessage(err, "Demo stream failed.");
            logger.error("demo stream failed", { message: msg });
            push(encodeEvent({ type: "error", message: msg }));
          } finally {
            safeClose(controller);
          }
          return;
        }

        await runLiveAgent(controller, intake, keyForStream);
      } catch (err) {
        const message = huntErrorMessage(err, "Hunt failed to start.");
        logger.error("hunt stream aborted", { message });
        push(encodeEvent({ type: "error", message }));
        safeClose(controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      ...NO_STORE,
    },
  });
}

async function runLiveAgent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  intake: IntakeValues,
  apiKey: string
): Promise<void> {
  const encoder = new TextEncoder();
  const push = (line: string) => controller.enqueue(encoder.encode(line));

  let SdkAgent: typeof import("@cursor/sdk").Agent;
  let SdkCursorAgentError: typeof import("@cursor/sdk").CursorAgentError;
  try {
    const sdk = await import("@cursor/sdk");
    SdkAgent = sdk.Agent;
    SdkCursorAgentError = sdk.CursorAgentError;
  } catch (err) {
    const msg = huntErrorMessage(err, "Could not load @cursor/sdk.");
    logger.error("sdk import failed", { message: msg });
    push(encodeEvent({ type: "error", message: msg }));
    safeClose(controller);
    return;
  }

  let agent: Awaited<ReturnType<(typeof SdkAgent)["create"]>> | undefined;
  try {
    try {
      agent = await SdkAgent.create(buildSkyflintAgentCreateInput(apiKey));
    } catch (err) {
      let msg = huntErrorMessage(err, "Could not start Cursor agent.");
      if (err instanceof SdkCursorAgentError) {
        msg = `${msg} (retryable=${String(err.isRetryable)})`;
      }
      logger.error("agent create failed", { message: msg });
      push(encodeEvent({ type: "error", message: msg }));
      return;
    }

    const prompt = buildFlightDealHunterPrompt(intake);
    let run;
    try {
      run = await agent.send(prompt);
    } catch (err) {
      const msg = huntErrorMessage(err, "Send failed for Cursor agent run.");
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
      const errDetail =
        typeof result.result === "string" && result.result.trim().length > 0
          ? ` ${result.result.trim()}`
          : "";
      push(
        encodeEvent({
          type: "log",
          text: `Run ended with status error (run id: ${result.id}).${errDetail}`,
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
    const msg = huntErrorMessage(err, "Unexpected agent failure.");
    logger.error("hunt live run error", { message: msg });
    push(encodeEvent({ type: "error", message: msg }));
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
    safeClose(controller);
  }
}
