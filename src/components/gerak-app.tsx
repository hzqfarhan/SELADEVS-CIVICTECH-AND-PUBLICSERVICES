"use client";
import { SERVICES, serviceFor } from "@/lib/feeds";
import { uniqueRouteColors } from "@/lib/route-colors";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownUp,
  ArrowRight,
  Bookmark,
  BusFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  Globe2,
  Layers3,
  LayoutDashboard,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  Radio,
  Route,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Accessibility as Wheelchair,
  WifiOff,
  X,
  Camera,
  Loader2,
  LogOut,
  LockKeyhole,
  Footprints,
  CloudRain,
  Construction,
} from "lucide-react";
import type {
  CivicReport,
  Coordinate,
  Locale,
  Region,
  ReportCategory,
  ReportStatus,
  TransitRoute,
  Stop,
} from "@/lib/types";
import { routes, stops, etaForVehicle, planJourney, distance } from "@/lib/transit";
import { useNetwork } from "@/lib/use-network";
const TransportMap = dynamic(() => import("./transport-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="loading-orbit" />
      <p>Connecting your city…</p>
    </div>
  ),
});
type View = "explore" | "routes" | "community" | "saved" | "operator";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const categories: {
  id: ReportCategory;
  en: string;
  ms: string;
  icon: typeof MapPin;
}[] = [
  {
    id: "damaged-stop",
    en: "Damaged stop",
    ms: "Hentian rosak",
    icon: BusFront,
  },
  {
    id: "unsafe-walkway",
    en: "Unsafe walkway",
    ms: "Laluan tidak selamat",
    icon: Footprints,
  },
  {
    id: "accessibility",
    en: "Accessibility",
    ms: "Kebolehcapaian",
    icon: Wheelchair,
  },
  { id: "flooding", en: "Flooding", ms: "Banjir", icon: CloudRain },
  {
    id: "infrastructure",
    en: "Infrastructure",
    ms: "Infrastruktur",
    icon: Construction,
  },
  { id: "crowding", en: "Crowding", ms: "Kesesakan", icon: Users },
];
const statusNames: Record<ReportStatus, [string, string]> = {
  submitted: ["Submitted", "Dihantar"],
  acknowledged: ["Acknowledged", "Diterima"],
  "in-progress": ["In progress", "Dalam tindakan"],
  resolved: ["Resolved", "Selesai"],
};

export default function GerakApp({
  initialView = "explore",
}: {
  initialView?: View;
}) {
  const [locale, setLocale] = useState<Locale>("en"),
    [view, setView] = useState<View>(initialView),
    [region, setRegion] = useState<Region>("johor"),
    [mode, setMode] = useState<"2d" | "3d">("2d");
  const [feed, setFeed] = useState<"demo" | "live">("live"),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [follow, setFollow] = useState(false),
    [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [favourites, setFavourites] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [showReport, setShowReport] = useState(false),
    [picking, setPicking] = useState(false),
    [picked, setPicked] = useState<Coordinate | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null),
    [showSurroundings, setShowSurroundings] = useState(true),
    [dismissCitySuggest, setDismissCitySuggest] = useState(false);
  const [origin, setOrigin] = useState("jb-sentral"),
    [destination, setDestination] = useState("ksl"),
    [planned, setPlanned] = useState(false),
    [accessible, setAccessible] = useState(false),
    [showPlanner, setShowPlanner] = useState(false),
    [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null),
    [showInfo, setShowInfo] = useState(false),
    [panelOpen, setPanelOpen] = useState(true),
    [heatmap, setHeatmap] = useState(false);
  const [authenticated, setAuthenticated] = useState(false),
    [demoAvailable, setDemoAvailable] = useState(false),
    [showLogin, setShowLogin] = useState(false),
    [password, setPassword] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [authError, setAuthError] = useState("");
  const [opsTab, setOpsTab] = useState<"fleet" | "reports" | "analytics">(
      "fleet",
    ),
    [dispatches, setDispatches] = useState<
      { id: string; vehicle: string; time: string }[]
    >([]);
  const { snapshot, reports, online, connected, refreshReports } = useNetwork(
    region,
    feed,
  );
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const [officialNetwork, setOfficialNetwork] = useState<{
    routes: TransitRoute[];
    stops: Stop[];
    importedAt?: string;
  } | null>(null);
  const [networkNotice, setNetworkNotice] = useState("");
  const isCampus = region === "uthm" || region === "uthm-pagoh";
  const usingOfficial = feed === "live" && !isCampus;
  const service = serviceFor(region);
  const regionRoutes = useMemo(() => {
    const network = usingOfficial
      ? (officialNetwork?.routes ?? [])
      : routes.filter((r) => r.region === region);
    const colors = uniqueRouteColors(network.map((r) => r.id));
    return network.map((r) => ({ ...r, color: colors.get(r.id)! }));
  }, [region, usingOfficial, officialNetwork]);
  const regionStops = useMemo(
    () =>
      usingOfficial
        ? (officialNetwork?.stops ?? [])
        : stops.filter((s) => s.region === region),
    [region, usingOfficial, officialNetwork],
  );
  const displayedRoutes = useMemo(
    () =>
      (filter ? regionRoutes.filter((r) => r.id === filter) : regionRoutes).map(
        (route) =>
          route.path.length > 220
            ? {
                ...route,
                path: route.path.filter(
                  (_, i) =>
                    i === 0 ||
                    i === route.path.length - 1 ||
                    i % Math.ceil(route.path.length / 220) === 0,
                ),
              }
            : route,
      ),
    [filter, regionRoutes],
  );
  const mapStops = useMemo(() => {
    const included = filter
      ? regionStops.filter((stop) =>
          displayedRoutes.some((route) => route.stops.includes(stop.id)),
        )
      : regionStops;
    const cap = mode === "3d" ? 50 : 100;
    return included.length > cap
      ? included.filter((_, i) => i % Math.ceil(included.length / cap) === 0)
      : included;
  }, [regionStops, filter, displayedRoutes, mode]);
  const displayedVehicles = useMemo(
    () => snapshot.vehicles.filter((v) => !filter || v.routeId === filter),
    [snapshot.vehicles, filter],
  );
  const vehicle = snapshot.vehicles.find((v) => v.id === selectedId),
    vehicleRoute = regionRoutes.find((r) => r.id === vehicle?.routeId);
  useEffect(() => {
    if (feed !== "live" || isCampus) return;
    setOfficialNetwork(null);
    const controller = new AbortController();
    try {
      const cached = JSON.parse(
        localStorage.getItem(`gerak:official-network:${region}`) ?? "null",
      );
      if (
        cached?.source === "official" &&
        Array.isArray(cached.routes) &&
        Array.isArray(cached.stops)
      ) {
        setOfficialNetwork(cached);
        setNetworkNotice("Cached official network · checking for updates");
      }
    } catch {}
    const refresh = async () => {
      try {
        const response = await fetch(`/api/network?region=${region}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw Error("Network unavailable");
        const d = await response.json();
        if (d.source === "official" && !controller.signal.aborted) {
          setOfficialNetwork((previous) =>
            previous?.importedAt === d.importedAt &&
            previous?.routes.length === d.routes.length
              ? previous
              : d,
          );
          setNetworkNotice(d.message ?? "");
          if (d.routes.length)
            try {
              localStorage.setItem(
                `gerak:official-network:${region}`,
                JSON.stringify(d),
              );
            } catch {}
        }
      } catch {
        if (!controller.signal.aborted)
          setNetworkNotice(
            "Official network unavailable · cached routes shown if available",
          );
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [feed, region]);
  const favourite = (id: string) => favourites.includes(id);
  const toggleFavourite = (id: string) => {
    setFavourites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      try {
        localStorage.setItem("gerak:favourites", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    try {
      const savedFavourites = JSON.parse(
        localStorage.getItem("gerak:favourites") ?? "[]",
      );
      setFavourites(
        Array.isArray(savedFavourites)
          ? savedFavourites.filter((x) => typeof x === "string")
          : [],
      );
      setLocale(localStorage.getItem("gerak:locale") === "ms" ? "ms" : "en");
    } catch {}
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setDemoAvailable(d.demoAvailable);
      })
      .catch(() => {});
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => {
          const urls = [
            ...performance
              .getEntriesByType("resource")
              .map((entry) => entry.name),
            ...Array.from(
              document.querySelectorAll<HTMLScriptElement>("script[src]"),
            ).map((s) => s.src),
            ...Array.from(
              document.querySelectorAll<HTMLLinkElement>("link[href]"),
            ).map((l) => l.href),
            "/vendor/maplibre-gl-worker.mjs",
          ];
          registration.active?.postMessage({ type: "CACHE_APP_ASSETS", urls });
        })
        .catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", prompt);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "ms" ? "ms" : "en";
    try {
      localStorage.setItem("gerak:locale", locale);
    } catch {}
  }, [locale]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const changeRegion = (next: Region) => {
    setRegion(next);
    setFeed(next === "uthm" || next === "uthm-pagoh" ? "demo" : "live");
    setFilter(null);
    setSelectedId(null);
    setFollow(false);
    setSelectedStop(null);
    setPlanned(false);
    const stopsForRegion = stops.filter((s) => s.region === next);
    setOrigin(next === "johor" ? "jb-sentral" : stopsForRegion[0]?.id || "");
    setDestination(
      next === "johor"
        ? "ksl"
        : stopsForRegion[1]?.id || stopsForRegion[0]?.id || "",
    );
  };
  const selectVehicle = (id: string) => {
    if (mode === "3d") setFollow(true);
    setSelectedId(id);
    setSelectedStop(null);
  };
  const journey = useMemo(
    () =>
      planned
        ? planJourney(
            origin,
            destination,
            accessible,
            regionRoutes,
            regionStops,
          )
        : [],
    [origin, destination, accessible, planned, regionRoutes, regionStops],
  );
  const occupancy = snapshot.vehicles.filter(
      (v) => v.occupancy === "low",
    ).length,
    delayed = snapshot.vehicles.filter((v) => v.delay > 0).length;
  const fresh = snapshot.vehicles.filter(
    (v) => Date.now() - v.timestamp < 120000,
  ).length;
  const searchedRoutes = regionRoutes.filter((r) =>
    `${r.id} ${r.name} ${r.destination}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const searchedStops = useMemo(() => {
    const list = regionStops.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
    );
    if (!userLocation) return list;
    return [...list].sort(
      (a, b) =>
        distance(userLocation, a.coordinate) -
        distance(userLocation, b.coordinate),
    );
  }, [regionStops, search, userLocation]);

  const nearestStop = useMemo(() => {
    if (!userLocation || !regionStops.length) return null;
    let best = regionStops[0];
    let bestDist = distance(userLocation, best.coordinate);
    for (let i = 1; i < regionStops.length; i++) {
      const d = distance(userLocation, regionStops[i].coordinate);
      if (d < bestDist) {
        bestDist = d;
        best = regionStops[i];
      }
    }
    return { stop: best, distanceMeters: Math.round(bestDist) };
  }, [userLocation, regionStops]);

  const nearestService = useMemo(() => {
    if (!userLocation) return null;
    let best = SERVICES[0];
    let bestDist = distance(userLocation, best.center);
    for (let i = 1; i < SERVICES.length; i++) {
      const d = distance(userLocation, SERVICES[i].center);
      if (d < bestDist) {
        bestDist = d;
        best = SERVICES[i];
      }
    }
    return { service: best, distanceMeters: Math.round(bestDist) };
  }, [userLocation]);
  useEffect(() => {
    if (usingOfficial && regionRoutes[0]) {
      const ids = regionRoutes[0].stops;
      setOrigin(ids[0] ?? "");
      setDestination(ids[Math.min(4, ids.length - 1)] ?? "");
      setPlanned(false);
    }
  }, [usingOfficial, regionRoutes]);
  const reportStatus = (status: ReportStatus) =>
    statusNames[status][locale === "en" ? 0 : 1];
  const authenticate = async (demo: boolean) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo ? { demo: true } : { password }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Sign-in failed");
      setAuthenticated(true);
      setShowLogin(false);
      setPassword("");
      notify(tr("Operator session ready", "Sesi operator sedia"));
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setAuthBusy(false);
    }
  };
  const updateStatus = async (report: CivicReport, status: ReportStatus) => {
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw Error(e.error ?? "Unable to update");
      }
      await refreshReports();
      notify(
        tr(
          "Report updated. The community can see your progress.",
          "Laporan dikemas kini. Komuniti boleh melihat perkembangannya.",
        ),
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to update");
    }
  };
  return (
    <div className={`app-shell ${view === "operator" ? "operator-shell" : ""}`}>
      <aside
        className="rail"
        aria-label={tr("Main navigation", "Navigasi utama")}
      >
        <button
          className="brand-symbol"
          title="GERAK"
          onClick={() => setView("explore")}
          aria-label="GERAK home"
        >
          <span>g</span>
          <i />
        </button>
        <div className="rail-links">
          {(
            [
              { id: "explore", icon: Compass, en: "Explore", ms: "Teroka" },
              { id: "routes", icon: Route, en: "Routes", ms: "Laluan" },
              {
                id: "community",
                icon: MessageSquare,
                en: "Community",
                ms: "Komuniti",
              },
              { id: "saved", icon: Bookmark, en: "Saved", ms: "Disimpan" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-label={tr(item.en, item.ms)}
              title={tr(item.en, item.ms)}
              className={`rail-button ${view === item.id ? "active" : ""}`}
              onClick={() => {
                setView(item.id);
                setPanelOpen(true);
              }}
            >
              <item.icon size={22} />
              <span>{tr(item.en, item.ms)}</span>
            </button>
          ))}
        </div>
        <div className="rail-bottom">
          <button
            className={`rail-button ${view === "operator" ? "active" : ""}`}
            aria-label={tr("Operator dashboard", "Papan pemuka operator")}
            title="Operator"
            onClick={() => {
              setView("operator");
              setPanelOpen(true);
            }}
          >
            <LayoutDashboard size={21} />
            <span>{tr("Operator", "Operator")}</span>
          </button>
          <button
            className="avatar"
            aria-label={tr("About GERAK", "Tentang GERAK")}
            onClick={() => setShowInfo(true)}
          >
            G
          </button>
        </div>
      </aside>
      <header className="topbar">
        <div className="brand-lockup">
          <button className="wordmark" onClick={() => setView("explore")}>
            gerak<span>↗</span>
          </button>
          <span className="brand-divider" />
          <span className="brand-tagline">
            {tr("A better way to move.", "Bergerak lebih baik.")}
          </span>
        </div>
        <div className="topbar-right">
          <span className={`connection ${!online ? "offline" : ""}`}>
            <span className="status-dot" />
            {!online
              ? tr("Offline", "Luar talian")
              : feed === "demo"
                ? tr("Demo network", "Rangkaian demo")
                : snapshot.stale
                  ? tr("Awaiting fresh GPS", "Menunggu GPS baharu")
                  : tr("Live network", "Rangkaian langsung")}
          </span>
          <button
            className="language-button"
            onClick={() => setLocale((l) => (l === "en" ? "ms" : "en"))}
            aria-label={tr("Switch to Bahasa Melayu", "Tukar ke English")}
          >
            <Globe2 size={15} />
            <span>{locale === "en" ? "EN" : "BM"}</span>
          </button>
          <button
            className="top-operator"
            onClick={() =>
              setView(view === "operator" ? "explore" : "operator")
            }
          >
            {view === "operator" ? (
              <Compass size={15} />
            ) : (
              <LayoutDashboard size={15} />
            )}
            <span>
              {view === "operator"
                ? tr("Passenger view", "Paparan penumpang")
                : tr("Operator console", "Konsol operator")}
            </span>
            <ChevronRight size={14} />
          </button>
        </div>
      </header>
      <main className={`workspace ${panelOpen ? "" : "panel-collapsed"}`}>
        {panelOpen && (
          <section
            className="side-panel"
            aria-label={tr(
              "Journey and network details",
              "Butiran perjalanan dan rangkaian",
            )}
          >
            <div className="panel-heading">
              <span className="eyebrow">
                <span className="tiny-star">✳</span>{" "}
                {view === "operator"
                  ? tr("CONTROL CENTRE", "PUSAT KAWALAN")
                  : tr("YOUR CITY, CONNECTED", "BANDAR ANDA, TERHUBUNG")}
              </span>
              <h1>
                {view === "operator"
                  ? tr("Keep your city moving.", "Pastikan bandar bergerak.")
                  : view === "community"
                    ? tr(
                        "Better streets. Together.",
                        "Jalan lebih baik. Bersama.",
                      )
                    : view === "saved"
                      ? tr("Your everyday journeys.", "Perjalanan harian anda.")
                      : tr("Jom, let’s go.", "Jom, kita gerak.")}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "operator"
                  ? tr(
                      "One view. Every vehicle. Every voice.",
                      "Satu paparan. Setiap kenderaan. Setiap suara.",
                    )
                  : view === "community"
                    ? tr(
                        "A small report can make a big difference.",
                        "Laporan kecil membawa perubahan besar.",
                      )
                    : view === "saved"
                      ? tr(
                          "The places and routes that matter to you.",
                          "Tempat dan laluan yang penting untuk anda.",
                        )
                      : tr(
                          "A little less waiting. A lot more living.",
                          "Kurang menunggu. Lebih menikmati hidup.",
                        )}
              </p>
            </div>
            <div className="region-picker">
              <MapPin size={17} />
              <select
                aria-label={tr("Choose region", "Pilih kawasan")}
                value={region}
                onChange={(e) => changeRegion(e.target.value as Region)}
              >
                {SERVICES.map((s) => {
                  const label =
                    s.operator === "BAS.MY" ||
                    s.kind === "pilot" ||
                    s.name.startsWith(s.operator)
                      ? s.name
                      : `${s.operator} · ${s.name}`;
                  return (
                    <option key={s.id} value={s.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={15} />
            </div>
            {view !== "operator" && view !== "community" && (
              <>
                <button
                  className={`journey-cta ${showPlanner ? "open" : ""}`}
                  onClick={() => setShowPlanner((v) => !v)}
                >
                  <div className="journey-cta-icon">
                    <Navigation size={19} />
                  </div>
                  <span>
                    <strong>
                      {tr("Where are we heading?", "Ke mana kita?")}
                    </strong>
                    <small>
                      {tr("Plan your next journey", "Rancang perjalanan anda")}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
                {showPlanner && (
                  <div className="planner">
                    <label>
                      {tr("From", "Dari")}
                      <select
                        value={origin}
                        onChange={(e) => {
                          setOrigin(e.target.value);
                          setPlanned(false);
                        }}
                      >
                        {regionStops.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="swap-button icon-button"
                      aria-label="Swap origin and destination"
                      onClick={() => {
                        setOrigin(destination);
                        setDestination(origin);
                        setPlanned(false);
                      }}
                    >
                      <ArrowDownUp size={15} />
                    </button>
                    <label>
                      {tr("To", "Ke")}
                      <select
                        value={destination}
                        onChange={(e) => {
                          setDestination(e.target.value);
                          setPlanned(false);
                        }}
                      >
                        {regionStops.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={accessible}
                        onChange={(e) => {
                          setAccessible(e.target.checked);
                          setPlanned(false);
                        }}
                      />
                      <Wheelchair size={14} />
                      {tr("Step-free stops", "Hentian tanpa tangga")}
                    </label>
                    <button
                      className="primary-button"
                      onClick={() => setPlanned(true)}
                    >
                      {tr("Find a journey", "Cari perjalanan")}
                      <ArrowRight size={16} />
                    </button>
                    <p className="fineprint">
                      {usingOfficial
                        ? tr(
                            "Connections from published GTFS stop order. Ride time is a proportional estimate; excludes waiting and transfers. Representative direction only, not a departure timetable.",
                            "Sambungan daripada urutan hentian GTFS. Masa perjalanan ialah anggaran berkadar; tidak termasuk masa menunggu dan pertukaran. Satu arah contoh, bukan jadual berlepas.",
                          )
                        : tr(
                            "Illustrative corridor planner · no published timetable or fares. Accessibility is demo data.",
                            "Perancang koridor contoh · bukan jadual atau tambang rasmi. Aksesibiliti ialah data demo.",
                          )}
                    </p>
                    {planned &&
                      (journey.length ? (
                        journey.map((j, i) => (
                          <button
                            className="journey-result"
                            key={i}
                            onClick={() => {
                              setFilter(j.routes[0].id);
                              setShowPlanner(false);
                            }}
                          >
                            <span>
                              <strong>
                                {j.minutes
                                  ? `${j.minutes} ${tr("min ride estimate", "min anggaran perjalanan")}`
                                  : tr("Route connection", "Sambungan laluan")}
                              </strong>
                              <small>
                                {j.transfers
                                  ? tr("1 transfer", "1 pertukaran")
                                  : tr("Direct journey", "Perjalanan terus")}
                              </small>
                            </span>
                            <span className="journey-badges">
                              {j.routes.map((r) => (
                                <b
                                  className="route-badge"
                                  style={{ color: r.color }}
                                  key={r.id}
                                >
                                  {r.id}
                                </b>
                              ))}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="empty-inline">
                          {tr(
                            "No matching journey. Try different stops or accessibility settings.",
                            "Tiada perjalanan sepadan. Cuba hentian atau tetapan lain.",
                          )}
                        </p>
                      ))}
                  </div>
                )}
                <div className="search-input">
                  <Search size={17} />
                  <input
                    placeholder={tr(
                      "Search routes or stops",
                      "Cari laluan atau hentian",
                    )}
                    aria-label={tr(
                      "Search routes or stops",
                      "Cari laluan atau hentian",
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
            {usingOfficial && (
              <div className="data-provenance">
                <Radio size={14} />
                <div>
                  <strong>
                    {tr(
                      `${service.operator} · ${service.name} official data`,
                      `Data rasmi ${service.operator} · ${service.name}`,
                    )}
                  </strong>
                  <span>
                    {snapshot.updatedAt
                      ? new Date(snapshot.updatedAt).toLocaleTimeString(
                          "en-MY",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            timeZone: "Asia/Kuala_Lumpur",
                          },
                        ) + " MYT"
                      : tr(
                          "Waiting for official observations",
                          "Menunggu pemerhatian rasmi",
                        )}{" "}
                    ·{" "}
                    <a href="/sources" target="_blank" rel="noreferrer">
                      {tr("Sources", "Sumber")}
                    </a>
                  </span>
                  {networkNotice && <small>{networkNotice}</small>}
                </div>
              </div>
            )}
            <div className="panel-scroll">
              {(view === "explore" ||
                view === "routes" ||
                view === "saved") && (
                <>
                  <div className="section-title">
                    <h2>
                      {view === "saved"
                        ? tr("Saved routes", "Laluan disimpan")
                        : tr("Around your city", "Sekitar bandar anda")}
                    </h2>
                    <span>
                      {regionRoutes.length} {tr("routes", "laluan")}
                    </span>
                  </div>
                  <div className="route-list">
                    {searchedRoutes
                      .filter((r) => view !== "saved" || favourite(r.id))
                      .map((route) => {
                        const fleet = snapshot.vehicles.filter(
                          (v) => v.routeId === route.id,
                        );
                        const eta = fleet
                          .map((v) => etaForVehicle(v, route.stops[0]))
                          .filter((v): v is number => v !== null)
                          .sort((a, b) => a - b)[0];
                        return (
                          <div
                            key={route.id}
                            className={`route-card ${filter === route.id ? "selected" : ""}`}
                            style={
                              {
                                "--route-color": route.color,
                              } as React.CSSProperties
                            }
                          >
                            <button
                              className="route-main"
                              onClick={() => {
                                setFilter((f) =>
                                  f === route.id ? null : route.id,
                                );
                                if (fleet[0]) selectVehicle(fleet[0].id);
                              }}
                            >
                              <div className="route-card-top">
                                <span className="route-badge">
                                  <BusFront size={13} />
                                  {route.id}
                                </span>
                                <span className="route-arrival">
                                  {eta
                                    ? `${eta} min`
                                    : route.source === "official"
                                      ? tr("Official route", "Laluan rasmi")
                                      : tr("Demo route", "Laluan demo")}
                                  <span className="signal-bars">
                                    <i />
                                    <i />
                                    <i />
                                  </span>
                                </span>
                              </div>
                              <strong>{route.name}</strong>
                              <p>{route.destination}</p>
                              <div className="route-card-meta">
                                <span>
                                  <span className="status-dot" />
                                  {fleet.length}{" "}
                                  {tr(
                                    "vehicles reporting",
                                    "kenderaan melapor",
                                  )}
                                </span>
                                <span>
                                  {route.stops.length} {tr("stops", "hentian")}
                                </span>
                                {route.source === "demo" && (
                                  <Wheelchair size={13} />
                                )}
                              </div>
                            </button>
                            <button
                              className={`save-route ${favourite(route.id) ? "is-saved" : ""}`}
                              aria-label={`${favourite(route.id) ? "Unsave" : "Save"} ${route.id}`}
                              onClick={() => toggleFavourite(route.id)}
                            >
                              <Bookmark
                                size={16}
                                fill={
                                  favourite(route.id) ? "currentColor" : "none"
                                }
                              />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  {view === "saved" &&
                    !regionRoutes.some((r) => favourite(r.id)) && (
                      <div className="empty-state">
                        <Bookmark size={28} />
                        <h3>
                          {tr("Make it your own", "Jadikan ia milik anda")}
                        </h3>
                        <p>
                          {tr(
                            "Tap the bookmark on any route or stop. Your favourites stay on this device.",
                            "Tekan penanda buku pada laluan atau hentian. Pilihan disimpan pada peranti ini.",
                          )}
                        </p>
                      </div>
                    )}
                  <div className="section-title">
                    <h2>
                      {view === "saved"
                        ? tr("Saved stops", "Hentian disimpan")
                        : tr("Stops to know", "Hentian pilihan")}
                    </h2>
                    <span>{tr("EXPLORE", "TEROKA")}</span>
                  </div>
                  {searchedStops
                    .filter((s) => view !== "saved" || favourite(s.id))
                    .slice(
                      0,
                      search || view === "routes" || view === "saved" ? 100 : 5,
                    )
                    .map((stop) => (
                      <div
                        className={`stop-row ${selectedStop === stop.id ? "selected" : ""}`}
                        key={stop.id}
                      >
                        <button
                          className="stop-main"
                          onClick={() => {
                            setSelectedStop(stop.id);
                            setSelectedId(null);
                          }}
                        >
                          <span className="stop-icon">
                            <MapPin size={17} />
                          </span>
                          <span>
                            <strong>{stop.name}</strong>
                            <small>
                              {userLocation && (
                                <span className="stop-distance">
                                  {(() => {
                                    const d = Math.round(
                                      distance(userLocation, stop.coordinate),
                                    );
                                    return d < 1000
                                      ? `${d}m`
                                      : `${(d / 1000).toFixed(1)}km`;
                                  })()}{" "}
                                  ·{" "}
                                </span>
                              )}
                              {regionRoutes
                                .filter((r) => r.stops.includes(stop.id))
                                .map((r) => r.id)
                                .join(" · ")}
                              {stop.accessible
                                ? " · " +
                                  (usingOfficial
                                    ? tr(
                                        "Step-free (GTFS)",
                                        "Tanpa tangga (GTFS)",
                                      )
                                    : tr("Step-free*", "Tanpa tangga*"))
                                : ""}
                            </small>
                          </span>
                        </button>
                        <button
                          className={`icon-button ${favourite(stop.id) ? "is-saved" : ""}`}
                          aria-label={`Save stop ${stop.name}`}
                          onClick={() => toggleFavourite(stop.id)}
                        >
                          <Bookmark
                            size={15}
                            fill={favourite(stop.id) ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    ))}
                  <div className="community-promo">
                    <span className="promo-icon">
                      <MessageSquare size={21} />
                    </span>
                    <h3>
                      {tr(
                        "Good journeys start with us.",
                        "Perjalanan baik bermula dengan kita.",
                      )}
                    </h3>
                    <p>
                      {tr(
                        "Spot something that needs a little care? Help make your neighbourhood better.",
                        "Nampak sesuatu yang perlu perhatian? Bantu perbaiki kejiranan anda.",
                      )}
                    </p>
                    <button
                      onClick={() => {
                        setPicked(null);
                        setShowReport(true);
                      }}
                    >
                      {tr("Report an issue", "Laporkan isu")}
                      <Plus size={15} />
                    </button>
                  </div>
                </>
              )}
              {view === "community" && (
                <>
                  <button
                    className="primary-button wide"
                    onClick={() => {
                      setPicked(null);
                      setShowReport(true);
                    }}
                  >
                    <Plus size={18} />
                    {tr("Make a community report", "Buat laporan komuniti")}
                  </button>
                  <div className="community-totals">
                    <div>
                      <strong>{reports.length}</strong>
                      <span>{tr("reports", "laporan")}</span>
                    </div>
                    <div>
                      <strong>
                        {
                          reports.filter((r) => r.status === "in-progress")
                            .length
                        }
                      </strong>
                      <span>{tr("in progress", "dalam tindakan")}</span>
                    </div>
                    <div>
                      <strong>
                        {reports.filter((r) => r.status === "resolved").length}
                      </strong>
                      <span>{tr("resolved", "selesai")}</span>
                    </div>
                  </div>
                  <div className="section-title">
                    <h2>{tr("From the community", "Daripada komuniti")}</h2>
                    <span>{tr("LATEST", "TERKINI")}</span>
                  </div>
                  {reports.length === 0 ? (
                    <div className="empty-state">
                      <MessageSquare />
                      <h3>{tr("Be the first voice", "Jadi suara pertama")}</h3>
                      <p>
                        {tr(
                          "Submit an issue and follow its progress here.",
                          "Hantar isu dan ikuti perkembangannya di sini.",
                        )}
                      </p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        locale={locale}
                        onSelect={() => {
                          setPicked(report.coordinate);
                          notify(
                            `${report.location} · ${report.coordinate.map((c) => c.toFixed(5)).join(", ")}`,
                          );
                        }}
                      />
                    ))
                  )}
                </>
              )}
              {view === "operator" && (
                <>
                  <div
                    className={`operator-session ${authenticated ? "signed-in" : ""}`}
                  >
                    <ShieldCheck size={19} />
                    <span>
                      <strong>
                        {authenticated
                          ? tr("Operator connected", "Operator bersambung")
                          : tr("Public overview", "Gambaran awam")}
                      </strong>
                      <small>
                        {authenticated
                          ? tr(
                              "Incident management enabled",
                              "Pengurusan insiden diaktifkan",
                            )
                          : tr(
                              "Sign in to manage reports",
                              "Log masuk untuk urus laporan",
                            )}
                      </small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={
                        authenticated ? "Sign out" : "Operator sign in"
                      }
                      onClick={() => {
                        if (authenticated) {
                          void fetch("/api/session", { method: "DELETE" }).then(
                            () => setAuthenticated(false),
                          );
                        } else setShowLogin(true);
                      }}
                    >
                      {authenticated ? (
                        <LogOut size={17} />
                      ) : (
                        <LockKeyhole size={17} />
                      )}
                    </button>
                  </div>
                  <div className="operator-stats">
                    <div>
                      <span>
                        <BusFront size={15} />
                        {tr("Active", "Aktif")}
                      </span>
                      <strong>
                        {fresh.toString().padStart(2, "0")}
                        <small> / {snapshot.vehicles.length}</small>
                      </strong>
                      <i>{tr("Reporting vehicles", "Kenderaan melapor")}</i>
                    </div>
                    <div>
                      <span>
                        <Clock3 size={15} />
                        {tr("Delayed", "Lewat")}
                      </span>
                      <strong className="amber">
                        {usingOfficial
                          ? "—"
                          : delayed.toString().padStart(2, "0")}
                      </strong>
                      <i>
                        {usingOfficial
                          ? tr("No TripUpdates feed", "Tiada data kelewatan")
                          : tr("Simulated schedule", "Jadual simulasi")}
                      </i>
                    </div>
                    <div>
                      <span>
                        <WifiOff size={15} />
                        {tr("Stale", "Lapuk")}
                      </span>
                      <strong>{snapshot.vehicles.length - fresh}</strong>
                      <i>
                        {tr("No fresh GPS > 2 min", "Tiada GPS segar > 2 min")}
                      </i>
                    </div>
                    <div>
                      <span>
                        <MessageSquare size={15} />
                        {tr("Open reports", "Laporan terbuka")}
                      </span>
                      <strong>
                        {reports.filter((r) => r.status !== "resolved").length}
                      </strong>
                      <i>{tr("Community issues", "Isu komuniti")}</i>
                    </div>
                  </div>
                  <div className="segmented ops-tabs">
                    {(["fleet", "reports", "analytics"] as const).map((t) => (
                      <button
                        className={opsTab === t ? "active" : ""}
                        key={t}
                        onClick={() => setOpsTab(t)}
                      >
                        {t === "fleet"
                          ? tr("Fleet", "Armada")
                          : t === "reports"
                            ? tr("Reports", "Laporan")
                            : tr("Insights", "Analitik")}
                      </button>
                    ))}
                  </div>
                  {opsTab === "fleet" && (
                    <>
                      <div className="section-title">
                        <h2>{tr("On the road", "Di jalan raya")}</h2>
                        <span>
                          {snapshot.source === "simulator"
                            ? "SIMULATED"
                            : "GTFS-RT"}
                        </span>
                      </div>
                      {snapshot.vehicles.map((v) => (
                        <button
                          key={v.id}
                          className={`fleet-row ${selectedId === v.id ? "selected" : ""}`}
                          onClick={() => selectVehicle(v.id)}
                        >
                          <span className="fleet-icon">
                            <BusFront size={19} />
                          </span>
                          <span>
                            <strong>{v.label}</strong>
                            <small>
                              {v.routeId} ·{" "}
                              {v.speedKnown === false
                                ? "—"
                                : Math.round(v.speed)}{" "}
                              km/h
                            </small>
                          </span>
                          <span
                            className={v.delay ? "text-amber" : "text-green"}
                          >
                            {Date.now() - v.timestamp > 120000
                              ? tr("Stale GPS", "GPS lapuk")
                              : v.delay
                                ? `+${v.delay} min`
                                : tr("Reporting", "Melapor")}
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                      <div className="dispatch-box">
                        <span className="eyebrow">
                          {tr("DISPATCH SANDBOX", "SIMULASI DISPATCH")}
                        </span>
                        <h3>
                          {tr(
                            "A little breathing room.",
                            "Sedikit ruang bernafas.",
                          )}
                        </h3>
                        <p>
                          {tr(
                            "Select a vehicle, then simulate a 2-minute holding instruction. No message is sent to a real driver.",
                            "Pilih kenderaan, kemudian simulasi arahan menunggu 2 minit. Tiada mesej dihantar kepada pemandu sebenar.",
                          )}
                        </p>
                        <button
                          className="secondary-button wide"
                          disabled={!vehicle}
                          onClick={() => {
                            const item = {
                              id: crypto.randomUUID(),
                              vehicle: vehicle!.label,
                              time: new Date().toLocaleTimeString("en-MY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            };
                            setDispatches((d) => [item, ...d]);
                            notify(
                              tr(
                                `Simulated hold queued for ${vehicle!.label}`,
                                `Arahan simulasi menunggu untuk ${vehicle!.label}`,
                              ),
                            );
                          }}
                        >
                          <Radio size={15} />
                          {tr("Simulate holding", "Simulasi menunggu")}
                        </button>
                        {dispatches.slice(0, 3).map((d) => (
                          <p className="dispatch-log" key={d.id}>
                            <Check size={13} />
                            {d.vehicle} · {tr("2 min hold", "tunggu 2 min")}
                            <span>{d.time}</span>
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                  {opsTab === "reports" && (
                    <>
                      <div className="section-title">
                        <h2>{tr("Community inbox", "Peti masuk komuniti")}</h2>
                        <span>{reports.length}</span>
                      </div>
                      {reports.length === 0 && (
                        <div className="empty-state">
                          <CheckCircle2 />
                          <h3>{tr("All caught up", "Semua selesai")}</h3>
                          <p>
                            {tr(
                              "Passenger reports appear here automatically.",
                              "Laporan penumpang muncul di sini secara automatik.",
                            )}
                          </p>
                        </div>
                      )}
                      {reports.map((report) => (
                        <div key={report.id}>
                          <ReportCard report={report} locale={locale} />
                          {authenticated && (
                            <div className="report-action">
                              <span>{tr("Move to", "Tukar kepada")}</span>
                              <select
                                aria-label={`Update ${report.title}`}
                                value={report.status}
                                onChange={(e) =>
                                  void updateStatus(
                                    report,
                                    e.target.value as ReportStatus,
                                  )
                                }
                              >
                                <option value={report.status}>
                                  {reportStatus(report.status)}
                                </option>
                                {(report.status === "submitted"
                                  ? ["acknowledged"]
                                  : report.status === "acknowledged"
                                    ? ["in-progress", "resolved"]
                                    : report.status === "in-progress"
                                      ? ["resolved"]
                                      : ["acknowledged"]
                                ).map((s) => (
                                  <option key={s} value={s}>
                                    {reportStatus(s as ReportStatus)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {opsTab === "analytics" && (
                    <>
                      <div className="insight-card">
                        <span className="eyebrow">
                          {tr("FLEET DISTRIBUTION", "TABURAN ARMADA")}
                        </span>
                        <h3>
                          {tr(
                            "Every route, in balance.",
                            "Setiap laluan, seimbang.",
                          )}
                        </h3>
                        {regionRoutes.map((r) => {
                          const count = snapshot.vehicles.filter(
                            (v) => v.routeId === r.id,
                          ).length;
                          return (
                            <div className="chart-row" key={r.id}>
                              <span>{r.id}</span>
                              <div>
                                <i
                                  style={{
                                    width: `${Math.max(3, (count / Math.max(1, snapshot.vehicles.length)) * 100)}%`,
                                    background: r.color,
                                  }}
                                />
                              </div>
                              <b>{count}</b>
                            </div>
                          );
                        })}
                        <small>
                          {tr(
                            "Current positions · not historical ridership",
                            "Kedudukan semasa · bukan sejarah penumpang",
                          )}
                        </small>
                      </div>
                      <div className="insight-card">
                        <span className="eyebrow">
                          {tr("PASSENGER COMFORT", "KESELESAAN PENUMPANG")}
                        </span>
                        <strong className="insight-number">
                          {snapshot.source === "simulator" ? occupancy : "—"}
                          <small>
                            {tr("buses with space", "bas dengan ruang")}
                          </small>
                        </strong>
                        <p>
                          {tr(
                            "Demonstration occupancy. The official feed does not guarantee crowd data.",
                            "Kapasiti demonstrasi. Data rasmi tidak menjamin maklumat kesesakan.",
                          )}
                        </p>
                      </div>
                      <button
                        className={`secondary-button wide ${heatmap ? "enabled" : ""}`}
                        onClick={() => setHeatmap((h) => !h)}
                      >
                        <Layers3 size={16} />
                        {heatmap
                          ? tr("Hide fleet heatmap", "Sembunyikan peta haba")
                          : tr("Show fleet heatmap", "Papar peta haba")}
                      </button>
                      <p className="fineprint">
                        {tr(
                          "Position density from the current fleet. Switch to 2D for the heatmap.",
                          "Kepadatan kedudukan daripada armada semasa. Tukar ke 2D untuk peta haba.",
                        )}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="panel-footer">
              <span className="malaysia-flag">🇲🇾</span>
              <span>
                {tr(
                  "Made for the way Malaysia moves.",
                  "Untuk cara Malaysia bergerak.",
                )}
              </span>
              <span>2026</span>
            </div>
          </section>
        )}
        <section
          className="map-workspace"
          aria-label={tr(
            "Interactive transport map",
            "Peta pengangkutan interaktif",
          )}
        >
          <TransportMap
            mode={mode}
            region={region}
            vehicles={displayedVehicles}
            selectedVehicleId={selectedId}
            onSelectVehicle={selectVehicle}
            follow={follow}
            routes={displayedRoutes}
            stops={mapStops}
            reports={reports}
            heatmap={heatmap}
            picking={picking}
            onPick={(coordinate) => {
              setPicked(coordinate);
              setPicking(false);
              setShowReport(true);
            }}
            onSelectStop={(id) => {
              setSelectedStop(id);
              setSelectedId(null);
            }}
            userLocation={userLocation}
            onUserLocationChange={(coord) => {
              setUserLocation(coord);
              setShowSurroundings(true);
              setDismissCitySuggest(false);
            }}
            onLocationError={(msg) => notify(msg)}
          />
          <div className="map-top-controls">
            <div className="map-control-right">
              <div className="mode-toggle" role="group" aria-label="Map mode">
                <button
                  className={mode === "2d" ? "active" : ""}
                  onClick={() => setMode("2d")}
                >
                  <Compass size={15} />
                  2D
                </button>
                <button
                  className={mode === "3d" ? "active" : ""}
                  onClick={() => {
                    setMode("3d");
                    if (usingOfficial)
                      notify(
                        tr(
                          "3D buildings are illustrative. Routes and GPS are from the official feed.",
                          "Bangunan 3D ialah ilustrasi. Laluan dan GPS daripada data rasmi.",
                        ),
                      );
                  }}
                >
                  <Layers3 size={15} />
                  3D
                  <span className="new-dot" />
                </button>
              </div>
              <button
                className="map-square"
                title={tr("Data and map information", "Maklumat data dan peta")}
                aria-label={tr(
                  "Data and map information",
                  "Maklumat data dan peta",
                )}
                onClick={() => setShowInfo(true)}
              >
                <Settings2 size={18} />
              </button>
            </div>
          </div>
          {picking && (
            <div className="map-banner pick-banner">
              <MapPin size={17} />
              {tr(
                "Tap the map to place your report",
                "Tekan peta untuk lokasi laporan",
              )}
              <button
                className="icon-button"
                aria-label="Cancel picking"
                onClick={() => {
                  setPicking(false);
                  setShowReport(true);
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!online && (
            <div className="map-banner offline-banner">
              <WifiOff size={17} />
              {tr(
                "You’re offline. Saved routes and the demo still work.",
                "Anda di luar talian. Laluan disimpan dan demo masih berfungsi.",
              )}
            </div>
          )}
          {feed === "live" && snapshot.stale && snapshot.message && (
            <div className="map-banner feed-banner">
              <TriangleAlert size={15} />
              {snapshot.message}
            </div>
          )}
          {userLocation &&
            !dismissCitySuggest &&
            nearestService &&
            nearestService.service.id !== region &&
            nearestService.distanceMeters < 50000 &&
            !vehicle &&
            !selectedStop && (
              <div className="map-banner city-suggest-banner">
                <MapPin size={16} />
                <span>
                  {tr(
                    `You are near ${nearestService.service.name} (${Math.round(nearestService.distanceMeters / 1000)} km away).`,
                    `Anda berada berhampiran ${nearestService.service.name} (${Math.round(nearestService.distanceMeters / 1000)} km).`,
                  )}
                </span>
                <button
                  className="banner-action-button"
                  onClick={() =>
                    changeRegion(nearestService.service.id as Region)
                  }
                >
                  {tr("Switch", "Tukar")}
                </button>
                <button
                  className="icon-button"
                  aria-label="Dismiss suggestion"
                  onClick={() => setDismissCitySuggest(true)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          <div className="map-city-label">
            <span>
              {mode === "3d"
                ? tr("A DIFFERENT PERSPECTIVE", "PERSPEKTIF BERBEZA")
                : tr("EXPLORE YOUR CITY", "TEROKAI BANDAR ANDA")}
            </span>
            <h2>{service.name.split(" · ")[0]}</h2>
          </div>
          {userLocation && showSurroundings && nearestStop && !vehicle && !selectedStop && (
            <div
              className="surroundings-card"
              role="region"
              aria-label={tr("Your surroundings", "Sekitar anda")}
            >
              <div className="surroundings-top">
                <span className="surroundings-badge">
                  <Navigation size={12} />
                  {tr("YOUR SURROUNDINGS", "SEKITAR ANDA")}
                </span>
                <button
                  className="icon-button"
                  aria-label={tr("Close surroundings", "Tutup maklumat sekitar")}
                  onClick={() => setShowSurroundings(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="surroundings-body">
                <strong>{nearestStop.stop.name}</strong>
                <p>
                  {nearestStop.distanceMeters < 1000
                    ? `${nearestStop.distanceMeters} m`
                    : `${(nearestStop.distanceMeters / 1000).toFixed(1)} km`}{" "}
                  · ~{Math.max(1, Math.round(nearestStop.distanceMeters / 80))}{" "}
                  {tr("min walk", "min jalan")}
                </p>
              </div>
              <button
                className="surroundings-action"
                onClick={() => {
                  setSelectedStop(nearestStop.stop.id);
                  setSelectedId(null);
                }}
              >
                <span>{tr("View stop & arrivals", "Lihat hentian & ketibaan")}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          {vehicle && (
            <div className="vehicle-detail" aria-live="polite">
              <div className="detail-top">
                <span
                  className="route-badge"
                  style={{ color: vehicleRoute?.color ?? "#b3f56b" }}
                >
                  <BusFront size={14} />
                  {vehicle.routeId || tr("Live vehicle", "Kenderaan langsung")}
                </span>
                <span className="detail-source">
                  {vehicle.source === "simulator"
                    ? tr("SIMULATED GPS", "GPS SIMULASI")
                    : "GTFS REALTIME"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Close vehicle details"
                  onClick={() => {
                    setSelectedId(null);
                    setFollow(false);
                  }}
                >
                  <X size={17} />
                </button>
              </div>
              <h2>{vehicle.label}</h2>
              <p>
                {vehicleRoute?.destination ??
                  tr(
                    "Official vehicle position · route metadata unavailable",
                    "Kedudukan rasmi · metadata laluan tidak tersedia",
                  )}
              </p>
              <div className="vehicle-metrics">
                <div>
                  <span>{tr("Speed", "Kelajuan")}</span>
                  <strong>
                    {vehicle.speedKnown === false
                      ? "—"
                      : Math.round(vehicle.speed)}
                    <small> km/h</small>
                  </strong>
                </div>
                <div>
                  <span>{tr("On board", "Dalam bas")}</span>
                  <strong className="occupancy-label">
                    {vehicle.occupancy === "unknown"
                      ? "—"
                      : vehicle.occupancy === "low"
                        ? tr("Plenty of room", "Banyak ruang")
                        : vehicle.occupancy === "medium"
                          ? tr("Some seats", "Ada tempat")
                          : tr("Busy", "Sibuk")}
                  </strong>
                </div>
                <div>
                  <span>{tr("Status", "Status")}</span>
                  <strong
                    className={vehicle.delay ? "text-amber" : "text-green"}
                  >
                    {vehicle.source === "gtfs-rt" &&
                    Date.now() - vehicle.timestamp > 120000
                      ? tr("Stale GPS", "GPS lapuk")
                      : vehicle.delay
                        ? `+${vehicle.delay} min`
                        : tr("Moving", "Bergerak")}
                  </strong>
                </div>
              </div>
              <div className="detail-accessibility">
                <Wheelchair size={15} />
                {vehicle.source === "gtfs-rt"
                  ? tr(
                      "Accessibility not provided by feed",
                      "Aksesibiliti tidak disediakan",
                    )
                  : tr(
                      "Wheelchair space · simulated information",
                      "Ruang kerusi roda · maklumat simulasi",
                    )}
              </div>
              {vehicleRoute && vehicle.source === "simulator" && (
                <div className="upcoming-stops">
                  <div className="section-title">
                    <h3>{tr("Coming up", "Seterusnya")}</h3>
                    <span>{tr("ESTIMATED", "ANGGARAN")}</span>
                  </div>
                  {vehicleRoute.stops
                    .map((id) => ({
                      stop: regionStops.find((s) => s.id === id),
                      eta: etaForVehicle(vehicle, id),
                    }))
                    .filter((x) => x.eta !== null)
                    .sort((a, b) => a.eta! - b.eta!)
                    .slice(0, 3)
                    .map(({ stop, eta }, i) => (
                      <div className="upcoming-stop" key={stop!.id}>
                        <i className={i === 0 ? "first" : ""} />
                        <span>{stop?.name}</span>
                        <strong>
                          {eta} <small>min</small>
                        </strong>
                      </div>
                    ))}
                </div>
              )}
              <button
                className={`follow-button ${follow ? "following" : ""}`}
                onClick={() => setFollow((f) => !f)}
              >
                <LocateFixed size={16} />
                {follow
                  ? tr("Following vehicle", "Mengikuti kenderaan")
                  : tr("Follow this ride", "Ikuti perjalanan ini")}
                {follow && <span className="status-dot" />}
              </button>
              {vehicle.source === "gtfs-rt" && (
                <p className="fineprint">
                  {tr(
                    "Arrival predictions and delay data are not supplied by this official feed.",
                    "Ramalan ketibaan dan data kelewatan tidak disediakan oleh data rasmi ini.",
                  )}
                </p>
              )}
              <span className="detail-footnote">
                {vehicle.source === "simulator"
                  ? tr(
                      "Demo route & estimates · not for travel decisions",
                      "Laluan & anggaran demo · bukan panduan perjalanan",
                    )
                  : tr("Last GPS update", "Kemas kini GPS terakhir") +
                    " " +
                    new Date(vehicle.timestamp).toLocaleTimeString("en-MY")}
              </span>
            </div>
          )}
          {selectedStop &&
            (() => {
              const stop = regionStops.find((s) => s.id === selectedStop);
              if (!stop) return null;
              const arrivals = snapshot.vehicles
                .map((v) => ({ vehicle: v, eta: etaForVehicle(v, stop.id) }))
                .filter((v) => v.eta !== null)
                .sort((a, b) => a.eta! - b.eta!)
                .slice(0, 4);
              return (
                <div className="vehicle-detail stop-detail">
                  <div className="detail-top">
                    <span className="eyebrow">
                      <MapPin size={14} />
                      {tr("BUS STOP", "HENTIAN BAS")}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Close stop details"
                      onClick={() => setSelectedStop(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <h2>{stop.name}</h2>
                  <p>
                    {stop.accessible
                      ? usingOfficial
                        ? tr(
                            "Step-free access reported in GTFS",
                            "Akses tanpa tangga dalam GTFS",
                          )
                        : tr(
                            "Step-free access · demo information",
                            "Akses tanpa tangga · maklumat demo",
                          )
                      : tr(
                          "Accessibility not confirmed",
                          "Aksesibiliti belum disahkan",
                        )}
                  </p>
                  <div className="section-title">
                    <h3>{tr("Next arrivals", "Ketibaan seterusnya")}</h3>
                    <span>{tr("ESTIMATES", "ANGGARAN")}</span>
                  </div>
                  {arrivals.map((a) => (
                    <button
                      className="arrival-row"
                      key={a.vehicle.id}
                      onClick={() => selectVehicle(a.vehicle.id)}
                    >
                      <b className="route-badge">{a.vehicle.routeId}</b>
                      <span>{a.vehicle.label}</span>
                      <strong>{a.eta} min</strong>
                    </button>
                  ))}
                  {!arrivals.length && (
                    <p>
                      {tr(
                        "No estimated arrivals available.",
                        "Tiada anggaran ketibaan tersedia.",
                      )}
                    </p>
                  )}
                  <button
                    className="follow-button"
                    onClick={() => toggleFavourite(stop.id)}
                  >
                    <Bookmark size={16} />
                    {favourite(stop.id)
                      ? tr("Saved to favourites", "Disimpan ke kegemaran")
                      : tr("Save this stop", "Simpan hentian ini")}
                  </button>
                </div>
              );
            })()}
          <div className="map-bottom">
            <div className="map-legend">
              <span>
                <i style={{ background: "#b3f56b" }} />
                {tr("City", "Bandar")}
              </span>
              <span>
                <i style={{ background: "#75baff" }} />
                {tr("Waterfront", "Persisiran")}
              </span>
              <span>
                <i style={{ background: "#d6a1ff" }} />
                {tr("Connections", "Sambungan")}
              </span>
              {filter && (
                <button onClick={() => setFilter(null)}>
                  <X size={12} />
                  {tr("Clear filter", "Padam penapis")}
                </button>
              )}
            </div>
            <button
              className="report-fab"
              onClick={() => {
                setPicked(null);
                setShowReport(true);
              }}
            >
              <Plus size={17} />
              <span>{tr("Report an issue", "Laporkan isu")}</span>
            </button>
          </div>
          <div className="network-strip">
            <span>
              <span className={`status-dot ${connected ? "" : "muted"}`} />
              <b>{displayedVehicles.length}</b>{" "}
              {tr("vehicles in view", "kenderaan dalam paparan")}
            </span>
            <span className="network-source">
              {mode === "3d"
                ? tr(
                    "Malaysia geography · OpenStreetMap",
                    "Geografi Malaysia · OpenStreetMap",
                  )
                : usingOfficial
                  ? tr(
                      `${service.operator} · official GTFS network`,
                      `${service.operator} · rangkaian GTFS rasmi`,
                    )
                  : tr(
                      "Pilot · illustrative routes",
                      "Perintis · laluan ilustrasi",
                    )}
            </span>
            <button
              onClick={() => {
                setFeed((f) => (f === "demo" ? "live" : "demo"));
                if (region === "uthm" || region === "uthm-pagoh")
                  changeRegion("johor");
                else if (region !== "johor") {
                  changeRegion("johor");
                  setFeed("demo");
                }
                setFilter(null);
                setSelectedId(null);
                setFollow(false);
                setSelectedStop(null);
                setShowPlanner(false);
                setMode("2d");
              }}
            >
              <Radio size={12} />
              {feed === "demo"
                ? tr("Try official feed", "Cuba data rasmi")
                : tr("Use separate demo", "Guna demo berasingan")}
              <ChevronRight size={12} />
            </button>
          </div>
        </section>
      </main>
      {showReport && (
        <ReportDialog
          locale={locale}
          region={region}
          networkStops={regionStops}
          picked={picked}
          online={online}
          onClose={() => setShowReport(false)}
          onPick={() => {
            setShowReport(false);
            setPicking(true);
            setMode("2d");
          }}
          onSubmit={() => {
            setShowReport(false);
            void refreshReports();
            notify(
              tr(
                "Thank you. Your report is now in the community and operator inbox.",
                "Terima kasih. Laporan anda kini dalam peti masuk komuniti dan operator.",
              ),
            );
          }}
        />
      )}
      {showLogin && (
        <Dialog
          title={tr("Welcome to operations.", "Selamat datang ke operasi.")}
          onClose={() => setShowLogin(false)}
        >
          <p>
            {tr(
              "Sign in to acknowledge reports and keep the community informed.",
              "Log masuk untuk menerima laporan dan memaklumkan komuniti.",
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void authenticate(false);
            }}
          >
            <label className="form-label">
              {tr("Operator password", "Kata laluan operator")}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {authError && (
              <p className="form-error" role="alert">
                {authError}
              </p>
            )}
            <button className="primary-button wide" disabled={authBusy}>
              {authBusy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <LockKeyhole size={16} />
              )}{" "}
              {tr("Sign in", "Log masuk")}
            </button>
          </form>
          {demoAvailable && (
            <>
              <div className="or-divider">
                {tr("CODEFEST DEMO", "DEMO CODEFEST")}
              </div>
              <button
                className="secondary-button wide"
                disabled={authBusy}
                onClick={() => void authenticate(true)}
              >
                <Sparkles size={16} />
                {tr("Enter demo operator session", "Masuk sesi operator demo")}
              </button>
              <p className="fineprint">
                {tr(
                  "Local demonstration access. Disable this before public deployment.",
                  "Akses demonstrasi tempatan. Nyahaktifkan sebelum pelancaran awam.",
                )}
              </p>
            </>
          )}
        </Dialog>
      )}
      {showInfo && (
        <Dialog
          title={tr("A city in motion.", "Bandar yang bergerak.")}
          onClose={() => setShowInfo(false)}
        >
          <p>
            {tr(
              "GERAK connects the everyday journey with the places and people around it. Built in Malaysia, for Malaysia.",
              "GERAK menghubungkan perjalanan harian dengan tempat dan masyarakat. Dibina di Malaysia, untuk Malaysia.",
            )}
          </p>
          <div className="info-block">
            <h3>{tr("Know what you’re seeing", "Kenali paparan anda")}</h3>
            <p>
              {tr(
                "Demo mode uses real place names with illustrative routes, arrivals, accessibility and occupancy. Live mode requests official data.gov.my vehicle positions; unavailable or stale data is labelled.",
                "Mod demo menggunakan nama tempat sebenar dengan laluan, ketibaan, aksesibiliti dan kapasiti ilustrasi. Mod langsung meminta kedudukan rasmi data.gov.my; data tidak tersedia atau lapuk dilabelkan.",
              )}
            </p>
            <p>
              {tr(
                "3D uses real OpenStreetMap roads, coastline and building footprints via OpenFreeMap. Building heights can be estimated; this is not surveyed terrain. Bus models stay anchored to their source GPS positions.",
                "Paparan 3D menggunakan jalan, garis pantai dan tapak bangunan OpenStreetMap melalui OpenFreeMap. Ketinggian bangunan mungkin anggaran; ini bukan rupa bumi hasil ukur. Bas mengikut koordinat GPS sumber.",
              )}
            </p>
          </div>
          <div className="info-links">
            <a href="/sources" target="_blank" rel="noreferrer">
              {tr("All sources & APIs", "Semua sumber & API")}
              <ChevronRight size={14} />
            </a>
            <a
              href="https://developer.data.gov.my/realtime-api/gtfs-realtime"
              target="_blank"
              rel="noreferrer"
            >
              data.gov.my <ChevronRight size={14} />
            </a>
            <a
              href="https://www.uthm.edu.my/en/transportation"
              target="_blank"
              rel="noreferrer"
            >
              UTHM transport <ChevronRight size={14} />
            </a>
          </div>
          <button
            className="primary-button wide"
            onClick={() => {
              if (installEvent) {
                void installEvent.prompt().then(() => setInstallEvent(null));
              } else
                notify(
                  tr(
                    "In your browser menu, choose Install app or Add to Home Screen. Installation requires HTTPS or localhost.",
                    "Dalam menu pelayar, pilih Pasang aplikasi atau Tambah ke Skrin Utama. Pemasangan memerlukan HTTPS atau localhost.",
                  ),
                );
            }}
          >
            <Download size={16} />
            {tr("Install GERAK", "Pasang GERAK")}
          </button>
          <p className="fineprint">
            {tr(
              "A lightweight home for your daily journeys. Cached routes remain available offline after your first visit.",
              "Aplikasi ringan untuk perjalanan harian. Laluan cache tersedia di luar talian selepas lawatan pertama.",
            )}
          </p>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <span className="eyebrow">GERAK · COMMUNITY & MOBILITY</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={21} />
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
function ReportCard({
  report,
  locale,
  onSelect,
}: {
  report: CivicReport;
  locale: Locale;
  onSelect?: () => void;
}) {
  const category = categories.find((c) => c.id === report.category),
    Icon = category?.icon ?? MapPin;
  return (
    <article className="report-card">
      <div className="report-card-top">
        <span className="report-category">
          <Icon size={16} />
          {category?.[locale === "en" ? "en" : "ms"]}
        </span>
        <span className={`report-status ${report.status}`}>
          {statusNames[report.status][locale === "en" ? 0 : 1]}
        </span>
      </div>
      <h3>{report.title}</h3>
      <p>{report.description}</p>
      {report.image && (
        <img className="report-image" src={report.image} alt={report.title} />
      )}
      <div className="report-card-bottom">
        <button onClick={onSelect} disabled={!onSelect}>
          <MapPin size={12} />
          {report.location}
        </button>
        <span>
          {new Date(report.createdAt).toLocaleDateString(
            locale === "ms" ? "ms-MY" : "en-MY",
            { day: "numeric", month: "short" },
          )}
          {report.source === "demo" ? " · Demo" : ""}
        </span>
      </div>
    </article>
  );
}
function ReportDialog({
  locale,
  region,
  networkStops,
  picked,
  online,
  onClose,
  onPick,
  onSubmit,
}: {
  locale: Locale;
  region: Region;
  networkStops: Stop[];
  picked: Coordinate | null;
  online: boolean;
  onClose: () => void;
  onPick: () => void;
  onSubmit: () => void;
}) {
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const availableStops = networkStops;
  const [category, setCategory] = useState<ReportCategory>("damaged-stop"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [locationId, setLocationId] = useState(availableStops[0]?.id ?? ""),
    [image, setImage] = useState<string | undefined>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draftSaved, setDraftSaved] = useState(false);
  const stop = availableStops.find((s) => s.id === locationId)!;
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("gerak:report-draft") ?? "null",
      );
      if (saved) {
        setCategory(saved.category);
        setTitle(saved.title);
        setDescription(saved.description);
        if (availableStops.some((s) => s.id === saved.locationId))
          setLocationId(saved.locationId);
        setImage(saved.image);
      }
    } catch {}
  }, []); // draft read once on open
  const saveDraft = () => {
    try {
      localStorage.setItem(
        "gerak:report-draft",
        JSON.stringify({ category, title, description, locationId, image }),
      );
      setDraftSaved(true);
    } catch {
      setError(
        tr(
          "Storage is full. Try removing the photo.",
          "Storan penuh. Cuba buang foto.",
        ),
      );
    }
  };
  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    if (
      !/^image\/(jpeg|png|webp)$/.test(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError(
        tr(
          "Choose a JPG, PNG or WebP photo under 8 MB.",
          "Pilih foto JPG, PNG atau WebP bawah 8 MB.",
        ),
      );
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setImage(canvas.toDataURL("image/jpeg", 0.72));
      bitmap.close();
      setError("");
    } catch {
      setError(
        tr("This image could not be read.", "Imej ini tidak dapat dibaca."),
      );
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked && !stop) {
      setError(tr("Choose a location on the map.", "Pilih lokasi pada peta."));
      return;
    }
    if (!online) {
      saveDraft();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          description,
          coordinate: picked ?? stop.coordinate,
          location: picked
            ? `${tr("Map location", "Lokasi peta")} · ${picked[1].toFixed(5)}, ${picked[0].toFixed(5)}`
            : stop.name,
          image,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw Error(
          typeof data.error === "string"
            ? data.error
            : "Please check your report and try again.",
        );
      localStorage.removeItem("gerak:report-draft");
      onSubmit();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr(
              "Could not submit. Save a draft and retry.",
              "Gagal dihantar. Simpan draf dan cuba lagi.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={tr(
        "A small act. A better city.",
        "Tindakan kecil. Bandar lebih baik.",
      )}
      onClose={onClose}
    >
      <p>
        {tr(
          "Tell us what needs attention. Your report is public and goes directly to the operator inbox.",
          "Beritahu kami apa yang perlu perhatian. Laporan anda terbuka dan dihantar terus ke peti masuk operator.",
        )}
      </p>
      <form onSubmit={submit}>
        <div className="category-grid">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={category === c.id ? "selected" : ""}
              onClick={() => setCategory(c.id)}
            >
              <c.icon size={20} />
              <span>{c[locale === "en" ? "en" : "ms"]}</span>
            </button>
          ))}
        </div>
        <label className="form-label">
          {tr("What’s the issue?", "Apakah isunya?")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr(
              "e.g. Broken shelter at JB Sentral",
              "cth. Bumbung hentian rosak di JB Sentral",
            )}
            minLength={5}
            maxLength={100}
            required
          />
        </label>
        <label className="form-label">
          {tr("A little more detail", "Maklumat lanjut")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr(
              "What did you notice? Keep personal details out of your report.",
              "Apa yang anda perhatikan? Jangan sertakan maklumat peribadi.",
            )}
            minLength={10}
            maxLength={1500}
            rows={3}
            required
          />
        </label>
        <div className="location-form">
          <label className="form-label">
            {tr("Where is it?", "Di manakah lokasinya?")}
            {picked ? (
              <span className="picked-location">
                <MapPin size={16} />
                {picked[1].toFixed(5)}, {picked[0].toFixed(5)}
              </span>
            ) : (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {availableStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              saveDraft();
              onPick();
            }}
          >
            <MapPin size={16} />
            {tr("Pick on map", "Pilih pada peta")}
          </button>
        </div>
        <label className="image-upload">
          <Camera size={18} />
          {image
            ? tr("Change photo", "Tukar foto")
            : tr("Add a photo (optional)", "Tambah foto (pilihan)")}
          <span>JPG, PNG · 8 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void chooseImage(e.target.files?.[0])}
          />
        </label>
        {image && (
          <div className="image-preview">
            <img src={image} alt="Report attachment preview" />
            <button
              type="button"
              className="icon-button"
              onClick={() => setImage(undefined)}
              aria-label="Remove photo"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {draftSaved && (
          <p className="draft-message" role="status">
            <Check size={14} />
            {tr(
              "Draft saved on this device.",
              "Draf disimpan pada peranti ini.",
            )}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={saveDraft}
          >
            {tr("Save draft", "Simpan draf")}
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}{" "}
            {online
              ? tr("Submit report", "Hantar laporan")
              : tr("Save offline draft", "Simpan draf luar talian")}
          </button>
        </div>
        <p className="fineprint">
          {tr(
            "Not an emergency service. For immediate danger in Malaysia, call 999. Reports here are not automatically forwarded to a government authority.",
            "Bukan perkhidmatan kecemasan. Jika dalam bahaya, hubungi 999. Laporan tidak dihantar secara automatik kepada pihak berkuasa.",
          )}
        </p>
      </form>
    </Dialog>
  );
}
