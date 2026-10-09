import { z } from "zod";
import { serviceFor } from "./feeds";
import { distance, type Journey } from "./transit";
import type { Region, Stop, TransitRoute } from "./types";

export const profileSchema = z.object({
  citizenship: z.enum(["unknown", "malaysian", "foreigner"]).default("unknown"),
  category: z
    .enum([
      "adult",
      "uniformed_student",
      "senior_over_60",
      "oku",
      "university_student",
    ])
    .default("adult"),
  concessionConfirmed: z.boolean().default(false),
  card: z.enum(["none", "basmy_concession"]).default("none"),
  cardActiveConfirmed: z.boolean().default(false),
});
export type PassengerProfile = z.infer<typeof profileSchema>;
export const defaultProfile: PassengerProfile = profileSchema.parse({});
export const FARE_SOURCE = "https://bas.my/pasperjalanan.php";
export const fareConfigSchema = z.object({
  region: z.string(),
  sourceUrl: z.string().url(),
  verifiedAt: z.string().date(),
  effectiveFrom: z.string().date().optional(),
  effectiveUntil: z.string().date().optional(),
  baseMetres: z.number().int().positive(),
  baseMicros: z.number().int().nonnegative(),
  additionalKmMicros: z.number().int().nonnegative(),
  pass: z.object({
    priceSen: z.number().int().nonnegative(),
    days: z.number().int().positive(),
    coverageConfirmed: z.boolean(),
  }),
  overrides: z.array(
    z.object({
      routeId: z.string(),
      patternId: z.string().optional(),
      fromSequence: z.number().int(),
      toSequence: z.number().int(),
      fareSen: z.number().int().nonnegative().nullable(),
      concessionAllowed: z.boolean(),
    }),
  ),
});
export type FareConfig = z.infer<typeof fareConfigSchema>;
// Official national rate verified 2026-10-08. City-specific pass coverage is
// not inferred from the national RM30 price; comparisons remain gated.
export function fareConfig(region: Region): FareConfig | null {
  if (serviceFor(region).operator !== "BAS.MY" || region === "kuching")
    return null;
  return {
    region,
    sourceUrl: FARE_SOURCE,
    verifiedAt: "2026-10-08",
    baseMetres: 2000,
    baseMicros: 940000,
    additionalKmMicros: 94000,
    pass: { priceSen: 3000, days: 30, coverageConfirmed: false },
    overrides: [],
  };
}
export type Leg = {
  route: TransitRoute;
  patternId: string | null;
  fromStopId: string;
  toStopId: string;
  fromSequence: number;
  toSequence: number;
};
export type DistanceResult =
  | { metres: number; method: "gtfs_shape_dist_traveled" | "route_geometry" }
  | { metres: null; method: null; reason: string };
const missing = (reason: string): DistanceResult => ({
  metres: null,
  method: null,
  reason,
});
export function resolveDistance(leg: Leg, stops: Stop[]): DistanceResult {
  const p = leg.route.patterns?.find((p) => p.id === leg.patternId);
  if (!p || leg.route.source !== "official") return missing("missing_pattern");
  const start = p.stops.findIndex(
    (s) => s.sequence === leg.fromSequence && s.stopId === leg.fromStopId,
  );
  const end = p.stops.findIndex(
    (s) => s.sequence === leg.toSequence && s.stopId === leg.toStopId,
  );
  if (
    p.stops.filter((s) => s.stopId === leg.fromStopId).length > 1 ||
    p.stops.filter((s) => s.stopId === leg.toStopId).length > 1
  )
    return missing("ambiguous_shape");
  if (
    start < 0 ||
    end <= start ||
    p.stops.some(
      (s, i) =>
        !Number.isFinite(s.sequence) ||
        (i > 0 && s.sequence <= p.stops[i - 1].sequence),
    )
  )
    return missing("invalid_stop_order");
  const values = p.stops.map((s) => s.shapeDistance);
  if (
    p.shapeId &&
    p.distanceUnit !== "unknown" &&
    values.every(
      (v, i) =>
        v !== null &&
        Number.isFinite(v) &&
        v >= 0 &&
        (i === 0 || v > (values[i - 1] ?? Infinity)),
    )
  ) {
    const a = values[start],
      b = values[end];
    if (a !== null && b !== null)
      return {
        metres: (b - a) * (p.distanceUnit === "kilometres" ? 1000 : 1),
        method: "gtfs_shape_dist_traveled",
      };
  }
  if (
    p.geometrySource !== "gtfs_shape" ||
    !p.shapeId ||
    p.path.length < 2 ||
    p.path.some((c) => !c.every(Number.isFinite))
  )
    return missing("missing_shape");
  const positions: number[] = [];
  // Resolve the entire ordered stop sequence. Ambiguous overlapping sections
  // fail closed rather than selecting the wrong occurrence of a loop.
  for (const occurrence of p.stops) {
    const stop = stops.find((s) => s.id === occurrence.stopId);
    if (!stop) return missing("missing_stop");
    let travelled = 0;
    const candidates: { offset: number; error: number }[] = [];
    for (let i = 1; i < p.path.length; i++) {
      const a = p.path[i - 1],
        b = p.path[i],
        cos = Math.cos((stop.coordinate[1] * Math.PI) / 180);
      const dx = (b[0] - a[0]) * cos,
        dy = b[1] - a[1],
        size = dx * dx + dy * dy;
      const len = distance(a, b);
      if (!size) continue;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((stop.coordinate[0] - a[0]) * cos * dx +
            (stop.coordinate[1] - a[1]) * dy) /
            size,
        ),
      );
      const point: [number, number] = [
        a[0] + t * (b[0] - a[0]),
        a[1] + t * (b[1] - a[1]),
      ];
      const error = distance(point, stop.coordinate),
        offset = travelled + t * len;
      if (error <= 40) candidates.push({ offset, error });
      travelled += len;
    }
    candidates.sort((a, b) => a.error - b.error);
    const best = candidates[0];
    if (
      !best ||
      candidates.some(
        (c) =>
          c.error <= best.error + 5 && Math.abs(c.offset - best.offset) > 80,
      )
    )
      return missing("ambiguous_shape");
    if (positions.length && best.offset <= positions[positions.length - 1])
      return missing("invalid_stop_order");
    positions.push(best.offset);
  }
  const metres = positions[end] - positions[start];
  return Number.isFinite(metres) && metres > 0
    ? { metres, method: "route_geometry" }
    : missing("invalid_distance");
}
export type FareResult = {
  status: "estimated" | "unavailable" | "unsupported_operator";
  fareSen: number | null;
  reason: string;
  rule: "distance_formula" | "route_override" | "concession" | null;
  distance: DistanceResult;
  sourceUrl: string | null;
  billedExtraKm?: number;
  baseSen?: number;
};
export function calculateFare(input: {
  leg: Leg;
  distance: DistanceResult;
  profile: PassengerProfile;
  config: FareConfig | null;
  asOf: string;
}): FareResult {
  const { leg, distance: d, profile, config, asOf } = input;
  const unavailable = (
    reason: string,
    status: FareResult["status"] = "unavailable",
  ): FareResult => ({
    status,
    fareSen: null,
    reason,
    rule: null,
    distance: d,
    sourceUrl: config?.sourceUrl ?? null,
  });
  if (serviceFor(leg.route.region).operator !== "BAS.MY")
    return unavailable("unsupported_operator", "unsupported_operator");
  if (!config) return unavailable("unverified_city");
  if (
    !fareConfigSchema.safeParse(config).success ||
    !profileSchema.safeParse(profile).success ||
    !/^\d{4}-\d{2}-\d{2}$/.test(asOf) ||
    config.region !== leg.route.region ||
    (config.effectiveFrom && asOf < config.effectiveFrom) ||
    (config.effectiveUntil && asOf > config.effectiveUntil)
  )
    return unavailable("invalid_configuration");
  if (leg.route.source !== "official") return unavailable("demo_distance");
  const known = config.overrides.filter(
    (o) =>
      o.routeId === leg.route.id &&
      (!o.patternId || o.patternId === leg.patternId),
  );
  const override = known.find(
    (o) =>
      o.fromSequence === leg.fromSequence && o.toSequence === leg.toSequence,
  );
  if (known.length && (!override || override.fareSen === null))
    return unavailable("unresolved_override");
  if (d.metres === null && !override) return unavailable("missing_distance");
  if (d.metres !== null && (!Number.isFinite(d.metres) || d.metres < 0))
    return unavailable("invalid_distance");
  const extra =
    d.metres === null
      ? 0
      : Math.max(0, Math.ceil((d.metres - config.baseMetres) / 1000));
  const raw =
    override?.fareSen !== undefined && override.fareSen !== null
      ? override.fareSen * 10000
      : d.metres === 0
        ? 0
        : config.baseMicros + extra * config.additionalKmMicros;
  const discountAllowed = !override || override.concessionAllowed;
  const free =
    discountAllowed &&
    profile.citizenship === "malaysian" &&
    profile.category !== "adult" &&
    profile.card === "basmy_concession" &&
    profile.cardActiveConfirmed;
  const half =
    discountAllowed &&
    profile.concessionConfirmed &&
    ["uniformed_student", "senior_over_60", "oku"].includes(profile.category);
  const amount = free ? 0 : half ? raw / 2 : raw;
  if (
    !Number.isSafeInteger(raw) ||
    !Number.isSafeInteger(Math.floor((amount + 5000) / 10000))
  )
    return unavailable("invalid_configuration");
  return {
    status: "estimated",
    fareSen: Math.floor((amount + 5000) / 10000),
    reason: free ? "confirmed_card" : half ? "confirmed_half" : "standard",
    rule:
      free || half
        ? "concession"
        : override
          ? "route_override"
          : "distance_formula",
    distance: d,
    sourceUrl: config.sourceUrl,
    billedExtraKm: extra,
    baseSen: config.baseMicros / 10000,
  };
}
export function journeyLegs(journey: Journey, from: string, to: string): Leg[] {
  const points = [from, ...journey.via, to];
  return journey.routes.map((route, i) => {
    const p = route.patterns?.[0];
    const a = p?.stops.find((s) => s.stopId === points[i]);
    const b = p?.stops.find(
      (s) =>
        s.stopId === points[i + 1] && s.sequence > (a?.sequence ?? Infinity),
    );
    return {
      route,
      patternId: p?.id ?? null,
      fromStopId: points[i],
      toStopId: points[i + 1],
      fromSequence: a?.sequence ?? -1,
      toSequence: b?.sequence ?? -1,
    };
  });
}
export function estimateJourney(
  journey: Journey,
  from: string,
  to: string,
  stops: Stop[],
  profile: PassengerProfile,
  asOf: string,
) {
  const legs = journeyLegs(journey, from, to).map((leg) => ({
    leg,
    fare: calculateFare({
      leg,
      distance: resolveDistance(leg, stops),
      profile,
      config: fareConfig(leg.route.region),
      asOf,
    }),
  }));
  const knownSen = legs.reduce((n, l) => n + (l.fare.fareSen ?? 0), 0);
  return {
    legs,
    knownSen,
    totalSen:
      legs.length && legs.every((l) => l.fare.fareSen !== null)
        ? knownSen
        : null,
  };
}
export const formatFare = (sen: number) => `RM${(sen / 100).toFixed(2)}`;
