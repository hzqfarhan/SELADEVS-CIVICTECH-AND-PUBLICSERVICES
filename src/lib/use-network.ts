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
  const refreshReports = useCallback(async () => {
    try {
      const r = await fetch("/api/reports");
      if (r.ok) {
        const d = await r.json();
        acceptReports(d.reports);
      }
    } catch {}
  }, [acceptReports]);
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
    let lastStream = 0;
    setSnapshot({
      vehicles: mode === "demo" ? simulateVehicles(region) : [],
      source: mode === "live" ? "gtfs-rt" : "simulator",
      updatedAt: mode === "demo" ? Date.now() : 0,
      stale: mode === "live",
    });
    const refresh = async () => {
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
          if (mode === "demo")
            setSnapshot({
              vehicles: simulateVehicles(region),
              source: "simulator",
              updatedAt: Date.now(),
              stale: false,
              message: "Offline demonstration",
            });
          else
            setSnapshot((s) => ({
              ...s,
              stale: true,
              message: hasResponse
                ? "Connection interrupted · last known positions"
                : "Official vehicle feed unavailable · retrying",
            }));
        }
      }
    };
    void refresh();
    void refreshReports();
    const stream = new EventSource(`/api/events?region=${region}&mode=${mode}`);
    stream.addEventListener("vehicles", (event) => {
      if (!active) return;
      try {
        setSnapshot(JSON.parse((event as MessageEvent).data));
        setConnected(true);
        hasResponse = true;
        lastStream = Date.now();
      } catch {}
    });
    stream.addEventListener("reports", (event) => {
      if (!active) return;
      try {
        acceptReports(JSON.parse((event as MessageEvent).data).reports);
      } catch {}
    });
    stream.onerror = () => {
      lastStream = 0;
      if (active) setConnected(false);
    };
    const interval = setInterval(
      () => {
        if (Date.now() - lastStream > 12000) {
          void refresh();
          void refreshReports();
        }
      },
      mode === "demo" ? 2500 : 10000,
    );
    return () => {
      active = false;
      controller.abort();
      stream.close();
      clearInterval(interval);
    };
  }, [region, mode, refreshReports, acceptReports]);
  return { snapshot, reports, online, connected, refreshReports };
}
