import type {
  CivicReport,
  Coordinate,
  Region,
  Stop,
  TransitRoute,
  Vehicle,
} from "@/lib/types";

export interface TransportMapProps {
  scenario?: { closed: Stop; alternatives: Stop[] } | null;
  locale?: "en" | "ms";
  journeyFrom?: Stop;
  journeyTo?: Stop;
  onTrafficReport?: (coordinate: Coordinate, context: string) => void;
  mode: "2d" | "3d";
  onModeChange?: (mode: "2d" | "3d") => void;
  lighting?: "day" | "dusk" | "night";
  region: Region;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  previewVehicleId?: string | null;
  /** Increment key to focus a stop/report again, including the same coordinate. */
  focusLocation?: { coordinate: Coordinate; key: number } | null;
  onSelectVehicle: (id: string) => void;
  onOpenVehicleDetails?: (id: string) => void;
  vehicleDetailsOpen?: boolean;
  follow: boolean;
  onFollowChange?: (follow: boolean) => void;
  onOverview?: () => void;
  weatherCode?: number;
  routes: TransitRoute[];
  stops: Stop[];
  reports: CivicReport[];
  heatmap?: boolean;
  picking?: boolean;
  onPick?: (coordinate: Coordinate) => void;
  onSelectStop?: (id: string) => void;
  userLocation?: Coordinate | null;
  onUserLocationChange?: (coordinate: Coordinate | null) => void;
  onLocationError?: (message: string) => void;
}
