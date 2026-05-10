export const WORKFLOW_STEPS = [
  { id: 1, label: "Intake: confirm trip parameters" },
  { id: 2, label: "Baseline: aggregator sweep (Google Flights / Kayak / Skyscanner)" },
  { id: 3, label: "Budget-carrier direct check" },
  { id: 4, label: "Nearby-airport + flexible-date expansion" },
  { id: 5, label: "Structural plays (separate tickets, hidden city, repositioning)" },
  { id: 6, label: "Error-fare & deal-feed cross-check" },
  { id: 7, label: "Total-cost normalization (bags, transit, time penalty)" },
  { id: 8, label: "Ranked report + booking caveats" },
] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]["id"];
