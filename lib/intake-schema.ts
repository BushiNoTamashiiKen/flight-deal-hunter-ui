import { z } from "zod";

export const CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "JPY"] as const;

export const dateModeEnum = z.enum([
  "fixed",
  "flexible",
  "whole_month",
  "cheapest_month",
]);

export const cabinEnum = z.enum([
  "economy",
  "premium_economy",
  "business",
  "first",
]);

export const CABIN_VALUES = cabinEnum.options;

export const bagPolicyEnum = z.enum(["personal", "carryon", "checked"]);

export const intakeSchema = z
  .object({
    origins: z.array(z.string().min(1)).min(1),
    destinations: z.array(z.string().min(1)),
    anywhereInternational: z.boolean(),
    anywhereEurope: z.boolean(),
    dateMode: dateModeEnum,
    tripType: z.enum(["roundtrip", "oneway"]),
    flexibleDays: z.coerce.number().int().min(0).max(21),
    tripLengthNights: z.coerce.number().int().min(1).max(42),
    outboundDate: z.string().optional(),
    returnDate: z.string().optional(),
    monthYear: z.string().optional(),
    cheapestMonth: z.string().optional(),
    adults: z.coerce.number().int().min(1).max(9),
    children: z.coerce.number().int().min(0).max(9),
    infants: z.coerce.number().int().min(0).max(9),
    cabin: cabinEnum,
    bagPolicy: bagPolicyEnum,
    checkedBags: z.coerce.number().int().min(0).max(5),
    constraintNoRedEyes: z.boolean(),
    constraintMaxLayovers: z.boolean(),
    constraintMaxLayoversValue: z.coerce.number().int().min(0).max(4),
    constraintMaxTotalTime: z.boolean(),
    constraintMaxHours: z.coerce.number().int().min(6).max(48),
    avoidCarriers: z.string(),
    prefDirect: z.boolean(),
    prefAllianceStatus: z.boolean(),
    prefAvoidUSConnections: z.boolean(),
    budgetCeiling: z.coerce.number().positive(),
    currency: z.enum(CURRENCIES),
    bookingCountry: z.string().length(2),
  })
  .superRefine((data, ctx) => {
    const discovery =
      data.anywhereInternational ||
      data.anywhereEurope ||
      data.destinations.length > 0;
    if (!discovery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add destinations or enable an anywhere search.",
        path: ["destinations"],
      });
    }

    if (data.dateMode === "fixed") {
      if (!data.outboundDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick an outbound date.",
          path: ["outboundDate"],
        });
      }
      if (data.tripType === "roundtrip" && !data.returnDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a return date.",
          path: ["returnDate"],
        });
      }
    }

    if (data.dateMode === "flexible") {
      if (!data.outboundDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a center date for the flexible window.",
          path: ["outboundDate"],
        });
      }
      if (data.flexibleDays < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose ± days ≥ 1.",
          path: ["flexibleDays"],
        });
      }
    }

    if (data.dateMode === "whole_month") {
      if (!data.monthYear || !/^\d{4}-\d{2}$/.test(data.monthYear)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a month.",
          path: ["monthYear"],
        });
      }
    }

    if (data.dateMode === "cheapest_month") {
      if (!data.cheapestMonth || !/^\d{4}-\d{2}$/.test(data.cheapestMonth)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a month range anchor.",
          path: ["cheapestMonth"],
        });
      }
    }

    if (data.constraintMaxLayovers && data.constraintMaxLayoversValue < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid layover cap.",
        path: ["constraintMaxLayoversValue"],
      });
    }
  });

export type IntakeValues = z.infer<typeof intakeSchema>;

export const defaultIntakeValues: IntakeValues = {
  origins: ["CPT"],
  destinations: ["LIS"],
  anywhereInternational: false,
  anywhereEurope: false,
  dateMode: "fixed",
  tripType: "roundtrip",
  flexibleDays: 3,
  tripLengthNights: 7,
  outboundDate: "2026-10-14",
  returnDate: "2026-10-21",
  monthYear: "2026-10",
  cheapestMonth: "2026-10",
  adults: 2,
  children: 0,
  infants: 0,
  cabin: "economy",
  bagPolicy: "carryon",
  checkedBags: 0,
  constraintNoRedEyes: false,
  constraintMaxLayovers: false,
  constraintMaxLayoversValue: 2,
  constraintMaxTotalTime: false,
  constraintMaxHours: 24,
  avoidCarriers: "",
  prefDirect: false,
  prefAllianceStatus: false,
  prefAvoidUSConnections: false,
  budgetCeiling: 900,
  currency: "EUR",
  bookingCountry: "ZA",
};
