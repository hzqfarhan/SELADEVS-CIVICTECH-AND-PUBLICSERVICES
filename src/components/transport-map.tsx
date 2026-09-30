"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { busFootprint } from "./geographic-3d";
import type { GeoJSONSource, Map as LibreMap, Marker } from "maplibre-gl";
import type { Coordinate } from "@/lib/types";
import type { TransportMapProps } from "./map-types";
import {
  createProjection,
  REGION_CENTERS,
  sampleMotion,
  updateMotions,
  type VehicleMotion,
} from "./map-motion";
import "maplibre-gl/dist/maplibre-gl.css";
import "./transport-map.css";

const BUS_SVG =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><rect x="5" y="3" width="14" height="17" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M6 11h12M9 3v8m6-8v8M8 21v-2m8 2v-2" stroke="currentColor" stroke-width="1.8"/><path d="m12 0 2 2h-4z" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>';

export type { TransportMapProps } from "./map-types";

/** Geographic schematic remains usable with no WebGL, no basemap or no network. */
export function SchematicMap(props: TransportMapProps & { reason?: string }) {
  const projection = useMemo(
    () => createProjection(props.routes, props.region),
    [props.routes, props.region],
  );
  const motions = useRef(new Map<string, VehicleMotion>());
  const nodes = useRef(new Map<string, SVGGElement>());
  const [pick, setPick] = useState<Coordinate | null>(null);
  useEffect(() => {
    updateMotions(
      motions.current,
      props.vehicles,
      props.routes,
      performance.now(),
    );
  }, [props.vehicles, props.routes]);
  useEffect(() => {
    let frame: number;
    const animate = (now: number) => {
      for (const [id, motion] of motions.current) {
        const node = nodes.current.get(id);
        if (node) {
          const sample = sampleMotion(motion, now);
          const point = projection.project(sample.coordinate);
          node.setAttribute("transform", `translate(${point[0]} ${point[1]})`);
          node
            .querySelector("[data-bus-body]")
            ?.setAttribute("transform", `rotate(${sample.bearing})`);
        }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [projection]);
  return (
    <div className="gerak-schematic" data-testid="schematic-map">
      <svg
        viewBox={[
          -projection.width / 2,
          -projection.depth / 2,
          projection.width,
          projection.depth,
        ].join(" ")}
        role="group"
        aria-label="Geographic route schematic"
        onClick={(event) => {
          if (!props.picking || !props.onPick) return;
          const svg = event.currentTarget;
          const matrix = svg.getScreenCTM();
          if (!matrix) return;
          const point = new DOMPoint(
            event.clientX,
            event.clientY,
          ).matrixTransform(matrix.inverse());
          const coordinate = projection.unproject([point.x, point.y]);
          setPick(coordinate);
          props.onPick(coordinate);
        }}
      >
        <defs>
          <pattern
            id="gerak-schematic-grid"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 5 0 L 0 0 0 5"
              fill="none"
              stroke="#24342f"
              strokeWidth="0.08"
            />
          </pattern>
        </defs>
        <rect
          x={-projection.width / 2}
          y={-projection.depth / 2}
          width={projection.width}
          height={projection.depth}
          fill="url(#gerak-schematic-grid)"
        />
        {props.routes.map((route) => (
          <g key={route.id}>
            <polyline
              points={route.path
                .map((point) => projection.project(point).join(","))
                .join(" ")}
              stroke={route.color}
              strokeWidth="2"
              opacity="0.12"
              fill="none"
              strokeLinejoin="round"
            />
            <polyline
              points={route.path
                .map((point) => projection.project(point).join(","))
                .join(" ")}
              stroke={route.color}
              strokeWidth="0.42"
              opacity="0.85"
              fill="none"
              strokeLinejoin="round"
            />
          </g>
        ))}
        {props.stops.map((stop) => {
          const [x, y] = projection.project(stop.coordinate);
          return (
            <g
              key={stop.id}
              transform={`translate(${x} ${y})`}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelectStop?.(stop.id);
              }}
              className="gerak-svg-stop"
              role="button"
              tabIndex={0}
              aria-label={stop.name}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onSelectStop?.(stop.id);
                }
              }}
            >
              <circle
                r="0.65"
                fill="#e7f2e8"
                stroke="#15251d"
                strokeWidth="0.3"
              />
              <text
                y="-1.7"
                textAnchor="middle"
                fill="#b6c5bd"
                fontSize="1.5"
                paintOrder="stroke"
                stroke="#101a16"
                strokeWidth="0.6"
              >
                {stop.name}
              </text>
            </g>
          );
        })}
        {props.reports
          .filter((report) => report.status !== "resolved")
          .map((report) => {
            const [x, y] = projection.project(report.coordinate);
            return (
              <g key={report.id} transform={`translate(${x} ${y})`}>
                <circle r="1" fill="#f5b65a" />
                <text textAnchor="middle" y=".55" fontSize="1.7" fill="#191a14">
                  !
                </text>
              </g>
            );
          })}
        {props.vehicles.map((vehicle) => {
          const [x, y] = projection.project(vehicle.coordinate);
          const color =
            props.routes.find((route) => route.id === vehicle.routeId)?.color ??
            "#bafa45";
          return (
            <g
              key={vehicle.id}
              ref={(node) => {
                if (node) nodes.current.set(vehicle.id, node);
                else nodes.current.delete(vehicle.id);
              }}
              transform={`translate(${x} ${y})`}
              role="button"
              tabIndex={0}
              aria-label={`Select ${vehicle.label}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onSelectVehicle(vehicle.id);
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelectVehicle(vehicle.id);
              }}
              className="gerak-svg-bus"
            >
              <circle
                r={props.selectedVehicleId === vehicle.id ? "2.6" : "1.7"}
                fill={color}
                opacity="0.18"
              />
              <g data-bus-body="true" transform={`rotate(${vehicle.bearing})`}>
                <rect
                  x="-1.25"
                  y="-1.25"
                  width="2.5"
                  height="2.5"
                  rx=".8"
                  fill={color}
                />
                <path
                  d="M-.65-.7H.65V.25H-.65ZM-.5.7h.2M.3.7h.2"
                  stroke="#152217"
                  strokeWidth=".22"
                  fill="none"
                />
                <path d="M0 -2 -.5 -1.35H.5Z" fill={color} />
              </g>
              <text
                y="-2.2"
                textAnchor="middle"
                fill="#e3efe3"
                fontSize="1.4"
                paintOrder="stroke"
                stroke="#101a16"
                strokeWidth=".5"
              >
                {vehicle.label}
              </text>
            </g>
          );
        })}
        {pick && (
          <circle
            cx={projection.project(pick)[0]}
            cy={projection.project(pick)[1]}
            r="1.5"
            fill="#ffbc62"
            stroke="white"
            strokeWidth=".4"
          />
        )}
      </svg>
      <div className="gerak-map-caption">
        {props.reason ?? "Offline route schematic"} · geographic routes,
        simplified base
      </div>
    </div>
  );
}

function FlatMap(props: TransportMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const fleetMarkers = useRef(
    new Map<
      string,
      { marker: Marker; element: HTMLButtonElement; icon: HTMLSpanElement }
    >(),
  );
  const staticMarkers = useRef<Marker[]>([]);
  const motions = useRef(new Map<string, VehicleMotion>());
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const regionAtFit = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;
    async function createMap() {
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      if (disposed || !container.current) return;
      try {
        const instance = new maplibre.Map({
          container: container.current,
          center: REGION_CENTERS[latest.current.region],
          zoom: latest.current.region === "uthm" ? 15 : 12.5,
          attributionControl: false,
          maxZoom: 18,
          minZoom: 6,
          maxPitch: 70,
          style: "https://tiles.openfreemap.org/styles/dark",
        });
        if (disposed) {
          instance.remove();
          return;
        }
        map.current = instance;
        instance.addControl(
          new maplibre.AttributionControl({ compact: true }),
          "bottom-right",
        );
        instance.addControl(
          new maplibre.ScaleControl({ maxWidth: 85, unit: "metric" }),
          "bottom-left",
        );
        instance
          .getCanvas()
          .setAttribute(
            "aria-label",
            "Live transport map. Use arrow keys to pan; plus and minus to zoom.",
          );
        loadTimeout = setTimeout(() => {
          if (!disposed && !instance.loaded()) setUnavailable(true);
        }, 15000);
        instance.on("load", () => {
          clearTimeout(loadTimeout);
          if (!disposed) {
            instance.addLayer({
              id: "johor-buildings-3d",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13,
              filter: ["!=", ["get", "hide_3d"], true],
              layout: { visibility: "none" },
              paint: {
                "fill-extrusion-color": "#809f99",
                "fill-extrusion-height": [
                  "max",
                  3,
                  ["coalesce", ["get", "render_height"], 6],
                ],
                "fill-extrusion-base": [
                  "coalesce",
                  ["get", "render_min_height"],
                  0,
                ],
                "fill-extrusion-opacity": 0.8,
              },
            });
            instance.addSource("bus-models", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            instance.addLayer({
              id: "bus-models-3d",
              type: "fill-extrusion",
              source: "bus-models",
              layout: { visibility: "none" },
              paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-opacity": 1,
              },
            });
            setReady(true);
          }
        });
        instance.on("sourcedata", (event) => {
          if (
            event.sourceId === "openmaptiles" &&
            event.isSourceLoaded &&
            !disposed
          ) {
            setBaseLoaded(true);
            setTileError(false);
          }
        });
        instance.on("error", (event) => {
          if (
            !disposed &&
            /tile|fetch|network|image|ajax/i.test(event.error?.message ?? "")
          )
            setTileError(true);
        });
        instance.on("webglcontextlost", () => {
          if (!disposed) setUnavailable(true);
        });
        instance.on("click", (event) => {
          if (latest.current.picking) {
            latest.current.onPick?.([event.lngLat.lng, event.lngLat.lat]);
          } else if (instance.getLayer("bus-models-3d")) {
            const hit = instance.queryRenderedFeatures(event.point, {
              layers: ["bus-models-3d"],
            })[0];
            if (hit?.properties?.id)
              latest.current.onSelectVehicle(String(hit.properties.id));
          }
        });
        observer = new ResizeObserver(() => instance.resize());
        observer.observe(container.current);
        let previousFollow = 0;
        let previousModels = 0;
        const animate = (now: number) => {
          if (disposed || !map.current) return;
          for (const [id, motion] of motions.current) {
            const marker = fleetMarkers.current.get(id);
            if (!marker) continue;
            const sample = sampleMotion(motion, now);
            marker.marker.setLngLat(sample.coordinate);
            marker.icon.style.transform = `rotate(${sample.bearing - instance.getBearing()}deg)`;
            if (
              latest.current.follow &&
              latest.current.selectedVehicleId === id &&
              now - previousFollow > 40 &&
              !instance.isMoving()
            ) {
              instance.setCenter(sample.coordinate);
              previousFollow = now;
            }
          }
          if (
            latest.current.mode === "3d" &&
            now - previousModels > 100 &&
            instance.getSource("bus-models")
          ) {
            const zoom = instance.getZoom();
            // Cartographic model scale grows at regional zoom, without moving GPS anchors.
            const scale = Math.min(12, Math.max(1, Math.pow(2, 15 - zoom)));
            const features = latest.current.vehicles.flatMap((vehicle) => {
              const motion = motions.current.get(vehicle.id);
              const sample = motion ? sampleMotion(motion, now) : vehicle;
              const color =
                latest.current.routes.find((r) => r.id === vehicle.routeId)
                  ?.color ?? "#bafa45";
              return [
                {
                  type: "Feature" as const,
                  properties: {
                    id: vehicle.id,
                    color,
                    height: 3.2 * scale,
                    base: 0,
                  },
                  geometry: busFootprint(
                    sample.coordinate,
                    sample.bearing,
                    12 * scale,
                    2.6 * scale,
                  ),
                },
                {
                  type: "Feature" as const,
                  properties: {
                    id: vehicle.id,
                    color: "#e3f1ec",
                    height: 3.6 * scale,
                    base: 3.2 * scale,
                  },
                  geometry: busFootprint(
                    sample.coordinate,
                    sample.bearing,
                    9 * scale,
                    2.2 * scale,
                  ),
                },
              ];
            });
            (instance.getSource("bus-models") as GeoJSONSource).setData({
              type: "FeatureCollection",
              features,
            });
            previousModels = now;
          }
          frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
      } catch {
        if (!disposed) setUnavailable(true);
      }
    }
    void createMap().catch(() => {
      if (!disposed) setUnavailable(true);
    });
    return () => {
      disposed = true;
      clearTimeout(loadTimeout);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fleetMarkers.current.forEach((entry) => entry.marker.remove());
      fleetMarkers.current.clear();
      staticMarkers.current.forEach((marker) => marker.remove());
      staticMarkers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (unavailable) {
      map.current?.remove();
      map.current = null;
    }
  }, [unavailable]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || unavailable) return;
    const routes = {
      type: "FeatureCollection" as const,
      features: props.routes.map((route) => ({
        type: "Feature" as const,
        properties: { color: route.color, id: route.id },
        geometry: { type: "LineString" as const, coordinates: route.path },
      })),
    };
    if (instance.getSource("routes"))
      (instance.getSource("routes") as GeoJSONSource).setData(routes);
    else {
      instance.addSource("routes", { type: "geojson", data: routes });
      instance.addLayer({
        id: "route-glow",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 15,
          "line-opacity": 0.08,
          "line-blur": 5,
        },
      });
      instance.addLayer({
        id: "route-outline",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#091810",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });
      instance.addLayer({
        id: "route-line",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2.6,
          "line-opacity": 0.82,
        },
      });
    }
  }, [ready, unavailable, props.routes, props.region]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || unavailable) return;
    const official = props.vehicles.filter(
      (vehicle) => vehicle.source === "gtfs-rt",
    );
    const fitKey = `${props.region}:${official.length ? "official" : "demo"}`;
    if (regionAtFit.current === fitKey) return;
    const bounds = createProjection(props.routes, props.region).bounds;
    // A regional official feed extends beyond the compact demo corridor. Frame
    // its actual observations once on source change, then preserve user panning.
    if (official.length) {
      const lngs = official.map((vehicle) => vehicle.coordinate[0]);
      const lats = official.map((vehicle) => vehicle.coordinate[1]);
      bounds[0] = [Math.min(...lngs), Math.min(...lats)];
      bounds[1] = [Math.max(...lngs), Math.max(...lats)];
    }
    const compact = instance.getContainer().clientHeight < 500;
    instance.fitBounds(bounds, {
      padding: {
        top: compact ? 60 : 100,
        bottom: compact ? 65 : 115,
        left: compact ? 25 : 60,
        right: compact ? 25 : 60,
      },
      duration: regionAtFit.current ? 1000 : 0,
      maxZoom: props.region === "uthm" ? 15.8 : 15,
    });
    regionAtFit.current = fitKey;
  }, [ready, unavailable, props.routes, props.region, props.vehicles]);

  useEffect(() => {
    updateMotions(
      motions.current,
      props.vehicles,
      props.routes,
      performance.now(),
    );
  }, [props.vehicles, props.routes]);

  useEffect(() => {
    if (!ready || !map.current || unavailable) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled || !map.current) return;
      const ids = new Set(props.vehicles.map((vehicle) => vehicle.id));
      for (const [id, item] of fleetMarkers.current) {
        if (!ids.has(id)) {
          item.marker.remove();
          fleetMarkers.current.delete(id);
        }
      }
      for (const vehicle of props.vehicles) {
        let entry = fleetMarkers.current.get(vehicle.id);
        if (!entry) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = "gerak-bus-marker";
          const icon = document.createElement("span");
          icon.className = "gerak-bus-marker-icon";
          icon.innerHTML = BUS_SVG;
          const label = document.createElement("span");
          label.className = "gerak-bus-marker-label";
          label.textContent = vehicle.label;
          element.append(icon, label);
          element.addEventListener("click", (event) => {
            event.stopPropagation();
            latest.current.onSelectVehicle(vehicle.id);
          });
          const marker = new Marker({ element, anchor: "center" })
            .setLngLat(vehicle.coordinate)
            .addTo(map.current);
          entry = { marker, element, icon };
          fleetMarkers.current.set(vehicle.id, entry);
        }
        entry.element.setAttribute(
          "aria-label",
          `${vehicle.label}, ${vehicle.routeId}. View vehicle details`,
        );
        entry.element.setAttribute(
          "aria-pressed",
          String(props.selectedVehicleId === vehicle.id),
        );
        entry.element.classList.toggle(
          "is-selected",
          props.selectedVehicleId === vehicle.id,
        );
        entry.element.style.setProperty(
          "--bus-color",
          props.routes.find((route) => route.id === vehicle.routeId)?.color ??
            "#bafa45",
        );
        entry.element.style.zIndex =
          props.selectedVehicleId === vehicle.id ? "5" : "2";
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    unavailable,
    props.vehicles,
    props.routes,
    props.selectedVehicleId,
  ]);

  useEffect(() => {
    if (!ready || !map.current || unavailable) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled || !map.current) return;
      staticMarkers.current.forEach((marker) => marker.remove());
      staticMarkers.current = [];
      props.stops.forEach((stop) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "gerak-stop-marker";
        element.setAttribute(
          "aria-label",
          `${stop.name}${stop.accessible ? ", wheelchair accessible" : ""}`,
        );
        element.title = stop.name;
        const dot = document.createElement("span");
        dot.className = "gerak-stop-dot";
        const text = document.createElement("span");
        text.textContent = stop.name;
        text.className = "gerak-stop-label";
        element.append(dot, text);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelectStop?.(stop.id);
        });
        staticMarkers.current.push(
          new Marker({ element, anchor: "center" })
            .setLngLat(stop.coordinate)
            .addTo(map.current!),
        );
      });
      props.reports
        .filter((report) => report.status !== "resolved")
        .forEach((report) => {
          const element = document.createElement("div");
          element.className = `gerak-report-marker ${report.status === "in-progress" ? "in-progress" : ""}`;
          element.textContent = "!";
          element.title = `${report.title} · ${report.status}`;
          element.setAttribute("role", "img");
          element.setAttribute("aria-label", element.title);
          staticMarkers.current.push(
            new Marker({ element, anchor: "bottom" })
              .setLngLat(report.coordinate)
              .addTo(map.current!),
          );
        });
    });
    return () => {
      cancelled = true;
    };
  }, [ready, unavailable, props.stops, props.reports]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || unavailable) return;
    instance.getCanvas().style.cursor = props.picking ? "crosshair" : "";
    const heat = {
      type: "FeatureCollection" as const,
      features: props.vehicles.map((vehicle) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: vehicle.coordinate },
      })),
    };
    if (instance.getSource("community-heat"))
      (instance.getSource("community-heat") as GeoJSONSource).setData(heat);
    else {
      instance.addSource("community-heat", { type: "geojson", data: heat });
      instance.addLayer(
        {
          id: "community-heat",
          type: "heatmap",
          source: "community-heat",
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": 1.3,
            "heatmap-radius": 48,
            "heatmap-opacity": 0.7,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(250,177,64,0)",
              0.3,
              "rgba(246,155,44,.3)",
              0.65,
              "#f7bd5c",
              1,
              "#fa625a",
            ],
          },
        },
        "route-glow",
      );
    }
    instance.setLayoutProperty(
      "community-heat",
      "visibility",
      props.heatmap ? "visible" : "none",
    );
  }, [ready, unavailable, props.vehicles, props.heatmap, props.picking]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || unavailable) return;
    const is3d = props.mode === "3d";
    instance.setLayoutProperty(
      "johor-buildings-3d",
      "visibility",
      is3d ? "visible" : "none",
    );
    instance.setLayoutProperty(
      "bus-models-3d",
      "visibility",
      is3d ? "visible" : "none",
    );
    const selected = latest.current.vehicles.find(
      (v) => v.id === latest.current.selectedVehicleId,
    );
    instance.easeTo({
      pitch: is3d ? 58 : 0,
      bearing: is3d ? -18 : 0,
      duration: 1000,
      ...(is3d
        ? {
            center: selected?.coordinate ?? REGION_CENTERS[props.region],
            zoom: Math.max(instance.getZoom(), 14.5),
          }
        : {}),
    });
  }, [ready, unavailable, props.mode, props.region]);

  useEffect(() => {
    if (!ready || !props.follow || !props.selectedVehicleId) return;
    const vehicle = props.vehicles.find(
      (v) => v.id === props.selectedVehicleId,
    );
    if (vehicle)
      map.current?.easeTo({
        center: vehicle.coordinate,
        zoom: props.mode === "3d" ? 16 : 15,
        duration: 800,
      });
    // GPS updates are followed by the interpolation loop, not by restarting camera transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.follow, props.selectedVehicleId, props.mode]);

  if (unavailable)
    return (
      <SchematicMap {...props} reason="Map could not load · route schematic" />
    );
  return (
    <div
      className={`gerak-flat-map ${props.mode === "3d" ? "is-geographic-3d" : ""} ${props.picking ? "is-picking" : ""}`}
    >
      <div ref={container} className="gerak-map-canvas" data-testid="map-2d" />
      {!ready && (
        <div className="gerak-map-loading">
          <span className="gerak-map-loader" />
          <strong>Connecting your city</strong>
          <span>Preparing the live transport map</span>
        </div>
      )}
      {tileError && !baseLoaded && (
        <div className="gerak-map-tile-notice">
          Basemap unavailable · route positions remain available
        </div>
      )}
      {props.mode === "3d" && (
        <div className="gerak-geographic-note">
          Real geography · OpenStreetMap
          <br />
          Building heights may be estimated · right-drag to rotate
        </div>
      )}
      <div className="gerak-map-navigation" aria-label="Map controls">
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => map.current?.zoomIn()}
        >
          +
        </button>
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => map.current?.zoomOut()}
        >
          −
        </button>
        <span />
        {props.mode === "3d" && props.region === "johor" && (
          <button
            type="button"
            title="Johor overview"
            aria-label="Show all Johor geography"
            onClick={() =>
              map.current?.fitBounds(
                [
                  [102.4, 1.15],
                  [104.6, 2.9],
                ],
                { padding: 60, pitch: 35, bearing: 0, duration: 1000 },
              )
            }
          >
            MY
          </button>
        )}
        <button
          type="button"
          title="Recenter map"
          aria-label="Recenter map"
          onClick={() => {
            const projection = createProjection(props.routes, props.region);
            map.current?.fitBounds(projection.bounds, {
              padding: 100,
              duration: 700,
              maxZoom: props.region === "uthm" ? 15.8 : 13.8,
            });
          }}
        >
          ⌖
        </button>
      </div>
      <div className="gerak-map-compass" aria-hidden="true">
        <span>N</span>
        <i />
      </div>
    </div>
  );
}

export default function TransportMap(props: TransportMapProps) {
  return (
    <div className="gerak-transport-map">
      <FlatMap {...props} />
    </div>
  );
}
