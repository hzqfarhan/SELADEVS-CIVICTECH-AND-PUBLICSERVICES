/**
 * UTHM Campus Shuttle Bus Live Scraper
 *
 * Scrapes live telemetry and vehicle registration (number plates) for:
 * 1. UTHM Main Campus (Parit Raja / Batu Pahat) - Routes 10 (KK TF/TDI) & 11 (KK Perwira)
 * 2. UTHM Pagoh Higher Education Hub - Route 12 (UTHM Pagoh)
 *
 * Source: Katsana Shuttle Telematics WebSocket
 * Endpoint: wss://ws.shuttle.katsana.com/stream/1
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface KatsanaRawVehicle {
  id: number;
  route_id: number;
  license_plate: string;
  timezone?: string;
  state?: {
    number: number | null;
    checkpoint: number | null;
    type: "enter" | "exit" | "crossing" | null;
    timestamp: string | null;
  };
}

export interface KatsanaRawPing {
  id?: number;
  latitude: number;
  longitude: number;
  speed: number;
  course?: number;
  altitude?: number;
  tracked_at?: string;
  meta?: {
    ignition?: number;
    voltage?: number;
    satellites?: number;
    [key: string]: unknown;
  };
}

export type CampusId = "parit-raja" | "pagoh" | "other";

export interface ScrapedBus {
  id: number;
  licensePlate: string;
  rawPlate: string;
  campusId: CampusId;
  campusName: string;
  routeId: number;
  routeName: string;
  latitude: number | null;
  longitude: number | null;
  speedKmH: number;
  bearing: number;
  ignition: boolean;
  status: string;
  lastUpdated: string | null;
}

const ROUTE_CONFIG: Record<
  number,
  { name: string; campusId: CampusId; campusName: string }
> = {
  10: {
    name: "KK TF/TDI",
    campusId: "parit-raja",
    campusName: "UTHM Parit Raja (Main Campus)",
  },
  11: {
    name: "KK Perwira",
    campusId: "parit-raja",
    campusName: "UTHM Parit Raja (Main Campus)",
  },
  12: {
    name: "UTHM Pagoh",
    campusId: "pagoh",
    campusName: "UTHM Pagoh Campus",
  },
  20: {
    name: "KKTU Bus",
    campusId: "parit-raja",
    campusName: "UTHM Parit Raja (Main Campus)",
  },
};

/**
 * Geofence bounds for Kolej Kediaman Taman Universiti (KKTU)
 * and its access corridor west of DSI
 */
export function isKktuLocation(
  lat: number | null,
  lng: number | null,
): boolean {
  if (lat === null || lng === null) return false;
  return lat >= 1.853 && lat <= 1.8578 && lng >= 103.071 && lng <= 103.0768;
}

/**
 * Clean and extract the standard Malaysian registration number plate
 * e.g. "JMG 1700 / PERWIRA / AEROSYSTEM" -> "JMG 1700"
 * e.g. "FAULTY -JJU 6300" -> "JJU 6300"
 * e.g. "Old JHX 9300 relocate to JKD 7400" -> "JKD 7400"
 */
export function extractLicensePlate(raw: string): string {
  if (!raw) return "UNKNOWN";

  // Check if plate indicates relocation to another plate
  const relocateMatch = raw.match(
    /relocate\s+to\s+([A-Z]{1,3}\s*\d{1,4}\s*[A-Z]?)/i,
  );
  if (relocateMatch) {
    return formatPlate(relocateMatch[1]);
  }

  // Look for standard Malaysian plate patterns: 1-3 letters, space/optional, 1-4 numbers, optional suffix letter
  const plateMatch = raw.match(/\b([A-Z]{1,3})\s*(\d{1,4})\s*([A-Z])?\b/);
  if (plateMatch) {
    const letters = plateMatch[1].toUpperCase();
    const numbers = plateMatch[2];
    const suffix = plateMatch[3] ? plateMatch[3].toUpperCase() : "";
    return `${letters} ${numbers}${suffix ? " " + suffix : ""}`;
  }

  return raw.trim();
}

function formatPlate(str: string): string {
  const m = str.match(/([A-Z]{1,3})\s*(\d{1,4})\s*([A-Z])?/i);
  if (!m) return str.trim().toUpperCase();
  return `${m[1].toUpperCase()} ${m[2]}${m[3] ? " " + m[3].toUpperCase() : ""}`;
}

export function resolveCampus(
  routeId: number,
  lat: number | null,
  lng: number | null,
  rawPlate: string,
  cameFromKktu = false,
): { campusId: CampusId; campusName: string; routeName: string } {
  const upper = rawPlate.toUpperCase();

  // If vehicle is physically at KKTU, came from KKTU, or labeled KKTU
  if (
    isKktuLocation(lat, lng) ||
    cameFromKktu ||
    upper.includes("KKTU") ||
    upper.includes("TAMAN UNIVERSITI")
  ) {
    return {
      campusId: "parit-raja",
      campusName: "UTHM Parit Raja (Main Campus)",
      routeName:
        cameFromKktu && !isKktuLocation(lat, lng)
          ? "KKTU Bus (From KKTU)"
          : "KKTU Bus",
    };
  }

  if (ROUTE_CONFIG[routeId]) {
    return {
      campusId: ROUTE_CONFIG[routeId].campusId,
      campusName: ROUTE_CONFIG[routeId].campusName,
      routeName: ROUTE_CONFIG[routeId].name,
    };
  }

  // Infer by GPS coordinates if available
  if (lat !== null && lng !== null) {
    if (lat >= 2.1 && lat <= 2.2 && lng >= 102.68 && lng <= 102.78) {
      return {
        campusId: "pagoh",
        campusName: "UTHM Pagoh Campus",
        routeName: `Pagoh (Route ${routeId})`,
      };
    }
    if (lat >= 1.83 && lat <= 1.89 && lng >= 103.05 && lng <= 103.12) {
      return {
        campusId: "parit-raja",
        campusName: "UTHM Parit Raja (Main Campus)",
        routeName: `Parit Raja (Route ${routeId})`,
      };
    }
  }

  // Infer by label text keywords
  if (upper.includes("PAGOH")) {
    return {
      campusId: "pagoh",
      campusName: "UTHM Pagoh Campus",
      routeName: `Pagoh (Route ${routeId})`,
    };
  }
  if (
    upper.includes("PERWIRA") ||
    upper.includes("TF") ||
    upper.includes("TDI")
  ) {
    return {
      campusId: "parit-raja",
      campusName: "UTHM Parit Raja (Main Campus)",
      routeName: `Parit Raja (Route ${routeId})`,
    };
  }

  return {
    campusId: "other",
    campusName: "UTHM (Unassigned/Depot)",
    routeName: `Route ${routeId}`,
  };
}

export async function scrapeUthmBuses(
  options: {
    listenDurationMs?: number;
    onPing?: (bus: ScrapedBus) => void;
    verbose?: boolean;
  } = {},
): Promise<ScrapedBus[]> {
  const listenDurationMs = options.listenDurationMs ?? 6000;
  const busMap = new Map<number, ScrapedBus>();
  const kktuOriginVehicles = new Set<number>();

  return new Promise((resolvePromise, rejectPromise) => {
    const wsUrl = "wss://ws.shuttle.katsana.com/stream/1";
    if (options.verbose) {
      console.log(`[Scraper] Connecting to Katsana Telematics: ${wsUrl}`);
    }

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolvePromise(Array.from(busMap.values()));
    }, listenDurationMs);

    ws.onopen = () => {
      if (options.verbose) {
        console.log(
          `[Scraper] WebSocket connected. Listening for vehicle pings...`,
        );
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      rejectPromise(err);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data.toString());

        // Initial snapshot of all vehicles
        if (msg.event === "vehicle.state" && msg.data) {
          for (const item of Object.values(msg.data) as Array<{
            vehicle?: KatsanaRawVehicle;
            ping?: KatsanaRawPing | [number, number] | null;
          }>) {
            if (!item.vehicle) continue;
            const v = item.vehicle;
            let lat: number | null = null;
            let lng: number | null = null;
            let speed = 0;
            let course = 0;
            let trackedAt: string | null = null;
            let ignition = false;

            if (Array.isArray(item.ping) && item.ping.length >= 2) {
              lat = item.ping[0];
              lng = item.ping[1];
            } else if (
              item.ping &&
              typeof item.ping === "object" &&
              "latitude" in item.ping
            ) {
              lat = item.ping.latitude;
              lng = item.ping.longitude;
              speed = item.ping.speed ?? 0;
              course = item.ping.course ?? 0;
              trackedAt = item.ping.tracked_at ?? null;
              ignition = Boolean(item.ping.meta?.ignition);
            }

            if (isKktuLocation(lat, lng)) {
              kktuOriginVehicles.add(v.id);
            }

            const cleanPlate = extractLicensePlate(v.license_plate);
            const { campusId, campusName, routeName } = resolveCampus(
              v.route_id,
              lat,
              lng,
              v.license_plate,
              kktuOriginVehicles.has(v.id),
            );

            let statusStr = "Idle";
            if (v.state?.type && v.state?.checkpoint) {
              statusStr = `${v.state.type} cp#${v.state.checkpoint}`;
            }

            busMap.set(v.id, {
              id: v.id,
              licensePlate: cleanPlate,
              rawPlate: v.license_plate,
              campusId,
              campusName,
              routeId: v.route_id,
              routeName,
              latitude: lat,
              longitude: lng,
              speedKmH: Math.round(speed * 10) / 10,
              bearing: course,
              ignition,
              status: statusStr,
              lastUpdated: trackedAt || v.state?.timestamp || null,
            });
          }
        }

        // Live incoming vehicle ping
        if (msg.event === "vehicles.ping" && msg.data) {
          const v = msg.data.vehicle as KatsanaRawVehicle;
          const p = msg.data.ping as KatsanaRawPing;
          if (!v || !p) return;

          if (isKktuLocation(p.latitude, p.longitude)) {
            kktuOriginVehicles.add(v.id);
          }

          const cleanPlate = extractLicensePlate(v.license_plate);
          const { campusId, campusName, routeName } = resolveCampus(
            v.route_id,
            p.latitude,
            p.longitude,
            v.license_plate,
            kktuOriginVehicles.has(v.id),
          );

          let statusStr = "Active";
          if (v.state?.type && v.state?.checkpoint) {
            statusStr = `${v.state.type} cp#${v.state.checkpoint}`;
          }

          const updatedBus: ScrapedBus = {
            id: v.id,
            licensePlate: cleanPlate,
            rawPlate: v.license_plate,
            campusId,
            campusName,
            routeId: v.route_id,
            routeName,
            latitude: p.latitude,
            longitude: p.longitude,
            speedKmH: Math.round((p.speed ?? 0) * 10) / 10,
            bearing: p.course ?? 0,
            ignition: Boolean(p.meta?.ignition),
            status: statusStr,
            lastUpdated: p.tracked_at || new Date().toISOString(),
          };

          busMap.set(v.id, updatedBus);

          if (options.onPing) {
            options.onPing(updatedBus);
          }
        }
      } catch (err) {
        if (options.verbose) {
          console.warn("[Scraper] Message parse error:", err);
        }
      }
    };
  });
}

// CLI runner if invoked directly
async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");
  const isWatch = args.includes("--watch") || args.includes("-w");
  const outputFile =
    args.find((a) => a.startsWith("--out="))?.split("=")[1] ||
    resolve(process.cwd(), "public/data/uthm-live.json");

  if (!isJson) {
    console.log(
      "==================================================================",
    );
    console.log(" 🚌 UTHM LIVE BUS SCRAPER (Parit Raja & Pagoh) ");
    console.log(" Source: Katsana Telematics Real-Time WebSocket ");
    console.log(
      "==================================================================",
    );
  }

  if (isWatch) {
    console.log("Streaming live pings... (Press Ctrl+C to stop)");
    await scrapeUthmBuses({
      listenDurationMs: 86400000, // 24 hours
      verbose: false,
      onPing: (bus) => {
        const time = new Date().toLocaleTimeString();
        console.log(
          `[${time}] [${bus.campusName}] Plate: ${bus.licensePlate.padEnd(9)} | Route: ${bus.routeName.padEnd(12)} | Speed: ${String(bus.speedKmH).padStart(4)} km/h | Lat/Lng: ${bus.latitude?.toFixed(5)}, ${bus.longitude?.toFixed(5)}`,
        );
      },
    });
    return;
  }

  if (!isJson) {
    console.log("Connecting and collecting live telemetry for 6 seconds...");
  }

  const buses = await scrapeUthmBuses({
    listenDurationMs: 6500,
    verbose: !isJson,
  });

  if (isJson) {
    console.log(JSON.stringify(buses, null, 2));
    return;
  }

  // Group by campus
  const paritRaja = buses.filter((b) => b.campusId === "parit-raja");
  const pagoh = buses.filter((b) => b.campusId === "pagoh");
  const others = buses.filter((b) => b.campusId === "other");

  console.log(
    "\n==================================================================",
  );
  console.log(
    `📍 1. PARIT RAJA / BATU PAHAT CAMPUS (${paritRaja.length} buses found)`,
  );
  console.log(
    "==================================================================",
  );
  console.table(
    paritRaja.map((b) => ({
      ID: b.id,
      "Number Plate": b.licensePlate,
      Route: b.routeName,
      "Speed (km/h)": b.speedKmH,
      Latitude: b.latitude ? b.latitude.toFixed(5) : "N/A",
      Longitude: b.longitude ? b.longitude.toFixed(5) : "N/A",
      Status: b.status,
      "Raw Label": b.rawPlate,
    })),
  );

  console.log(
    "\n==================================================================",
  );
  console.log(`📍 2. PAGOH CAMPUS (${pagoh.length} buses found)`);
  console.log(
    "==================================================================",
  );
  console.table(
    pagoh.map((b) => ({
      ID: b.id,
      "Number Plate": b.licensePlate,
      Route: b.routeName,
      "Speed (km/h)": b.speedKmH,
      Latitude: b.latitude ? b.latitude.toFixed(5) : "N/A",
      Longitude: b.longitude ? b.longitude.toFixed(5) : "N/A",
      Status: b.status,
      "Raw Label": b.rawPlate,
    })),
  );

  if (others.length > 0) {
    console.log(
      "\n==================================================================",
    );
    console.log(
      `📍 3. UNASSIGNED / DEPOT / SPARE (${others.length} buses found)`,
    );
    console.log(
      "==================================================================",
    );
    console.table(
      others.map((b) => ({
        ID: b.id,
        "Number Plate": b.licensePlate,
        Route: b.routeName,
        "Speed (km/h)": b.speedKmH,
        Latitude: b.latitude ? b.latitude.toFixed(5) : "N/A",
        Longitude: b.longitude ? b.longitude.toFixed(5) : "N/A",
        "Raw Label": b.rawPlate,
      })),
    );
  }

  // Save snapshot to public/data/uthm-live.json
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      counts: {
        total: buses.length,
        paritRaja: paritRaja.length,
        pagoh: pagoh.length,
        others: others.length,
      },
      buses,
    };
    writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`\n💾 Snapshot saved to: ${outputFile}`);
  } catch (err) {
    console.error(`Failed to save snapshot:`, err);
  }
}

if (process.argv[1] && process.argv[1].endsWith("scrape-uthm.ts")) {
  main().catch((err) => {
    console.error("Scraper error:", err);
    process.exit(1);
  });
}
