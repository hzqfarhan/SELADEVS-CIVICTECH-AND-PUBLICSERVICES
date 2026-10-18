import { SERVICES } from "@/lib/feeds";
import type { Coordinate, Region, TransitRoute, Vehicle } from "@/lib/types";

export interface VehicleMotion {
  from: Coordinate;
  to: Coordinate;
  fromBearing: number;
  bearing: number;
  started: number;
  duration: number;
  timestamp: number;
  route?: TransitRoute;
  fromProgress?: number;
  toProgress?: number;
  /** Magnitudes of the last few observed along-shape movements, m/s. */
  speeds?: number[];
  /** Consecutive fix intervals that moved backwards along the shape. */
  backward?: number;
  prediction?: {
    path: Coordinate[];
    progress: number;
    correction: number;
    rate: number;
    age: number;
    loop: boolean;
    /** The fix landed too far behind the estimate to reconcile without reversing. */
    hold?: boolean;
    /** Seconds of travel the estimate may claim, from this observation window. */
    horizon?: number;
  };
}

export const REGION_CENTERS = Object.fromEntries(
  SERVICES.map((s) => [s.id, s.center]),
) as Record<Region, Coordinate>;

const lengths = new WeakMap<
  Coordinate[],
  { segments: number[]; total: number }
>();
function routeLengths(path: Coordinate[]) {
  const cached = lengths.get(path);
  if (cached) return cached;
  const segments = path
    .slice(1)
    .map((point, index) =>
      Math.hypot(
        (point[0] - path[index][0]) * Math.cos((point[1] * Math.PI) / 180),
        point[1] - path[index][1],
      ),
    );
  const result = {
    segments,
    total: segments.reduce((sum, distance) => sum + distance, 0),
  };
  lengths.set(path, result);
  return result;
}

/** Distance-based path interpolation keeps simulated buses on their route around corners. */
export function positionOnPath(
  path: Coordinate[],
  progress: number,
): { coordinate: Coordinate; bearing: number } {
  if (path.length < 2) return { coordinate: path[0] ?? [0, 0], bearing: 0 };
  const { segments, total } = routeLengths(path);
  if (!total) return { coordinate: path[0], bearing: 0 };
  let distance = (((progress % 1) + 1) % 1) * total;
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i]) continue;
    if (distance <= segments[i] || i === segments.length - 1) {
      const ratio = segments[i] ? distance / segments[i] : 0;
      const a = path[i];
      const b = path[i + 1];
      return {
        coordinate: [
          a[0] + (b[0] - a[0]) * ratio,
          a[1] + (b[1] - a[1]) * ratio,
        ],
        bearing:
          ((Math.atan2(
            (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180),
            b[1] - a[1],
          ) *
            180) /
            Math.PI +
            360) %
          360,
      };
    }
    distance -= segments[i];
  }
  return { coordinate: path[path.length - 1], bearing: 0 };
}

/** Closest segment projection; never extrapolate a bus onto an unrelated corridor. */
export function projectToRoute(
  path: Coordinate[],
  point: Coordinate,
  heading?: number,
) {
  const { segments, total } = routeLengths(path);
  let nearest = { progress: 0, distance: Infinity, bearing: 0 };
  let traversed = 0;
  let bestScore = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const a = path[i],
      b = path[i + 1];
    const cos = Math.cos((point[1] * Math.PI) / 180);
    const dx = (b[0] - a[0]) * cos,
      dy = b[1] - a[1];
    const size = dx * dx + dy * dy;
    if (!size) continue;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point[0] - a[0]) * cos * dx + (point[1] - a[1]) * dy) / size,
      ),
    );
    const distance =
      Math.hypot((point[0] - a[0]) * cos - t * dx, point[1] - a[1] - t * dy) *
      111320;
    const segmentBearing = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
    const angle =
      heading === undefined
        ? 0
        : Math.abs(((heading - segmentBearing + 540) % 360) - 180);
    // At nearby crossings prefer an aligned street, in either direction.
    const score = distance + (Math.min(angle, 180 - angle) / 90) * 25;
    if (score < bestScore) {
      bestScore = score;
      nearest = {
        distance,
        progress: total ? (traversed + segments[i] * t) / total : 0,
        bearing: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360,
      };
    }
    traversed += segments[i];
  }
  return nearest;
}

/** How far an estimate may run ahead of the next fix before that gap is closed
 * by holding the marker instead of sliding it backwards along the road. */
const OVER_RUN_HOLD_METRES = 60;

/** Signed movement between two observations along one shape, in metres. */
function shapeMove(
  path: Coordinate[],
  a: Coordinate,
  b: Coordinate,
  total: number,
  loop: boolean,
) {
  const from = projectToRoute(path, a),
    to = projectToRoute(path, b);
  if (from.distance > 80 || to.distance > 80) return undefined;
  const moved = (to.progress - from.progress) * total;
  return loop && moved < -total / 2 ? moved + total : moved;
}

/** Coast to a halt over the final 30 seconds of a three-minute GPS outage. */
export function predictionTravelSeconds(age: number) {
  const seconds = Math.max(0, Math.min(180, age));
  if (seconds <= 150) return seconds;
  const t = (seconds - 150) / 30;
  return 150 + 30 * (t - t ** 3 + t ** 4 / 2);
}

export function sampleMotion(motion: VehicleMotion, now: number) {
  if (motion.prediction) {
    const p = motion.prediction;
    const elapsed = Math.max(0, (now - motion.started) / 1000);
    // Estimate only for a bounded outage. Never manufacture new GPS timestamps.
    const seconds = Math.min(
      predictionTravelSeconds(p.age + elapsed),
      p.horizon ?? Infinity,
    );
    const blend = Math.min(1, elapsed / 6);
    let progress =
      p.progress +
      p.rate * seconds +
      p.correction * (1 - blend * blend * (3 - 2 * blend));
    progress = p.loop
      ? ((progress % 1) + 1) % 1
      : Math.max(0, Math.min(1, progress));
    const sample = positionOnPath(p.path, Math.min(progress, 1 - 1e-12));
    if (!p.loop && progress === 1)
      sample.coordinate = p.path[p.path.length - 1];
    return {
      ...sample,
      bearing: (sample.bearing + (p.rate < 0 ? 180 : 0)) % 360,
      progress,
      estimated: seconds > 0 && p.rate !== 0,
      predictionPaused: p.age + elapsed >= 180,
      correcting: p.hold === true,
    };
  }
  const t =
    motion.duration <= 0
      ? 1
      : Math.max(0, Math.min(1, (now - motion.started) / motion.duration));
  if (
    motion.route &&
    motion.fromProgress !== undefined &&
    motion.toProgress !== undefined
  ) {
    let delta = motion.toProgress - motion.fromProgress;
    // Simulator progress always advances. Shortest-arc interpolation would make
    // buses drive backwards after a longer pause or a delayed feed response.
    if (delta < 0) delta += 1;
    return {
      ...positionOnPath(motion.route.path, motion.fromProgress + delta * t),
      progress: (motion.fromProgress + delta * t + 1) % 1,
    };
  }
  const bearingDelta =
    ((motion.bearing - motion.fromBearing + 540) % 360) - 180;
  return {
    coordinate: [
      motion.from[0] + (motion.to[0] - motion.from[0]) * t,
      motion.from[1] + (motion.to[1] - motion.from[1]) * t,
    ] as Coordinate,
    bearing: motion.fromBearing + bearingDelta * t,
    progress: undefined,
  };
}

export function updateMotions(
  motions: Map<string, VehicleMotion>,
  vehicles: Vehicle[],
  routes: TransitRoute[],
  now: number,
  wallNow = Date.now(),
) {
  const ids = new Set(vehicles.map((vehicle) => vehicle.id));
  for (const id of motions.keys()) if (!ids.has(id)) motions.delete(id);
  for (const vehicle of vehicles) {
    const previous = motions.get(vehicle.id);
    // Polls may complete out of order. Never rewind a displayed observation.
    if (previous && vehicle.timestamp < previous.timestamp) continue;
    const route = routes.find(
      (r) => r.id === vehicle.routeId && r.source === "official",
    );
    // A route carries one representative shape, usually a single direction.
    // Projecting the opposite half of the fleet onto it rewinds those buses at
    // every fix, so follow the one-way shape matching the reported direction.
    const shape =
      route?.patterns?.find(
        (p) =>
          p.direction !== null &&
          p.direction === vehicle.direction &&
          p.path.length > 1,
      )?.path ?? route?.path;
    if (
      previous &&
      previous.timestamp === vehicle.timestamp &&
      previous.to[0] === vehicle.coordinate[0] &&
      previous.to[1] === vehicle.coordinate[1] &&
      (vehicle.source === "simulator" || previous.prediction?.path === shape)
    )
      continue;
    const current = previous
      ? sampleMotion(previous, now)
      : {
          coordinate: vehicle.coordinate,
          bearing: vehicle.bearing,
          progress: vehicle.progress,
        };
    const delta = previous ? vehicle.timestamp - previous.timestamp : 0;
    const displaced =
      previous &&
      Math.hypot(
        vehicle.coordinate[0] - previous.to[0],
        vehicle.coordinate[1] - previous.to[1],
      ) > 0.00001;
    const inferredBearing = displaced
      ? ((Math.atan2(
          (vehicle.coordinate[0] - previous.to[0]) *
            Math.cos((vehicle.coordinate[1] * Math.PI) / 180),
          vehicle.coordinate[1] - previous.to[1],
        ) *
          180) /
          Math.PI +
          360) %
        360
      : (previous?.bearing ?? 0);
    const projected = shape
      ? projectToRoute(
          shape,
          vehicle.coordinate,
          vehicle.bearingKnown === false ? undefined : vehicle.bearing,
        )
      : undefined;
    let prediction: VehicleMotion["prediction"];
    let speeds = previous?.speeds ? [...previous.speeds] : [];
    let backward = 0;
    if (
      vehicle.source === "gtfs-rt" &&
      shape &&
      projected &&
      projected.distance < 80
    ) {
      const total = routeLengths(shape).total * 111320;
      const loop =
        Math.hypot(
          shape[0][0] - shape.at(-1)![0],
          shape[0][1] - shape.at(-1)![1],
        ) *
          111320 <
        30;
      const gap = delta / 1000;
      const moved =
        previous && total && gap > 2
          ? shapeMove(shape, previous.to, vehicle.coordinate, total, loop)
          : undefined;
      // Under about 2.5 km/h of travel between fixes, the difference between
      // two observations is GPS noise and can support neither speed nor course.
      const noise = Math.max(12, gap * 0.7);
      if (moved !== undefined && Math.abs(moved) > noise) {
        speeds = [...speeds, Math.abs(moved / gap)].slice(-3);
        backward = moved < 0 ? (previous?.backward ?? 0) + 1 : 0;
      }
      const heading =
        vehicle.bearingKnown === false ? inferredBearing : vehicle.bearing;
      const reported =
        vehicle.speedKnown === false ? undefined : vehicle.speed / 3.6;
      // These feeds publish no speed, so the estimate is the recent lower
      // median of observed movements: one jittered fix cannot spike it, and a
      // bus that has just slowed is not extrapolated at its old pace.
      const observed = speeds.length
        ? [...speeds].sort((a, b) => a - b)[Math.floor((speeds.length - 1) / 2)]
        : 0;
      const speed = Math.max(
        0,
        Math.min(
          vehicle.vehicleKind === "rail" ? 50 : 30,
          reported ?? observed,
        ),
      );
      // One backward fix is a jam reading or a projection artefact. Only a
      // sustained series of them means the vehicle actually turned around.
      const direction =
        moved === undefined
          ? Math.abs(((heading - projected.bearing + 540) % 360) - 180) > 90
            ? -1
            : 1
          : backward >= 2
            ? -1
            : 1;
      const age = Math.max(0, (wallNow - vehicle.timestamp) / 1000);
      const rate = total ? (direction * speed) / total : 0;
      // Only claim as much road as the window that produced this speed. A bus
      // that has just stopped cannot be extrapolated across a whole fix age,
      // and a long lead is what turns into a visible backward snap next poll.
      const horizon = gap > 2 ? gap : undefined;
      const travel = Math.min(
        predictionTravelSeconds(age),
        horizon ?? Infinity,
      );
      const start = projectToRoute(shape, current.coordinate);
      let correction =
        previous && start.distance < 80
          ? start.progress - (projected.progress + rate * travel)
          : 0;
      if (loop) correction = ((correction + 1.5) % 1) - 0.5;
      // Sliding the marker backwards to meet a fix that landed behind an
      // over-run estimate animates a bus driving in reverse. Beyond a few
      // metres of that, show the observation as it is, predict nothing, and
      // label the position as correcting.
      const hold = total > 0 && correction * total > OVER_RUN_HOLD_METRES;
      prediction = {
        path: shape,
        progress: projected.progress,
        correction: hold ? 0 : correction,
        rate: hold ? 0 : rate,
        age,
        loop,
        hold,
        horizon,
      };
    }
    motions.set(vehicle.id, {
      prediction,
      speeds,
      backward,
      from: current.coordinate,
      to: vehicle.coordinate,
      fromBearing: current.bearing,
      bearing:
        vehicle.bearingKnown === false ? inferredBearing : vehicle.bearing,
      started: now,
      duration: previous ? Math.min(6000, Math.max(800, delta || 2500)) : 1,
      timestamp: vehicle.timestamp,
      // Official GPS positions stay authoritative; route progress is simulator-only.
      route:
        vehicle.source === "simulator"
          ? routes.find((route) => route.id === vehicle.routeId)
          : undefined,
      fromProgress: current.progress,
      toProgress: vehicle.progress,
    });
  }
}

export function createProjection(
  routes: TransitRoute[],
  region: Region,
  worldSpan = 76,
) {
  const points = routes.flatMap((route) => route.path);
  const center = REGION_CENTERS[region];
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  const west = points.length ? Math.min(...lngs) : center[0] - 0.025;
  const east = points.length ? Math.max(...lngs) : center[0] + 0.025;
  const south = points.length ? Math.min(...lats) : center[1] - 0.025;
  const north = points.length ? Math.max(...lats) : center[1] + 0.025;
  const midpoint: Coordinate = [(west + east) / 2, (south + north) / 2];
  const cos = Math.cos((midpoint[1] * Math.PI) / 180);
  const scale = worldSpan / Math.max((east - west) * cos, north - south, 0.006);
  return {
    center: midpoint,
    bounds: [
      [west, south],
      [east, north],
    ] as [Coordinate, Coordinate],
    width: Math.max(42, (east - west) * cos * scale + 22),
    depth: Math.max(42, (north - south) * scale + 22),
    project: (point: Coordinate): [number, number] => [
      (point[0] - midpoint[0]) * cos * scale,
      (midpoint[1] - point[1]) * scale,
    ],
    unproject: (point: [number, number]): Coordinate => [
      point[0] / (cos * scale) + midpoint[0],
      midpoint[1] - point[1] / scale,
    ],
  };
}
