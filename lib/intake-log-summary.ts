import type { IntakeValues } from "@/lib/intake-schema";

/** Safe summary for logs — counts and enums only, no raw origins/destinations text. */
export function summarizeIntakeForLog(data: IntakeValues): Record<string, unknown> {
  return {
    originsCount: data.origins.length,
    destinationsCount: data.destinations.length,
    anywhereInternational: data.anywhereInternational,
    anywhereEurope: data.anywhereEurope,
    dateMode: data.dateMode,
    tripType: data.tripType,
    flexibleDays: data.flexibleDays,
    adults: data.adults,
    children: data.children,
    infants: data.infants,
    cabin: data.cabin,
    bagPolicy: data.bagPolicy,
    budgetCeiling: data.budgetCeiling,
    currency: data.currency,
    bookingCountrySet: data.bookingCountry.length === 2,
  };
}
