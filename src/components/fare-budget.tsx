"use client";
import { useEffect, useState } from "react";
import { BookmarkPlus, Wallet, Trash2 } from "lucide-react";
import type { Locale, Stop, TransitRoute } from "@/lib/types";
import type { Journey } from "@/lib/transit";
import {
  defaultProfile,
  estimateJourney,
  fareConfig,
  formatFare,
  type PassengerProfile,
} from "@/lib/fares";
import {
  budgetSchema,
  calculateBudget,
  comparePass,
  type PricedOccurrence,
  type TransportBudget,
} from "@/lib/transport-budget";
import {
  BUDGET_KEY,
  PROFILE_KEY,
  restoreBudget,
  restoreProfile,
} from "@/lib/fare-preferences";
import { ft, type FareCopyKey, fareCopy } from "@/lib/fare-copy";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function useFarePreferences() {
  const [profile, setProfile] = useState<PassengerProfile>(defaultProfile);
  const [budget, setBudget] = useState<TransportBudget>(() =>
    restoreBudget(null, today().slice(0, 7)),
  );
  const [storageError, setStorageError] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setProfile(restoreProfile(localStorage.getItem(PROFILE_KEY)));
      setBudget(
        restoreBudget(localStorage.getItem(BUDGET_KEY), today().slice(0, 7)),
      );
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  function saveProfile(value: PassengerProfile) {
    setProfile(value);
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ schemaVersion: 1, profile: value }),
      );
    } catch {
      setStorageError(true);
    }
  }
  function saveBudget(value: TransportBudget) {
    const result = budgetSchema.safeParse(value);
    if (!result.success) return;
    setBudget(result.data);
    try {
      localStorage.setItem(BUDGET_KEY, JSON.stringify(result.data));
    } catch {
      setStorageError(true);
    }
  }
  return { profile, budget, saveProfile, saveBudget, storageError, ready };
}
export function FareDisclaimer({ locale }: { locale: Locale }) {
  return (
    <p className="fare-disclaimer">
      {ft(locale, "disclaimer")}{" "}
      <a href="https://bas.my" target="_blank" rel="noreferrer">
        BAS.MY ↗
      </a>
    </p>
  );
}
export function PassengerSelector({
  profile,
  onChange,
  locale,
}: {
  profile: PassengerProfile;
  onChange: (p: PassengerProfile) => void;
  locale: Locale;
}) {
  return (
    <details className="fare-profile">
      <summary>
        {ft(locale, "profile")} · {ft(locale, profile.category)}
      </summary>
      <div className="fare-form">
        <label>
          {ft(locale, "citizenship")}
          <select
            value={profile.citizenship}
            onChange={(e) =>
              onChange({
                ...profile,
                citizenship: e.target.value as PassengerProfile["citizenship"],
                cardActiveConfirmed: false,
              })
            }
          >
            {(["unknown", "malaysian", "foreigner"] as const).map((v) => (
              <option key={v} value={v}>
                {ft(locale, v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ft(locale, "category")}
          <select
            value={profile.category}
            onChange={(e) =>
              onChange({
                ...profile,
                category: e.target.value as PassengerProfile["category"],
                concessionConfirmed: false,
                cardActiveConfirmed: false,
              })
            }
          >
            {(
              [
                "adult",
                "uniformed_student",
                "senior_over_60",
                "oku",
                "university_student",
              ] as const
            ).map((v) => (
              <option key={v} value={v}>
                {ft(locale, v)}
              </option>
            ))}
          </select>
        </label>
        {["uniformed_student", "senior_over_60", "oku"].includes(
          profile.category,
        ) && (
          <label className="fare-check">
            <input
              type="checkbox"
              checked={profile.concessionConfirmed}
              onChange={(e) =>
                onChange({ ...profile, concessionConfirmed: e.target.checked })
              }
            />
            {ft(locale, "half")}
          </label>
        )}
        {profile.category !== "adult" &&
          profile.citizenship === "malaysian" && (
            <>
              <label className="fare-check">
                <input
                  type="checkbox"
                  checked={profile.card === "basmy_concession"}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      card: e.target.checked ? "basmy_concession" : "none",
                      cardActiveConfirmed: false,
                    })
                  }
                />
                {ft(locale, "card")}
              </label>
              {profile.card === "basmy_concession" && (
                <label className="fare-check">
                  <input
                    type="checkbox"
                    checked={profile.cardActiveConfirmed}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        cardActiveConfirmed: e.target.checked,
                      })
                    }
                  />
                  {ft(locale, "active")}
                </label>
              )}
            </>
          )}
        <small>{ft(locale, "local")}</small>
      </div>
    </details>
  );
}
export function JourneyFare({
  journey,
  from,
  to,
  stops,
  profile,
  locale,
  onAdd,
}: {
  journey: Journey;
  from: string;
  to: string;
  stops: Stop[];
  profile: PassengerProfile;
  locale: Locale;
  onAdd: () => void;
}) {
  const result = estimateJourney(journey, from, to, stops, profile, today());
  return (
    <section className="journey-fare">
      <div className="fare-total">
        <span>{ft(locale, result.totalSen === null ? "known" : "total")}</span>
        <strong>
          {result.legs.some((l) => l.fare.fareSen !== null)
            ? formatFare(result.knownSen)
            : "—"}
        </strong>
      </div>
      {result.legs.map(({ leg, fare }, i) => (
        <details key={i} className="fare-leg">
          <summary>
            {leg.route.operator} ·{" "}
            {fare.fareSen === null
              ? ft(locale, "unavailable")
              : formatFare(fare.fareSen)}
          </summary>
          <p>
            {stops.find((s) => s.id === leg.fromStopId)?.name ?? leg.fromStopId}{" "}
            → {stops.find((s) => s.id === leg.toStopId)?.name ?? leg.toStopId}
          </p>
          <p>
            {ft(locale, profile.category)} ·{" "}
            {fare.status === "estimated"
              ? ft(
                  locale,
                  fare.rule === "concession"
                    ? "concession"
                    : fare.rule === "route_override"
                      ? "route_override"
                      : "rules",
                )
              : ft(
                  locale,
                  fare.reason in fareCopy
                    ? (fare.reason as FareCopyKey)
                    : "distance",
                )}
          </p>
          {fare.distance.metres !== null && (
            <p>
              {(fare.distance.metres / 1000).toFixed(2)} km ·{" "}
              {fare.distance.method}
            </p>
          )}
          {fare.rule === "distance_formula" && (
            <p>
              {formatFare(fare.baseSen ?? 0)} + {fare.billedExtraKm} × RM0.094
            </p>
          )}
          {fare.sourceUrl && (
            <a href={fare.sourceUrl} target="_blank" rel="noreferrer">
              {ft(locale, "source")} ↗
            </a>
          )}
        </details>
      ))}
      <button type="button" className="fare-action" onClick={onAdd}>
        <BookmarkPlus size={15} />
        {ft(locale, "add")}
      </button>
      <FareDisclaimer locale={locale} />
    </section>
  );
}
export function BudgetPanel({
  budget,
  profile,
  onChange,
  onProfile,
  locale,
  routes,
  stops,
  storageError,
}: {
  budget: TransportBudget;
  profile: PassengerProfile;
  onChange: (b: TransportBudget) => void;
  onProfile: (p: PassengerProfile) => void;
  locale: Locale;
  routes: TransitRoute[];
  stops: Stop[];
  storageError: boolean;
}) {
  const [networks, setNetworks] = useState<{
    routes: TransitRoute[];
    stops: Stop[];
  }>({ routes: [], stops: [] });
  const [loading, setLoading] = useState(false);
  const [activationDay, setActivationDay] = useState(1);
  const [dateError, setDateError] = useState(false);
  const regions = [...new Set(budget.recurringTrips.map((t) => t.region))]
    .sort()
    .join(",");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void Promise.all(
      regions
        .split(",")
        .filter(Boolean)
        .map(async (region) => {
          try {
            const r = await fetch(
              `/api/network?region=${encodeURIComponent(region)}`,
              { signal: controller.signal },
            );
            if (!r.ok) return null;
            const n = await r.json();
            return Array.isArray(n.routes) && Array.isArray(n.stops) ? n : null;
          } catch {
            return null;
          }
        }),
    ).then((ns) => {
      if (controller.signal.aborted) return;
      setNetworks({
        routes: ns.flatMap((n) => n?.routes ?? []),
        stops: ns.flatMap((n) => n?.stops ?? []),
      });
      setLoading(false);
    });
    return () => controller.abort();
  }, [regions]);
  const allRoutes = [
    ...new Map(
      [...routes, ...networks.routes].map((r) => [`${r.region}:${r.id}`, r]),
    ).values(),
  ];
  const allStops = [
    ...new Map(
      [...stops, ...networks.stops].map((s) => [`${s.region}:${s.id}`, s]),
    ).values(),
  ];
  const result = calculateBudget(
    budget,
    allRoutes,
    allStops,
    profile,
    `${budget.month}-01`,
  );
  const candidates = [...new Set(budget.recurringTrips.map((t) => t.region))]
    .map(fareConfig)
    .filter((c) => c !== null);
  const events: PricedOccurrence[] = [];
  const datesComplete =
    result.items.length > 0 &&
    result.items.every((item) => {
      const days = item.trip.serviceDays;
      if (
        !days ||
        days.length !== item.trip.days ||
        new Set(days).size !== days.length ||
        item.totalSen === null
      )
        return false;
      for (const day of days)
        for (let i = 0; i < item.trip.tripsPerDay; i++) {
          for (const estimate of [item.outbound, item.inbound])
            if (estimate)
              for (const { leg, fare } of estimate.legs)
                events.push({
                  day,
                  region: leg.route.region,
                  fareSen: fare.fareSen,
                  journeyId: `${item.trip.id}:${day}:${i}:${estimate === item.outbound ? "out" : "in"}`,
                });
        }
      return true;
    });
  const comparisons = datesComplete
    ? candidates
        .map((c) => ({
          region: c.region,
          result: comparePass(events, c, profile, activationDay),
        }))
        .filter((c) => c.result !== null)
    : [];
  const update = (
    id: string,
    patch: Partial<TransportBudget["recurringTrips"][number]>,
  ) =>
    onChange({
      ...budget,
      recurringTrips: budget.recurringTrips.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  return (
    <section className="budget-panel" aria-label={ft(locale, "budget")}>
      <h2>
        <Wallet size={19} /> {ft(locale, "budget")}
      </h2>
      <p>{ft(locale, "projected")}</p>
      <PassengerSelector
        locale={locale}
        profile={profile}
        onChange={onProfile}
      />
      <div className="fare-form">
        <label>
          {ft(locale, "month")}
          <input
            type="month"
            value={budget.month}
            onChange={(e) => onChange({ ...budget, month: e.target.value })}
          />
        </label>
        <label>
          {ft(locale, "limit")}
          <input
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={budget.monthlyLimitSen / 100}
            onChange={(e) =>
              onChange({
                ...budget,
                monthlyLimitSen: Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </label>
      </div>
      {loading && <p role="status">{ft(locale, "loading")}</p>}
      <div className="budget-summary" role="status">
        <span>{ft(locale, result.status as FareCopyKey)}</span>
        <strong>
          {formatFare(result.knownSen)}
          {result.totalSen === null ? " + ?" : ""}
        </strong>
        {result.percentage !== null && (
          <progress
            max="100"
            value={Math.min(100, result.percentage)}
            aria-label={ft(locale, "projected")}
          />
        )}
        {result.remainingSen !== null && (
          <small>
            {ft(locale, "balance")}: {formatFare(result.remainingSen)}
          </small>
        )}
      </div>
      {!budget.recurringTrips.length && <p>{ft(locale, "empty")}</p>}
      {result.items.map(({ trip, totalSen, knownSen, reason }) => (
        <article className="budget-trip" key={trip.id}>
          <h3>
            {allStops.find((s) => s.id === trip.from)?.name ?? trip.from} →{" "}
            {allStops.find((s) => s.id === trip.to)?.name ?? trip.to}
          </h3>
          <strong>
            {formatFare(knownSen)}
            {totalSen === null ? " + ?" : ""}
          </strong>
          {reason !== "complete" && <p>{ft(locale, reason as FareCopyKey)}</p>}
          <div className="fare-form">
            <label>
              {ft(locale, "trips")}
              <input
                type="number"
                min="0"
                max="20"
                step="1"
                value={trip.tripsPerDay}
                onChange={(e) =>
                  update(trip.id, { tripsPerDay: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {ft(locale, "days")}
              <input
                type="number"
                min="0"
                max="31"
                step="1"
                value={trip.days}
                onChange={(e) =>
                  update(trip.id, { days: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {ft(locale, "one_way")} / {ft(locale, "return")}
              <select
                value={trip.direction}
                onChange={(e) =>
                  update(trip.id, {
                    direction: e.target.value as "one_way" | "return",
                  })
                }
              >
                <option value="one_way">{ft(locale, "one_way")}</option>
                <option value="return">{ft(locale, "return")}</option>
              </select>
            </label>
            <label>
              {ft(locale, "dates")}
              <input
                key={`${trip.id}:${budget.month}`}
                type="text"
                inputMode="numeric"
                defaultValue={trip.serviceDays?.join(", ") ?? ""}
                placeholder="1, 3, 5"
                onBlur={(e) => {
                  const values = e.target.value.trim()
                    ? e.target.value.split(",").map((v) => Number(v.trim()))
                    : [];
                  const max = new Date(
                    Number(budget.month.slice(0, 4)),
                    Number(budget.month.slice(5)),
                    0,
                  ).getDate();
                  if (
                    values.some(
                      (v) => !Number.isInteger(v) || v < 1 || v > max,
                    ) ||
                    new Set(values).size !== values.length ||
                    values.length !== trip.days
                  ) {
                    setDateError(true);
                    update(trip.id, { serviceDays: [] });
                  } else {
                    setDateError(false);
                    update(trip.id, { serviceDays: values });
                  }
                }}
              />
            </label>
          </div>
          <button
            className="fare-action"
            onClick={() =>
              onChange({
                ...budget,
                recurringTrips: budget.recurringTrips.filter(
                  (t) => t.id !== trip.id,
                ),
              })
            }
          >
            <Trash2 size={14} />
            {ft(locale, "remove")}
          </button>
        </article>
      ))}
      <div className="pass-note">
        <strong>Kad 30 Hari</strong>
        <p>
          {[...new Set(budget.recurringTrips.map((t) => t.region))]
            .map((region) => {
              const c = fareConfig(region);
              return c && c.pass.priceSen !== null
                ? `${region}: ${formatFare(c.pass.priceSen)} / ${c.pass.days} ${locale === "ms" ? "hari" : "days"}`
                : null;
            })
            .filter(Boolean)
            .join(" · ")}
        </p>
        <label>
          {ft(locale, "activation")}
          <input
            type="number"
            min="1"
            max="31"
            value={activationDay}
            onChange={(e) => setActivationDay(Number(e.target.value))}
          />
        </label>
        {dateError && <p role="alert">{ft(locale, "dateError")}</p>}
        {comparisons.length ? (
          comparisons.map(
            ({ region, result: c }) =>
              c && (
                <div key={region}>
                  <p>
                    {region} · {ft(locale, "pay")}:{" "}
                    {formatFare(c.payPerTripSen)}
                  </p>
                  <p>
                    {ft(locale, "withPass")}: {formatFare(c.withPassSen)}
                  </p>
                  <p>
                    {ft(locale, "saving")}:{" "}
                    {formatFare(Math.max(0, c.savingSen))}
                  </p>
                  <p>
                    {ft(locale, "breakEven")}:{" "}
                    {c.breakEven ?? ft(locale, "never")}
                  </p>
                </div>
              ),
          )
        ) : (
          <p>{ft(locale, "passUnavailable")}</p>
        )}
      </div>
      <FareDisclaimer locale={locale} />
      <p>{ft(locale, storageError ? "storage" : "local")}</p>
    </section>
  );
}
