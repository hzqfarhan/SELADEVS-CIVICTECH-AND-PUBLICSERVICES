import { z } from "zod";
export const cameraFeedSchema = z.object({
  items: z
    .array(
      z.object({
        cameras: z
          .array(
            z.object({
              camera_id: z.string(),
              timestamp: z.string().datetime({ offset: true }),
              image: z
                .string()
                .url()
                .refine((value) => {
                  const u = new URL(value);
                  return (
                    u.protocol === "https:" &&
                    u.hostname === "images.data.gov.sg" &&
                    !u.username &&
                    !u.password
                  );
                }),
              location: z.object({
                latitude: z.number().min(1).max(2),
                longitude: z.number().min(103).max(105),
              }),
            }),
          )
          .max(1000),
      }),
    )
    .max(10),
});
export type TrafficCamera = {
  id: string;
  name: string;
  coordinate: [number, number];
  image: string;
  observedAt: string;
  country: "SG";
};
export type TrafficSignal = {
  id: string;
  name: string;
  coordinate: [number, number];
};
export function normalizeCameras(input: unknown): TrafficCamera[] {
  return cameraFeedSchema
    .parse(input)
    .items.flatMap((item) => item.cameras)
    .filter((c) => c.location.latitude > 1.3 && c.location.longitude < 103.9)
    .map((c) => ({
      id: `lta:${c.camera_id}`,
      name: `LTA camera ${c.camera_id}`,
      coordinate: [c.location.longitude, c.location.latitude],
      image: c.image,
      observedAt: c.timestamp,
      country: "SG" as const,
    }));
}
export function cameraFresh(observedAt: string, now = Date.now()) {
  const age = now - Date.parse(observedAt);
  return Number.isFinite(age) && age >= -60000 && age < 300000;
}
export const signalFeedSchema = z.object({
  remark: z.never().optional(),
  elements: z
    .array(
      z.object({
        type: z.literal("node"),
        id: z.number().int(),
        lat: z.number().min(1.35).max(1.7),
        lon: z.number().min(103.5).max(103.95),
        tags: z.record(z.string(), z.string()).optional(),
      }),
    )
    .max(5000),
});
export function normalizeSignals(input: unknown): TrafficSignal[] {
  return signalFeedSchema
    .parse(input)
    .elements.filter((n) => n.tags?.highway === "traffic_signals")
    .map((n) => ({
      id: `osm:node:${n.id}`,
      name: n.tags?.name || `Signal junction ${n.id}`,
      coordinate: [n.lon, n.lat],
    }));
}
