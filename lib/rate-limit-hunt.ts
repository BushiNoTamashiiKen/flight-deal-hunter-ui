const WINDOW_MS = 5 * 60 * 1000;
/** Starting a live hunt (POST /api/hunt). */
const MAX_START_REQUESTS = 10;
/** Polling an in-flight hunt (GET /api/hunt/status) — ~4s interval × 15 min. */
const MAX_POLL_REQUESTS = 240;

const startHitsByIp = new Map<string, number[]>();
const pollHitsByIp = new Map<string, number[]>();

function slidingAllow(
  map: Map<string, number[]>,
  ip: string,
  max: number
): boolean {
  if (process.env.SKYFLINT_DISABLE_RATELIMIT === "1") {
    return true;
  }
  const now = Date.now();
  const arr = map.get(ip) ?? [];
  const windowHits = arr.filter((t) => now - t < WINDOW_MS);
  if (windowHits.length >= max) {
    map.set(ip, windowHits);
    return false;
  }
  windowHits.push(now);
  map.set(ip, windowHits);
  return true;
}

/** Sliding window: 10 hunt starts per 5 minutes per IP. */
export function allowHuntStart(ip: string): boolean {
  return slidingAllow(startHitsByIp, ip, MAX_START_REQUESTS);
}

/** Sliding window: 240 status polls per 5 minutes per IP (separate from starts). */
export function allowHuntPoll(ip: string): boolean {
  return slidingAllow(pollHitsByIp, ip, MAX_POLL_REQUESTS);
}
