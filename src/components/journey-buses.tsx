"use client";

import { ArrowRight } from "lucide-react";
import type { Locale, TransitRoute, Vehicle } from "@/lib/types";
import { VehiclePicker } from "./vehicle-picker";

export function JourneyBuses({
  routes,
  vehicles,
  locale,
  selectedId,
  onSelect,
  onRoute,
}: {
  routes: TransitRoute[];
  vehicles: Vehicle[];
  locale: Locale;
  selectedId: string | null;
  onSelect: (id: string, routeId: string) => void;
  onRoute: (routeId: string) => void;
}) {
  const tr = (en: string, ms: string) => (locale === "ms" ? ms : en);
  return (
    <div className="journey-buses">
      <p className="fineprint">
        {tr(
          "Vehicles reporting on these routes. Arrival times and travel direction are not confirmed. Select a vehicle to view its location and route.",
          "Kenderaan yang melapor pada laluan ini. Masa ketibaan dan arah perjalanan belum disahkan. Pilih kenderaan untuk lihat lokasi dan laluannya.",
        )}
      </p>
      {routes.map((route, index) => (
        <section key={route.id} aria-label={route.name}>
          <div className="journey-bus-route">
            <div>
              {routes.length > 1 && (
                <small>
                  {tr("Leg", "Bahagian")} {index + 1}
                </small>
              )}
              <strong>{route.name}</strong>
              <span>{route.destination}</span>
            </div>
            <button type="button" onClick={() => onRoute(route.id)}>
              {tr("View route", "Lihat laluan")} <ArrowRight size={14} />
            </button>
          </div>
          <VehiclePicker
            vehicles={vehicles.filter(
              (vehicle) => vehicle.routeId === route.id,
            )}
            routes={[route]}
            selectedId={selectedId}
            filter={route.id}
            search=""
            locale={locale}
            onSelect={(id) => onSelect(id, route.id)}
            onFilter={() => {}}
            compact
          />
        </section>
      ))}
    </div>
  );
}
