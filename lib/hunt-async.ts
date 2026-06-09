import { isManagedServerlessHost, trimmedCursorApiKey } from "@/lib/cursor-agent-options";

/** Netlify Pro caps synchronous functions at ~26s — hand off before that. */
export const STREAM_HANDOFF_MS = 20_000;

export const POLL_INTERVAL_MS = 4_000;

export const MAX_POLL_MS = 15 * 60 * 1000;

/** Live hunts on managed hosts use start-stream → poll instead of one long stream. */
export function shouldUseAsyncHunt(): boolean {
  if (process.env.SKYFLINT_ASYNC_HUNT === "1") return true;
  return isManagedServerlessHost() && Boolean(trimmedCursorApiKey());
}

const CLOUD_AGENT_ID = /^bc-[a-zA-Z0-9-]{8,120}$/;
const RUN_ID = /^[a-zA-Z0-9-]{8,120}$/;

export function isValidCloudAgentId(agentId: string): boolean {
  return CLOUD_AGENT_ID.test(agentId);
}

export function isValidRunId(runId: string): boolean {
  return RUN_ID.test(runId);
}
