import { readResponseBytes } from "./upstream";
import {
  normalizeCameras,
  normalizeSignals,
  type TrafficCamera,
  type TrafficSignal,
} from "../traffic";
type Entry<T> = {
  data: T[];
  fetchedAt: string | null;
  available: boolean;
  retryAt: number;
  pending?: Promise<void>;
};
const cameras: Entry<TrafficCamera> = {
  data: [],
  fetchedAt: null,
  available: false,
  retryAt: 0,
};
const signals: Entry<TrafficSignal> = {
  data: [],
  fetchedAt: null,
  available: false,
  retryAt: 0,
};
async function refresh<T>(
  entry: Entry<T>,
  url: string,
  normalize: (v: unknown) => T[],
  ttl: number,
) {
  if (!entry.pending && Date.now() >= entry.retryAt) {
    entry.retryAt = Date.now() + ttl;
    entry.pending = (async () => {
      try {
        const r = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        });
        if (!r.ok) throw Error("Provider unavailable");
        const json = JSON.parse(
          new TextDecoder().decode(await readResponseBytes(r, 2_000_000)),
        );
        entry.data = normalize(json);
        entry.fetchedAt = new Date().toISOString();
        entry.available = true;
      } catch {
        entry.available = false;
      } finally {
        entry.pending = undefined;
      }
    })();
  }
  await entry.pending;
  return {
    data: entry.data,
    fetchedAt: entry.fetchedAt,
    available: entry.available,
  };
}
export function getTrafficCameras() {
  return refresh(
    cameras,
    "https://api.data.gov.sg/v1/transport/traffic-images",
    normalizeCameras,
    60000,
  );
}
export function getTrafficSignals() {
  const query =
    '[out:json][timeout:10];node["highway"="traffic_signals"](1.35,103.5,1.7,103.95);out body;';
  return refresh(
    signals,
    "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query),
    normalizeSignals,
    signals.available ? 86400000 : 900000,
  );
}
