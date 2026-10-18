import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import type { Region, Vehicle, VehicleSnapshot } from "@/lib/types";
import { simulateVehicles } from "@/lib/transit";
import { readResponseBytes } from "./upstream";
import { serviceFor, feedId, type Endpoint } from "../feeds";
import { resolveTripRoute } from "./network";
import { reserveOfficialRequest } from "./upstream-budget";

export const JOHOR_VEHICLES_URL =
  "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor";
const refreshMs = 15_000;
const staleMs = 90_000;
interface FeedCache {
  snapshot?: VehicleSnapshot;
  nextFetch: number;
  pending?: Promise<VehicleSnapshot>;
  lastError?: string;
}
const caches = new Map<string, FeedCache>();
type Feed = GtfsRealtimeBindings.transit_realtime.IFeedMessage;
function numeric(value: unknown) {
  return Number(value);
}

/** One normalization boundary; protobuf Long timestamps become milliseconds. */
export function normalizeFeed(
  feed: Feed,
  region: Region,
  now = Date.now(),
): Vehicle[] {
  const vehicles = new Map<string, Vehicle>();
  for (const entity of feed.entity || []) {
    if (entity.isDeleted || !entity.vehicle?.position) continue;
    const item = entity.vehicle;
    const position = item.position!;
    const lng = numeric(position.longitude);
    const lat = numeric(position.latitude);
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng < 99 ||
      lng > 120 ||
      lat < 0 ||
      lat > 8
    )
      continue;
    const id = item.vehicle?.id || entity.id;
    if (!id) continue;
    // protobuf Long(0) is truthy when a missing timestamp uses its prototype
    // default. Use field presence so header timestamps remain a valid fallback.
    const time =
      numeric(
        Object.hasOwn(item, "timestamp")
          ? item.timestamp
          : feed.header.timestamp || 0,
      ) * 1000;
    // Reject invalid and future timestamps instead of making old GPS appear fresh.
    if (!Number.isFinite(time) || time <= 0 || time > now + 60_000) continue;
    // Protobuf instances expose default 0 on the prototype even when the field
    // was omitted. Only an explicitly supplied EMPTY value means an empty bus.
    const occupancy = Object.hasOwn(item, "occupancyStatus")
      ? item.occupancyStatus
      : undefined;
    const normalized: Vehicle = {
      id,
      label: item.vehicle?.label || id,
      routeId: item.trip?.routeId || "unavailable",
      tripId: item.trip?.tripId || undefined,
      // direction_id 0 is a real direction, so a prototype default cannot be
      // told apart from an omitted field without presence.
      direction:
        item.trip &&
        Object.hasOwn(item.trip, "directionId") &&
        Number.isFinite(item.trip.directionId)
          ? String(item.trip.directionId)
          : undefined,
      vehicleKind: serviceFor(region).kind === "rail" ? "rail" : "bus",
      coordinate: [lng, lat],
      bearing: Number.isFinite(position.bearing)
        ? ((Number(position.bearing) % 360) + 360) % 360
        : 0,
      speed: Number.isFinite(position.speed)
        ? Math.max(0, Number(position.speed) * 3.6)
        : 0,
      speedKnown:
        Object.hasOwn(position, "speed") &&
        Number.isFinite(position.speed) &&
        Number(position.speed) >= 0,
      bearingKnown:
        Object.hasOwn(position, "bearing") && Number.isFinite(position.bearing),
      occupancy:
        occupancy == null
          ? "unknown"
          : occupancy <= 1
            ? "low"
            : occupancy === 2
              ? "medium"
              : occupancy <= 6
                ? "high"
                : "unknown",
      accessible: false,
      delay: 0,
      timestamp: time,
      source: "gtfs-rt",
      region,
    };
    if (!vehicles.has(id) || vehicles.get(id)!.timestamp < time)
      vehicles.set(id, normalized);
  }
  return [...vehicles.values()];
}
function demo(region: Region, message?: string): VehicleSnapshot {
  if (region !== "johor" && region !== "uthm" && region !== "uthm-pagoh")
    return {
      vehicles: [],
      source: "simulator",
      updatedAt: Date.now(),
      stale: false,
      message: "This operator has no simulator. Select its official live feed.",
    };
  return {
    vehicles: simulateVehicles(region),
    source: "simulator",
    updatedAt: Date.now(),
    stale: false,
    message:
      message ||
      (region === "uthm" || region === "uthm-pagoh"
        ? "UTHM pilot simulation. No university GPS feed is connected."
        : "Demo vehicles follow illustrative Johor routes. Switch to official live data for actual GPS positions."),
  };
}
function withFreshness(
  snapshot: VehicleSnapshot,
  message?: string,
): VehicleSnapshot {
  const stale = Date.now() - snapshot.updatedAt > staleMs || !!message;
  return {
    ...snapshot,
    stale,
    message:
      message ||
      (stale
        ? "Official GPS feed is stale. Positions show the last observation; arrival times are not provided by this feed."
        : "Official data.gov.my vehicle positions. ETA, accessibility and occupancy may be unavailable."),
  };
}
async function refresh(
  endpoint: Endpoint,
  region: Region,
  cache: FeedCache,
): Promise<VehicleSnapshot> {
  cache.nextFetch = Date.now() + refreshMs;
  try {
    // The official endpoint negotiates octet-stream and returns 406 for a
    // strict application/x-protobuf Accept header. Keep the default */*.
    reserveOfficialRequest("realtime");
    const response = await fetch(endpoint.realtimeUrl!, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Official feed returned HTTP ${response.status}`);
    const buffer = await readResponseBytes(response, 16 * 1024 * 1024);
    const feed =
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
    const vehicles = normalizeFeed(feed, region);
    const newest = vehicles.length
      ? Math.max(...vehicles.map((v) => v.timestamp))
      : Number(feed.header.timestamp || 0) * 1000;
    cache.snapshot = {
      vehicles,
      source: "gtfs-rt",
      updatedAt: newest,
      stale: Date.now() - newest > staleMs,
    };
    cache.lastError = undefined;
    console.info(
      JSON.stringify({
        level: "info",
        event: "gtfs_refresh",
        endpoint: endpoint.id,
        vehicles: vehicles.length,
        newest: new Date(newest).toISOString(),
      }),
    );
    return withFreshness(cache.snapshot);
  } catch (error) {
    cache.lastError =
      error instanceof Error ? error.message : "Unknown feed error";
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "gtfs_refresh_failed",
        message: cache.lastError,
      }),
    );
    if (cache.snapshot)
      return withFreshness(
        cache.snapshot,
        "Official feed temporarily unavailable. Showing the last received GPS observations; check the observation time.",
      );
    return {
      vehicles: [],
      source: "gtfs-rt",
      updatedAt: 0,
      stale: true,
      message:
        "Official feed unavailable. No live positions received. You can explicitly select the separate demo.",
    };
  }
}

async function endpointVehicles(
  endpoint: Endpoint,
  region: Region,
): Promise<VehicleSnapshot> {
  let cache = caches.get(endpoint.id);
  if (!cache) {
    cache = { nextFetch: 0 };
    caches.set(endpoint.id, cache);
  }
  if (cache.pending) return cache.pending;
  if (Date.now() < cache.nextFetch) {
    if (cache.snapshot)
      return {
        ...withFreshness(
          cache.snapshot,
          cache.lastError
            ? "Feed temporarily unavailable; last observations retained."
            : undefined,
        ),
        stale:
          !!cache.lastError || Date.now() - cache.snapshot.updatedAt > staleMs,
      };
    return {
      vehicles: [],
      source: "gtfs-rt",
      updatedAt: 0,
      stale: true,
      message: `${endpoint.id}: unavailable or waiting for official API request budget.`,
    };
  }
  cache.pending = refresh(endpoint, region, cache).finally(() => {
    cache!.pending = undefined;
  });
  return cache.pending;
}
export async function getVehicles(
  region: Region,
  mode: "demo" | "live" = "live",
): Promise<VehicleSnapshot> {
  if (mode === "demo") return demo(region);
  const service = serviceFor(region),
    endpoints = service.endpoints.filter((e) => e.realtimeUrl);
  if (!endpoints.length)
    return {
      vehicles: [],
      source: "gtfs-rt",
      updatedAt: 0,
      stale: true,
      message:
        region === "uthm" || region === "uthm-pagoh"
          ? "UTHM telemetry is not connected. Select the campus demo."
          : "Rapid KL rail schedules are available; the official publisher does not provide a stable realtime rail feed.",
    };
  const snapshots = await Promise.all(
    endpoints.map(async (endpoint) => ({
      endpoint,
      snapshot: await endpointVehicles(endpoint, region),
    })),
  );
  const vehicles = snapshots.flatMap(({ endpoint, snapshot }) =>
    snapshot.vehicles.map((v) => ({
      ...v,
      id: feedId(endpoint.id, v.id),
      routeId: resolveTripRoute(endpoint.id, v.tripId, v.routeId),
    })),
  );
  const failed = snapshots.filter((s) => s.snapshot.stale);
  return {
    vehicles,
    source: "gtfs-rt",
    updatedAt: Math.max(0, ...snapshots.map((s) => s.snapshot.updatedAt)),
    stale: failed.length > 0,
    message: failed.length
      ? failed.map((s) => `${s.endpoint.id}: ${s.snapshot.message}`).join(" · ")
      : vehicles.length
        ? `${service.operator} · ${service.name} official vehicle positions.`
        : "Official feed currently contains no vehicles. Services may be outside operating hours.",
  };
}
export function feedHealth() {
  const johor = caches.get("johor");
  return {
    configured: "data.gov.my/multi-agency",
    hasObservations: !!johor?.snapshot,
    lastObservation: johor?.snapshot?.updatedAt || null,
    lastError: johor?.lastError || null,
    refreshSeconds: 35,
    feeds: Object.fromEntries(
      [...caches].map(([id, c]) => [
        id,
        {
          vehicles: c.snapshot?.vehicles.length || 0,
          lastObservation: c.snapshot?.updatedAt || null,
          lastError: c.lastError || null,
        },
      ]),
    ),
  };
}
