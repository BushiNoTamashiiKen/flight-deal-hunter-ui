export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const mode = process.env.CURSOR_API_KEY ? "live" : "demo";
  const commit =
    process.env.COMMIT_REF ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "local";

  return Response.json(
    { status: "ok", mode, commit },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
