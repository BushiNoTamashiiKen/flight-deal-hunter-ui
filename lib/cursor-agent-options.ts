/** Options for Cursor SDK Agent.create scoped to Skyflint's deploy surface. */

const CLOUD_REPO_ENV = "CURSOR_CLOUD_REPO_URL";
const CLOUD_REPO_REF_ENV = "CURSOR_CLOUD_REPO_REF";

export function trimmedCursorApiKey(): string | undefined {
  const k = process.env.CURSOR_API_KEY?.trim();
  return k && k.length > 0 ? k : undefined;
}

/**
 * Vercel, Netlify, or generic AWS Lambda-style hosts cannot run Cursor's
 * **local** agent (filesystem + Cursor CLI assumptions). Prefer **cloud**.
 */
export function isManagedServerlessHost(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
  );
}

/** Normalize GitHub HTTPS URLs for Cursor Cloud (`…/repo` → `…/repo.git`). */
export function normalizeCloudRepoUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+$/i.test(trimmed)) {
    return `${trimmed}.git`;
  }
  return trimmed;
}

export function trimmedCloudRepoUrl(): string | undefined {
  const u = process.env[CLOUD_REPO_ENV]?.trim();
  if (!u || u.length === 0) return undefined;
  return normalizeCloudRepoUrl(u);
}

/** Branch/ref for cloud agent clone — avoids "Failed to determine default branch" on agent.send. */
export function trimmedCloudRepoRef(): string {
  const ref = process.env[CLOUD_REPO_REF_ENV]?.trim();
  return ref && ref.length > 0 ? ref : "main";
}

/** Human-readable env names for dashboards / README. */
export const cloudRepoEnvDocs = CLOUD_REPO_ENV;
export const cloudRepoRefEnvDocs = CLOUD_REPO_REF_ENV;
