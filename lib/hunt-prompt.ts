import type { IntakeValues } from "@/lib/intake-schema";

const WORKFLOW_CHECKLIST = `Trip Hunt Progress:
- [ ] 1. Intake: confirm trip parameters
- [ ] 2. Baseline: parallel aggregator sweep (≥4 distinct sources — see rules)
- [ ] 3. Budget-carrier direct check (+ bag normalization)
- [ ] 4. Nearby-airport matrix + systematic date-flex expansion
- [ ] 5. Structural plays (separate tickets, repositioning, virtual interlining, etc.)
- [ ] 6. Error-fare & deal-feed cross-check (≥2 feeds when applicable)
- [ ] 7. Total-cost normalization (bags, transit, time penalty, OTA risk premium)
- [ ] 7.5 Cross-validation gate (hard — do not emit Step 8 until satisfied or every gap is UNCHECKABLE with deep-links)
- [ ] 8. Ranked report + price-anchor sanity + booking caveats`;

/** Builds the Cursor agent prompt for the Flight Deal Hunter workflow + intake JSON. */
export function buildFlightDealHunterPrompt(intake: IntakeValues): string {
  const serialized = JSON.stringify(intake, null, 2);

  return `You are running the **flight-deal-hunter** Cursor Agent Skill workflow.

## Canonical checklist (mirror this mentally)
${WORKFLOW_CHECKLIST}

## Confirmed intake (do not re-ask — respect every field)
${serialized}

## Execution rules (from the skill — strict)
1. **Cheapest = lowest verified all-in total**, not OTA headline or one-aggregator sticker price. Rank only after **Step 7 normalization** on every finalist.
2. **Before any "cheapest" claim:** run **≥6 distinct sources in parallel** (same dates/pax/cabin/bags intent). Default pool includes **Google Flights, Kayak, Skyscanner, ITA Matrix, Kiwi, Trip.com, Wego, Momondo, Hopper** — use all relevant sources for the route; if fewer than 6 are available, mark the blocked ones as **UNCHECKABLE** with a deep-link and reason.
3. **Never invent fares, times, or carriers.** Every numeric quote must trace to a **named source + retrieval time (UTC) + deep-link** that reproduces the search. If you cannot fetch live data, write **UNCHECKABLE** for that item and still supply the **best-effort URL pattern** from the skill — do not fill gaps with plausible numbers.
4. **Disagreement rule:** if two sources differ by **>8%** on comparable total, **pause ranking** until you reconcile (third check, fare-class match, bag inclusion alignment) or report both with **Low confidence** and explain.
5. **Step 7.5 gate (blocking):** Do **not** open \`[[SKYFLINT_REPORT_BEGIN]]\` until each applicable bullet in Step 7.5 of the **flight-deal-hunter** skill is **done** or **UNCHECKABLE + deep-link**. Include a **### Cross-validation gate** subsection in the report summarizing PASS / PARTIAL / UNCHECKABLE per row.
6. **Breadth loop (required):** after baseline, keep expanding coverage until you hit diminishing returns: nearby-airport matrix, date-grid expansion, regional OTAs, and carrier-direct checks for each region touched by candidate routings. Stop only when one of these is true: (a) no option beats winner by ≥2% after normalization, or (b) environment/time limits block further checks — then list blocked checks as **UNCHECKABLE + link**.
7. **LCC and self-transfer:** quote **carrier-direct** fees where aggregators flake; separate tickets need **explicit misconnect caveat** and buffer guidance.
8. **Currency:** report in **${intake.currency}**; note POS quirks when comparing.

## Machine-readable progress markers (required)
After you fully complete checklist step **N** (1–8), output exactly one line:
[[SKYFLINT_STEP_DONE:N]]
Treat **step 7** as complete only after **both** total-cost normalization **and** Step **7.5** cross-validation (or documented UNCHECKABLE rows) — then emit **\`[[SKYFLINT_STEP_DONE:7]]\`** once.

## Final ranked report markers (required)
Wrap your final ranked markdown report (Step 8 template exactly) between:
[[SKYFLINT_REPORT_BEGIN]]
...markdown here...
[[SKYFLINT_REPORT_END]]

The markdown inside must follow this structure (do not skip sections; use "UNCHECKABLE — see link" where data is missing):

## Trip: {Origin} → {Destination}, {Dates}, {Pax}, {Cabin}

### TL;DR
{Best pick + why — must align with verified totals in Top 3.}

### Cross-validation gate
{Table or bullets: each Step 7.5 requirement → PASS | PARTIAL | UNCHECKABLE + deep-link}

### Top 3 options

**1. {Carrier(s)} — {Total} {CCY}**
- Routing: {A → B → C}, {Xh Ym total}, {N stops}
- **Source:** {aggregator / carrier direct / ITA / etc.}
- **Bags:** {what is included vs add-on fees for this intake}
- Fare: {base} + bags {x} + transit {y} = {total}
- **Retrieval:** {UTC timestamp}
- Booking: {label} — {deep-link reproducing search}
- **Why ranked here:** {beats #2 by ___ after normalization; or caveat if uncertain}
- Tradeoffs: {…}
- Confidence: {High / Medium / Low}

**2. …** **3. …**

### Price-anchor sanity
{Compare winner to typical band for route/dates; flag if anomalously cheap (error-fare risk) or expensive.}

### What could change this
- {1–3 concrete triggers, e.g. date shift, alternate airport}

### Freshness
{Cash fares ~6–12h validity — revalidate before pay.}

### Also considered
- {Cheapest raw fare that lost on total cost — explain why}
- {Best premium upgrade-for-the-money option}
- {Best date-shift suggestion}

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
