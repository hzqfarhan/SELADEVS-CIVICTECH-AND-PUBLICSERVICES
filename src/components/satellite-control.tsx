"use client";

import { useEffect, useState } from "react";
import type { Map as LibreMap } from "maplibre-gl";
import { createDayPalette } from "./map-day-palette";

const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

/** Raster overlay keeps the vector source and all GERAK custom layers intact. */
export function SatelliteControl({
  map,
  locale,
}: {
  map: LibreMap;
  locale?: string;
}) {
  const [mapType, setMapType] = useState<"blue" | "road" | "satellite">("blue");
  const satellite = mapType === "satellite";
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (mapType !== "blue") return;
    const palette = createDayPalette();
    palette(map, false);
    const buildings = [
      ["johor-buildings-3d", "fill-extrusion-color"],
      ["gerak-buildings-2d", "fill-color"],
    ] as const;
    const original = buildings
      .filter(([id]) => map.getLayer(id))
      .map(([id, property]) => ({
        id,
        property,
        value: map.getPaintProperty(id, property),
      }));
    for (const { id, property } of original)
      map.setPaintProperty(id, property, "#34465f");
    return () => {
      if (!map.getStyle()) return;
      palette(map, null);
      for (const { id, property, value } of original)
        if (map.getLayer(id)) map.setPaintProperty(id, property, value);
    };
  }, [map, mapType]);
  useEffect(() => {
    if (!satellite || !key) return;
    const id = "gerak-satellite";
    const layers = map.getStyle().layers;
    const labels = layers.filter((l) => l.type === "symbol");
    const firstOverlay = layers.find(
      (l) =>
        l.type === "symbol" ||
        l.id.startsWith("gerak-") ||
        l.id.startsWith("johor-"),
    );
    const error = (event: unknown) => {
      if (
        typeof event === "object" &&
        event !== null &&
        "sourceId" in event &&
        event.sourceId === id
      ) {
        setMapType("road");
        setMessage(
          locale === "ms"
            ? "Imej tidak tersedia. Peta jalan dipulihkan."
            : "Imagery unavailable. Road map restored.",
        );
      }
    };
    map.on("error", error);
    map.addSource(id, {
      type: "raster",
      url: `https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=${encodeURIComponent(key)}`,
      attribution:
        '<a href="https://www.maptiler.com/copyright/">© MapTiler</a>',
    });
    map.addLayer(
      { id, type: "raster", source: id, paint: { "raster-opacity": 1 } },
      firstOverlay?.id,
    );
    const paint = labels
      .filter((l) => l.layout?.["text-field"])
      .map((l) => ({
        id: l.id,
        color: map.getPaintProperty(l.id, "text-color"),
        halo: map.getPaintProperty(l.id, "text-halo-color"),
      }));
    for (const l of paint) {
      map.setPaintProperty(l.id, "text-color", "#ffffff");
      map.setPaintProperty(l.id, "text-halo-color", "#26342c");
    }
    return () => {
      map.off("error", error);
      if (!map.getStyle()) return;
      for (const l of paint)
        if (map.getLayer(l.id)) {
          map.setPaintProperty(l.id, "text-color", l.color);
          map.setPaintProperty(l.id, "text-halo-color", l.halo);
        }
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, satellite, locale]);
  return (
    <div className="satellite-control">
      <div
        role="group"
        aria-label={locale === "ms" ? "Jenis peta" : "Map type"}
      >
        <button
          type="button"
          aria-pressed={mapType === "blue"}
          onClick={() => {
            setMapType("blue");
            setMessage("");
          }}
        >
          {locale === "ms" ? "Biru" : "Blue"}
        </button>
        <button
          type="button"
          aria-pressed={mapType === "road"}
          onClick={() => {
            setMapType("road");
            setMessage("");
          }}
        >
          {locale === "ms" ? "Jalan" : "Road"}
        </button>
        <button
          type="button"
          aria-pressed={satellite}
          onClick={() => {
            if (!key) {
              setMessage(
                locale === "ms"
                  ? "Imej satelit belum dikonfigurasi."
                  : "Satellite imagery is not configured yet.",
              );
              return;
            }
            setMessage("");
            setMapType("satellite");
          }}
        >
          {locale === "ms" ? "Satelit" : "Satellite"}
        </button>
      </div>
      {message && (
        <p role="status">
          {message}
          <button
            type="button"
            aria-label="Dismiss map message"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </p>
      )}
    </div>
  );
}
