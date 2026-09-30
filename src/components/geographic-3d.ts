import type { Coordinate } from "@/lib/types";

/** Metre-sized bus footprint around the authoritative GPS anchor. Bearing is clockwise from north. */
export function busFootprint(
  center: Coordinate,
  bearing: number,
  length: number,
  width: number,
) {
  const angle = (bearing * Math.PI) / 180;
  const cosLat = Math.cos((center[1] * Math.PI) / 180);
  const corners = [
    [-width / 2, -length / 2],
    [width / 2, -length / 2],
    [width / 2, length / 2],
    [-width / 2, length / 2],
  ];
  const ring = corners.map(([right, forward]) => {
    const east = right * Math.cos(angle) + forward * Math.sin(angle);
    const north = forward * Math.cos(angle) - right * Math.sin(angle);
    return [center[0] + east / (111320 * cosLat), center[1] + north / 111320];
  });
  ring.push([...ring[0]]);
  return { type: "Polygon" as const, coordinates: [ring] };
}
