/** Options for Cursor SDK Agent.create scoped to Skyflint's deploy surface. */

const CLOUD_REPO_ENV = "CURSOR_CLOUD_REPO_URL";

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

export function trimmedCloudRepoUrl(): string | undefined {
  const u = process.env[CLOUD_REPO_ENV]?.trim();
  return u && u.length > 0 ? u : undefined;
}

/** Human-readable constraint for dashboards / README. */
export const cloudRepoEnvDocs = CLOUD_REPO_ENV;
