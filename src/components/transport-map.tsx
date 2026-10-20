"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Maximize2 } from "lucide-react";
import type { CurrentWeather } from "@/lib/weather";
import { MapWeather } from "./map-weather";
import { SatelliteControl } from "./satellite-control";
import { ScenarioMarkers } from "./scenario-markers";
import TrafficLayers from "./traffic-layers";
import { updateFleetClusters } from "./fleet-clusters";
import MalaysiaBoundaries, {
  boundaryContains,
  type Boundary,
} from "./malaysia-boundaries";
import type { GeoJSONSource, Map as LibreMap, Marker } from "maplibre-gl";
import type { Coordinate } from "@/lib/types";
import { distance } from "@/lib/transit";
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
  '<rect x="7" y="6" width="18" height="30" rx="4.5" fill="#131822" stroke="currentColor" stroke-width="1.8"/>' +
  '<path d="M8.8 13.5 C8.8 8.8, 23.2 8.8, 23.2 13.5 Z" fill="#0b0f17" stroke="currentColor" stroke-width="0.9"/>' +
  '<path d="M12 9.5 L15 13" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.65"/>' +
  '<rect x="11" y="6.8" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.9"/>' +
  '<rect x="7.8" y="6.2" width="2.6" height="1.6" rx="0.6" fill="#fff9b8"/>' +
  '<rect x="21.6" y="6.2" width="2.6" height="1.6" rx="0.6" fill="#fff9b8"/>' +
  '<path d="M7 9.5 H4.5 C4.2 9.5 4 9.8 4 10.2 L4.2 12 C4.3 12.3 4.6 12.5 4.9 12.4 L7 11.6 Z" fill="currentColor"/>' +
  '<path d="M25 9.5 H27.5 C27.8 9.5 28 9.8 28 10.2 L27.8 12 C27.7 12.3 27.4 12.5 27.1 12.4 L25 11.6 Z" fill="currentColor"/>' +
  '<rect x="7.8" y="16" width="1.8" height="16" rx="0.7" fill="#080b11" stroke="currentColor" stroke-width="0.5"/>' +
  '<rect x="22.4" y="16" width="1.8" height="16" rx="0.7" fill="#080b11" stroke="currentColor" stroke-width="0.5"/>' +
  '<rect x="11.2" y="18" width="9.6" height="9.5" rx="1.8" fill="#181f2c" stroke="currentColor" stroke-width="0.8"/>' +
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
          node.classList.toggle(
            "is-estimated",
            "estimated" in sample && !!sample.estimated,
          );
          node.classList.toggle(
            "is-correcting",
            "correcting" in sample && !!sample.correcting,
          );
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
              stroke="#242a34"
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
        {props.scenario &&
          [props.scenario.closed, ...props.scenario.alternatives].map(
            (stop, index) => {
              const [x, y] = projection.project(stop.coordinate);
              return (
                <g
                  key={`scenario-${stop.id}`}
                  transform={`translate(${x} ${y})`}
                >
                  <title>{`${props.locale === "ms" ? "Senario hipotesis" : "Hypothetical scenario"}: ${stop.name}`}</title>
                  <circle
                    r="4"
                    fill={index === 0 ? "#ffc56b" : "#9ce8d5"}
                    stroke="#142b45"
                    strokeWidth=".5"
                  />
                  <text textAnchor="middle" y="1" fontSize="3" fill="#142b45">
                    {index === 0 ? "×" : index}
                  </text>
                </g>
              );
            },
          )}
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
                fill="#e7ebf2"
                stroke="#151b25"
                strokeWidth="0.3"
              />
              <text
                y="-1.7"
                textAnchor="middle"
                fill="#b6bcc5"
                fontSize="1.5"
                paintOrder="stroke"
                stroke="#10141a"
                strokeWidth="0.6"
              >
                {stop.name}
              </text>
            </g>
          );
        })}
        {[props.journeyFrom, props.journeyTo].map((stop, index) => {
          if (!stop) return null;
          const [x, y] = projection.project(stop.coordinate);
          const label = `${index === 0 ? "A" : "B"} · ${
            index === 0
              ? props.locale === "ms"
                ? "Dari"
                : "From"
              : props.locale === "ms"
                ? "Ke"
                : "To"
          }: ${stop.name}`;
          return (
            <g
              key={`endpoint-${index}`}
              transform={`translate(${x} ${y})`}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={(event) => {
                event.stopPropagation();
                props.onSelectStop?.(stop.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onSelectStop?.(stop.id);
                }
              }}
            >
              <circle
                r="1.3"
                fill={index === 0 ? "#38b992" : "#9bb5ff"}
                stroke="#fff"
                strokeWidth="0.3"
              />
              <text
                y="-2.5"
                textAnchor="middle"
                fontSize="2"
                fill="#fff"
                paintOrder="stroke"
                stroke="#10141a"
                strokeWidth="0.7"
              >
                {label}
              </text>
            </g>
          );
        })}
        {props.reports
          .filter((report) => report.status !== "resolved")
          .map((report) => {
            const [x, y] = projection.project(report.coordinate);
            return (
              <g
                key={report.id}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${report.title} · ${report.status}`}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onSelectReport?.(report);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    props.onSelectReport?.(report);
                  }
                }}
              >
                <circle r="1" fill="#f5b65a" />
                <text textAnchor="middle" y=".55" fontSize="1.7" fill="#14161a">
                  !
                </text>
              </g>
            );
          })}
        {props.vehicles.map((vehicle) => {
          const [x, y] = projection.project(vehicle.coordinate);
          const color =
            props.routes.find((route) => route.id === vehicle.routeId)?.color ??
            "#518bee";
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
                  fill="#0e131b"
                />
                <circle cx="-1.2" cy="-2.2" r=".3" fill="#fff9b8" />
                <circle cx="1.2" cy="-2.2" r=".3" fill="#fff9b8" />
                <rect
                  x="-.8"
                  y="-.2"
                  width="1.6"
                  height="1.4"
                  rx=".4"
                  fill="#0e131b"
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
                stroke="#10141a"
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
      {props.scenario && (
        <div className="gerak-scenario-legend" role="status">
          <strong>
            {props.locale === "ms"
              ? "SENARIO HIPOTESIS"
              : "HYPOTHETICAL SCENARIO"}
          </strong>
          <span>× {props.scenario.closed.name}</span>
          {props.scenario.alternatives.map((stop, index) => (
            <span key={stop.id}>
              {index + 1} · {stop.name}
            </span>
          ))}
          <span>
            {props.locale === "ms"
              ? "Bukan amaran perkhidmatan sebenar"
              : "Not a real service alert"}
          </span>
        </div>
      )}
      <div className="gerak-map-caption">
        {props.reason ?? "Offline route schematic"} · geographic routes,
        simplified base
      </div>
    </div>
  );
}

function FlatMap(props: TransportMapProps) {
  const previewLabel = useRef<HTMLButtonElement>(null);
  const previewVehicle = useRef<string | null>(null);
  useEffect(() => {
    previewVehicle.current = null;
  }, [props.region]);
  useEffect(() => {
    if (props.selectedVehicleId || props.focusLocation || props.picking)
      previewVehicle.current = null;
  }, [props.selectedVehicleId, props.focusLocation, props.picking]);
  const modeFocus = useRef<{ coordinate: Coordinate; bearing: number } | null>(
    null,
  );
  const container = useRef<HTMLDivElement>(null);
  const motionStatus = useRef<HTMLDivElement>(null);
  const lastFocus = useRef("");
  const [lightingChoice, setLighting] = useState<"day" | "dusk" | "night">(
    "night",
  );
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  useEffect(() => {
    const syncAppearance = () =>
      setLighting(
        document.documentElement.dataset.theme === "light" ? "day" : "night",
      );
    syncAppearance();
    const observer = new MutationObserver(syncAppearance);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  const lighting = lightingChoice;
  const [viewAngle] = useState<"right" | "left" | "front">("right");
  const angleRef = useRef(viewAngle);
  angleRef.current = viewAngle;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
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
        const isInitial3D = latest.current.mode === "3d";
        const instance = new maplibre.Map({
          container: container.current,
          center: REGION_CENTERS[latest.current.region],
          zoom:
            latest.current.region === "uthm" ||
            latest.current.region === "uthm-pagoh"
              ? 15
              : isInitial3D
                ? 16
                : 12.5,
          pitch: isInitial3D ? 58 : 0,
          bearing: isInitial3D ? -15 : 0,
          attributionControl: false,
          maxZoom: 22,
          minZoom: 3,
          maxPitch: 70,
          style: "https://tiles.openfreemap.org/styles/liberty",
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
              minzoom: 12,
              filter: ["!=", ["get", "hide_3d"], true],
              layout: {
                visibility: latest.current.mode === "3d" ? "visible" : "none",
              },
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], 6],
                  0,
                  "#c8c3b9",
                  15,
                  "#d6d1c7",
                  60,
                  "#e2ddd4",
                  160,
                  "#efeae0",
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
                "fill-color": "#c8c3b9",
                "fill-opacity": 0.24,
                "fill-outline-color": "#b9b3a9",
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
              layout: {
                visibility: latest.current.mode === "3d" ? "visible" : "none",
              },
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
                  previewVehicleId: previewVehicle.current,
                  lighting: lightingRef.current,
                  weatherCode: undefined,
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
          if (event.originalEvent) {
            previewVehicle.current = null;
            latest.current.onFollowChange?.(false);
          }
        });
        instance.on("click", (event) => {
          const trafficLayers = ["traffic-cameras", "traffic-signals"].filter(
            (id) => !!instance.getLayer(id),
          );
          if (
            !latest.current.picking &&
            trafficLayers.length &&
            instance.queryRenderedFeatures(event.point, {
              layers: trafficLayers,
            }).length
          )
            return;
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
            pausedCount = 0,
            correctingCount = 0;
          for (const [id, motion] of motions.current) {
            const marker = fleetMarkers.current.get(id);
            if (!marker) continue;
            const sample = sampleMotion(motion, now);
            if ("estimated" in sample && sample.estimated) estimatedCount++;
            if ("predictionPaused" in sample && sample.predictionPaused)
              pausedCount++;
            const correcting = "correcting" in sample && !!sample.correcting;
            if (correcting) correctingCount++;
            marker.element.classList.toggle(
              "is-estimated",
              "estimated" in sample && !!sample.estimated,
            );
            marker.element.classList.toggle("is-correcting", correcting);
            // Keep the pressed target still until pointer release, so moving
            // vehicles remain tappable while their geographic animation continues.
            if (!marker.element.matches(":active"))
              marker.marker.setLngLat(sample.coordinate);
            marker.element.style.display = !allowedRef.current.has(id)
              ? "none"
              : "";
            if (latest.current.mode !== "3d") {
              marker.icon.style.transform = `rotate(${sample.bearing - instance.getBearing()}deg)`;
            }
          }

          // Follow selected vehicle in 60fps lockstep without micro-stutter
          const previewId = !latest.current.selectedVehicleId
            ? previewVehicle.current
            : null;
          const selectedId = latest.current.selectedVehicleId ?? previewId;
          if ((latest.current.follow || previewId) && selectedId) {
            const motion = motions.current.get(selectedId);
            const vehicle = latest.current.vehicles.find(
              (v) => v.id === selectedId,
            );
            if (motion || vehicle) {
              const sample = motion ? sampleMotion(motion, now) : vehicle!;
              if (now < easingUntilRef.current || instance.isZooming()) {
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
                    (previewId
                      ? 70
                      : angleRef.current === "right"
                        ? -125
                        : angleRef.current === "left"
                          ? 125
                          : 180);
                  const headingDelta =
                    ((desiredAngle - instance.getBearing() + 540) % 360) - 180;
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

          const label = previewLabel.current;
          const labelVehicleId =
            latest.current.selectedVehicleId ?? previewVehicle.current;
          const preview =
            !latest.current.vehicleDetailsOpen && labelVehicleId
              ? latest.current.vehicles.find((v) => v.id === labelVehicleId)
              : undefined;
          if (label) {
            label.hidden = !preview;
            if (preview) {
              const motion = motions.current.get(preview.id);
              const sample = motion ? sampleMotion(motion, now) : preview;
              const point = instance.project(sample.coordinate);
              const route = latest.current.routes.find(
                (r) => r.id === preview.routeId,
              );
              const routeName =
                route?.name.split(/\s+\u00b7\s+/)[0] ?? preview.routeId;
              const title = `${routeName} · ${preview.licensePlate || preview.label}`;
              const hint =
                latest.current.locale === "ms"
                  ? "Lihat butiran"
                  : "View details";
              const text = `${title}  ›`;
              if (label.textContent !== text) label.textContent = text;
              label.setAttribute("aria-label", `${hint}: ${title}`);
              label.title = hint;
              // Match the model's zoom-dependent world scale, with a gentler
              // label response so its text stays useful at both extremes.
              const zoom = instance.getZoom();
              const is3d = latest.current.mode === "3d";
              const modelScale = Math.min(
                12,
                Math.max(2.4, 2 ** (16.5 - zoom)),
              );
              const relativeSize = is3d
                ? (2 ** (zoom - 16.8) * modelScale) / 2.4
                : 2 ** (zoom - 15.3);
              const labelScale = Math.min(
                1.45,
                Math.max(0.78, relativeSize ** 0.35),
              );
              label.style.setProperty("--label-scale", String(labelScale));
              label.style.left = `${point.x}px`;
              label.style.top = `${point.y - (is3d ? Math.min(160, Math.max(22, 38 * relativeSize ** 0.65)) : 24 * labelScale)}px`;
              label.hidden =
                point.x < 0 ||
                point.y < 0 ||
                point.x > instance.getCanvas().clientWidth ||
                point.y > instance.getCanvas().clientHeight;
            }
          }
          if (motionStatus.current && now - previousStatus > 500) {
            motionStatus.current.textContent =
              latest.current.vehicles.length > 0 &&
              latest.current.vehicles.every((v) => v.source === "simulator")
                ? "Simulated service · animated route movement"
                : pausedCount
                  ? `${pausedCount} position estimates paused · awaiting GPS`
                  : correctingCount
                    ? `${correctingCount} positions re-anchored to GPS · estimate held`
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
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            12,
            11,
            16,
            18,
          ],
          "line-opacity": 0.2,
          "line-blur": 6,
        },
      });
      instance.addLayer({
        id: "route-outline",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#060b13",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            3,
            12,
            4.8,
            15,
            6.5,
            18,
            8.5,
          ],
          "line-opacity": 0.85,
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
            1.8,
            12,
            3,
            15,
            4.2,
            18,
            6,
          ],
          "line-opacity": 0.9,
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
        ? ["case", ["==", ["get", "id"], selectedRoute], 1, 0.42]
        : 0.85,
    );
    instance.setPaintProperty(
      "route-glow",
      "line-opacity",
      selectedRoute
        ? ["case", ["==", ["get", "id"], selectedRoute], 0.35, 0.06]
        : 0.09,
    );
  }, [ready, props.selectedVehicleId, props.vehicles, props.routes]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || unavailable) return;
    const official = props.vehicles.filter(
      (vehicle) => vehicle.source === "gtfs-rt",
    );
    const fitKey = `${props.region}:${official.length ? "official" : "demo"}`;
    // A late feed refresh must not replace an explicitly chosen stop/report.
    if (props.focusLocation || props.journeyFrom || props.journeyTo) {
      regionAtFit.current = fitKey;
      return;
    }
    if (regionAtFit.current === fitKey) return;
    const bounds = createProjection(props.routes, props.region).bounds;
    // A regional official feed extends beyond the compact demo corridor. Frame
    // its actual observations once on source change, then preserve user panning.
    if (official.length) {
      const lngs = official.map((vehicle) => vehicle.coordinate[0]);
      const lats = official.map((vehicle) => vehicle.coordinate[1]);
      bounds[0] = [
        Math.min(bounds[0][0], ...lngs),
        Math.min(bounds[0][1], ...lats),
      ];
      bounds[1] = [
        Math.max(bounds[1][0], ...lngs),
        Math.max(bounds[1][1], ...lats),
      ];
    }
    const is3d = props.mode === "3d";
    // 3D opens at street-block scale; a nationwide fleet fit hides buildings.
    // Keep the explicit Overall action for viewing the entire service area.
    if (is3d) {
      if (
        !props.selectedVehicleId &&
        regionAtFit.current?.split(":")[0] !== props.region
      )
        instance.easeTo({
          center: REGION_CENTERS[props.region],
          zoom: 16,
          pitch: 58,
          bearing: -25,
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          duration: regionAtFit.current ? 1100 : 0,
        });
      regionAtFit.current = fitKey;
      return;
    }
    const compact = instance.getContainer().clientHeight < 500;
    instance.fitBounds(bounds, {
      padding: {
        top: compact ? 60 : 90,
        bottom: compact ? 65 : 100,
        left: compact ? 25 : 60,
        right: compact ? 25 : 60,
      },
      duration: regionAtFit.current ? 1000 : 0,
      pitch: is3d ? 45 : 0,
      bearing: is3d ? -15 : 0,
      maxZoom:
        props.region === "uthm" || props.region === "uthm-pagoh"
          ? 15.8
          : is3d
            ? 14.5
            : 13.8,
    });
    regionAtFit.current = fitKey;
  }, [
    ready,
    unavailable,
    props.routes,
    props.region,
    props.vehicles,
    props.mode,
  ]);

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
            "#518bee",
        );
        entry.element.style.zIndex =
          props.selectedVehicleId === vehicle.id ? "5" : "2";
        entry.element.style.display = "";
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
        "circle-color": "#c4cad3",
        "circle-stroke-color": "#171f2d",
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
        "text-color": "#c4cad3",
        "text-halo-color": "#101621",
        "text-halo-width": 1.5,
      },
    });
  }, [ready, unavailable, props.stops, boundary]);

  // Independent of the sampled stop layer: selected endpoints always stay visible.
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || unavailable) return;
    let cancelled = false;
    const markers: Marker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled) return;
      [props.journeyFrom, props.journeyTo].forEach((stop, index) => {
        if (!stop) return;
        const label =
          index === 0
            ? props.locale === "ms"
              ? "Dari"
              : "From"
            : props.locale === "ms"
              ? "Ke"
              : "To";
        const element = document.createElement("button");
        element.type = "button";
        element.className = `gerak-journey-marker ${index === 0 ? "from" : "to"}`;
        element.textContent = `${index === 0 ? "A" : "B"} · ${label}: ${stop.name}`;
        element.title = element.textContent;
        element.setAttribute("aria-label", element.textContent);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          props.onSelectStop?.(stop.id);
        });
        markers.push(
          new Marker({ element, anchor: "bottom" })
            .setLngLat(stop.coordinate)
            .addTo(instance),
        );
      });
    });
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [
    ready,
    unavailable,
    props.journeyFrom,
    props.journeyTo,
    props.locale,
    props.onSelectStop,
  ]);

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
          const element = document.createElement("button");
          element.type = "button";
          element.className = `gerak-report-marker ${report.status === "in-progress" ? "in-progress" : ""}`;
          element.textContent = "!";
          element.title = `${report.title} · ${report.status}`;
          element.setAttribute("aria-label", element.title);
          element.addEventListener("click", (event) => {
            event.stopPropagation();
            props.onSelectReport?.(report);
          });
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
  }, [ready, unavailable, props.stops, props.reports, props.onSelectReport]);

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
    if (instance.getLayer("gerak-buildings-2d"))
      instance.setLayoutProperty(
        "gerak-buildings-2d",
        "visibility",
        is3d ? "none" : "visible",
      );
    if (instance.getLayer("johor-buildings-3d"))
      instance.setLayoutProperty(
        "johor-buildings-3d",
        "visibility",
        is3d ? "visible" : "none",
      );
    if (instance.getLayer("bus-models-3d"))
      instance.setLayoutProperty(
        "bus-models-3d",
        "visibility",
        is3d ? "visible" : "none",
      );
    const selected = latest.current.vehicles.find(
      (v) => v.id === latest.current.selectedVehicleId,
    );
    const focus = modeFocus.current;
    modeFocus.current = null;
    if (focus) easingUntilRef.current = performance.now() + 1100;
    instance.easeTo({
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      pitch: is3d ? 58 : 0,
      bearing: is3d ? -25 : 0,
      duration: 1100,
      ...(focus
        ? {
            center: focus.coordinate,
            zoom: is3d ? 16.8 : 15.3,
            bearing: is3d ? focus.bearing + 70 : 0,
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 1000,
          }
        : is3d
          ? {
              center:
                selected?.coordinate ??
                (instance.getZoom() < 14
                  ? REGION_CENTERS[props.region]
                  : instance.getCenter()),
              zoom: Math.max(instance.getZoom(), 16),
            }
          : {}),
    });
  }, [ready, unavailable, props.mode, props.region]);

  useEffect(() => {
    if (!ready) return;
    if (!props.selectedVehicleId) {
      // setPadding stops an active camera transition, even for unchanged values.
      // Only reset a previous vehicle framing; leave 3D entry animation running.
      const padding = map.current?.getPadding();
      if (
        lastFocus.current &&
        padding &&
        Object.values(padding).some((value) => value !== 0)
      )
        map.current?.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      lastFocus.current = "";
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
        // Reserve the details card's space so the ride remains in the clear.
        padding:
          window.innerWidth <= 960
            ? { top: 90, left: 0, right: 0, bottom: 260 }
            : { top: 90, left: 0, right: 340, bottom: 70 },
        zoom: props.mode === "3d" ? 18.35 : Math.max(map.current.getZoom(), 16),
        pitch: props.mode === "3d" ? 64 : 0,
        ...(props.mode === "3d"
          ? {
              bearing:
                sample.bearing +
                (viewAngle === "right"
                  ? -125
                  : viewAngle === "left"
                    ? 125
                    : 180),
            }
          : {}),
        duration: 800,
      });
    }
    // GPS updates are followed by the interpolation loop, not by restarting camera transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.follow, props.selectedVehicleId, props.mode, viewAngle]);

  useEffect(() => {
    const instance = map.current;
    const focus = props.focusLocation;
    const element = container.current;
    if (!ready || unavailable || !instance || !element || !focus) return;
    if (
      !focus.coordinate.every(Number.isFinite) ||
      Math.abs(focus.coordinate[0]) > 180 ||
      Math.abs(focus.coordinate[1]) > 90
    )
      return;

    latest.current.onFollowChange?.(false);
    let applied = false;
    let frame = 0;
    const revealLocation = () => {
      if (applied || !element.clientWidth || !element.clientHeight) return;
      applied = true;
      observer.disconnect();
      instance.resize();
      const compact = window.matchMedia("(max-width: 960px)").matches;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const is3d = latest.current.mode === "3d";
      const height = element.clientHeight;
      const width = element.clientWidth;
      instance.easeTo({
        center: focus.coordinate,
        zoom: is3d ? 17 : 16,
        pitch: is3d ? 50 : 0,
        bearing: is3d ? -25 : 0,
        // Leave the location visible above/beside the detail sheet.
        padding: compact
          ? {
              top: 60,
              bottom: Math.min(250, height * 0.38),
              left: 20,
              right: 20,
            }
          : {
              top: 70,
              bottom: 60,
              left: 30,
              right: Math.min(350, width * 0.4),
            },
        duration: reducedMotion ? 0 : 750,
      });
    };
    // A mobile map can still be display:none when the selection is dispatched.
    // Wait for measurable dimensions instead of framing a zero-sized canvas.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(revealLocation);
    });
    observer.observe(element);
    frame = requestAnimationFrame(revealLocation);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ready, unavailable, props.focusLocation]);

  const journeyFrame = useRef("");
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || unavailable) return;
    const points = [props.journeyFrom, props.journeyTo].flatMap((stop) =>
      stop ? [stop.coordinate] : [],
    );
    const key = JSON.stringify(points);
    if (journeyFrame.current === key) return;
    journeyFrame.current = key;
    if (!points.length) return;
    const lngs = points.map((point) => point[0]);
    const lats = points.map((point) => point[1]);
    instance.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 110, bottom: 85, left: 70, right: 70 },
        maxZoom: 16,
        duration: 800,
      },
    );
  }, [ready, unavailable, props.journeyFrom, props.journeyTo]);

  useEffect(() => {
    if (ready && map.current?.getLayer("transit-stop-names"))
      map.current.setLayoutProperty(
        "transit-stop-names",
        "visibility",
        props.mode === "3d" && props.follow ? "none" : "visible",
      );
  }, [ready, props.mode, props.follow, props.stops, boundary]);

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
    // Keep the geographic road palette independent of the app chrome theme.
    if (map.current.getLayer("my-mask"))
      map.current.setPaintProperty("my-mask", "fill-color", "#dce5de");
    map.current.setLight({
      anchor: "map",
      color: "#fff8ed",
      intensity: 0.45,
      position: [1.5, 210, 38],
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

  const handleOverall = () => {
    previewVehicle.current = null;
    props.onOverview?.();
    const is3d = props.mode === "3d";
    const points = [
      ...props.routes.flatMap((r) => r.path),
      ...props.vehicles.map((v) => v.coordinate),
    ];
    let bounds: [Coordinate, Coordinate];
    if (points.length > 0) {
      const lngs = points.map((p) => p[0]);
      const lats = points.map((p) => p[1]);
      bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
    } else {
      bounds = createProjection(props.routes, props.region).bounds;
    }
    const compact = map.current?.getContainer().clientHeight
      ? map.current.getContainer().clientHeight < 500
      : false;
    map.current?.fitBounds(bounds, {
      padding: {
        top: compact ? 60 : 80,
        bottom: compact ? 65 : 90,
        left: compact ? 30 : 60,
        right: compact ? 30 : 60,
      },
      pitch: is3d ? 45 : 0,
      bearing: is3d ? -15 : 0,
      duration: 900,
      maxZoom:
        props.region === "uthm" || props.region === "uthm-pagoh"
          ? 15.8
          : is3d
            ? 14.5
            : 13.5,
    });
  };

  useEffect(() => {
    const onTrigger = () => handleOverall();
    window.addEventListener("gerak:overview", onTrigger);
    return () => window.removeEventListener("gerak:overview", onTrigger);
  }, [props.routes, props.vehicles, props.region, props.mode]);

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
        <ScenarioMarkers
          map={map.current}
          scenario={props.scenario}
          locale={props.locale}
        />
      )}
      {ready && map.current && (
        <TrafficLayers
          map={map.current}
          locale={props.locale}
          region={props.region}
          picking={props.picking}
          onInspect={() => props.onFollowChange?.(false)}
          onReport={props.onTrafficReport}
        />
      )}
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
      <button
        ref={previewLabel}
        hidden
        type="button"
        className="gerak-follow-label"
        onClick={() => {
          const id = props.selectedVehicleId ?? previewVehicle.current;
          if (id) (props.onOpenVehicleDetails ?? props.onSelectVehicle)(id);
        }}
      />
      <MapWeather region={props.region} onWeather={setWeather} />
      {ready && map.current && (
        <SatelliteControl map={map.current} locale={props.locale} />
      )}
      <div className="gerak-map-navigation" aria-label="Map controls">
        <div className="gerak-mode-buttons" role="group" aria-label="Map mode">
          {(["2d", "3d"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-label={mode.toUpperCase()}
              aria-pressed={props.mode === mode}
              onClick={() => {
                const instance = map.current;
                if (!instance) return;
                const center = instance.getCenter();
                const candidates = props.vehicles
                  .map((vehicle) => {
                    const motion = motions.current.get(vehicle.id);
                    return {
                      ...(motion
                        ? sampleMotion(motion, performance.now())
                        : vehicle),
                      id: vehicle.id,
                    };
                  })
                  .filter((v) => v.coordinate.every(Number.isFinite));
                const nearby = candidates.filter((v) =>
                  instance.getBounds().contains(v.coordinate),
                );
                const closest = (nearby.length ? nearby : candidates).sort(
                  (a, b) =>
                    distance([center.lng, center.lat], a.coordinate) -
                    distance([center.lng, center.lat], b.coordinate),
                )[0];
                modeFocus.current = closest ?? null;
                previewVehicle.current = closest?.id ?? null;
                props.onModeChange?.(mode);
                if (props.mode === mode && closest) {
                  modeFocus.current = null;
                  easingUntilRef.current = performance.now() + 1100;
                  instance.easeTo({
                    center: closest.coordinate,
                    zoom: mode === "3d" ? 16.8 : 15.3,
                    pitch: mode === "3d" ? 58 : 0,
                    bearing: mode === "3d" ? closest.bearing + 70 : 0,
                    duration: matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                      ? 0
                      : 1000,
                  });
                }
              }}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
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
        <button
          type="button"
          className="gerak-overall-button"
          title="Overall network view (all routes & buses)"
          aria-label="Overall network view"
          onClick={handleOverall}
        >
          <Maximize2 size={16} />
        </button>

        <button
          type="button"
          title="Recenter map"
          aria-label="Recenter map"
          onClick={() => {
            previewVehicle.current = null;
            const is3d = props.mode === "3d";
            const projection = createProjection(props.routes, props.region);
            map.current?.fitBounds(projection.bounds, {
              padding: 100,
              duration: 700,
              pitch: is3d ? 50 : 0,
              bearing: is3d ? -15 : 0,
              maxZoom:
                props.region === "uthm" || props.region === "uthm-pagoh"
                  ? 15.8
                  : is3d
                    ? 14.5
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
