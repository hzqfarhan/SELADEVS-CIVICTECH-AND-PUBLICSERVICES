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
    clusterRadius: 36,
    clusterMaxZoom: 10,
  });
  map.addLayer({
    id: "fleet-clusters",
    type: "circle",
    source: "fleet-overview",
    maxzoom: 11,
    filter: [">=", ["get", "point_count"], 2],
    paint: {
      "circle-color": "#122a22",
      "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 20, 24],
      "circle-stroke-color": "#b3f56b",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "fleet-cluster-count",
    type: "symbol",
    source: "fleet-overview",
    maxzoom: 11,
    filter: [">=", ["get", "point_count"], 2],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#f0ffdf" },
  });
}
