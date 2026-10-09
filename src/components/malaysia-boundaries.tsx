"use client";
import { useEffect, useState } from "react";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";

export type Boundary = Feature<
  Polygon | MultiPolygon,
  { state?: string; district?: string; country?: string }
>;
type Collection = FeatureCollection<
  Polygon | MultiPolygon,
  Boundary["properties"]
>;
export function boundaryBounds(
  feature: Boundary,
): [[number, number], [number, number]] {
  let west = 180,
    east = -180,
    south = 90,
    north = -90;
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number") {
      west = Math.min(west, value[0]);
      east = Math.max(east, value[0]);
      south = Math.min(south, value[1]);
      north = Math.max(north, value[1]);
    } else value.forEach(visit);
  };
  visit(feature.geometry.coordinates);
  return [
    [west, south],
    [east, north],
  ];
}
export function boundaryContains(feature: Boundary, point: [number, number]) {
  const insideRing = (ring: Position[]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (
        a[1] > point[1] !== b[1] > point[1] &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
    }
    return inside;
  };
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return polygons.some(
    (rings) => insideRing(rings[0]) && !rings.slice(1).some(insideRing),
  );
}

export default function MalaysiaBoundaries({
  map,
  onSelect,
  picking,
}: {
  map: LibreMap;
  onSelect: (feature: Boundary | null) => void;
  picking?: boolean;
}) {
  const [data, setData] = useState<{
    country: Collection;
    states: Collection;
    districts: Collection;
  }>();
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      ["country", "states", "districts"].map(async (name) => {
        const response = await fetch(`/data/boundaries/${name}.geojson`, {
          signal: controller.signal,
        });
        if (!response.ok) throw Error("Boundary download failed");
        return response.json() as Promise<Collection>;
      }),
    )
      .then(([country, states, districts]) =>
        setData({ country, states, districts }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!data) return;
    for (const name of ["states", "districts"] as const) {
      map.addSource(`my-${name}`, { type: "geojson", data: data[name] });
      map.addLayer({
        id: `my-${name}-fill`,
        type: "fill",
        source: `my-${name}`,
        paint: {
          "fill-color": name === "states" ? "#6991d7" : "#518bee",
          "fill-opacity": 0.06,
        },
      });
      map.addLayer({
        id: `my-${name}-line`,
        type: "line",
        source: `my-${name}`,
        paint: {
          "line-color": name === "states" ? "#8bace4" : "#94a9cd",
          "line-width": name === "states" ? 1.8 : 0.7,
          "line-opacity": 0.65,
        },
      });
    }
    for (const id of ["my-selection", "my-mask"])
      map.addSource(id, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    map.addLayer({
      id: "my-mask",
      type: "fill",
      source: "my-mask",
      paint: { "fill-color": "#080e18", "fill-opacity": 0.9 },
    });
    map.addLayer({
      id: "my-selection-fill",
      type: "fill",
      source: "my-selection",
      paint: { "fill-color": "#518bee", "fill-opacity": 0.07 },
    });
    map.addLayer({
      id: "my-selection-line",
      type: "line",
      source: "my-selection",
      paint: { "line-color": "#77a4f2", "line-width": 3 },
    });
    return () => {
      if (!map.getStyle()) return;
      for (const id of [
        "my-mask",
        "my-selection-fill",
        "my-selection-line",
        "my-states-fill",
        "my-states-line",
        "my-districts-fill",
        "my-districts-line",
      ])
        if (map.getLayer(id)) map.removeLayer(id);
      for (const id of ["my-mask", "my-selection", "my-states", "my-districts"])
        if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, data]);
  useEffect(() => {
    if (!data || !map.getSource("my-selection")) return;
    const selected = district
      ? data.districts.features.find(
          (f) =>
            f.properties.state === state && f.properties.district === district,
        )
      : state
        ? data.states.features.find((f) => f.properties.state === state)
        : data.country.features[0];
    if (!selected) return;
    const collection: Collection = {
      type: "FeatureCollection",
      features: [selected],
    };
    (map.getSource("my-selection") as GeoJSONSource).setData(collection);
    const polygons =
      selected.geometry.type === "Polygon"
        ? [selected.geometry.coordinates]
        : selected.geometry.coordinates;
    (map.getSource("my-mask") as GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-179, -80],
            [179, -80],
            [179, 80],
            [-179, 80],
            [-179, -80],
          ],
          ...polygons.map((p) => p[0]),
        ],
      },
    });
    map.setFilter(
      "my-districts-fill",
      state ? ["==", ["get", "state"], state] : ["==", ["get", "state"], ""],
    );
    map.setFilter(
      "my-districts-line",
      state ? ["==", ["get", "state"], state] : ["==", ["get", "state"], ""],
    );
    onSelect(selected);
    if (expanded)
      map.fitBounds(boundaryBounds(selected), {
        padding: {
          top: Math.min(100, map.getContainer().clientHeight * 0.2),
          bottom: Math.min(100, map.getContainer().clientHeight * 0.2),
          left: 35,
          right: 35,
        },
        pitch: 30,
        bearing: 0,
        duration: 1100,
        maxZoom: 12,
      });
  }, [data, state, district, map, onSelect, expanded]);
  useEffect(() => {
    if (!data) return;
    const click = (event: { point: { x: number; y: number } }) => {
      if (picking || !expanded) return;
      const layer = state ? "my-districts-fill" : "my-states-fill";
      if (!map.getLayer(layer)) return;
      const feature = map.queryRenderedFeatures(
        [event.point.x, event.point.y],
        {
          layers: [layer],
        },
      )[0];
      if (!feature) return;
      if (state) setDistrict(String(feature.properties.district));
      else {
        setState(String(feature.properties.state));
        setDistrict("");
      }
    };
    map.on("click", click);
    return () => {
      map.off("click", click);
    };
  }, [map, state, expanded, picking, data]);
  return (
    <div className="gerak-boundary-panel">
      <button
        type="button"
        className="gerak-boundary-trigger"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={district || state || "Explore states and districts"}
        aria-label="Explore states and districts"
      >
        <span className="gerak-boundary-label">Areas</span>
        <span className="gerak-boundary-arrow" aria-hidden="true">
          {expanded ? "▴" : "▾"}
        </span>
      </button>
      {expanded && (
        <div className="gerak-boundary-fields">
          <div className="gerak-boundary-header">
            <strong>Boundaries / Sempadan</strong>
            <button
              type="button"
              className="gerak-boundary-close"
              onClick={() => setExpanded(false)}
              aria-label="Close boundaries"
            >
              ✕
            </button>
          </div>
          {error ? (
            <p>Boundaries unavailable. Reload to retry.</p>
          ) : !data ? (
            <p>Loading DOSM boundaries…</p>
          ) : (
            <>
              <label>
                State / Negeri
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setDistrict("");
                  }}
                >
                  <option value="">All Malaysia</option>
                  {data.states.features
                    .map((f) => f.properties.state!)
                    .sort()
                    .map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                </select>
              </label>
              <label>
                District / Daerah
                <select
                  disabled={!state}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="">Whole state</option>
                  {data.districts.features
                    .filter((f) => f.properties.state === state)
                    .map((f) => f.properties.district!)
                    .sort()
                    .map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                </select>
              </label>
              <small>
                DOSM boundary snapshot · choose an operator for live coverage
              </small>
            </>
          )}
        </div>
      )}
    </div>
  );
}
