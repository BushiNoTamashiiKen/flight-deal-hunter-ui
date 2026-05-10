import type { IntakeValues } from "@/lib/intake-schema";

const WORKFLOW_CHECKLIST = `Trip Hunt Progress:
- [ ] 1. Intake: confirm trip parameters
- [ ] 2. Baseline: aggregator sweep (Google Flights / Kayak / Skyscanner)
- [ ] 3. Budget-carrier direct check
- [ ] 4. Nearby-airport + flexible-date expansion
- [ ] 5. Structural plays (separate tickets, hidden city, repositioning)
- [ ] 6. Error-fare & deal-feed cross-check
- [ ] 7. Total-cost normalization (bags, transit, time penalty)
- [ ] 8. Ranked report + booking caveats`;

/** Builds the Cursor agent prompt for the Flight Deal Hunter workflow + intake JSON. */
export function buildFlightDealHunterPrompt(intake: IntakeValues): string {
  const serialized = JSON.stringify(intake, null, 2);

  return `You are running the **flight-deal-hunter** Cursor Agent Skill workflow.

## Canonical checklist (mirror this mentally)
${WORKFLOW_CHECKLIST}

## Confirmed intake (do not re-ask — respect every field)
${serialized}

## Execution rules (from the skill)
- Follow Steps 1–8 in order. Always show your work when quoting fares: source, cabin, bag inclusion, and timestamp when possible.
- Never invent fares. If live quotes are unavailable in this environment, say so clearly and provide deep-link search URLs using the patterns from the skill (Google Flights / Kayak / Skyscanner).
- Normalize true total cost (bags + transit + time penalty + booking-channel risk) before ranking.

## Machine-readable progress markers (required)
After you fully complete workflow step N (1–8), output exactly one line:
[[SKYFLINT_STEP_DONE:N]]

## Final ranked report markers (required)
Wrap your final ranked markdown report (Step 8 template exactly) between:
[[SKYFLINT_REPORT_BEGIN]]
...markdown here...
[[SKYFLINT_REPORT_END]]

The markdown inside must match this structure exactly:

## Trip: {Origin} → {Destination}, {Dates}, {Pax}, {Cabin}

### TL;DR
{One sentence with the single best recommendation and why.}

### Top 3 options

**1. {Carrier(s)} — {Total} {CCY}**
- Routing: {A → B → C}, {Xh Ym total}, {N stops}
- Fare: {base} + bags {x} + transit {y} = {total}
- Booking: {direct carrier | OTA name} — link
- Tradeoffs: {red-eye? long layover? separate tickets?}
- Confidence: {High / Medium / Low — last seen at this price: {timestamp}}

**2. ...**
**3. ...**

### Also considered
- {Cheapest raw fare that lost on total cost — explain why}
- {Best premium upgrade-for-the-money option}
- {Best date-shift suggestion: "shift outbound by 2 days saves $X"}

### Risks & caveats
- {Separate-ticket exposure / LCC bag policy / passport-validity / visa-transit / Schengen-90/180}

### Booking checklist
- [ ] Verify passport validity ≥6 months past return
- [ ] Confirm bag allowance matches selected fare class
- [ ] Check transit visa requirements for {layover country}
- [ ] Pay with a card with travel insurance / chargeback protection
- [ ] Set a rebooking watch in Google Flights for {date}

Begin now with Step 1 using the intake JSON above.`;
}
