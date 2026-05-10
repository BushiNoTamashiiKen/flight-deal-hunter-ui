import { defaultIntakeValues } from "@/lib/intake-schema";

function mapBagKeyword(raw: string): "personal" | "carryon" | "checked" | undefined {
  const n = raw.replace(/[\s_-]/g, "").toLowerCase();
  if (n === "personal" || n === "personalitemonly") return "personal";
  if (n === "carryon") return "carryon";
  if (n === "checked" || n === "checkedbags") return "checked";
  return undefined;
}

/**
 * Merges shorthand / alternate API shapes (e.g. travelers, bags, residency)
 * with defaults so POST /api/hunt accepts compact JSON from scripts and CLIs.
 */
export function normalizeHuntIntakeJson(json: unknown): unknown {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    return json;
  }

  const raw = json as Record<string, unknown>;
  if (Object.keys(raw).length === 0) {
    return raw;
  }

  const usesShorthand =
    "travelers" in raw || "bags" in raw || "residency" in raw;

  const merged: Record<string, unknown> = usesShorthand
    ? { ...defaultIntakeValues, ...raw }
    : { ...raw };

  const travelers = raw.travelers;
  if (travelers && typeof travelers === "object" && !Array.isArray(travelers)) {
    const t = travelers as Record<string, unknown>;
    if (t.adults !== undefined) merged.adults = t.adults;
    if (t.children !== undefined) merged.children = t.children;
    if (t.infants !== undefined) merged.infants = t.infants;
  }
  delete merged.travelers;

  if (typeof raw.bags === "string") {
    const mapped = mapBagKeyword(raw.bags);
    if (mapped) merged.bagPolicy = mapped;
  }
  delete merged.bags;

  if (typeof raw.residency === "string") {
    merged.bookingCountry = raw.residency.trim().toUpperCase().slice(0, 2);
  }
  delete merged.residency;

  return merged;
}
