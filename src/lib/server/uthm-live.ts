import type { Vehicle, VehicleSnapshot, Region } from "@/lib/types";
import {
  extractLicensePlate,
  resolveCampus,
  isKktuLocation,
  type KatsanaRawVehicle,
  type KatsanaRawPing,
  type CampusId,
} from "../../../scripts/scrape-uthm";

interface CachedVehicle {
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
  lastUpdated: number;
}

class KatsanaLiveManager {
  private ws: WebSocket | null = null;
  private vehicles = new Map<number, CachedVehicle>();
  private kktuOriginVehicles = new Set<number>();
  private lastConnectAttempt = 0;
  private isConnecting = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    // Lazily initialized on first request
  }

  private connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.readyPromise || Promise.resolve();
    }

    this.lastConnectAttempt = Date.now();
    this.isConnecting = true;

    this.readyPromise = new Promise<void>((resolve) => {
      try {
        const ws = new WebSocket("wss://ws.shuttle.katsana.com/stream/1");
        this.ws = ws;

        const connectTimeout = setTimeout(() => {
          this.isConnecting = false;
          resolve();
        }, 5000);

        ws.onopen = () => {
          this.isConnecting = false;
        };

        ws.onerror = (err) => {
          console.warn("[KatsanaLive] WebSocket error:", err);
          this.isConnecting = false;
          clearTimeout(connectTimeout);
          resolve();
        };

        ws.onclose = () => {
          this.ws = null;
          this.isConnecting = false;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data.toString());

            if (msg.event === "vehicle.state" && msg.data) {
              clearTimeout(connectTimeout);
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

                if (Array.isArray(item.ping) && item.ping.length >= 2) {
                  lat = item.ping[0];
                  lng = item.ping[1];
                } else if (item.ping && typeof item.ping === "object" && "latitude" in item.ping) {
                  lat = item.ping.latitude;
                  lng = item.ping.longitude;
                  speed = item.ping.speed ?? 0;
                  course = item.ping.course ?? 0;
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

                this.vehicles.set(v.id, {
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
                  status: v.state?.type ? `${v.state.type} cp#${v.state.checkpoint}` : "Idle",
                  lastUpdated: Date.now(),
                });
              }
              resolve();
            }

            if (msg.event === "vehicles.ping" && msg.data) {
              const v = msg.data.vehicle as KatsanaRawVehicle;
              const p = msg.data.ping as KatsanaRawPing;
              if (!v || !p) return;

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

              this.vehicles.set(v.id, {
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
                status: v.state?.type ? `${v.state.type} cp#${v.state.checkpoint}` : "Active",
                lastUpdated: Date.now(),
              });
            }
          } catch {
            // Ignore parse errors
          }
        };
      } catch {
        this.isConnecting = false;
        resolve();
      }
    });

    return this.readyPromise;
  }

  public async getSnapshot(targetRegion: "uthm" | "uthm-pagoh"): Promise<VehicleSnapshot> {
    const targetCampusId: CampusId = targetRegion === "uthm" ? "parit-raja" : "pagoh";

    // Reconnect if socket closed and cool-down elapsed (10 seconds)
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      if (Date.now() - this.lastConnectAttempt > 10_000) {
        await this.connect();
      }
    } else if (this.readyPromise) {
      await this.readyPromise;
    }

    const now = Date.now();
    const staleThresholdMs = 15 * 60 * 1000; // 15 mins for campus telemetry

    const matchingBuses = Array.from(this.vehicles.values()).filter((b) => {
      if (b.campusId !== targetCampusId) return false;
      if (b.latitude === null || b.longitude === null) return false;
      // Filter out invalid zero / null positions
      if (b.latitude === 0 && b.longitude === 0) return false;
      return true;
    });

    const activeVehicles: Vehicle[] = matchingBuses.map((b) => ({
      id: `uthm-${b.id}`,
      label: b.licensePlate, // Vehicle Number Plate prominently displayed!
      licensePlate: b.licensePlate,
      routeId: b.routeName,
      vehicleKind: "bus",
      coordinate: [b.longitude!, b.latitude!],
      bearing: b.bearing,
      speed: b.speedKmH,
      speedKnown: true,
      bearingKnown: b.bearing > 0,
      occupancy: "low",
      accessible: true,
      delay: 0,
      timestamp: b.lastUpdated,
      source: "gtfs-rt",
      region: targetRegion as Region,
    }));

    const campusTitle =
      targetRegion === "uthm" ? "UTHM Parit Raja" : "UTHM Pagoh";

    if (activeVehicles.length === 0) {
      return {
        vehicles: [],
        source: "gtfs-rt",
        updatedAt: now,
        stale: true,
        message: `${campusTitle}: No active shuttle buses currently transmitting GPS coordinates. Switch to demo mode if outside operating hours.`,
      };
    }

    const newestUpdate = Math.max(...activeVehicles.map((v) => v.timestamp), 0);

    return {
      vehicles: activeVehicles,
      source: "gtfs-rt",
      updatedAt: newestUpdate,
      stale: now - newestUpdate > staleThresholdMs,
      message: `Live ${campusTitle} shuttle telemetry (${activeVehicles.length} buses with live number plates)`,
    };
  }
}

// Global singleton to persist across API requests in Node server
const globalManager = new KatsanaLiveManager();

export async function getLiveUthmVehicles(
  region: "uthm" | "uthm-pagoh"
): Promise<VehicleSnapshot> {
  return globalManager.getSnapshot(region);
}
