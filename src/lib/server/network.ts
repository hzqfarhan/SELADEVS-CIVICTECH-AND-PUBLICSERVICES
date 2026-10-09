import { promises as fs } from "node:fs";
import path from "node:path";
import type { Region, TransitRoute, Stop } from "@/lib/types";
import { routes, stops } from "@/lib/transit";
import { serviceFor, feedId, type Endpoint } from "../feeds";
import { parseStaticGtfs } from "./gtfs-static";
import { readResponseBytes } from "./upstream";
import { reserveOfficialRequest } from "./upstream-budget";
export const JOHOR_STATIC_URL = serviceFor("johor").endpoints[0].staticUrl;
export interface TransitNetwork {
  schemaVersion?: number;
  routes: TransitRoute[];
  stops: Stop[];
  source: "official" | "demo";
  importedAt?: string;
  feedUrl?: string;
  message?: string;
  stale?: boolean;
  tripRoutes?: Record<string, string>;
}
interface Cache {
  network?: TransitNetwork;
  pending?: Promise<TransitNetwork>;
  retryAt: number;
}
const caches = new Map<string, Cache>();
export const networkFile = (id: string) =>
  path.join(
    /* turbopackIgnore: true */
    process.env.GERAK_DATA_DIR || path.join(process.cwd(), ".runtime"),
    id === "johor" ? "network.json" : `network-${id}.json`,
  );
export function namespaceNetwork(
  network: TransitNetwork,
  endpoint: Endpoint,
  region: Region,
): TransitNetwork {
  return {
    ...network,
    schemaVersion: 2,
    routes: network.routes.map((r) => ({
      ...r,
      region,
      id: feedId(endpoint.id, r.id),
      stops: r.stops.map((s) => feedId(endpoint.id, s)),
      patterns: r.patterns?.map((p) => ({
        ...p,
        id: feedId(endpoint.id, p.id),
        tripId: feedId(endpoint.id, p.tripId),
        shapeId: p.shapeId ? feedId(endpoint.id, p.shapeId) : null,
        stops: p.stops.map((s) => ({
          ...s,
          stopId: feedId(endpoint.id, s.stopId),
        })),
      })),
    })),
    stops: network.stops.map((s) => ({
      ...s,
      region,
      id: feedId(endpoint.id, s.id),
    })),
  };
}
export function resolveTripRoute(
  endpointId: string,
  tripId: string | undefined,
  rawRouteId: string,
) {
  const network = caches.get(endpointId)?.network;
  const id = feedId(endpointId, rawRouteId);
  if (network?.routes.some((r) => r.id === id)) return id;
  if (tripId && network?.tripRoutes) {
    const exact = network.tripRoutes[tripId];
    if (exact) return feedId(endpointId, exact);
    // Prasarana Penang publishes service-prefixed static trip IDs. Match a unique suffix only.
    const matches = new Set(
      Object.entries(network.tripRoutes)
        .filter(([key]) => key.endsWith(`_${tripId}`))
        .map(([, route]) => route),
    );
    if (matches.size === 1) return feedId(endpointId, [...matches][0]);
  }
  return id;
}
async function loadEndpoint(
  endpoint: Endpoint,
  region: Region,
  cache: Cache,
): Promise<TransitNetwork> {
  if (!cache.network)
    try {
      cache.network = JSON.parse(
        await fs.readFile(
          /* turbopackIgnore: true */ networkFile(endpoint.id),
          "utf8",
        ),
      );
    } catch {}
  if (
    cache.network?.schemaVersion === 2 &&
    cache.network.importedAt &&
    Date.now() - Date.parse(cache.network.importedAt) < 86400000
  )
    return cache.network;
  const fallback = (): TransitNetwork =>
    cache.network
      ? {
          ...cache.network,
          stale: true,
          message: `${endpoint.id}: cached network; refresh pending.`,
        }
      : {
          routes: [],
          stops: [],
          source: "official",
          stale: true,
          message: `${endpoint.id}: official network unavailable or waiting for request budget.`,
        };
  if (Date.now() < cache.retryAt) return fallback();
  cache.retryAt = Date.now() + 35000;
  try {
    reserveOfficialRequest();
    const response = await fetch(endpoint.staticUrl, {
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!response.ok) throw Error(`Static HTTP ${response.status}`);
    const parsed = parseStaticGtfs(
      await readResponseBytes(response, 32 * 1024 * 1024),
      endpoint.staticUrl,
      region,
    );
    cache.network = namespaceNetwork(parsed, endpoint, region);
    const target = networkFile(endpoint.id);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target + ".auto.tmp", JSON.stringify(cache.network));
    await fs.rename(target + ".auto.tmp", target);
    return cache.network;
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "gtfs_static_failed",
        endpoint: endpoint.id,
        message: String(error),
      }),
    );
    return fallback();
  }
}
export async function getNetwork(region: Region): Promise<TransitNetwork> {
  if (region === "uthm" || region === "uthm-pagoh")
    return {
      routes: routes.filter((r) => r.region === region),
      stops: stops.filter((s) => s.region === region),
      source: "demo",
      message:
        "Published UTHM/KATSANA campus geometry; simulated vehicles and journey times.",
    };
  const results: TransitNetwork[] = [];
  for (const endpoint of serviceFor(region).endpoints) {
    let cache = caches.get(endpoint.id);
    if (!cache) {
      cache = { retryAt: 0 };
      caches.set(endpoint.id, cache);
    }
    if (!cache.pending)
      cache.pending = loadEndpoint(endpoint, region, cache).finally(() => {
        cache!.pending = undefined;
      });
    results.push(await cache.pending);
  }
  return {
    routes: results.flatMap((n) => n.routes),
    stops: results.flatMap((n) => n.stops),
    source: "official",
    importedAt: results.map((n) => n.importedAt || "").sort()[0] || undefined,
    feedUrl: serviceFor(region)
      .endpoints.map((e) => e.staticUrl)
      .join(" ; "),
    stale: results.some((n) => n.stale),
    message:
      results
        .map((n) => n.message)
        .filter(Boolean)
        .join(" · ") || undefined,
  };
}
