import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl";
import type { Vehicle } from "@/lib/types";
export function updateFleetClusters(map: LibreMap, vehicles: Vehicle[]) {
  const data = {
    type: "FeatureCollection" as const,
    features: vehicles.map((v) => ({
      type: "Feature" as const,
      properties: { id: v.id },
      geometry: { type: "Point" as const, coordinates: v.coordinate },
    })),
  };
  if (map.getSource("fleet-overview")) {
    (map.getSource("fleet-overview") as GeoJSONSource).setData(data);
    return;
  }
  map.addSource("fleet-overview", {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 12,
  });
  map.addLayer({
    id: "fleet-clusters",
    type: "circle",
    source: "fleet-overview",
    maxzoom: 13,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#173c32",
      "circle-radius": ["step", ["get", "point_count"], 18, 20, 23, 60, 28],
      "circle-stroke-color": "#b9ed76",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "fleet-cluster-count",
    type: "symbol",
    source: "fleet-overview",
    maxzoom: 13,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#f0ffdf" },
  });
  map.addLayer({
    id: "fleet-overview-single",
    type: "circle",
    source: "fleet-overview",
    maxzoom: 13,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#b9ed76",
      "circle-radius": 6,
      "circle-stroke-color": "#173c32",
      "circle-stroke-width": 2,
    },
  });
}
