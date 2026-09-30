import { promises as fs } from "node:fs";
import path from "node:path";
import type { Region, TransitRoute, Stop } from "@/lib/types";
import { routes, stops } from "@/lib/transit";
import { parseStaticGtfs } from "./gtfs-static";
import { readResponseBytes } from "./upstream";
export const JOHOR_STATIC_URL =
  "https://api.data.gov.my/gtfs-static/mybas-johor";
export interface TransitNetwork {
  routes: TransitRoute[];
  stops: Stop[];
  source: "official" | "demo";
  importedAt?: string;
  feedUrl?: string;
  message?: string;
  stale?: boolean;
}
let cached: TransitNetwork | undefined;
let pending: Promise<TransitNetwork> | undefined;
let retryAt = 0;
const filename = () =>
  path.join(
    process.env.GERAK_DATA_DIR || path.join(process.cwd(), ".runtime"),
    "network.json",
  );
async function officialNetwork(): Promise<TransitNetwork> {
  if (!cached) {
    try {
      const saved = JSON.parse(
        await fs.readFile(filename(), "utf8"),
      ) as TransitNetwork;
      if (
        saved.source === "official" &&
        Array.isArray(saved.routes) &&
        Array.isArray(saved.stops)
      )
        cached = saved;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        console.warn("Imported network unavailable");
    }
  }
  if (
    cached?.importedAt &&
    Date.now() - Date.parse(cached.importedAt) < 86400000
  )
    return cached;
  const fallback = (): TransitNetwork =>
    cached
      ? {
          ...cached,
          stale: true,
          message: "Last imported official network; refresh pending.",
        }
      : {
          routes: [],
          stops: [],
          source: "official",
          stale: true,
          message:
            "Official routes are unavailable. Retry shortly or run npm run ingest.",
        };
  if (Date.now() < retryAt) return fallback();
  retryAt = Date.now() + 60000;
  try {
    const response = await fetch(JOHOR_STATIC_URL, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Static feed HTTP ${response.status}`);
    cached = parseStaticGtfs(
      await readResponseBytes(response, 32 * 1024 * 1024),
      JOHOR_STATIC_URL,
    );
    try {
      const target = filename();
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(`${target}.auto.tmp`, JSON.stringify(cached));
      await fs.rename(`${target}.auto.tmp`, target);
    } catch {
      console.warn(
        "Network import is memory-only: configure persistent GERAK_DATA_DIR.",
      );
    }
    return cached;
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "gtfs_static_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return fallback();
  }
}
export async function getNetwork(region: Region): Promise<TransitNetwork> {
  if (region === "uthm")
    return {
      routes: routes.filter((r) => r.region === region),
      stops: stops.filter((s) => s.region === region),
      source: "demo",
      message: "Illustrative UTHM pilot, not university telemetry.",
    };
  if (!pending)
    pending = officialNetwork().finally(() => {
      pending = undefined;
    });
  return pending;
}
