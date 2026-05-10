const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 10;

const hitsByIp = new Map<string, number[]>();

function prune(ip: string, now: number): number[] {
  const arr = hitsByIp.get(ip) ?? [];
  const next = arr.filter((t) => now - t < WINDOW_MS);
  hitsByIp.set(ip, next);
  return next;
}

/** Sliding window: 10 requests per 5 minutes per IP. In-memory only. */
export function allowHuntRequest(ip: string): boolean {
  if (process.env.SKYFLINT_DISABLE_RATELIMIT === "1") {
    return true;
  }
  const now = Date.now();
  const windowHits = prune(ip, now);
  if (windowHits.length >= MAX_REQUESTS) {
    return false;
  }
  windowHits.push(now);
  hitsByIp.set(ip, windowHits);
  return true;
}
