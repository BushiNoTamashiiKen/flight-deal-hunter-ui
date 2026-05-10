import { demoHuntStream } from "@/lib/demo-run";
import { buildFlightDealHunterPrompt } from "@/lib/hunt-prompt";
import { intakeSchema } from "@/lib/intake-schema";
import { encodeEvent } from "@/lib/stream-events";
import { extractTaggedReport } from "@/lib/parse-report";

import type { IntakeValues } from "@/lib/intake-schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = intakeSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const intake = parsed.data;

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
      "Content-Type": "application/x-ndjson; charset=utf-8",
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
  } catch (err) {
    const msg =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unexpected agent failure.";
    push(encodeEvent({ type: "error", message: msg }));
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
    controller.close();
  }
}
