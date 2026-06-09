import { extractRankedReportSection, extractTaggedReport } from "@/lib/parse-report";

export function flushStepMarkers(
  text: string,
  seenSteps: Set<number>,
  onStepDone: (step: number) => void
): void {
  const re = /\[\[SKYFLINT_STEP_DONE:(\d+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const step = Number(m[1]);
    if (!seenSteps.has(step)) {
      seenSteps.add(step);
      onStepDone(step);
    }
  }
}

export function buildReportMarkdown(buffer: string, resultText?: string): string {
  const merged =
    buffer + (typeof resultText === "string" && resultText.length > 0 ? `\n${resultText}` : "");

  let reportMd = extractRankedReportSection(merged);
  if (!reportMd) {
    reportMd = extractTaggedReport(merged)?.trim();
  }
  if (!reportMd) {
    reportMd =
      typeof resultText === "string" && resultText.trim().length > 0
        ? resultText.trim()
        : merged.trim();
  }
  return reportMd;
}
