import type { Coordinate, Region, TransitRoute, Vehicle } from '@/lib/types';

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
}

export const REGION_CENTERS: Record<Region, Coordinate> = {
  johor: [103.7565, 1.4835],
  uthm: [103.0862, 1.8548],
};

const lengths = new WeakMap<Coordinate[], { segments: number[]; total: number }>();
function routeLengths(path: Coordinate[]) {
  const cached = lengths.get(path);
  if (cached) return cached;
  const segments = path.slice(1).map((point, index) => Math.hypot((point[0] - path[index][0]) * Math.cos(point[1] * Math.PI / 180), point[1] - path[index][1]));
  const result = { segments, total: segments.reduce((sum, distance) => sum + distance, 0) };
  lengths.set(path, result);
  return result;
}

/** Distance-based path interpolation keeps simulated buses on their route around corners. */
export function positionOnPath(path: Coordinate[], progress: number): { coordinate: Coordinate; bearing: number } {
  if (path.length < 2) return { coordinate: path[0] ?? [0, 0], bearing: 0 };
  const { segments, total } = routeLengths(path);
  if (!total) return { coordinate: path[0], bearing: 0 };
  let distance = ((progress % 1) + 1) % 1 * total;
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i]) continue;
    if (distance <= segments[i] || i === segments.length - 1) {
      const ratio = segments[i] ? distance / segments[i] : 0;
      const a = path[i]; const b = path[i + 1];
      return {
        coordinate: [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio],
        bearing: (Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + 360) % 360,
      };
    }
    distance -= segments[i];
  }
  return { coordinate: path[path.length - 1], bearing: 0 };
}

export function sampleMotion(motion: VehicleMotion, now: number) {
  const t = motion.duration <= 0 ? 1 : Math.max(0, Math.min(1, (now - motion.started) / motion.duration));
  if (motion.route && motion.fromProgress !== undefined && motion.toProgress !== undefined) {
    let delta = motion.toProgress - motion.fromProgress;
    // Simulator progress always advances. Shortest-arc interpolation would make
    // buses drive backwards after a longer pause or a delayed feed response.
    if (delta < 0) delta += 1;
    return { ...positionOnPath(motion.route.path, motion.fromProgress + delta * t), progress: (motion.fromProgress + delta * t + 1) % 1 };
  }
  const bearingDelta = ((motion.bearing - motion.fromBearing + 540) % 360) - 180;
  return {
    coordinate: [motion.from[0] + (motion.to[0] - motion.from[0]) * t, motion.from[1] + (motion.to[1] - motion.from[1]) * t] as Coordinate,
    bearing: motion.fromBearing + bearingDelta * t,
    progress: undefined,
  };
}

export function updateMotions(motions: Map<string, VehicleMotion>, vehicles: Vehicle[], routes: TransitRoute[], now: number) {
  const ids = new Set(vehicles.map(vehicle => vehicle.id));
  for (const id of motions.keys()) if (!ids.has(id)) motions.delete(id);
  for (const vehicle of vehicles) {
    const previous = motions.get(vehicle.id);
    // Polls may complete out of order. Never rewind a displayed observation.
    if (previous && vehicle.timestamp < previous.timestamp) continue;
    if (previous && previous.timestamp === vehicle.timestamp && previous.to[0] === vehicle.coordinate[0] && previous.to[1] === vehicle.coordinate[1]) continue;
    const current = previous ? sampleMotion(previous, now) : { coordinate: vehicle.coordinate, bearing: vehicle.bearing, progress: vehicle.progress };
    const delta = previous ? vehicle.timestamp - previous.timestamp : 0;
    motions.set(vehicle.id, {
      from: current.coordinate,
      to: vehicle.coordinate,
      fromBearing: current.bearing,
      bearing: vehicle.bearing,
      started: now,
      duration: previous ? Math.min(6000, Math.max(800, delta || 2500)) : 1,
      timestamp: vehicle.timestamp,
      // Official GPS positions stay authoritative; route progress is simulator-only.
      route: vehicle.source === 'simulator' ? routes.find(route => route.id === vehicle.routeId) : undefined,
      fromProgress: current.progress,
      toProgress: vehicle.progress,
    });
  }
}

export function createProjection(routes: TransitRoute[], region: Region) {
  const points = routes.flatMap(route => route.path);
  const center = REGION_CENTERS[region];
  const lngs = points.map(point => point[0]); const lats = points.map(point => point[1]);
  const west = points.length ? Math.min(...lngs) : center[0] - 0.025;
  const east = points.length ? Math.max(...lngs) : center[0] + 0.025;
  const south = points.length ? Math.min(...lats) : center[1] - 0.025;
  const north = points.length ? Math.max(...lats) : center[1] + 0.025;
  const midpoint: Coordinate = [(west + east) / 2, (south + north) / 2];
  const cos = Math.cos(midpoint[1] * Math.PI / 180);
  const scale = 76 / Math.max((east - west) * cos, north - south, 0.006);
  return {
    center: midpoint,
    bounds: [[west, south], [east, north]] as [Coordinate, Coordinate],
    width: Math.max(42, (east - west) * cos * scale + 22),
    depth: Math.max(42, (north - south) * scale + 22),
    project: (point: Coordinate): [number, number] => [(point[0] - midpoint[0]) * cos * scale, (midpoint[1] - point[1]) * scale],
    unproject: (point: [number, number]): Coordinate => [point[0] / (cos * scale) + midpoint[0], midpoint[1] - point[1] / scale],
  };
}
