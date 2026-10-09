import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl";
import type { Vehicle } from "@/lib/types";

// A compact front-facing bus remains readable at national/region scale.
// The offset backplate distinguishes a group without numeric map clutter.
function busImage(grouped: boolean): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 88;
  const ctx = canvas.getContext("2d")!;
  ctx.lineWidth = 3;
  if (grouped) {
    ctx.fillStyle = "#365380";
    ctx.beginPath();
    ctx.roundRect(23, 9, 54, 61, 16);
    ctx.fill();
  }
  ctx.fillStyle = "#142138";
  ctx.strokeStyle = "#83b3ff";
  ctx.beginPath();
  ctx.roundRect(10, 17, 60, 60, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#8bb9ff";
  ctx.beginPath();
  ctx.roundRect(24, 26, 32, 39, 8);
  ctx.fill();
  ctx.fillStyle = "#142138";
  ctx.beginPath();
  ctx.roundRect(28, 32, 24, 16, 4);
  ctx.fill();
  ctx.fillRect(31, 28, 18, 2);
  ctx.fillStyle = "#ffffff";
  for (const x of [31, 49]) {
    ctx.beginPath();
    ctx.arc(x, 56, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#8bb9ff";
  ctx.fillRect(27, 62, 6, 7);
  ctx.fillRect(47, 62, 6, 7);
  return ctx.getImageData(0, 0, 88, 88);
}
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
  for (const [name, grouped] of [
    ["fleet-group-bus", true],
    ["fleet-single-bus", false],
  ] as const)
    if (!map.hasImage(name))
      map.addImage(name, busImage(grouped), { pixelRatio: 2 });
  map.addSource("fleet-overview", {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: 10,
  });
  map.addLayer({
    id: "fleet-clusters",
    type: "symbol",
    source: "fleet-overview",
    maxzoom: 11,
    filter: ["has", "point_count"],
    layout: {
      "icon-image": "fleet-group-bus",
      "icon-size": 1,
      "icon-padding": 5,
      "icon-allow-overlap": false,
    },
  });
  map.addLayer({
    id: "fleet-overview-single",
    type: "symbol",
    source: "fleet-overview",
    maxzoom: 11,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": "fleet-single-bus",
      "icon-size": 0.9,
      "icon-padding": 4,
      "icon-allow-overlap": false,
    },
  });
  for (const layer of ["fleet-clusters", "fleet-overview-single"]) {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  }
}
