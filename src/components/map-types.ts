import type {
  CivicReport,
  Coordinate,
  Region,
  Stop,
  TransitRoute,
  Vehicle,
} from "@/lib/types";

export interface TransportMapProps {
  mode: "2d" | "3d";
  lighting?: "day" | "dusk" | "night";
  region: Region;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  follow: boolean;
  routes: TransitRoute[];
  stops: Stop[];
  reports: CivicReport[];
  heatmap?: boolean;
  picking?: boolean;
  onPick?: (coordinate: Coordinate) => void;
  onSelectStop?: (id: string) => void;
}
