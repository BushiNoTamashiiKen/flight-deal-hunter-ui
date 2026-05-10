import { encodeEvent } from "@/lib/stream-events";

/** Canonical demo markdown — CPT ⇄ Lisbon, October, structured per SKILL.md Step 8. */
export const DEMO_RANKED_REPORT = `## Trip: CPT → Lisbon (LIS), October (±3 days flex), 2 adults, Economy

### TL;DR
**Best overall pick:** TAP Air Portugal via Amsterdam on a single ticket — competitive true total once bags and sensible ground transit are included, vs a cheaper-looking split-ticket combo that adds misconnect risk.

### Top 3 options

**1. TAP Air Portugal — 842 EUR**
- Routing: CPT → AMS → LIS, 22h 10m total, 1 stop
- Fare: 612 + bags 140 + transit 90 = 842
- Booking: Google Flights → TAP — https://www.google.com/travel/flights?q=Flights+from+CPT+to+LIS+on+2026-10-14
- Tradeoffs: Overnight-ish connection attitude (long AMS layover); not the shortest elapsed time
- Confidence: Medium — last seen at this price: 2026-05-09 14:10 UTC

**2. Air France / KLM — 910 EUR**
- Routing: CPT → CDG → LIS, 19h 40m total, 1 stop
- Fare: 705 + bags 120 + transit 85 = 910
- Booking: Kayak — https://www.kayak.com/flights/CPT-LIS/2026-10-14/2026-10-21
- Tradeoffs: Higher headline fare than TAP; strong protection as single ticket
- Confidence: High — last seen at this price: 2026-05-09 13:45 UTC

**3. Split itinerary (long-haul + Ryanair) — 798 EUR**
- Routing: CPT → LON-area → STN, then FR STN → LIS (self-transfer), 26h 05m total, 2 tickets
- Fare: 540 + bags 188 + transit 70 = 798
- Booking: Kiwi (self-transfer) — https://www.kiwi.com/
- Tradeoffs: Separate tickets; luggage recheck; misconnect exposure
- Confidence: Low — last seen at this price: 2026-05-09 12:05 UTC

### Also considered
- Cheapest raw fare: €482 from a mystery OTA on Skyscanner — lost after verified bag fees, seat bundles, and ~5% OTA friction premium in normalization.
- Premium upgrade-for-money: TAP Economy Extra bundle ~€140 r/t for seats-together + priority — strong value if traveling as a pair with cabin bags.
- Date shift: Moving outbound Wed→Thu within the October flex window historically shaved ~€65 on the TAP bucket for this route mix.

### Risks & caveats
- Self-transfer itineraries have no protection if the inbound long-haul is delayed.
- Ryanair bag policies are route-specific — confirm carry-on dimensions at purchase.
- Schengen 90/180 applies if adding EU hops on separate tickets in the same trip.

### Booking checklist
- [ ] Verify passport validity ≥6 months past return
- [ ] Confirm bag allowance matches selected fare class
- [ ] Check transit visa requirements for Netherlands (AMS) if routing via AMS
- [ ] Pay with a card with travel insurance / chargeback protection
- [ ] Set a rebooking watch in Google Flights for October outbound in the flex window
`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* demoHuntStream(): AsyncGenerator<string> {
  const logs: Array<{ step: number; lines: string[] }> = [
    {
      step: 1,
      lines: [
        "Step 1 — Intake locked: CPT ⇄ LIS, October flex ±3, 2 adults, economy, carry-on baseline.",
        "Translating chips into concrete search matrices for aggregators + LCC direct passes.",
      ],
    },
    {
      step: 2,
      lines: [
        "Step 2 — Baseline sweep: launching Google Flights grid, Kayak hacker-fare scan, Skyscanner month view.",
        "Capturing cheapest / cheapest-direct / reasonable-fast buckets per source.",
      ],
    },
    {
      step: 3,
      lines: [
        "Step 3 — LCC direct pass: checking Ryanair, easyJet, TAP promo fares ex secondary airports.",
        "Warning noted: headline FR fares diverge after bundle add-ons — quoting inclusive-of-needs totals only.",
      ],
    },
    {
      step: 4,
      lines: [
        "Step 4 — Expansion: testing JNB alternate origin traction (ground cost delta vs fare savings).",
        "Date grid: shifting outbound mid-week within ±3 improves TAP bucket modestly.",
      ],
    },
    {
      step: 5,
      lines: [
        "Step 5 — Structural plays: comparing Kiwi self-transfer vs protected connections.",
        "Separate tickets flagged where savings exist — buffers ≥4h where applicable.",
      ],
    },
    {
      step: 6,
      lines: [
        "Step 6 — Deal feeds cross-check: scanning Secret Flying / Holiday Pirates headlines for EU↔Africa flashes.",
        "Nothing fresher than 24h beats normalized totals — baseline fares still dominate.",
      ],
    },
    {
      step: 7,
      lines: [
        "Step 7 — Normalizing true totals: adding bag allowances per intake, AMS ground transit estimate, OTA friction premium on sketch OTAs.",
        "Ranking by comparable all-in economics (not sticker fare).",
      ],
    },
    {
      step: 8,
      lines: [
        "Step 8 — Composing ranked report + caveats + booking checklist — aligning to Step 8 markdown template.",
      ],
    },
  ];

  for (const block of logs) {
    yield encodeEvent({ type: "step", step: block.step, status: "running" });
    for (const line of block.lines) {
      yield encodeEvent({ type: "log", text: line });
      await delay(220);
    }
    yield encodeEvent({ type: "step", step: block.step, status: "done" });
    await delay(140);
  }

  yield encodeEvent({ type: "report", markdown: DEMO_RANKED_REPORT });
}
