import { serviceFor } from "../feeds";
import { distance } from "../transit";
import { unzipSync } from "fflate";
import { parse } from "csv-parse/sync";
import type { Coordinate, Stop, TransitRoute, Region } from "@/lib/types";
import type { TransitNetwork } from "./network";
type Row = Record<string, string>;
const allowedFiles = new Set([
  "agency.txt",
  "routes.txt",
  "stops.txt",
  "trips.txt",
  "stop_times.txt",
  "shapes.txt",
]);
function timeMinutes(value: string | undefined) {
  if (!value || !/^\d{1,3}:\d{2}:\d{2}$/.test(value)) return undefined;
  const [h, m, s] = value.split(":").map(Number);
  return h * 60 + m + s / 60;
}
function validCoordinate(lng: number, lat: number) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= 99 &&
    lng <= 120 &&
    lat >= 0 &&
    lat <= 8
  );
}
// GTFS does not define shape_dist_traveled units. Establish them per pattern
// only when every stop carries a strictly increasing value whose magnitude
// convincingly matches the shape polyline; otherwise keep "unknown" so fares
// fail closed instead of guessing.
function inferDistanceUnit(
  path: Coordinate[],
  values: (number | null)[],
): "metres" | "kilometres" | "unknown" {
  if (
    path.length < 2 ||
    values.length < 2 ||
    values.some((v) => v === null || !Number.isFinite(v) || v < 0) ||
    values.some((v, i) => i > 0 && v! <= values[i - 1]!)
  )
    return "unknown";
  let shape = 0;
  for (let i = 1; i < path.length; i++) shape += distance(path[i - 1], path[i]);
  const travelled = values[values.length - 1]! - values[0]!;
  if (!(shape > 0) || !(travelled > 0)) return "unknown";
  const ratio = shape / travelled;
  if (ratio >= 0.7 && ratio <= 1.4) return "metres";
  if (ratio >= 700 && ratio <= 1400) return "kilometres";
  return "unknown";
}
export function parseStaticGtfs(
  buffer: Uint8Array,
  feedUrl: string,
  region: Region = "johor",
): TransitNetwork {
  if (buffer.byteLength > 32 * 1024 * 1024)
    throw new Error("GTFS archive exceeds 32 MB compressed limit.");
  let uncompressed = 0;
  const files = unzipSync(buffer, {
    filter(file) {
      const basename = file.name.split("/").pop() || "";
      if (!allowedFiles.has(basename)) return false;
      uncompressed += file.originalSize;
      if (
        uncompressed > 128 * 1024 * 1024 ||
        file.originalSize > 64 * 1024 * 1024
      )
        throw new Error("GTFS archive exceeds the safe extraction limit.");
      return true;
    },
  });
  const rows = (name: string, required = true): Row[] => {
    const match = Object.keys(files).find(
      (key) => key.split("/").pop() === name,
    );
    if (!match) {
      if (required) throw new Error(`GTFS is missing ${name}`);
      return [];
    }
    return parse(Buffer.from(files[match]), {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
      max_record_size: 10_000,
    }) as Row[];
  };
  const agencies = rows("agency.txt", false);
  const stopRows = rows("stops.txt");
  const routeRows = rows("routes.txt");
  const trips = rows("trips.txt");
  const stopTimes = rows("stop_times.txt");
  const shapeRows = rows("shapes.txt", false);
  const stops: Stop[] = stopRows
    .filter(
      (s) =>
        s.stop_id && validCoordinate(Number(s.stop_lon), Number(s.stop_lat)),
    )
    .map((s) => ({
      id: s.stop_id,
      name: s.stop_name || s.stop_id,
      coordinate: [Number(s.stop_lon), Number(s.stop_lat)],
      accessible: s.wheelchair_boarding === "1",
      region,
    }));
  const stopMap = new Map(stops.map((s) => [s.id, s]));
  const tripTimes = new Map<string, Row[]>();
  for (const row of stopTimes)
    if (stopMap.has(row.stop_id)) {
      const items = tripTimes.get(row.trip_id) || [];
      items.push(row);
      tripTimes.set(row.trip_id, items);
    }
  for (const items of tripTimes.values())
    items.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  const shapes = new Map<string, Row[]>();
  for (const row of shapeRows)
    if (validCoordinate(Number(row.shape_pt_lon), Number(row.shape_pt_lat))) {
      const items = shapes.get(row.shape_id) || [];
      items.push(row);
      shapes.set(row.shape_id, items);
    }
  for (const items of shapes.values())
    items.sort(
      (a, b) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence),
    );
  const representative = new Map<string, Row>();
  for (const trip of trips) {
    const previous = representative.get(trip.route_id);
    if (
      !previous ||
      (tripTimes.get(trip.trip_id)?.length || 0) >
        (tripTimes.get(previous.trip_id)?.length || 0)
    )
      representative.set(trip.route_id, trip);
  }
  const colors = ["#b3f56b", "#75baff", "#d6a1ff", "#ffbc82", "#76dac8"];
  const routes: TransitRoute[] = routeRows
    .filter((r) => r.route_id)
    .map((route, index) => {
      const trip = representative.get(route.route_id);
      const times = trip ? tripTimes.get(trip.trip_id) || [] : [];
      const routeStops = [...new Set(times.map((t) => t.stop_id))];
      const coordinates: Coordinate[] =
        trip && shapes.has(trip.shape_id)
          ? shapes
              .get(trip.shape_id)!
              .map((s) => [Number(s.shape_pt_lon), Number(s.shape_pt_lat)])
          : routeStops.map((id) => stopMap.get(id)!.coordinate);
      const start = timeMinutes(
        times[0]?.departure_time || times[0]?.arrival_time,
      );
      const end = timeMinutes(
        times.at(-1)?.arrival_time || times.at(-1)?.departure_time,
      );
      return {
        patterns: [
          ...new Map(
            trips
              .filter((t) => t.route_id === route.route_id)
              .map((t) => {
                const times = tripTimes.get(t.trip_id) || [];
                const key = JSON.stringify([
                  t.direction_id,
                  t.shape_id,
                  times.map((x) => [
                    x.stop_id,
                    x.stop_sequence,
                    x.shape_dist_traveled,
                  ]),
                ]);
                const path = (shapes.get(t.shape_id) || []).map(
                  (x) =>
                    [
                      Number(x.shape_pt_lon),
                      Number(x.shape_pt_lat),
                    ] as Coordinate,
                );
                const patternStops = times.map((x) => ({
                  stopId: x.stop_id,
                  sequence: Number(x.stop_sequence),
                  shapeDistance:
                    x.shape_dist_traveled?.trim() &&
                    Number.isFinite(Number(x.shape_dist_traveled))
                      ? Number(x.shape_dist_traveled)
                      : null,
                }));
                return [
                  key,
                  {
                    id: t.trip_id,
                    tripId: t.trip_id,
                    shapeId: t.shape_id || null,
                    direction: t.direction_id || null,
                    geometrySource: shapes.has(t.shape_id)
                      ? ("gtfs_shape" as const)
                      : ("unavailable" as const),
                    distanceUnit: inferDistanceUnit(
                      path,
                      patternStops.map((s) => s.shapeDistance),
                    ),
                    path,
                    stops: patternStops,
                  },
                ];
              }),
          ).values(),
        ],
        id: route.route_id,
        name:
          [route.route_short_name, route.route_long_name]
            .filter(Boolean)
            .join(" · ") || route.route_id,
        destination:
          trip?.trip_headsign ||
          route.route_long_name ||
          "Official published route",
        color: /^[a-fA-F0-9]{6}$/.test(route.route_color || "")
          ? `#${route.route_color}`
          : colors[index % colors.length],
        stops: routeStops,
        path: coordinates,
        duration:
          start != null && end != null && end > start
            ? Math.round(end - start)
            : 0,
        region,
        operator:
          agencies.find((a) => a.agency_id === route.agency_id)?.agency_name ||
          agencies[0]?.agency_name ||
          `${serviceFor(region).operator} ${serviceFor(region).name}`,
        source: "official",
      };
    });
  if (!routes.length || !stops.length)
    throw new Error("GTFS feed contains no usable routes or stops.");
  return {
    routes,
    stops,
    source: "official",
    importedAt: new Date().toISOString(),
    feedUrl,
    tripRoutes: Object.fromEntries(trips.map((t) => [t.trip_id, t.route_id])),
  };
}
