"use client";
import { useEffect, useState, useCallback } from "react";
import type { CivicReport, Region, VehicleSnapshot } from "./types";
import { simulateVehicles } from "./transit";
export function useNetwork(region: Region, mode: "demo" | "live") {
  const [snapshot, setSnapshot] = useState<VehicleSnapshot>({
    vehicles: [],
    source: mode === "live" ? "gtfs-rt" : "simulator",
    updatedAt: 0,
    stale: true,
  });
  const [reports, setReports] = useState<CivicReport[]>([]),
    [online, setOnline] = useState(true),
    [connected, setConnected] = useState(false);
  const acceptReports = useCallback(
    (next: CivicReport[]) =>
      setReports((previous) =>
        previous.map((r) => r.id + ":" + r.updatedAt).join("|") ===
        next.map((r) => r.id + ":" + r.updatedAt).join("|")
          ? previous
          : next,
      ),
    [],
  );
  const refreshReports = useCallback(
    async (fresh = false) => {
      try {
        const r = await fetch(fresh ? "/api/reports?fresh=1" : "/api/reports");
        if (r.ok) {
          const d = await r.json();
          acceptReports(d.reports);
        }
      } catch {}
    },
    [acceptReports],
  );
  const addReport = useCallback((report: CivicReport) => {
    setReports((previous) => [
      report,
      ...previous.filter((item) => item.id !== report.id),
    ]);
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let hasResponse = false;
    let vehicleRequestPending = false;
    let reportsRequestPending = false;
    setSnapshot({
      vehicles: mode === "demo" ? simulateVehicles(region) : [],
      source: mode === "live" ? "gtfs-rt" : "simulator",
      updatedAt: mode === "demo" ? Date.now() : 0,
      stale: mode === "live",
    });
    const refreshVehicles = async () => {
      if (vehicleRequestPending || document.visibilityState === "hidden")
        return;

      if (mode === "demo") {
        setSnapshot({
          vehicles: simulateVehicles(region),
          source: "simulator",
          updatedAt: Date.now(),
          stale: false,
        });
        setConnected(true);
        return;
      }

      vehicleRequestPending = true;
      try {
        const r = await fetch(`/api/vehicles?region=${region}&mode=${mode}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw Error("feed");
        const data = await r.json();
        if (active) {
          setSnapshot(data);
          setConnected(true);
          hasResponse = true;
        }
      } catch {
        if (active) {
          setConnected(false);
          setSnapshot((s) => ({
            ...s,
            stale: true,
            message: hasResponse
              ? "Connection interrupted · last known positions"
              : "Official vehicle feed unavailable · retrying",
          }));
        }
      } finally {
        vehicleRequestPending = false;
      }
    };

    const refreshCommunity = async () => {
      if (reportsRequestPending || document.visibilityState === "hidden")
        return;
      reportsRequestPending = true;
      try {
        await refreshReports();
      } finally {
        reportsRequestPending = false;
      }
    };

    const refreshVisibleData = () => {
      if (document.visibilityState === "hidden") return;
      void refreshVehicles();
      void refreshCommunity();
    };

    refreshVisibleData();
    document.addEventListener("visibilitychange", refreshVisibleData);
    const vehicleInterval = setInterval(
      () => void refreshVehicles(),
      mode === "demo" ? 2500 : 5000,
    );
    const reportsInterval = setInterval(() => void refreshCommunity(), 15000);

    return () => {
      active = false;
      controller.abort();
      document.removeEventListener("visibilitychange", refreshVisibleData);
      clearInterval(vehicleInterval);
      clearInterval(reportsInterval);
    };
  }, [region, mode, refreshReports]);
  return {
    snapshot,
    reports,
    online,
    connected,
    refreshReports,
    addReport,
  };
}
