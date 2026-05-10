import {
  isManagedServerlessHost,
  trimmedCloudRepoUrl,
  trimmedCursorApiKey,
} from "@/lib/cursor-agent-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const key = trimmedCursorApiKey();
  const mode = key ? "live" : "demo";
  const huntReady =
    !key ||
    !isManagedServerlessHost() ||
    Boolean(trimmedCloudRepoUrl());
  const commit =
    process.env.COMMIT_REF ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "local";

  return Response.json(
    { status: "ok", mode, huntReady, commit },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
