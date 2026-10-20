"use client";

import { useEffect } from "react";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import type { TransportMapProps } from "./map-types";

export function ScenarioMarkers({
  map,
  scenario,
  locale,
}: {
  map: LibreMap;
  scenario: TransportMapProps["scenario"];
  locale?: "en" | "ms";
}) {
  useEffect(() => {
    if (!scenario) return;
    let cancelled = false;
    const markers: Marker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled) return;
      [scenario.closed, ...scenario.alternatives].forEach((stop, index) => {
        const element = document.createElement("div");
        element.className = `gerak-scenario-marker ${index === 0 ? "closed" : "alternative"}`;
        const label =
          index === 0
            ? locale === "ms"
              ? "Ditutup dalam senario"
              : "Closed in scenario"
            : locale === "ms"
              ? `Alternatif ${index}`
              : `Alternative ${index}`;
        element.textContent = `${index === 0 ? "×" : index} · ${label}: ${stop.name}`;
        markers.push(
          new Marker({ element, anchor: "top", offset: [0, 12] })
            .setLngLat(stop.coordinate)
            .addTo(map),
        );
      });
    });
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [map, scenario, locale]);
  if (!scenario) return null;
  return (
    <div className="gerak-scenario-legend" role="status">
      <strong>
        {locale === "ms"
          ? "BAGAIMANA JIKA? · HIPOTESIS"
          : "WHAT IF? · HYPOTHETICAL"}
      </strong>
      <span>
        {locale === "ms"
          ? "× Hentian ditutup dalam senario · Nombor: calon hentian alternatif"
          : "× Stop closed in scenario · Numbers: alternative boarding candidates"}
      </span>
      <span>
        {locale === "ms"
          ? "Bukan amaran perkhidmatan sebenar"
          : "Not a real service alert"}
      </span>
    </div>
  );
}
