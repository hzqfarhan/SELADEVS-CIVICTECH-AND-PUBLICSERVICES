import campusSnapshot from "../../public/data/uthm-katsana.json";
import type { Coordinate, Region, Stop, TransitRoute, Vehicle } from "./types";

// Real place names, illustrative corridors. Never presented as published timetables.
const illustrativeStops: Stop[] = [
  {
    id: "jb-sentral",
    name: "JB Sentral",
    coordinate: [103.7633, 1.4625],
    accessible: true,
    region: "johor",
  },
  {
    id: "city-square",
    name: "Johor Bahru City Square",
    coordinate: [103.7621, 1.4608],
    accessible: true,
    region: "johor",
  },
  {
    id: "jalan-wong",
    name: "Jalan Wong Ah Fook",
    coordinate: [103.7626, 1.4584],
    accessible: false,
    region: "johor",
  },
  {
    id: "heritage",
    name: "Jalan Tan Hiok Nee",
    coordinate: [103.7632, 1.4561],
    accessible: false,
    region: "johor",
  },
  {
    id: "komtar",
    name: "KOMTAR JBCC",
    coordinate: [103.7608, 1.4649],
    accessible: true,
    region: "johor",
  },
  {
    id: "persada",
    name: "Persada Johor",
    coordinate: [103.7578, 1.4627],
    accessible: true,
    region: "johor",
  },
  {
    id: "zoo",
    name: "Zoo Johor",
    coordinate: [103.7518, 1.4578],
    accessible: true,
    region: "johor",
  },
  {
    id: "waterfront",
    name: "Lido Waterfront",
    coordinate: [103.7467, 1.4649],
    accessible: true,
    region: "johor",
  },
  {
    id: "danga",
    name: "Danga City Mall",
    coordinate: [103.7567, 1.478],
    accessible: true,
    region: "johor",
  },
  {
    id: "plaza",
    name: "Plaza Pelangi",
    coordinate: [103.7675, 1.4809],
    accessible: true,
    region: "johor",
  },
  {
    id: "ksl",
    name: "KSL City",
    coordinate: [103.7631, 1.4854],
    accessible: true,
    region: "johor",
  },
  {
    id: "uthm-gate",
    name: "UTHM Main Gate",
    coordinate: [103.0828, 1.8538],
    accessible: true,
    region: "uthm",
  },
  {
    id: "uthm-library",
    name: "Perpustakaan Tunku Tun Aminah",
    coordinate: [103.0867, 1.8586],
    accessible: true,
    region: "uthm",
  },
  {
    id: "uthm-fkaab",
    name: "FKAAB",
    coordinate: [103.0906, 1.8561],
    accessible: true,
    region: "uthm",
  },
  {
    id: "uthm-hostel",
    name: "Kolej Kediaman",
    coordinate: [103.0827, 1.8627],
    accessible: false,
    region: "uthm",
  },
  {
    id: "parit-raja",
    name: "Parit Raja",
    coordinate: [103.11, 1.8657],
    accessible: false,
    region: "uthm",
  },
  {
    id: "uthm-kktu",
    name: "Kolej Kediaman Taman Universiti (KKTU)",
    coordinate: [103.075257, 1.85574],
    accessible: true,
    region: "uthm",
  },
];
const illustrativeRoutes: TransitRoute[] = [
  {
    id: "G01",
    name: "City & heritage",
    destination: "JB Sentral ↔ Heritage Quarter",
    color: "#b3f56b",
    operator: "GERAK · Johor demo",
    region: "johor",
    source: "demo",
    duration: 24,
    stops: [
      "jb-sentral",
      "city-square",
      "jalan-wong",
      "heritage",
      "persada",
      "komtar",
    ],
    path: [
      [103.7633, 1.4625],
      [103.7624, 1.4618],
      [103.7621, 1.4608],
      [103.7626, 1.4584],
      [103.7632, 1.4561],
      [103.7612, 1.4558],
      [103.7589, 1.4572],
      [103.7578, 1.4627],
      [103.7591, 1.4643],
      [103.7608, 1.4649],
      [103.7633, 1.4625],
    ],
  },
  {
    id: "G02",
    name: "The waterfront line",
    destination: "JB Sentral ↔ Lido Waterfront",
    color: "#75baff",
    operator: "GERAK · Johor demo",
    region: "johor",
    source: "demo",
    duration: 32,
    stops: [
      "jb-sentral",
      "city-square",
      "heritage",
      "zoo",
      "waterfront",
      "persada",
    ],
    path: [
      [103.7633, 1.4625],
      [103.7621, 1.4608],
      [103.7632, 1.4561],
      [103.7584, 1.4544],
      [103.754, 1.4557],
      [103.7518, 1.4578],
      [103.7489, 1.461],
      [103.7467, 1.4649],
      [103.7507, 1.4658],
      [103.7548, 1.4647],
      [103.7578, 1.4627],
      [103.7608, 1.4649],
      [103.7633, 1.4625],
    ],
  },
  {
    id: "G03",
    name: "City connections",
    destination: "JB Sentral ↔ KSL City",
    color: "#d6a1ff",
    operator: "GERAK · Johor demo",
    region: "johor",
    source: "demo",
    duration: 38,
    stops: ["jb-sentral", "komtar", "danga", "ksl", "plaza"],
    path: [
      [103.7633, 1.4625],
      [103.7608, 1.4649],
      [103.7592, 1.4679],
      [103.7578, 1.4724],
      [103.7567, 1.478],
      [103.7597, 1.4822],
      [103.7631, 1.4854],
      [103.7664, 1.4838],
      [103.7675, 1.4809],
      [103.7656, 1.4754],
      [103.7642, 1.4698],
      [103.7633, 1.4625],
    ],
  },
  {
    id: "U01",
    name: "Campus loop",
    destination: "Main Gate ↔ Residential Colleges",
    color: "#b3f56b",
    operator: "UTHM pilot · simulated",
    region: "uthm",
    source: "demo",
    duration: 16,
    stops: ["uthm-gate", "uthm-fkaab", "uthm-library", "uthm-hostel"],
    path: [
      [103.0828, 1.8538],
      [103.0873, 1.8535],
      [103.0906, 1.8561],
      [103.0901, 1.8589],
      [103.0867, 1.8586],
      [103.0854, 1.8614],
      [103.0827, 1.8627],
      [103.0806, 1.8597],
      [103.0828, 1.8538],
    ],
  },
  {
    id: "U02",
    name: "Parit Raja connector",
    destination: "UTHM ↔ Parit Raja",
    color: "#75baff",
    operator: "UTHM pilot · simulated",
    region: "uthm",
    source: "demo",
    duration: 28,
    stops: ["uthm-gate", "uthm-library", "parit-raja"],
    path: [
      [103.0828, 1.8538],
      [103.0867, 1.8586],
      [103.0914, 1.8605],
      [103.1002, 1.862],
      [103.11, 1.8657],
      [103.1083, 1.863],
      [103.0997, 1.86],
      [103.0901, 1.8552],
      [103.0828, 1.8538],
    ],
  },
];

// Published campus geometry; duration and vehicle motion remain demo estimates.
const campusDefinitions: Array<{
  campus: (typeof campusSnapshot.campuses)["batu-pahat"];
  region: Region;
}> = [
  {
    campus: campusSnapshot.campuses["batu-pahat"],
    region: "uthm",
  },
  {
    campus: campusSnapshot.campuses["pagoh"],
    region: "uthm-pagoh",
  },
];

const additionalCampusStops: Stop[] = [
  {
    id: "uthm-kktu",
    name: "Kolej Kediaman Taman Universiti (KKTU)",
    coordinate: [103.075257, 1.85574],
    accessible: true,
    region: "uthm",
  },
];

export const stops: Stop[] = [
  ...illustrativeStops.filter(
    (stop) =>
      stop.region !== "uthm" && (stop.region as string) !== "uthm-pagoh",
  ),
  ...additionalCampusStops,
  ...campusDefinitions.flatMap(({ campus, region }) =>
    Array.from(
      new Map(
        campus.routes
          .flatMap((route) => route.checkpoints)
          .map((stop) => [
            stop.id,
            {
              id: `uthm-katsana-${stop.id}`,
              name: stop.name,
              coordinate: [stop.longitude, stop.latitude] as Coordinate,
              accessible: false,
              region,
            },
          ]),
      ).values(),
    ),
  ),
];
export const routes: TransitRoute[] = [
  ...illustrativeRoutes.filter(
    (route) =>
      route.region !== "uthm" && (route.region as string) !== "uthm-pagoh",
  ),
  ...campusDefinitions.flatMap(({ campus, region }, campusIdx) =>
    campus.routes.map((route, routeIdx): TransitRoute => {
      const overallIndex = campusIdx * 2 + routeIdx;
      return {
        id: `U${String(overallIndex + 1).padStart(2, "0")}`,
        name: route.name,
        destination: route.name,
        color: ["#b3f56b", "#75baff", "#f6ad73"][overallIndex % 3],
        operator: "UTHM / KATSANA geometry · simulated service",
        region,
        source: "demo",
        duration: 20 + routeIdx * 5,
        stops: route.checkpoints.map((stop) => `uthm-katsana-${stop.id}`),
        path: route.path.map((point) => [point[0], point[1]] as Coordinate),
      };
    }),
  ),
];

export function distance(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180,
    dlat = (b[1] - a[1]) * rad,
    dlng = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function bearing(a: Coordinate, b: Coordinate): number {
  const r = Math.PI / 180,
    d = (b[0] - a[0]) * r;
  return (
    (Math.atan2(
      Math.sin(d) * Math.cos(b[1] * r),
      Math.cos(a[1] * r) * Math.sin(b[1] * r) -
        Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos(d),
    ) /
      r +
      360) %
    360
  );
}
export function positionOnPath(
  path: Coordinate[],
  progress: number,
): { coordinate: Coordinate; bearing: number } {
  if (path.length < 2) return { coordinate: path[0] ?? [0, 0], bearing: 0 };
  const lengths = path.slice(1).map((p, i) => distance(path[i], p));
  const total = lengths.reduce((s, v) => s + v, 0);
  let remaining = (((progress % 1) + 1) % 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? remaining / lengths[i] : 0;
      return {
        coordinate: [
          path[i][0] + (path[i + 1][0] - path[i][0]) * t,
          path[i][1] + (path[i + 1][1] - path[i][1]) * t,
        ],
        bearing: bearing(path[i], path[i + 1]),
      };
    }
    remaining -= lengths[i];
  }
  return { coordinate: path[0], bearing: 0 };
}
const UTHM_PARIT_RAJA_PLATES = [
  "JQF 7400",
  "JPJ 7300",
  "JRE 9100",
  "JRE 9200",
  "JPL 3900",
  "JRM 6900",
  "JMG 1800",
  "JJU 6300",
];
const UTHM_PAGOH_PLATES = [
  "JPJ 1600",
  "JNV 2800",
  "JNV 2900",
  "JPJ 1400",
  "JTU 7900",
  "JMG 1700",
  "JNC 2400",
];

export function simulateVehicles(region: Region, time = Date.now()): Vehicle[] {
  return routes
    .filter((r) => r.region === region)
    .flatMap((route, ri) =>
      Array.from({ length: region === "johor" ? 4 : 3 }, (_, i) => {
        const progress =
          (time / 1000 / (route.duration * 60) +
            i / (region === "johor" ? 4 : 3) +
            ri * 0.16) %
          1;
        const position = positionOnPath(route.path, progress);
        const length = route.path
          .slice(1)
          .reduce((s, p, j) => s + distance(route.path[j], p), 0);
        const plate =
          region === "uthm"
            ? UTHM_PARIT_RAJA_PLATES[
                (ri * 3 + i) % UTHM_PARIT_RAJA_PLATES.length
              ]
            : region === "uthm-pagoh"
              ? UTHM_PAGOH_PLATES[(ri * 3 + i) % UTHM_PAGOH_PLATES.length]
              : `JHR ${String(ri * 4 + i + 101)}`;
        return {
          id: `${route.id}-${i + 1}`,
          label: plate,
          licensePlate: plate,
          vehicleKind: "bus",
          routeId: route.id,
          ...position,
          progress,
          speed: Math.round((length / (route.duration * 60)) * 3.6),
          occupancy: (["low", "medium", "low", "high"] as const)[i],
          accessible: true,
          delay: i === 3 ? 4 : 0,
          timestamp: time,
          source: "simulator" as const,
          region,
        };
      }),
    );
}
export function etaForVehicle(vehicle: Vehicle, stopId: string): number | null {
  if (vehicle.source !== "simulator") return null;
  const route = routes.find((r) => r.id === vehicle.routeId),
    stop = stops.find((s) => s.id === stopId);
  if (!route || !stop || !route.stops.includes(stopId)) return null;
  const lengths = route.path.slice(1).map((p, i) => distance(route.path[i], p)),
    total = lengths.reduce((s, v) => s + v, 0);
  let best = Infinity,
    at = 0,
    traversed = 0;
  route.path.forEach((point, i) => {
    const d = distance(point, stop.coordinate);
    if (d < best) {
      best = d;
      at = traversed / total;
    }
    traversed += lengths[i] ?? 0;
  });
  return Math.max(
    1,
    Math.ceil(((at - (vehicle.progress ?? 0) + 1) % 1) * route.duration) +
      vehicle.delay,
  );
}
export interface Journey {
  routes: TransitRoute[];
  minutes: number;
  transfers: number;
  via: string[];
}
/** Hops a pattern must travel to carry `from` -> `to`, or null if it cannot. */
function hopCount(
  route: TransitRoute,
  patternStops: string[],
  from: string,
  to: string,
) {
  const start = patternStops.indexOf(from),
    end = patternStops.indexOf(to);
  if (start < 0 || end < 0 || start === end) return null;
  if (route.source === "official" && end <= start) return null;
  return (end - start + patternStops.length) % patternStops.length;
}
type PatternLegs = { route: TransitRoute; stops: string[] };
const asPatterns = (networkRoutes: TransitRoute[]): PatternLegs[] =>
  networkRoutes.flatMap((r) =>
    r.patterns?.length
      ? r.patterns.map((p) => ({
          route: r,
          stops: p.stops.map((s) => s.stopId),
        }))
      : [{ route: r, stops: r.stops }],
  );
/**
 * Stops planJourney can actually pair with `anchor`: direct or via one
 * transfer. With `forward` off it answers the mirror question - which stops
 * can reach the anchor - so both journey pickers only offer real endpoints.
 */
export function reachableStops(
  anchor: string,
  networkRoutes = routes,
  networkStops = stops,
  accessible = false,
  forward = true,
): Set<string> {
  const stopById = new Map(networkStops.map((s) => [s.id, s])),
    anchorStop = stopById.get(anchor);
  if (!anchorStop || (accessible && !anchorStop.accessible)) return new Set();
  const patterns = asPatterns(
    networkRoutes.filter((r) => r.region === anchorStop.region),
  );
  const byStop = new Map<string, PatternLegs[]>();
  for (const p of patterns)
    for (const s of new Set(p.stops))
      byStop.set(s, [...(byStop.get(s) ?? []), p]);
  const carries = (p: PatternLegs, a: string, b: string) =>
    hopCount(p.route, p.stops, forward ? a : b, forward ? b : a) !== null;
  const usable = (id: string) =>
    !accessible || stopById.get(id)?.accessible === true;
  const reached = new Set<string>();
  const anchored = patterns.filter((p) => p.stops.includes(anchor));
  for (const first of anchored) {
    for (const stop of first.stops)
      if (stop !== anchor && carries(first, anchor, stop) && usable(stop))
        reached.add(stop);
    for (const transfer of first.stops) {
      if (
        transfer === anchor ||
        !carries(first, anchor, transfer) ||
        !usable(transfer)
      )
        continue;
      for (const second of byStop.get(transfer) ?? []) {
        if (second.route.id === first.route.id) continue;
        for (const stop of second.stops)
          if (
            stop !== anchor &&
            stop !== transfer &&
            carries(second, transfer, stop) &&
            usable(stop)
          )
            reached.add(stop);
      }
    }
  }
  return reached;
}
export function planJourney(
  from: string,
  to: string,
  accessible = false,
  networkRoutes = routes,
  networkStops = stops,
): Journey[] {
  if (from === to) return [];
  const origin = networkStops.find((s) => s.id === from),
    destination = networkStops.find((s) => s.id === to);
  if (!origin || !destination || origin.region !== destination.region)
    return [];
  if (accessible && (!origin.accessible || !destination.accessible)) return [];
  const available = networkRoutes
      .filter((r) => r.region === origin.region)
      .flatMap((r) =>
        r.patterns?.length
          ? r.patterns.map((p) => ({
              ...r,
              stops: p.stops.map((s) => s.stopId),
              patterns: [p],
            }))
          : [r],
      ),
    results: Journey[] = [];
  const leg = (route: TransitRoute, a: string, b: string) => {
    const count = hopCount(route, route.stops, a, b);
    if (count === null) return null;
    return route.duration > 0
      ? Math.ceil(
          (route.duration * count) / Math.max(1, route.stops.length - 1),
        )
      : 0;
  };
  for (const route of available)
    if (route.stops.includes(from) && route.stops.includes(to)) {
      const minutes = leg(route, from, to);
      if (minutes !== null)
        results.push({ routes: [route], minutes, transfers: 0, via: [] });
    }
  for (const first of available.filter((r) => r.stops.includes(from)))
    for (const second of available.filter(
      (r) => r.id !== first.id && r.stops.includes(to),
    )) {
      const transfer = first.stops.find(
        (s) =>
          s !== from &&
          s !== to &&
          leg(first, from, s) !== null &&
          leg(second, s, to) !== null &&
          (!accessible || networkStops.find((st) => st.id === s)?.accessible),
      );
      if (transfer && !results.some((r) => r.transfers === 0)) {
        const a = leg(first, from, transfer)!,
          b = leg(second, transfer, to)!;
        results.push({
          routes: [first, second],
          minutes: a && b ? a + b : 0,
          transfers: 1,
          via: [transfer],
        });
      }
    }
  return results.sort((a, b) => a.minutes - b.minutes).slice(0, 3);
}
