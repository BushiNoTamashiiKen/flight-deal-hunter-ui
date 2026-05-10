export interface ParsedFlightOption {
  rank: number;
  headline: string;
  carriers: string;
  totalDisplay: string;
  routing?: string;
  airports: string[];
  duration?: string;
  stops?: number;
  fareBase?: number;
  fareBags?: number;
  fareTransit?: number;
  fareTotal?: number;
  fareCurrency?: string;
  bookingLine?: string;
  bookingLabel?: string;
  bookingUrl?: string;
  tradeoffs?: string;
  confidence?: string;
}

export interface ParsedReport {
  tripTitle?: string;
  tldr?: string;
  options: ParsedFlightOption[];
  alsoConsidered: string[];
  risks: string[];
  checklist: Array<{ text: string; done: boolean }>;
  raw: string;
}

function extractBetween(body: string, start: string, end?: string): string | undefined {
  const i = body.indexOf(start);
  if (i === -1) return undefined;
  const sliceFrom = i + start.length;
  if (!end) return body.slice(sliceFrom).trim();
  const j = body.indexOf(end, sliceFrom);
  if (j === -1) return body.slice(sliceFrom).trim();
  return body.slice(sliceFrom, j).trim();
}

/** Pull airports from "Routing: CPT → AMS → LIS, ..." */
export function parseAirportsFromRouting(line: string): string[] {
  const routingPart = line.replace(/^-\s*Routing:\s*/i, "").split(",")[0]?.trim() ?? "";
  if (!routingPart.includes("→")) return [];
  return routingPart
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse fare numbers from `Fare: 612 + bags 140 + transit 90 = 842` */
function parseFareLine(line: string): Pick<
  ParsedFlightOption,
  "fareBase" | "fareBags" | "fareTransit" | "fareTotal"
> {
  const cleaned = line.replace(/^-\s*Fare:\s*/i, "");
  const nums = Array.from(cleaned.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) =>
    Number(m[1])
  );
  const out: Pick<ParsedFlightOption, "fareBase" | "fareBags" | "fareTransit" | "fareTotal"> = {};
  if (nums.length >= 4) {
    out.fareBase = nums[0];
    out.fareBags = nums[1];
    out.fareTransit = nums[2];
    out.fareTotal = nums[3];
  } else if (nums.length === 1) {
    out.fareTotal = nums[0];
  }
  return out;
}

function parseHeadline(line: string): Pick<ParsedFlightOption, "headline" | "carriers" | "totalDisplay" | "fareCurrency"> {
  const stripped = line.replace(/\*\*/g, "").trim();
  const m = stripped.match(/^(\d+)\.\s*(.+?)\s*[—–-]\s*(.+)$/);
  if (!m) {
    return { headline: stripped, carriers: stripped, totalDisplay: "", fareCurrency: undefined };
  }
  const rest = m[3].trim();
  const currencyMatch = rest.match(/([A-Z]{3})\s*$/);
  return {
    headline: stripped,
    carriers: m[2].trim(),
    totalDisplay: rest,
    fareCurrency: currencyMatch?.[1],
  };
}

/** Parse ranked report markdown shaped like SKILL.md Step 8. */
export function parseRankedReport(markdown: string): ParsedReport {
  const raw = markdown.trim();
  const tripTitle = raw.match(/^## Trip:\s*(.+)$/m)?.[1]?.trim();

  const tldr =
    raw.match(/### TL;DR\s*\n+([\s\S]*?)(?=\n### |\n## |$)/)?.[1]?.trim()?.replace(/^\*\*|\*\*$/g, "") ??
    raw.match(/### TL;DR\s*\n+([\s\S]*?)(?=\n)/)?.[1]?.trim();

  const topSection =
    extractBetween(raw, "### Top 3 options", "### Also considered") ??
    extractBetween(raw, "### Top 3 options", "### Risks");

  const options: ParsedFlightOption[] = [];
  if (topSection) {
    const blocks = topSection
      .split(/\n(?=\*\*\d+\.)/g)
      .map((b) => b.trim())
      .filter((b) => /^\*\*\d+\./.test(b));
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const first = lines[0] ?? "";
      const rankMatch = first.match(/^\*\*(\d+)\./);
      const rank = rankMatch ? Number(rankMatch[1]) : options.length + 1;
      const headlineParts = parseHeadline(first);

      const opt: ParsedFlightOption = {
        rank,
        headline: headlineParts.headline,
        carriers: headlineParts.carriers,
        totalDisplay: headlineParts.totalDisplay,
        fareCurrency: headlineParts.fareCurrency,
        airports: [],
      };

      for (const line of lines.slice(1)) {
        if (/^-\s*Routing:/i.test(line)) {
          opt.routing = line.replace(/^-\s*/i, "");
          opt.airports = parseAirportsFromRouting(line);
          const dur = line.match(/(\d+h\s*\d+m|\d+h)/i);
          if (dur) opt.duration = dur[0];
          const stops = line.match(/(\d+)\s*stops?/i);
          if (stops) opt.stops = Number(stops[1]);
        } else if (/^-\s*Fare:/i.test(line)) {
          Object.assign(opt, parseFareLine(line));
        } else if (/^-\s*Booking:/i.test(line)) {
          opt.bookingLine = line.replace(/^-\s*Booking:\s*/i, "").trim();
          const url = line.match(/https?:\/\/[^\s)]+/);
          if (url) opt.bookingUrl = url[0];
          const beforeUrl = url ? opt.bookingLine.split(url[0])[0] : opt.bookingLine;
          opt.bookingLabel =
            beforeUrl.replace(/[—–-]\s*$/, "").trim() || "Booking source";
        } else if (/^-\s*Tradeoffs:/i.test(line)) {
          opt.tradeoffs = line.replace(/^-\s*Tradeoffs:\s*/i, "").trim();
        } else if (/^-\s*Confidence:/i.test(line)) {
          opt.confidence = line.replace(/^-\s*Confidence:\s*/i, "").trim();
        }
      }
      options.push(opt);
    }
  }

  const alsoRaw =
    extractBetween(raw, "### Also considered", "### Risks") ??
    extractBetween(raw, "### Also considered", "### Risks & caveats");
  const alsoConsidered =
    alsoRaw
      ?.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^-\s*/, "")) ?? [];

  const risksRaw =
    extractBetween(raw, "### Risks & caveats", "### Booking checklist") ??
    extractBetween(raw, "### Risks", "### Booking checklist");
  const risks =
    risksRaw
      ?.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^-\s*/, "")) ?? [];

  const checklistRaw = extractBetween(raw, "### Booking checklist", undefined);
  const checklist: Array<{ text: string; done: boolean }> = [];
  if (checklistRaw) {
    for (const line of checklistRaw.split("\n")) {
      const m = line.match(/^-\s*\[\s*([ xX])\s*\]\s*(.+)$/);
      if (m) {
        checklist.push({ done: m[1].toLowerCase() === "x", text: m[2].trim() });
      }
    }
  }

  return {
    tripTitle,
    tldr,
    options,
    alsoConsidered,
    risks,
    checklist,
    raw,
  };
}

export function extractTaggedReport(fullText: string): string | undefined {
  return extractBetween(fullText, "[[SKYFLINT_REPORT_BEGIN]]", "[[SKYFLINT_REPORT_END]]");
}
