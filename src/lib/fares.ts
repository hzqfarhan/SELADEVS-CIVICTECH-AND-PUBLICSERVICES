import { z } from "zod";
import fareOverrides from "./fare-overrides.generated.json";
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
  // Null when the national pass price is not verified for this region.
  pass: z.object({
    priceSen: z.number().int().nonnegative().nullable(),
    days: z.number().int().positive(),
    coverageConfirmed: z.boolean(),
  }),
  // False where the distance formula has no verified local publication;
  // legs then price only through published route-table overrides.
  formulaVerified: z.boolean().default(true),
  overrides: z.array(
    z.object({
      routeId: z.string(),
      patternId: z.string().optional(),
      fromSequence: z.number().int(),
      toSequence: z.number().int(),
      fareSen: z.number().int().nonnegative().nullable(),
      concessionAllowed: z.boolean(),
      sourceUrl: z.string().url().optional(),
    }),
  ),
});
export type FareConfig = z.infer<typeof fareConfigSchema>;
type GeneratedRegion = {
  formulaVerified: boolean;
  sourceUrl: string;
  verifiedAt: string;
  overrides: FareConfig["overrides"];
};
const generatedRegions = fareOverrides.regions as Record<
  string,
  GeneratedRegion
>;
// Official national rate verified 2026-10-08. City-specific pass coverage is
// not inferred from the national RM30 price; comparisons remain gated.
export function fareConfig(region: Region): FareConfig | null {
  if (serviceFor(region).operator !== "BAS.MY") return null;
  const generated = generatedRegions[region];
  // Kuching has no verified fare formula publication; it is priceable only
  // through the imported route tables, and nothing else.
  if (region === "kuching" && !generated) return null;
  return {
    region,
    sourceUrl: generated?.sourceUrl ?? FARE_SOURCE,
    verifiedAt: generated?.verifiedAt ?? "2026-10-08",
    baseMetres: 2000,
    baseMicros: 940000,
    additionalKmMicros: 94000,
    pass: {
      priceSen: region === "kuching" ? null : 3000,
      days: 30,
      coverageConfirmed: false,
    },
    formulaVerified: generated?.formulaVerified ?? true,
    overrides: generated?.overrides ?? [],
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
// A stop plotted within SNAP_TRUSTED of its shape is on the corridor. Wider
// stops are still usable, but only when nothing closer exists - real feeds plot
// some stops across a forecourt or slip road, 45-55 m from the digitised path.
const SNAP_TRUSTED = 40;
const SNAP_RELUCTANT = 80;
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
  // Assign every stop between boarding and alighting to one strictly
  // increasing point along the shape, minimising total snap error. Stops are
  // trusted only when all near-optimal assignments place them in the same
  // along-shape cluster, so out-and-back corridors that genuinely tie still
  // fail closed.
  const proj: { offset: number; error: number }[][] = [];
  for (const occurrence of p.stops.slice(start, end + 1)) {
    const stop = stops.find((s) => s.id === occurrence.stopId);
    if (!stop) return missing("missing_stop");
    let travelled = 0;
    const raw: { offset: number; error: number }[] = [];
    for (let i = 1; i < p.path.length; i++) {
      const a = p.path[i - 1],
        b = p.path[i],
        cos = Math.cos((stop.coordinate[1] * Math.PI) / 180);
      const dx = (b[0] - a[0]) * cos,
        dy = b[1] - a[1],
        size = dx * dx + dy * dy;
      const len = distance(a, b);
      if (!size) {
        travelled += len;
        continue;
      }
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
      if (error <= SNAP_RELUCTANT) raw.push({ offset, error });
      travelled += len;
    }
    raw.sort((a, b) => a.offset - b.offset);
    // Prefer the stops that sit on the shape. The wider band is only a last
    // resort for stops plotted across a forecourt or slip road, so widening it
    // can never add a rival candidate to a stop that already snaps well; the
    // near-optimal cluster gate below still has the final say.
    const tight = raw.filter((c) => c.error <= SNAP_TRUSTED);
    const trusted = tight.length ? tight : raw;
    proj.push(
      trusted.filter((c, i) => i === 0 || c.offset - trusted[i - 1].offset > 5),
    );
  }
  if (proj.some((c) => !c.length)) return missing("ambiguous_shape");
  const INF = Number.POSITIVE_INFINITY;
  const fwd = proj.map((c) => c.map(() => INF));
  proj[0].forEach((c, j) => (fwd[0][j] = c.error));
  for (let i = 1; i < proj.length; i++) {
    let best = INF;
    let k = 0;
    for (let j = 0; j < proj[i].length; j++) {
      while (
        k < proj[i - 1].length &&
        proj[i - 1][k].offset < proj[i][j].offset
      ) {
        best = Math.min(best, fwd[i - 1][k]);
        k++;
      }
      if (best < INF) fwd[i][j] = best + proj[i][j].error;
    }
  }
  const last = proj.length - 1;
  const opt = Math.min(...fwd[last]);
  if (!Number.isFinite(opt)) return missing("invalid_stop_order");
  const bwd = proj.map((c) => c.map(() => INF));
  bwd[last].fill(0);
  for (let i = last - 1; i >= 0; i--) {
    let best = INF;
    let k = proj[i + 1].length - 1;
    for (let j = proj[i].length - 1; j >= 0; j--) {
      while (k >= 0 && proj[i + 1][k].offset > proj[i][j].offset) {
        best = Math.min(best, bwd[i + 1][k]);
        k--;
      }
      if (best < INF) bwd[i][j] = best;
    }
  }
  const band: { offset: number; error: number }[] = [];
  for (let i = 0; i <= last; i++) {
    const on = proj[i].filter(
      (_, j) =>
        Number.isFinite(fwd[i][j]) &&
        Number.isFinite(bwd[i][j]) &&
        fwd[i][j] + bwd[i][j] <= opt + 5,
    );
    if (on.length > 1 && on[on.length - 1].offset - on[0].offset > 80)
      return missing("ambiguous_shape");
    let best = on[0];
    for (const c of on) if (c.error < best.error) best = c;
    band.push(best);
  }
  const metres = band[last].offset - band[0].offset;
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
  if (!override && !config.formulaVerified)
    return unavailable("unverified_city");
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
    sourceUrl: override?.sourceUrl ?? config.sourceUrl,
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

export function sortJourneysByFare(
  journeys: Journey[],
  from: string,
  to: string,
  stops: Stop[],
  profile: PassengerProfile,
  asOf: string,
) {
  return journeys
    .map((journey, index) => {
      const estimate = estimateJourney(journey, from, to, stops, profile, asOf);
      const hasKnownFare = estimate.legs.some(
        ({ fare }) => fare.fareSen !== null,
      );
      return {
        journey,
        index,
        fareSen: hasKnownFare ? estimate.knownSen : null,
      };
    })
    .sort((a, b) => {
      if (a.fareSen === null && b.fareSen === null) return a.index - b.index;
      if (a.fareSen === null) return 1;
      if (b.fareSen === null) return -1;
      return a.fareSen - b.fareSen || a.index - b.index;
    })
    .map(({ journey }) => journey);
}
export const formatFare = (sen: number) => `RM${(sen / 100).toFixed(2)}`;
