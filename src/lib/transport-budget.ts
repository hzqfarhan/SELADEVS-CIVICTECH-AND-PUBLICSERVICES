import { z } from "zod";
import { REGION_IDS, serviceFor } from "./feeds";
import { planJourney } from "./transit";
import type { Stop, TransitRoute } from "./types";
import {
  estimateJourney,
  type PassengerProfile,
  type FareConfig,
} from "./fares";
export const tripSchema = z.object({
  id: z.string().min(1),
  region: z.enum(REGION_IDS),
  from: z.string().min(1),
  to: z.string().min(1),
  routeIds: z.array(z.string()).min(1).max(2),
  patternIds: z.array(z.string().nullable()).max(2),
  tripsPerDay: z.number().int().min(0).max(20),
  days: z.number().int().min(0).max(31),
  direction: z.enum(["one_way", "return"]),
  enabled: z.boolean(),
  serviceDays: z.array(z.number().int().min(1).max(31)).max(31).optional(),
});
export type RecurringTrip = z.infer<typeof tripSchema>;
export const budgetSchema = z.object({
  schemaVersion: z.literal(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  monthlyLimitSen: z.number().int().min(0).max(100000000),
  recurringTrips: z.array(tripSchema).max(50),
});
export type TransportBudget = z.infer<typeof budgetSchema>;
export function calculateBudget(
  budget: TransportBudget,
  routes: TransitRoute[],
  stops: Stop[],
  profile: PassengerProfile,
  asOf: string,
) {
  budgetSchema.parse(budget);
  const daysInMonth = new Date(
    Number(budget.month.slice(0, 4)),
    Number(budget.month.slice(5)),
    0,
  ).getDate();
  const items = budget.recurringTrips
    .filter((t) => t.enabled)
    .map((trip) => {
      const count = trip.tripsPerDay * trip.days;
      const journey = planJourney(
        trip.from,
        trip.to,
        false,
        routes,
        stops,
      ).find(
        (j) =>
          j.routes.map((r) => r.id).join("|") === trip.routeIds.join("|") &&
          j.routes.every(
            (r, i) =>
              (r.patterns?.[0]?.id ?? null) === (trip.patternIds[i] ?? null),
          ),
      );
      const outbound = journey
        ? estimateJourney(journey, trip.from, trip.to, stops, profile, asOf)
        : null;
      // Return is an independent route query, never double an outbound fare.
      const returns =
        trip.direction === "return"
          ? planJourney(trip.to, trip.from, false, routes, stops).filter(
              (j) =>
                j.routes.map((r) => r.id).join("|") ===
                trip.routeIds.slice().reverse().join("|"),
            )
          : [];
      const inbound =
        returns.length === 1
          ? estimateJourney(
              returns[0],
              trip.to,
              trip.from,
              stops,
              profile,
              asOf,
            )
          : null;
      const complete =
        trip.days <= daysInMonth &&
        outbound?.totalSen !== null &&
        outbound !== null &&
        (trip.direction === "one_way" ||
          (inbound !== null && inbound.totalSen !== null));
      const knownSen =
        count * ((outbound?.knownSen ?? 0) + (inbound?.knownSen ?? 0));
      return {
        trip,
        knownSen,
        totalSen: count === 0 ? 0 : complete ? knownSen : null,
        reason:
          trip.days > daysInMonth
            ? "invalid_days"
            : !journey
              ? "update_trip"
              : !complete
                ? "incomplete"
                : "complete",
        outbound,
        inbound,
      };
    });
  const knownSen = items.reduce((n, t) => n + t.knownSen, 0),
    complete = items.every((t) => t.totalSen !== null);
  const totalSen = complete ? knownSen : null;
  return {
    items,
    knownSen,
    totalSen,
    remainingSen: totalSen === null ? null : budget.monthlyLimitSen - totalSen,
    percentage:
      totalSen === null || budget.monthlyLimitSen === 0
        ? null
        : (totalSen / budget.monthlyLimitSen) * 100,
    status: !items.length
      ? "empty"
      : !complete
        ? "incomplete"
        : budget.monthlyLimitSen === 0
          ? "unconfigured"
          : knownSen > budget.monthlyLimitSen
            ? "over"
            : knownSen === budget.monthlyLimitSen
              ? "at"
              : "under",
  };
}
export type PricedOccurrence = {
  day: number;
  region: (typeof REGION_IDS)[number];
  fareSen: number | null;
  journeyId?: string;
};
// Input must be the actual selected, dated sequence. Unknown coverage or dates
// never become an invented average-fare break-even estimate.
export function comparePass(
  events: PricedOccurrence[],
  config: FareConfig,
  profile: PassengerProfile,
  activationDay: number,
) {
  if (
    profile.citizenship !== "malaysian" ||
    !config.pass.coverageConfirmed ||
    config.pass.priceSen === null ||
    !Number.isInteger(activationDay) ||
    activationDay < 1 ||
    activationDay > 31 ||
    events.some(
      (e) =>
        !Number.isInteger(e.day) ||
        e.day < 1 ||
        e.day > 31 ||
        e.fareSen === null ||
        !Number.isSafeInteger(e.fareSen) ||
        e.fareSen < 0,
    )
  )
    return null;
  let covered = 0,
    remaining = 0,
    breakEven: number | null = null,
    count = 0;
  const groups = new Map<string, PricedOccurrence[]>();
  [...events]
    .sort((a, b) => a.day - b.day)
    .forEach((e, i) => {
      const key = e.journeyId ?? String(i);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    });
  for (const group of groups.values()) {
    let eligibleJourney = false;
    for (const e of group) {
      if (e.fareSen === null) return null;
      const eligible =
        e.region === config.region &&
        serviceFor(e.region).operator === "BAS.MY" &&
        e.day >= activationDay &&
        e.day < activationDay + config.pass.days;
      if (eligible) {
        covered += e.fareSen;
        eligibleJourney = true;
      } else remaining += e.fareSen;
    }
    if (eligibleJourney) {
      count++;
      if (breakEven === null && covered >= config.pass.priceSen)
        breakEven = count;
    }
  }
  return {
    payPerTripSen: covered + remaining,
    withPassSen: config.pass.priceSen + remaining,
    savingSen: covered - config.pass.priceSen,
    breakEven,
  };
}
