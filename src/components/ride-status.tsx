"use client";
import { useEffect, useState } from "react";
import type { Stop, TransitRoute, Vehicle } from "@/lib/types";
import { etaForVehicle } from "@/lib/transit";
import { projectToRoute } from "./map-motion";
export function RideStatus({
  vehicle,
  route,
  stops,
}: {
  vehicle: Vehicle;
  route?: TransitRoute;
  stops: Stop[];
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const age = Math.max(0, Math.floor((now - vehicle.timestamp) / 1000));
  const position = route
    ? projectToRoute(
        route.path,
        vehicle.coordinate,
        vehicle.bearingKnown === false ? undefined : vehicle.bearing,
      )
    : null;
  const onRoute = position && position.distance < 80;
  const reverse =
    position &&
    vehicle.bearingKnown !== false &&
    Math.abs(((vehicle.bearing - position.bearing + 540) % 360) - 180) > 90;
  const next =
    route && onRoute
      ? route.stops
          .map((id) => stops.find((stop) => stop.id === id))
          .filter((stop): stop is Stop => !!stop)
          .map((stop) => {
            const projection = projectToRoute(route.path, stop.coordinate);
            return {
              stop,
              distance: projection.distance,
              progress:
                (projection.progress - position.progress) * (reverse ? -1 : 1),
            };
          })
          .filter((stop) => stop.distance < 120 && stop.progress > 0.0001)
          .sort((a, b) => a.progress - b.progress)[0]?.stop
      : undefined;
  const demoNext =
    vehicle.source === "simulator" && route
      ? route.stops
          .map((id) => ({
            stop: stops.find((s) => s.id === id),
            eta: etaForVehicle(vehicle, id),
          }))
          .filter((s) => s.stop && s.eta !== null)
          .sort((a, b) => a.eta! - b.eta!)[0]?.stop
      : undefined;
  const label =
    vehicle.source === "simulator"
      ? "Simulated service"
      : age > 180
        ? "Stale GPS · movement paused"
        : onRoute && vehicle.speed > 0 && age > 5
          ? "Route-estimated movement"
          : "GPS observation";
  return (
    <div className="ride-status">
      <strong>{label}</strong>
      <span>
        Last GPS fix: {age < 60 ? `${age}s` : `${Math.floor(age / 60)} min`} ago
        ·{" "}
        {new Date(vehicle.timestamp).toLocaleTimeString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        MYT
      </span>
      <div>
        <small>Next stop · route estimate</small>
        <b>{demoNext?.name ?? next?.name ?? "Not confirmed"}</b>
        <span>
          {vehicle.source === "simulator"
            ? "Demo journey estimates below"
            : "Arrival time unavailable · no live ETA supplied"}
        </span>
      </div>
    </div>
  );
}
