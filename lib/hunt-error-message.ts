/**
 * Produce a single client-safe string for NDJSON hunt errors. Many thrown
 * errors (including some from the Cursor SDK / gRPC stack) use message "Error"
 * with real detail on `code`, `operation`, or `cause`.
 */
const AUTH_FAILURE_HINT =
  "Update CURSOR_API_KEY in Netlify (Production): use a valid Cloud Agents API key from cursor.com/dashboard — no quotes or extra spaces, then redeploy.";

const REPO_FAILURE_HINT =
  "Check CURSOR_CLOUD_REPO_URL (HTTPS GitHub URL your key can access) and set CURSOR_CLOUD_REPO_REF=main if needed. Connect GitHub in cursor.com/dashboard/cloud-agents, then redeploy.";

export function huntErrorMessage(err: unknown, fallback: string): string {
  const formatted = formatUnknownError(err);
  const base =
    formatted.trim().length === 0 || formatted.trim() === "Error" ? fallback : formatted;

  if (isAuthFailure(err, base)) {
    return `${base} ${AUTH_FAILURE_HINT}`;
  }
  if (isRepoConfigFailure(base)) {
    return `${base} ${REPO_FAILURE_HINT}`;
  }
  return base;
}

function isRepoConfigFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("default branch") ||
    lower.includes("validation_error") ||
    (lower.includes("repository") && lower.includes("integration")) ||
    lower.includes("scm integration") ||
    lower.includes("repository_access")
  );
}

function isAuthFailure(err: unknown, message: string): boolean {
  if (typeof err === "object" && err !== null && err instanceof Error) {
    const e = err as Error & { status?: number };
    if (e.status === 401) return true;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid user api key") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication") ||
    lower.includes("status=401")
  );
}

function formatUnknownError(err: unknown): string {
  if (typeof err === "string") {
    return err.trim();
  }

  if (typeof err === "object" && err !== null && err instanceof Error) {
    const e = err as Error &
      Readonly<{
        code?: string;
        status?: number;
        requestId?: string;
        operation?: string;
        isRetryable?: boolean;
        cause?: unknown;
      }>;

    const parts: string[] = [];
    const msg = typeof e.message === "string" ? e.message.trim() : "";
    if (msg.length > 0 && msg !== "Error") {
      parts.push(msg);
    }
    if (typeof e.code === "string" && e.code.length > 0) {
      parts.push(`code=${e.code}`);
    }
    if (typeof e.operation === "string" && e.operation.length > 0) {
      parts.push(`operation=${e.operation}`);
    }
    if (typeof e.requestId === "string" && e.requestId.length > 0) {
      parts.push(`requestId=${e.requestId}`);
    }
    if (typeof e.status === "number" && Number.isFinite(e.status)) {
      parts.push(`status=${String(e.status)}`);
    }
    const causeStr = formatCause(e.cause);
    if (causeStr.length > 0) {
      parts.push(`cause: ${causeStr}`);
    }

    if (parts.length > 0) {
      return parts.join(" · ");
    }

    if (causeStr.length > 0) {
      return causeStr;
    }

    if (typeof e.name === "string" && e.name.length > 0 && e.name !== "Error") {
      return e.name;
    }

    return msg.length > 0 ? msg : "";
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function formatCause(cause: unknown): string {
  if (cause === undefined || cause === null) {
    return "";
  }
  if (cause instanceof Error) {
    const m = typeof cause.message === "string" ? cause.message.trim() : "";
    return m.length > 0 && m !== "Error" ? m : cause.name;
  }
  if (typeof cause === "object" && cause !== null && "message" in cause) {
    const m = String((cause as { message?: unknown }).message ?? "").trim();
    return m.length > 0 ? m : "";
  }
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}
