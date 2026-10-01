export type CampusId = "parit-raja" | "pagoh" | "other";

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
  lastUpdated: string;
  receivedAt: string;
}

export interface WorkerStats {
  startedAt: string;
  uptimeSeconds: number;
  connected: boolean;
  totalPingsReceived: number;
  activeBusesCount: number;
  paritRajaCount: number;
  pagohCount: number;
  lastPingTimestamp: string | null;
  dbConnected: boolean;
  dbInsertsCount: number;
}
