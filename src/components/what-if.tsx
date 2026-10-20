"use client";

import { useEffect, useMemo, useState } from "react";
import type { TransportMapProps } from "./map-types";
import { compareStopClosure } from "@/lib/what-if";
import {
  estimateJourney,
  formatFare,
  type PassengerProfile,
} from "@/lib/fares";
import type { Journey } from "@/lib/transit";
import type { Coordinate, Locale, Stop, TransitRoute } from "@/lib/types";
import styles from "./report-demo.module.css";

export function WhatIf({
  from,
  to,
  routes,
  stops,
  accessible,
  locale,
  profile,
  onLocate,
  onScenario,
}: {
  from: string;
  to: string;
  routes: TransitRoute[];
  stops: Stop[];
  accessible: boolean;
  locale: Locale;
  profile: PassengerProfile;
  onLocate: (coordinate: Coordinate) => void;
  onScenario: (scenario: TransportMapProps["scenario"]) => void;
}) {
  const [selection, setSelection] = useState("");
  const [applied, setApplied] = useState(false);
  const tr = (en: string, ms: string) => (locale === "ms" ? ms : en);
  const closed = stops.some((s) => s.id === selection) ? selection : from;
  const result = useMemo(
    () => compareStopClosure(from, to, closed, routes, stops, accessible),
    [from, to, closed, routes, stops, accessible],
  );
  useEffect(() => {
    const stop = stops.find((item) => item.id === closed);
    onScenario(
      applied && stop && result.baseline.length
        ? {
            closed: stop,
            alternatives: result.alternatives.map((item) => item.stop),
          }
        : null,
    );
    return () => onScenario(null);
  }, [applied, closed, stops, result, onScenario]);
  const name = (id: string) => stops.find((s) => s.id === id)?.name ?? id;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  function connection(journey: Journey, origin: string, index: number) {
    const fare = estimateJourney(journey, origin, to, stops, profile, date);
    return (
      <div className={styles.context} key={`${origin}-${index}`}>
        <strong>{journey.routes.map((route) => route.name).join(" → ")}</strong>
        <span>
          {journey.transfers
            ? tr("1 transfer", "1 pertukaran")
            : tr("Direct connection", "Sambungan terus")}
          {journey.via.length ? ` · ${journey.via.map(name).join(", ")}` : ""}
        </span>
        <span>
          {tr("Estimated fare", "Anggaran tambang")}:{" "}
          {fare.totalSen === null
            ? tr("Unavailable", "Tidak tersedia")
            : formatFare(fare.totalSen)}
        </span>
      </div>
    );
  }
  if (!from || !to || from === to || !result.baseline.length) return null;
  return (
    <details className={styles.panel}>
      <summary>
        <strong>
          {tr(
            "GERAK What If? · Test a stop closure",
            "GERAK Bagaimana Jika? · Uji penutupan hentian",
          )}
        </strong>
      </summary>
      <p className={styles.disclaimer}>
        {tr(
          "HYPOTHETICAL SCENARIO · No live service changes. Buses may pass the closed stop, but passengers cannot board, alight or transfer there.",
          "SENARIO HIPOTESIS · Tiada perubahan perkhidmatan sebenar. Bas boleh melalui hentian yang ditutup, tetapi penumpang tidak boleh naik, turun atau bertukar di situ.",
        )}
      </p>
      <label className={styles.label}>
        {tr("Temporarily close this stop", "Tutup hentian ini buat sementara")}
        <select
          value={closed}
          onChange={(e) => {
            setSelection(e.target.value);
            setApplied(false);
          }}
        >
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setApplied(true);
            const stop = stops.find((s) => s.id === closed);
            if (stop) onLocate(stop.coordinate);
          }}
        >
          {tr("Apply scenario", "Gunakan senario")}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setApplied(false)}
          disabled={!applied}
        >
          {tr("Reset", "Set semula")}
        </button>
      </div>
      <h3>{tr("Before", "Sebelum")}</h3>
      {result.baseline.map((journey, index) =>
        connection(journey, from, index),
      )}
      {applied && (
        <div
          role="region"
          aria-label={tr("Scenario result", "Keputusan senario")}
          aria-live="polite"
        >
          <h3>
            {tr("After", "Selepas")}: {name(closed)}
          </h3>
          <p>
            {result.after.length
              ? tr(
                  "A connection remains available in this model.",
                  "Sambungan masih tersedia dalam model ini.",
                )
              : tr(
                  "No connection found from the selected boarding stop.",
                  "Tiada sambungan ditemui dari hentian menaiki bas yang dipilih.",
                )}
          </p>
          {result.after.map((journey, index) =>
            connection(journey, from, index),
          )}
          {!result.after.length && (
            <h4>
              {tr(
                "Explore another boarding stop",
                "Terokai hentian menaiki bas lain",
              )}
            </h4>
          )}
          {result.alternatives.map(({ stop, metres, journeys }) => (
            <div key={stop.id}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onLocate(stop.coordinate)}
              >
                {stop.name} · {Math.round(metres)} m
              </button>
              {connection(journeys[0], stop.id, 0)}
            </div>
          ))}
          {!result.after.length && !result.alternatives.length && (
            <p>
              {closed === to
                ? tr(
                    "The destination stop is closed. Select another destination in the planner.",
                    "Hentian destinasi ditutup. Pilih destinasi lain dalam perancang.",
                  )
                : tr(
                    "No alternative found among the 20 nearest candidate stops within 1 km.",
                    "Tiada alternatif ditemui antara 20 calon hentian terdekat dalam 1 km.",
                  )}
            </p>
          )}
        </div>
      )}
      <p className={styles.disclaimer}>
        {tr(
          "Connections only, up to one transfer. Service dates and departure times are not checked. Distances are straight-line, not walking directions or verified safe access. Fares use your selected passenger profile.",
          "Sambungan sahaja, sehingga satu pertukaran. Tarikh perkhidmatan dan waktu berlepas tidak disemak. Jarak ialah garis lurus, bukan panduan berjalan atau akses selamat yang disahkan. Tambang menggunakan profil penumpang pilihan anda.",
        )}
      </p>
    </details>
  );
}
