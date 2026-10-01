export type Region = import("./feeds").FeedRegion;
export type Locale = "en" | "ms";
export type Coordinate = [number, number];
export interface Stop {
  id: string;
  name: string;
  coordinate: Coordinate;
  accessible: boolean;
  region: Region;
}
export interface TransitRoute {
  id: string;
  name: string;
  destination: string;
  color: string;
  stops: string[];
  path: Coordinate[];
  duration: number;
  region: Region;
  operator: string;
  source: "demo" | "official";
}
export interface Vehicle {
  id: string;
  label: string;
  routeId: string;
  tripId?: string;
  vehicleKind?: "bus" | "rail";
  coordinate: Coordinate;
  bearing: number;
  speed: number;
  speedKnown?: boolean;
  bearingKnown?: boolean;
  occupancy: "low" | "medium" | "high" | "unknown";
  accessible: boolean;
  delay: number;
  timestamp: number;
  source: "simulator" | "gtfs-rt";
  progress?: number;
  region: Region;
  licensePlate?: string;
}
export type ReportCategory =
  | "damaged-stop"
  | "unsafe-walkway"
  | "accessibility"
  | "flooding"
  | "infrastructure"
  | "crowding";
export type ReportStatus =
  "submitted" | "acknowledged" | "in-progress" | "resolved";
export interface CivicReport {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  coordinate: Coordinate;
  location: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  image?: string;
  source: "community" | "demo";
}
export interface VehicleSnapshot {
  vehicles: Vehicle[];
  source: "simulator" | "gtfs-rt";
  updatedAt: number;
  stale: boolean;
  message?: string;
}
