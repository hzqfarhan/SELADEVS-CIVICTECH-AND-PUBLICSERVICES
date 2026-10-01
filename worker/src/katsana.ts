import WebSocket from "ws";
import type {
  CampusId,
  KatsanaRawPing,
  KatsanaRawVehicle,
  ScrapedBus,
} from "./types.js";

const DEFAULT_WS_URL = "wss://ws.shuttle.katsana.com/stream/1";

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

export function isKktuLocation(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  return lat >= 1.8530 && lat <= 1.8578 && lng >= 103.0710 && lng <= 103.0768;
}

export function extractLicensePlate(raw: string): string {
  if (!raw) return "UNKNOWN";

  const relocateMatch = raw.match(/relocate\s+to\s+([A-Z]{1,3}\s*\d{1,4}\s*[A-Z]?)/i);
  if (relocateMatch) {
    return formatPlate(relocateMatch[1]);
  }

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
  cameFromKktu = false
): { campusId: CampusId; campusName: string; routeName: string } {
  const upper = (rawPlate || "").toUpperCase();

  if (isKktuLocation(lat, lng) || cameFromKktu || upper.includes("KKTU") || upper.includes("TAMAN UNIVERSITI")) {
    return {
      campusId: "parit-raja",
      campusName: "UTHM Parit Raja (Main Campus)",
      routeName: cameFromKktu && !isKktuLocation(lat, lng) ? "KKTU Bus (From KKTU)" : "KKTU Bus",
    };
  }

  if (ROUTE_CONFIG[routeId]) {
    return {
      campusId: ROUTE_CONFIG[routeId].campusId,
      campusName: ROUTE_CONFIG[routeId].campusName,
      routeName: ROUTE_CONFIG[routeId].name,
    };
  }

  if (lat !== null && lng !== null) {
    if (lat >= 2.10 && lat <= 2.20 && lng >= 102.68 && lng <= 102.78) {
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

  if (upper.includes("PAGOH")) {
    return {
      campusId: "pagoh",
      campusName: "UTHM Pagoh Campus",
      routeName: `Pagoh (Route ${routeId})`,
    };
  }
  if (upper.includes("PERWIRA") || upper.includes("TF") || upper.includes("TDI")) {
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

export class KatsanaContinuousScraper {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private isRunning = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private retryAttempt = 0;
  private buses = new Map<number, ScrapedBus>();
  private kktuOriginVehicles = new Set<number>();
  private onPingCallbacks: Array<(bus: ScrapedBus) => void> = [];
  private onStateCallbacks: Array<(buses: ScrapedBus[]) => void> = [];
  public totalPings = 0;
  public lastPingTime: string | null = null;
  public isConnected = false;

  constructor(wsUrl = process.env.KATSANA_WS_URL || DEFAULT_WS_URL) {
    this.wsUrl = wsUrl;
  }

  public onPing(callback: (bus: ScrapedBus) => void): void {
    this.onPingCallbacks.push(callback);
  }

  public onState(callback: (buses: ScrapedBus[]) => void): void {
    this.onStateCallbacks.push(callback);
  }

  public getBuses(): ScrapedBus[] {
    return Array.from(this.buses.values());
  }

  public getParitRajaBuses(): ScrapedBus[] {
    return this.getBuses().filter((b) => b.campusId === "parit-raja");
  }

  public getPagohBuses(): ScrapedBus[] {
    return this.getBuses().filter((b) => b.campusId === "pagoh");
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  private connect(): void {
    if (!this.isRunning) return;

    console.log(`[Scraper] Connecting to Katsana WebSocket: ${this.wsUrl}`);
    try {
      this.ws = new WebSocket(this.wsUrl, {
        handshakeTimeout: 10000,
      });

      this.ws.on("open", () => {
        console.log(`[Scraper] Connected successfully to Katsana live telematics stream`);
        this.isConnected = true;
        this.retryAttempt = 0;

        // Periodic ping to keep socket alive
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.ping();
          }
        }, 20000);
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        this.isConnected = false;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        console.warn(`[Scraper] WebSocket closed (code ${code}, reason: ${reason.toString() || "none"}). Reconnecting...`);
        this.scheduleReconnect();
      });

      this.ws.on("error", (err: Error) => {
        this.isConnected = false;
        console.error(`[Scraper] WebSocket error:`, err.message);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      console.error(`[Scraper] Failed to create WebSocket connection:`, err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
    const backoffMs = Math.min(1000 * Math.pow(1.8, this.retryAttempt), 15000);
    this.retryAttempt++;

    console.log(`[Scraper] Scheduling reconnect in ${(backoffMs / 1000).toFixed(1)}s (attempt ${this.retryAttempt})...`);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoffMs);
  }

  private handleMessage(payloadStr: string): void {
    try {
      const msg = JSON.parse(payloadStr);

      // Event 1: Initial full vehicle state snapshot
      if (msg.event === "vehicle.state" && msg.data) {
        const receivedAt = new Date().toISOString();
        const batch: ScrapedBus[] = [];

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
          let ignition = false;
          let trackedAt: string | null = null;

          if (Array.isArray(item.ping) && item.ping.length >= 2) {
            lat = item.ping[0];
            lng = item.ping[1];
          } else if (item.ping && typeof item.ping === "object" && "latitude" in item.ping) {
            lat = item.ping.latitude;
            lng = item.ping.longitude;
            speed = item.ping.speed ?? 0;
            course = item.ping.course ?? 0;
            trackedAt = item.ping.tracked_at ?? null;
            ignition = Boolean(item.ping.meta?.ignition);
          }

          if (isKktuLocation(lat, lng)) {
            this.kktuOriginVehicles.add(v.id);
          }

          const cleanPlate = extractLicensePlate(v.license_plate);
          const { campusId, campusName, routeName } = resolveCampus(
            v.route_id,
            lat,
            lng,
            v.license_plate,
            this.kktuOriginVehicles.has(v.id)
          );

          let statusStr = "Idle";
          if (v.state?.type && v.state?.checkpoint) {
            statusStr = `${v.state.type} cp#${v.state.checkpoint}`;
          }

          const bus: ScrapedBus = {
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
            lastUpdated: trackedAt || v.state?.timestamp || receivedAt,
            receivedAt,
          };

          this.buses.set(v.id, bus);
          batch.push(bus);
        }

        console.log(
          `[Scraper] Initial state received: ${this.buses.size} buses loaded (${this.getParitRajaBuses().length} Parit Raja, ${this.getPagohBuses().length} Pagoh)`
        );

        for (const cb of this.onStateCallbacks) {
          try {
            cb(batch);
          } catch (err) {
            console.error(`[Scraper] Error in onState callback:`, err);
          }
        }
      }

      // Event 2: Real-time individual vehicle ping
      if (msg.event === "vehicles.ping" && msg.data) {
        const v = msg.data.vehicle as KatsanaRawVehicle;
        const p = msg.data.ping as KatsanaRawPing;
        if (!v || !p) return;

        this.totalPings++;
        this.lastPingTime = p.tracked_at || new Date().toISOString();

        if (isKktuLocation(p.latitude, p.longitude)) {
          this.kktuOriginVehicles.add(v.id);
        }

        const cleanPlate = extractLicensePlate(v.license_plate);
        const { campusId, campusName, routeName } = resolveCampus(
          v.route_id,
          p.latitude,
          p.longitude,
          v.license_plate,
          this.kktuOriginVehicles.has(v.id)
        );

        let statusStr = "Active";
        if (v.state?.type && v.state?.checkpoint) {
          statusStr = `${v.state.type} cp#${v.state.checkpoint}`;
        }

        const bus: ScrapedBus = {
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
          receivedAt: new Date().toISOString(),
        };

        this.buses.set(v.id, bus);

        for (const cb of this.onPingCallbacks) {
          try {
            cb(bus);
          } catch (err) {
            console.error(`[Scraper] Error in onPing callback:`, err);
          }
        }
      }
    } catch (err) {
      console.warn(`[Scraper] Failed to parse WebSocket message:`, err);
    }
  }
}
