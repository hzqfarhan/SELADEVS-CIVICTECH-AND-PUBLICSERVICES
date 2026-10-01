"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { CurrentWeather } from "@/lib/weather";
import { MapWeather } from "./map-weather";
import { createDayPalette } from "./map-day-palette";
import { updateFleetClusters } from "./fleet-clusters";
import MalaysiaBoundaries, {
  boundaryContains,
  type Boundary,
} from "./malaysia-boundaries";
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
  '<svg viewBox="0 0 32 40" width="34" height="34" fill="none" aria-hidden="true">' +
  '<path d="M16 1.5 L19.5 5.5 H12.5 Z" fill="currentColor"/>' +
  '<rect x="7" y="6" width="18" height="30" rx="4.5" fill="#132219" stroke="currentColor" stroke-width="1.8"/>' +
  '<path d="M8.8 13.5 C8.8 8.8, 23.2 8.8, 23.2 13.5 Z" fill="#0b1711" stroke="currentColor" stroke-width="0.9"/>' +
  '<path d="M12 9.5 L15 13" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.65"/>' +
  '<rect x="11" y="6.8" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.9"/>' +
  '<rect x="7.8" y="6.2" width="2.6" height="1.6" rx="0.6" fill="#fff9b8"/>' +
  '<rect x="21.6" y="6.2" width="2.6" height="1.6" rx="0.6" fill="#fff9b8"/>' +
  '<path d="M7 9.5 H4.5 C4.2 9.5 4 9.8 4 10.2 L4.2 12 C4.3 12.3 4.6 12.5 4.9 12.4 L7 11.6 Z" fill="currentColor"/>' +
  '<path d="M25 9.5 H27.5 C27.8 9.5 28 9.8 28 10.2 L27.8 12 C27.7 12.3 27.4 12.5 27.1 12.4 L25 11.6 Z" fill="currentColor"/>' +
  '<rect x="7.8" y="16" width="1.8" height="16" rx="0.7" fill="#08110b" stroke="currentColor" stroke-width="0.5"/>' +
  '<rect x="22.4" y="16" width="1.8" height="16" rx="0.7" fill="#08110b" stroke="currentColor" stroke-width="0.5"/>' +
  '<rect x="11.2" y="18" width="9.6" height="9.5" rx="1.8" fill="#182c20" stroke="currentColor" stroke-width="0.8"/>' +
  '<line x1="13.2" y1="20.5" x2="18.8" y2="20.5" stroke="currentColor" stroke-width="0.7" opacity="0.8"/>' +
  '<line x1="13.2" y1="22.8" x2="18.8" y2="22.8" stroke="currentColor" stroke-width="0.7" opacity="0.8"/>' +
  '<line x1="13.2" y1="25.1" x2="18.8" y2="25.1" stroke="currentColor" stroke-width="0.7" opacity="0.8"/>' +
  '<rect x="8" y="34.8" width="3" height="1.5" rx="0.5" fill="#ff4d4f"/>' +
  '<rect x="21" y="34.8" width="3" height="1.5" rx="0.5" fill="#ff4d4f"/>' +
  "</svg>";

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
                r={props.selectedVehicleId === vehicle.id ? "4.5" : "3.0"}
                fill={color}
                opacity={
                  props.selectedVehicleId === vehicle.id ? "0.35" : "0.2"
                }
              />
              <g data-bus-body="true" transform={`rotate(${vehicle.bearing})`}>
                <path d="M0 -3.6 L1.3 -2.2 H-1.3 Z" fill={color} />
                <rect
                  x="-1.6"
                  y="-2.4"
                  width="3.2"
                  height="4.8"
                  rx="1.0"
                  fill={color}
                />
                <path
                  d="M-1.2 -1.7 C-1.2 -2.1, 1.2 -2.1, 1.2 -1.7 L1.1 -.8 H-1.1 Z"
                  fill="#0e1b13"
                />
                <circle cx="-1.2" cy="-2.2" r=".3" fill="#fff9b8" />
                <circle cx="1.2" cy="-2.2" r=".3" fill="#fff9b8" />
                <rect
                  x="-.8"
                  y="-.2"
                  width="1.6"
                  height="1.4"
                  rx=".4"
                  fill="#0e1b13"
                  opacity="0.7"
                />
                <rect
                  x="-1.3"
                  y="2.0"
                  width=".6"
                  height=".3"
                  rx=".15"
                  fill="#ff4d4f"
                />
                <rect
                  x=".7"
                  y="2.0"
                  width=".6"
                  height=".3"
                  rx=".15"
                  fill="#ff4d4f"
                />
              </g>
              <text
                y="-4.2"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="1.9"
                fontWeight="bold"
                paintOrder="stroke"
                stroke="#101a16"
                strokeWidth=".6"
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
  const motionStatus = useRef<HTMLDivElement>(null);
  const lastFocus = useRef("");
  const [lightingChoice, setLighting] = useState<
    "auto" | "day" | "dusk" | "night"
  >("auto");
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const lighting =
    lightingChoice === "auto"
      ? weather && !weather.stale
        ? weather.isDay
          ? "day"
          : "night"
        : "day"
      : lightingChoice;
  const [viewAngle, setViewAngle] = useState<"right" | "left" | "front">(
    "right",
  );
  const angleRef = useRef(viewAngle);
  angleRef.current = viewAngle;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const dayPalette = useRef(createDayPalette());
  const lightingRef = useRef(lighting);
  lightingRef.current = lighting;
  const map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const easingUntilRef = useRef(0);
  const fleetMarkers = useRef(
    new Map<
      string,
      { marker: Marker; element: HTMLButtonElement; icon: HTMLSpanElement }
    >(),
  );
  const staticMarkers = useRef<Marker[]>([]);
  const motions = useRef(new Map<string, VehicleMotion>());
  const [ready, setReady] = useState(false);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  useEffect(() => setBoundary(null), [props.region]);
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const allowedVehicles = useMemo(
    () =>
      new Set(
        props.vehicles
          .filter((v) => !boundary || boundaryContains(boundary, v.coordinate))
          .map((v) => v.id),
      ),
    [boundary, props.vehicles],
  );
  const allowedRef = useRef(allowedVehicles);
  allowedRef.current = allowedVehicles;
  const [unavailable, setUnavailable] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const regionAtFit = useRef<string | null>(null);
  const [locating, setLocating] = useState(false);
  const userMarkerRef = useRef<Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;
    async function createMap() {
      const { createBusFleetLayer } = await import("./bus-fleet-layer");
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      if (disposed || !container.current) return;
      try {
        const instance = new maplibre.Map({
          container: container.current,
          center: REGION_CENTERS[latest.current.region],
          zoom:
            latest.current.region === "uthm" ||
            latest.current.region === "uthm-pagoh"
              ? 15
              : 12.5,
          attributionControl: false,
          maxZoom: 22,
          minZoom: 3,
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
          "bottom-right",
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
            instance.setLight({
              anchor: "map",
              color: "#ffe2b1",
              intensity: 0.55,
              position: [1.5, 210, 38],
            });
            instance.addLayer({
              id: "johor-buildings-3d",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13,
              filter: ["!=", ["get", "hide_3d"], true],
              layout: { visibility: "none" },
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], 6],
                  0,
                  "#719b9b",
                  15,
                  "#99b7b0",
                  60,
                  "#c5c9b3",
                  160,
                  "#e0d5bb",
                ],
                "fill-extrusion-vertical-gradient": true,
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
                "fill-extrusion-opacity": 0.96,
              },
            });
            instance.addLayer({
              id: "gerak-buildings-2d",
              type: "fill",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 14,
              paint: {
                "fill-color": "#6a9185",
                "fill-opacity": 0.24,
                "fill-outline-color": "#7a9c8c",
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
                "fill-extrusion-opacity": 0,
              },
            });
            instance.addLayer(
              createBusFleetLayer(
                () => ({
                  ...latest.current,
                  lighting: lightingRef.current,
                  weatherCode: weatherRef.current?.stale
                    ? undefined
                    : weatherRef.current?.code,
                  vehicles: latest.current.vehicles.filter((v) =>
                    allowedRef.current.has(v.id),
                  ),
                }),
                motions.current,
              ),
            );
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
        instance.on("dragstart", (event) => {
          if (event.originalEvent) latest.current.onFollowChange?.(false);
        });
        instance.on("click", (event) => {
          if (
            !latest.current.picking &&
            instance.getZoom() < 13 &&
            instance.getLayer("fleet-clusters")
          ) {
            const hit = instance.queryRenderedFeatures(event.point, {
              layers: ["fleet-clusters", "fleet-overview-single"],
            })[0];
            if (
              hit?.properties?.cluster_id !== undefined &&
              hit.geometry.type === "Point"
            ) {
              const coordinates = hit.geometry.coordinates as [number, number];
              void (instance.getSource("fleet-overview") as GeoJSONSource)
                .getClusterExpansionZoom(Number(hit.properties.cluster_id))
                .then((zoom) => {
                  if (!disposed)
                    instance.easeTo({
                      center: coordinates,
                      zoom: zoom + 0.25,
                      duration: 600,
                    });
                });
              return;
            }
            if (hit?.properties?.id) {
              latest.current.onSelectVehicle(String(hit.properties.id));
              return;
            }
          }
          if (latest.current.picking) {
            latest.current.onPick?.([event.lngLat.lng, event.lngLat.lat]);
          } else {
            let hitVehicleId: string | null = null;
            if (latest.current.mode === "3d") {
              let minDist = 36;
              for (const v of latest.current.vehicles) {
                if (!allowedRef.current.has(v.id)) continue;
                const motion = motions.current.get(v.id);
                const sample = motion
                  ? sampleMotion(motion, performance.now())
                  : v;
                const pt = instance.project(sample.coordinate);
                const dist = Math.hypot(
                  pt.x - event.point.x,
                  pt.y - event.point.y,
                );
                if (dist < minDist) {
                  minDist = dist;
                  hitVehicleId = v.id;
                }
              }
            } else if (instance.getLayer("bus-models-3d")) {
              const hit = instance.queryRenderedFeatures(event.point, {
                layers: ["bus-models-3d"],
              })[0];
              if (hit?.properties?.id) hitVehicleId = String(hit.properties.id);
            }
            if (hitVehicleId) {
              latest.current.onSelectVehicle(hitVehicleId);
            } else if (instance.getLayer("transit-stop-dots")) {
              const stop = instance.queryRenderedFeatures(
                [
                  [event.point.x - 8, event.point.y - 8],
                  [event.point.x + 8, event.point.y + 8],
                ],
                { layers: ["transit-stop-dots", "transit-stop-names"] },
              )[0];
              if (stop?.properties?.id)
                latest.current.onSelectStop?.(String(stop.properties.id));
            }
          }
        });
        instance.on("mousemove", (event) => {
          if (latest.current.mode !== "3d" || latest.current.picking) return;
          let isOver = false;
          for (const v of latest.current.vehicles) {
            if (!allowedRef.current.has(v.id)) continue;
            const motion = motions.current.get(v.id);
            const sample = motion ? sampleMotion(motion, performance.now()) : v;
            const pt = instance.project(sample.coordinate);
            if (Math.hypot(pt.x - event.point.x, pt.y - event.point.y) < 32) {
              isOver = true;
              break;
            }
          }
          instance.getCanvas().style.cursor = isOver ? "pointer" : "";
        });
        instance.getCanvas().addEventListener("mouseleave", () => {
          if (!latest.current.picking) instance.getCanvas().style.cursor = "";
        });
        observer = new ResizeObserver(() => instance.resize());
        observer.observe(container.current);
        let previousFollow = 0;
        let previousStatus = 0;
        const animate = (now: number) => {
          if (disposed || !map.current) return;
          let estimatedCount = 0,
            pausedCount = 0;
          for (const [id, motion] of motions.current) {
            const marker = fleetMarkers.current.get(id);
            if (!marker) continue;
            const sample = sampleMotion(motion, now);
            if ("estimated" in sample && sample.estimated) estimatedCount++;
            if ("predictionPaused" in sample && sample.predictionPaused)
              pausedCount++;
            marker.element.classList.toggle(
              "is-estimated",
              "estimated" in sample && !!sample.estimated,
            );
            // Keep the pressed target still until pointer release, so moving
            // vehicles remain tappable while their geographic animation continues.
            if (!marker.element.matches(":active"))
              marker.marker.setLngLat(sample.coordinate);
            marker.element.style.display =
              instance.getZoom() < 13 || !allowedRef.current.has(id)
                ? "none"
                : "";
            if (latest.current.mode !== "3d") {
              marker.icon.style.transform = `rotate(${sample.bearing - instance.getBearing()}deg)`;
            }
          }

          // Follow selected vehicle in 60fps lockstep without micro-stutter
          const selectedId = latest.current.selectedVehicleId;
          if (latest.current.follow && selectedId) {
            const motion = motions.current.get(selectedId);
            const vehicle = latest.current.vehicles.find(
              (v) => v.id === selectedId,
            );
            if (motion || vehicle) {
              const sample = motion ? sampleMotion(motion, now) : vehicle!;
              if (now < easingUntilRef.current) {
                // Initial easeTo transition active: let camera glide smoothly to vehicle
                previousFollow = now;
              } else {
                const dt =
                  previousFollow > 0
                    ? Math.min(
                        0.05,
                        Math.max(0.001, (now - previousFollow) / 1000),
                      )
                    : 0.016;
                previousFollow = now;

                let targetBearing: number | undefined;
                if (latest.current.mode === "3d") {
                  const desiredAngle =
                    sample.bearing +
                    (angleRef.current === "right"
                      ? -90
                      : angleRef.current === "left"
                        ? 90
                        : 180);
                  const headingDelta =
                    (((desiredAngle - instance.getBearing() + 540) % 360) - 180);
                  const turnDamping = 1 - Math.exp(-dt * 5);
                  targetBearing =
                    (instance.getBearing() + headingDelta * turnDamping + 360) %
                    360;
                }

                instance.jumpTo({
                  center: sample.coordinate,
                  ...(targetBearing !== undefined
                    ? { bearing: targetBearing }
                    : {}),
                });
              }
            }
          }

          if (motionStatus.current && now - previousStatus > 500) {
            motionStatus.current.textContent =
              latest.current.vehicles.length > 0 &&
              latest.current.vehicles.every((v) => v.source === "simulator")
                ? "Simulated service · animated route movement"
                : pausedCount
                  ? `${pausedCount} position estimates paused · awaiting GPS`
                  : estimatedCount
                    ? `${estimatedCount} route-estimated positions · between GPS updates`
                    : "GPS observations · waiting for next update";
            previousStatus = now;
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
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
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
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            1.2,
            14,
            2.6,
            18,
            4,
          ],
          "line-opacity": 0.82,
        },
      });
    }
    // Ground overlays must be drawn before extruded buildings and the Three fleet.
    for (const id of ["route-glow", "route-outline", "route-line"]) {
      instance.moveLayer(id, "johor-buildings-3d");
    }
  }, [ready, unavailable, props.routes, props.region]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance?.getLayer("route-line")) return;
    const selectedRoute = props.vehicles.find(
      (v) => v.id === props.selectedVehicleId,
    )?.routeId;
    instance.setPaintProperty(
      "route-line",
      "line-opacity",
      selectedRoute
        ? ["case", ["==", ["get", "id"], selectedRoute], 1, 0.2]
        : 0.78,
    );
    instance.setPaintProperty(
      "route-glow",
      "line-opacity",
      selectedRoute
        ? ["case", ["==", ["get", "id"], selectedRoute], 0.3, 0.03]
        : 0.08,
    );
  }, [ready, props.selectedVehicleId, props.vehicles, props.routes]);
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
      maxZoom:
        props.region === "uthm" || props.region === "uthm-pagoh" ? 15.8 : 15,
    });
    regionAtFit.current = fitKey;
  }, [ready, unavailable, props.routes, props.region, props.vehicles]);

  useEffect(() => {
    if (!ready || !map.current || unavailable) return;
    updateFleetClusters(
      map.current,
      props.vehicles.filter((v) => allowedVehicles.has(v.id)),
    );
  }, [ready, unavailable, props.vehicles, allowedVehicles]);

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
          // Map drag handlers must not consume interaction with a vehicle button.
          for (const eventName of [
            "pointerdown",
            "mousedown",
            "touchstart",
            "dblclick",
          ]) {
            element.addEventListener(eventName, (event) =>
              event.stopPropagation(),
            );
          }
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
        entry.element.style.display =
          props.mode === "3d" || map.current.getZoom() < 13 ? "none" : "";
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
    props.mode,
  ]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || unavailable) return;
    let cancelled = false;
    if (props.userLocation) {
      void import("maplibre-gl").then(({ Marker }) => {
        if (cancelled || !map.current || !props.userLocation) return;
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "gerak-user-marker";
          el.setAttribute("aria-label", "Your current location");
          const pulse = document.createElement("span");
          pulse.className = "gerak-user-marker-pulse";
          const dot = document.createElement("span");
          dot.className = "gerak-user-marker-dot";
          el.append(pulse, dot);
          userMarkerRef.current = new Marker({ element: el, anchor: "center" })
            .setLngLat(props.userLocation)
            .addTo(map.current);
        } else {
          userMarkerRef.current.setLngLat(props.userLocation);
        }
      });
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    return () => {
      cancelled = true;
    };
  }, [props.userLocation, ready, unavailable]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || unavailable) return;
    const data = {
      type: "FeatureCollection" as const,
      features: props.stops
        .filter(
          (stop) => !boundary || boundaryContains(boundary, stop.coordinate),
        )
        .map((stop) => ({
          type: "Feature" as const,
          properties: { id: stop.id, name: stop.name },
          geometry: { type: "Point" as const, coordinates: stop.coordinate },
        })),
    };
    if (instance.getSource("transit-stops")) {
      (instance.getSource("transit-stops") as GeoJSONSource).setData(data);
      return;
    }
    instance.addSource("transit-stops", { type: "geojson", data });
    instance.addLayer({
      id: "transit-stop-dots",
      type: "circle",
      source: "transit-stops",
      minzoom: 12,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          1.5,
          16,
          3.5,
        ],
        "circle-color": "#c4d3c7",
        "circle-stroke-color": "#172d24",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.85,
      },
    });
    instance.addLayer({
      id: "transit-stop-names",
      type: "symbol",
      source: "transit-stops",
      minzoom: 14.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-anchor": "bottom",
        "text-offset": [0, -0.9],
        "text-max-width": 15,
        "text-padding": 12,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-optional": true,
      },
      paint: {
        "text-color": "#c4d3c7",
        "text-halo-color": "#10211c",
        "text-halo-width": 1.5,
      },
    });
  }, [ready, unavailable, props.stops, boundary]);

  useEffect(() => {
    if (!ready || !map.current || unavailable) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled || !map.current) return;
      staticMarkers.current.forEach((marker) => marker.remove());
      staticMarkers.current = [];
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
      "gerak-buildings-2d",
      "visibility",
      is3d ? "none" : "visible",
    );
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
            zoom: Math.max(instance.getZoom(), 15.4),
          }
        : {}),
    });
  }, [ready, unavailable, props.mode, props.region]);

  useEffect(() => {
    if (!ready) return;
    if (!props.selectedVehicleId) {
      lastFocus.current = "";
      map.current?.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      return;
    }
    const focusKey = `${props.selectedVehicleId}:${props.mode}:${viewAngle}`;
    // Stopping follow must leave the camera where the user stopped it.
    if (!props.follow && lastFocus.current === focusKey) return;
    lastFocus.current = focusKey;
    const vehicle = props.vehicles.find(
      (v) => v.id === props.selectedVehicleId,
    );
    if (vehicle) {
      const motion = motions.current.get(vehicle.id);
      const sample = motion ? sampleMotion(motion, performance.now()) : vehicle;
      const center = sample.coordinate;
      easingUntilRef.current = performance.now() + 850;
      map.current?.easeTo({
        center,
        padding: { top: 0, left: 0, right: 0, bottom: 0 },
        zoom: Math.max(map.current.getZoom(), props.mode === "3d" ? 17.5 : 16),
        pitch: props.mode === "3d" ? 62 : 0,
        ...(props.mode === "3d"
          ? {
              bearing:
                sample.bearing +
                (viewAngle === "right" ? -90 : viewAngle === "left" ? 90 : 180),
            }
          : {}),
        duration: 800,
      });
    }
    // GPS updates are followed by the interpolation loop, not by restarting camera transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.follow, props.selectedVehicleId, props.mode, viewAngle]);

  useEffect(() => {
    if (ready && map.current?.getLayer("johor-buildings-3d"))
      map.current.setPaintProperty(
        "johor-buildings-3d",
        "fill-extrusion-opacity",
        props.follow ? 0.18 : 0.96,
      );
  }, [ready, props.follow]);

  useEffect(() => {
    if (!ready || !map.current) return;
    dayPalette.current(map.current, lighting === "day");
    map.current.setLight({
      anchor: "map",
      color:
        lighting === "day"
          ? "#ffffff"
          : lighting === "night"
            ? "#9ab6e5"
            : "#ffe2b1",
      intensity: lighting === "day" ? 0.65 : lighting === "night" ? 0.2 : 0.55,
      position: [1.5, 210, lighting === "day" ? 28 : 65],
    });
  }, [ready, lighting, boundary]);

  const handleLocate = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      latest.current.onLocationError?.(
        "Geolocation is not supported by your browser.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coord: Coordinate = [pos.coords.longitude, pos.coords.latitude];
        latest.current.onUserLocationChange?.(coord);
        if (map.current) {
          map.current.flyTo({
            center: coord,
            zoom: Math.max(15.5, map.current.getZoom()),
            duration: 1200,
          });
        }
        if (watchIdRef.current === null) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              const watchCoord: Coordinate = [
                watchPos.coords.longitude,
                watchPos.coords.latitude,
              ];
              latest.current.onUserLocationChange?.(watchCoord);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
          );
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          latest.current.onLocationError?.(
            "Location access denied. Please enable location permissions in your browser to view your surroundings.",
          );
        } else if (err.code === 2) {
          latest.current.onLocationError?.(
            "GPS location unavailable on this device.",
          );
        } else {
          latest.current.onLocationError?.(
            "Location request timed out. Please try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  if (unavailable)
    return (
      <SchematicMap {...props} reason="Map could not load · route schematic" />
    );
  return (
    <div
      className={`gerak-flat-map ${props.mode === "3d" ? "is-geographic-3d" : ""} ${props.picking ? "is-picking" : ""}`}
    >
      <div ref={container} className="gerak-map-canvas" data-testid="map-2d" />
      {ready && map.current && (
        <MalaysiaBoundaries
          key={props.region}
          map={map.current}
          onSelect={setBoundary}
          picking={props.picking}
        />
      )}
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
      <div
        ref={motionStatus}
        className="gerak-motion-status"
        title="Route-based estimates use the last reported speed, reconcile with new GPS updates, and pause after three minutes without a new observation."
      >
        GPS observations · route estimates between updates
      </div>
      {props.selectedVehicleId && (
        <div className="gerak-follow-controls">
          <button
            type="button"
            onClick={() => props.onFollowChange?.(!props.follow)}
          >
            {props.follow ? "Stop following" : "Follow bus"}
          </button>
          {props.mode === "3d" && (
            <select
              aria-label="Bus viewing angle"
              value={viewAngle}
              onChange={(event) =>
                setViewAngle(event.target.value as typeof viewAngle)
              }
            >
              <option value="right">Right side</option>
              <option value="left">Left side</option>
              <option value="front">Front view</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              props.onOverview?.();
              map.current?.fitBounds(
                createProjection(props.routes, props.region).bounds,
                {
                  padding: 55,
                  pitch: props.mode === "3d" ? 35 : 0,
                  bearing: 0,
                  duration: 800,
                },
              );
            }}
          >
            Overview
          </button>
        </div>
      )}
      <MapWeather region={props.region} onWeather={setWeather} />
      <div className="gerak-map-navigation" aria-label="Map controls">
        {
          <button
            type="button"
            className="gerak-light-button"
            aria-label={`Scene lighting: ${lightingChoice}. Change lighting`}
            title={`Lighting: ${lightingChoice} (${lighting}) · click to cycle`}
            onClick={() =>
              setLighting(
                lightingChoice === "auto"
                  ? "day"
                  : lightingChoice === "day"
                    ? "dusk"
                    : lightingChoice === "dusk"
                      ? "night"
                      : "auto",
              )
            }
          >
            {lighting === "day" ? "☀" : lighting === "night" ? "☾" : "◐"}
            <small>{lightingChoice}</small>
          </button>
        }
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
        <button
          type="button"
          className={`gerak-locate-button ${locating ? "is-locating" : ""} ${props.userLocation ? "is-active" : ""}`}
          title={
            locating
              ? "Finding your location…"
              : props.userLocation
                ? "Your location (click to center)"
                : "Find my location & surroundings"
          }
          aria-label="Find my location"
          onClick={handleLocate}
        >
          <LocateFixed size={17} />
        </button>
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
              maxZoom:
                props.region === "uthm" || props.region === "uthm-pagoh"
                  ? 15.8
                  : 13.8,
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
