"use client";

import { useEffect, useState } from "react";
import { BusFront, ChevronRight, TrainFront } from "lucide-react";
import type { TransitRoute, Vehicle } from "@/lib/types";

export function VehiclePicker({
  vehicles,
  routes,
  selectedId,
  filter,
  search,
  locale,
  onSelect,
  onFilter,
  compact = false,
}: {
  compact?: boolean;
  vehicles: Vehicle[];
  routes: TransitRoute[];
  selectedId: string | null;
  filter: string | null;
  search: string;
  locale: string;
  onSelect: (id: string) => void;
  onFilter: (id: string | null) => void;
}) {
  const tr = (en: string, ms: string) => (locale === "ms" ? ms : en);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const query = search.trim().toLowerCase();
  const matches = vehicles
    .filter((v) => {
      const route = routes.find((r) => r.id === v.routeId);
      return (
        (!filter || v.routeId === filter) &&
        `${v.label} ${v.licensePlate ?? ""} ${v.routeId} ${route?.name ?? ""} ${route?.destination ?? ""}`
          .toLowerCase()
          .includes(query)
      );
    })
    .sort(
      (a, b) =>
        (a.licensePlate || a.label).localeCompare(
          b.licensePlate || b.label,
          undefined,
          { numeric: true },
        ) || a.id.localeCompare(b.id),
    );
  return (
    <section
      className="vehicle-picker"
      aria-label={tr("Choose a vehicle", "Pilih kenderaan")}
    >
      <div className="vehicle-picker-heading">
        <div>
          <h2>{tr("Find your bus", "Cari bas anda")}</h2>
          <p>
            {tr(
              "Select a plate to see it on the map",
              "Pilih nombor plat untuk lihat di peta",
            )}
          </p>
        </div>
        <span>{matches.length}</span>
      </div>
      {!compact && (
        <label className="vehicle-picker-filter">
          <span>{tr("Route", "Laluan")}</span>
          <select
            aria-label={tr(
              "Filter vehicles by route",
              "Tapis kenderaan mengikut laluan",
            )}
            value={filter ?? ""}
            onChange={(e) => onFilter(e.target.value || null)}
          >
            <option value="">{tr("All routes", "Semua laluan")}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div
        className="vehicle-picker-list"
        tabIndex={0}
        aria-label={tr("Available vehicles", "Kenderaan tersedia")}
      >
        {matches.map((v) => {
          const route = routes.find((r) => r.id === v.routeId);
          const stale = now - v.timestamp > 120000;
          const status =
            v.source === "simulator"
              ? tr("Demo", "Demo")
              : stale
                ? tr("Older GPS", "GPS lama")
                : tr("Recent GPS", "GPS terkini");
          const Icon = v.vehicleKind === "rail" ? TrainFront : BusFront;
          return (
            <button
              key={v.id}
              className="vehicle-picker-row"
              aria-pressed={selectedId === v.id}
              aria-label={`${tr("Select", "Pilih")} ${v.licensePlate || v.label}, ${v.routeId}`}
              onClick={() => onSelect(v.id)}
              style={
                {
                  "--vehicle-color": route?.color || "#7aa6f2",
                } as React.CSSProperties
              }
            >
              <span className="vehicle-picker-icon">
                <Icon size={19} />
              </span>
              <span className="vehicle-picker-copy">
                <strong>{v.licensePlate || v.label}</strong>
                <span title={route?.name || v.routeId}>
                  {route?.name || v.routeId}
                </span>
                <small>
                  {status}
                  {v.speedKnown !== false
                    ? ` · ${Math.round(v.speed)} km/h`
                    : ""}
                </small>
              </span>
              <span className="vehicle-picker-action">
                {selectedId === v.id ? (
                  tr("Selected", "Dipilih")
                ) : (
                  <ChevronRight size={17} />
                )}
              </span>
            </button>
          );
        })}
        {!matches.length && (
          <p className="vehicle-picker-empty">
            {vehicles.length === 0
              ? tr(
                  "No vehicle positions available right now. You can still browse routes and stops.",
                  "Kedudukan kenderaan belum tersedia. Anda masih boleh melihat laluan dan hentian.",
                )
              : tr(
                  "No vehicles match. Try another plate or choose All routes.",
                  "Tiada kenderaan sepadan. Cuba plat lain atau pilih Semua laluan.",
                )}
          </p>
        )}
      </div>
    </section>
  );
}
