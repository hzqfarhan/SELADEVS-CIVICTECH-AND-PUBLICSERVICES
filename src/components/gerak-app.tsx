"use client";

import { LocationSearch } from "./location-search";
import { AppearancePicker } from "./appearance-picker";
import { journeyInputIssue } from "@/lib/stop-search";
import { VehiclePicker } from "./vehicle-picker";
import { JourneyBuses } from "./journey-buses";
import {
  BudgetPanel,
  JourneyFare,
  PassengerSelector,
  useFarePreferences,
} from "./fare-budget";
import { ft } from "@/lib/fare-copy";
import { sortJourneysByFare } from "@/lib/fares";
import { RideStatus } from "./ride-status";
import { ReportDemo } from "./report-demo";
import { WhatIf } from "./what-if";
import type { TransportMapProps } from "./map-types";
import { SERVICES, serviceFor } from "@/lib/feeds";
import { uniqueRouteColors, routeColor } from "@/lib/route-colors";
import { useState, useEffect, useMemo, useRef, useId } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
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
  Maximize2,
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
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
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
import {
  routes,
  stops,
  etaForVehicle,
  planJourney,
  reachableStops,
  distance,
} from "@/lib/transit";
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
const viewPaths: Record<View, string> = {
  explore: "/buses",
  routes: "/routes",
  community: "/community",
  saved: "/saved",
  operator: "/operator",
};
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

type GerakAppProps = {
  initialView?: View;
  initialJourney?: boolean;
  initialBus?: string;
};

export default function GerakApp(props: GerakAppProps) {
  const routeKey = props.initialJourney
    ? "plan"
    : (props.initialView ?? "explore");

  return <GerakAppContent key={routeKey} {...props} />;
}

function GerakAppContent({
  initialView = "explore",
  initialJourney = false,
  initialBus,
}: GerakAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const farePreferences = useFarePreferences();
  const [trafficReportContext, setTrafficReportContext] = useState("");
  const [reportDemoScenario, setReportDemoScenario] = useState(0);
  const [mapScenario, setMapScenario] =
    useState<TransportMapProps["scenario"]>(null);
  const [reportDemoStage, setReportDemoStage] = useState(0);
  const [reportFilter, setReportFilter] = useState<"all" | "open" | "resolved">(
    "all",
  );
  const [reportSearch, setReportSearch] = useState("");
  const [locale, setLocale] = useState<Locale>("en"),
    [view, setView] = useState<View>(initialView),
    [region, setRegion] = useState<Region>("johor"),
    [mode, setMode] = useState<"2d" | "3d">("3d");
  const [feed, setFeed] = useState<"demo" | "live">("live"),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [detailVehicleId, setDetailVehicleId] = useState<string | null>(null),
    [follow, setFollow] = useState(false),
    [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [favourites, setFavourites] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [showReport, setShowReport] = useState(false),
    [editingReport, setEditingReport] = useState<CivicReport | null>(null),
    [managingReport, setManagingReport] = useState<CivicReport | null>(null),
    [viewingReport, setViewingReport] = useState<CivicReport | null>(null),
    [pendingManageReport, setPendingManageReport] =
      useState<CivicReport | null>(null),
    [picking, setPicking] = useState(false),
    [picked, setPicked] = useState<Coordinate | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null),
    [showSurroundings, setShowSurroundings] = useState(true),
    [dismissCitySuggest, setDismissCitySuggest] = useState(false);
  const [origin, setOrigin] = useState("jb-sentral"),
    [destination, setDestination] = useState("ksl"),
    [planned, setPlanned] = useState(false),
    [accessible, setAccessible] = useState(false),
    [showPlanner, setShowPlanner] = useState(initialJourney),
    [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null),
    [showInfo, setShowInfo] = useState(false),
    [panelOpen, setPanelOpen] = useState(true),
    [panelRouteOpen, setPanelRouteOpen] = useState(false),
    [heatmap, setHeatmap] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const initialBusHandled = useRef<string | null>(null);
  const manualPanelNavigation = useRef(false);
  const [focusLocation, setFocusLocation] = useState<{
    coordinate: Coordinate;
    key: number;
  } | null>(null);
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
  const { snapshot, reports, online, connected, refreshReports, addReport } =
    useNetwork(region, feed);
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const visibleReports = reports.filter(
    (report) =>
      reportFilter === "all" ||
      (reportFilter === "resolved"
        ? report.status === "resolved"
        : report.status !== "resolved"),
  );
  const communityReports = visibleReports
    .filter((report) =>
      `${report.title} ${report.location} ${report.description}`
        .toLowerCase()
        .includes(reportSearch.trim().toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const reportFilters = (
    <div
      className="report-filters"
      role="group"
      aria-label={tr("Filter reports", "Tapis laporan")}
    >
      {(["all", "open", "resolved"] as const).map((value) => (
        <button
          key={value}
          aria-pressed={reportFilter === value}
          onClick={() => setReportFilter(value)}
        >
          {value === "all"
            ? tr("All", "Semua")
            : value === "open"
              ? tr("Open", "Terbuka")
              : tr("Resolved", "Selesai")}
        </button>
      ))}
    </div>
  );
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
    const officialRoutes = officialNetwork?.routes ?? [];
    const baseRoutes =
      usingOfficial && officialRoutes.length > 0
        ? officialRoutes
        : routes.filter((r) => r.region === region);
    const colors = uniqueRouteColors(baseRoutes.map((r) => r.id));
    // If the feed provides uniform or monochromatic colors (e.g. data.gov.my BAS.MY setting every route to #FF40B4 in JB),
    // override with unique distinct vibrant colors so each line is easily identifiable.
    const uniqueColorsInFeed = new Set(
      baseRoutes.map((r) => (r.color || "").toLowerCase()).filter(Boolean),
    );
    const isMonochromatic = uniqueColorsInFeed.size <= 1;

    return baseRoutes.map((r) => ({
      ...r,
      color:
        isMonochromatic || !r.color
          ? colors.get(r.id) || routeColor(r.id)
          : r.color,
    }));
  }, [region, usingOfficial, officialNetwork]);
  const regionStops = useMemo(
    () =>
      usingOfficial &&
      officialNetwork?.stops &&
      officialNetwork.stops.length > 0
        ? officialNetwork.stops
        : stops.filter((s) => s.region === region),
    [region, usingOfficial, officialNetwork],
  );
  // Each picker offers only the endpoints planJourney can actually pair up, so
  // an unreachable place never appears as a suggestion.
  const reachableDestinations = useMemo(
    () =>
      origin
        ? reachableStops(origin, regionRoutes, regionStops, accessible, true)
        : null,
    [origin, accessible, regionRoutes, regionStops],
  );
  const reachableOrigins = useMemo(
    () =>
      destination
        ? reachableStops(
            destination,
            regionRoutes,
            regionStops,
            accessible,
            false,
          )
        : null,
    [destination, accessible, regionRoutes, regionStops],
  );
  const destinationChoices = useMemo(
    () =>
      reachableDestinations
        ? regionStops.filter((s) => reachableDestinations.has(s.id))
        : regionStops,
    [regionStops, reachableDestinations],
  );
  const originChoices = useMemo(
    () =>
      reachableOrigins
        ? regionStops.filter((s) => reachableOrigins.has(s.id))
        : regionStops,
    [regionStops, reachableOrigins],
  );
  const stopName = (id: string) =>
    regionStops.find((s) => s.id === id)?.name ?? id;
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
    return () => {
      controller.abort();
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
      const savedMode = localStorage.getItem("gerak:mode");
      if (savedMode === "2d" || savedMode === "3d") setMode(savedMode);
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
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
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
            registration.active?.postMessage({
              type: "CACHE_APP_ASSETS",
              urls,
            });
          })
          .catch(() => {});
      } else {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ),
          )
          .then(() =>
            "caches" in window
              ? caches
                  .keys()
                  .then((keys) =>
                    Promise.all(
                      keys
                        .filter((key) => key.startsWith("gerak-"))
                        .map((key) => caches.delete(key)),
                    ),
                  )
              : undefined,
          )
          .catch(() => {});
      }
    }
    return () => window.removeEventListener("beforeinstallprompt", prompt);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "ms" ? "ms" : "en";
    try {
      localStorage.setItem("gerak:locale", locale);
    } catch {}
  }, [locale]);
  useEffect(() => {
    try {
      localStorage.setItem("gerak:mode", mode);
    } catch {}
  }, [mode]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setView(initialView);
    setShowPlanner(initialJourney);
    setPanelOpen(true);
    setPanelRouteOpen(true);
  }, [initialView, initialJourney]);
  const panelVisible = panelOpen || panelRouteOpen;
  const showMap = () => {
    setPanelRouteOpen(false);
    setPanelOpen(false);
  };
  const planning = view === "explore" && showPlanner;
  const sectionTitle =
    view === "operator"
      ? tr("Operator dashboard", "Papan operator")
      : view === "community"
        ? tr("Community", "Komuniti")
        : view === "saved"
          ? tr("Saved journeys", "Perjalanan disimpan")
          : view === "routes"
            ? tr("Routes & stops", "Laluan & hentian")
            : planning
              ? tr("Plan your journey", "Rancang perjalanan")
              : tr("Live buses", "Bas langsung");
  const sectionLabel = planning
    ? tr("Journey", "Perjalanan")
    : view === "explore"
      ? tr("Buses", "Bas")
      : view === "routes"
        ? tr("Routes", "Laluan")
        : view === "community"
          ? tr("Community", "Komuniti")
          : view === "saved"
            ? tr("Saved", "Disimpan")
            : tr("Operator", "Operator");
  const navigateTo = (next: View, journey = false) => {
    const changed = next !== view || journey !== showPlanner;
    const nextPath = journey ? "/plan" : viewPaths[next];
    manualPanelNavigation.current = true;
    if (nextPath === "/buses") {
      initialBusHandled.current = initialBus ?? "manual-navigation";
    }
    setView(next);
    setShowPlanner(journey);
    setPanelRouteOpen(true);
    setPanelOpen(true);
    setPicking(false);
    if (nextPath === "/buses" && pathname === "/buses") {
      window.history.replaceState(window.history.state, "", nextPath);
    } else if (pathname !== nextPath) {
      router.push(nextPath);
    }
    if (changed) setSearch("");
    requestAnimationFrame(() => {
      setPanelOpen(true);
      if (changed && panelRef.current) panelRef.current.scrollTop = 0;
      panelRef.current
        ?.querySelector<HTMLElement>("h1")
        ?.focus({ preventScroll: true });
    });
  };
  const showLocation = (coordinate: Coordinate) => {
    setFollow(false);
    setFocusLocation({ coordinate, key: Date.now() });
    if (window.matchMedia("(max-width: 960px)").matches) showMap();
  };
  const changeRegion = (next: Region) => {
    setRegion(next);
    setSearch("");
    setFocusLocation(null);
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
  const selectVehicle = (id: string, openMap = true) => {
    setFocusLocation(null);
    if (openMap && window.matchMedia("(max-width: 960px)").matches) {
      showMap();
    }
    setFollow(true);
    setDetailVehicleId(null);
    setSelectedId(id);
    setSelectedStop(null);
  };
  useEffect(() => {
    if (pathname !== "/buses") return;
    if (!initialBus || initialBusHandled.current === initialBus) return;
    if (snapshot.vehicles.length === 0) return;

    const requestedVehicle =
      initialBus === "random"
        ? snapshot.vehicles[
            Math.floor(Math.random() * snapshot.vehicles.length)
          ]
        : snapshot.vehicles.find((candidate) => candidate.id === initialBus);
    if (!requestedVehicle) return;

    initialBusHandled.current = initialBus;
    selectVehicle(requestedVehicle.id, !manualPanelNavigation.current);
    if (initialBus === "random") {
      router.replace(`/buses?bus=${encodeURIComponent(requestedVehicle.id)}`, {
        scroll: false,
      });
    }
  }, [initialBus, pathname, router, snapshot.vehicles]);
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
  const sortedJourneys = useMemo(() => {
    const asOf = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return sortJourneysByFare(
      journey,
      origin,
      destination,
      regionStops,
      farePreferences.profile,
      asOf,
    );
  }, [journey, origin, destination, regionStops, farePreferences.profile]);
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
      if (pendingManageReport) {
        setManagingReport(pendingManageReport);
        setPendingManageReport(null);
      }
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
      await refreshReports(true);
      setManagingReport(null);
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
  const deleteCommunityReport = async (report: CivicReport) => {
    if (
      !window.confirm(
        tr(
          `Delete report ${report.id}? This cannot be undone.`,
          `Padam laporan ${report.id}? Tindakan ini tidak boleh dibatalkan.`,
        ),
      )
    )
      return;
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw Error(data?.error ?? "Unable to delete report");
      }
      await refreshReports(true);
      setManagingReport(null);
      notify(tr("Report deleted.", "Laporan dipadam."));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to delete report",
      );
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
          onClick={() => navigateTo("explore")}
          aria-label="GERAK home"
        >
          <img src="/icons/gerak-app-192.png" alt="" width={43} height={43} />
        </button>
        <div className="rail-links">
          {(
            [
              { id: "explore", icon: BusFront, en: "Live buses", ms: "Bas" },
              {
                id: "plan",
                icon: Navigation,
                en: "Plan journey",
                ms: "Rancang",
              },
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
              aria-current={
                (
                  item.id === "plan"
                    ? planning
                    : item.id === "explore"
                      ? view === "explore" && !planning
                      : view === item.id
                )
                  ? "page"
                  : undefined
              }
              className={`rail-button ${(item.id === "plan" ? planning : item.id === "explore" ? view === "explore" && !planning : view === item.id) ? "active" : ""}`}
              onPointerDown={() => {
                if (item.id === "explore" && view === "explore" && !planning) {
                  window.location.assign("/buses");
                }
              }}
              onClick={() => {
                if (item.id === "explore" && view === "explore" && !planning) {
                  window.location.assign("/buses");
                  return;
                }
                navigateTo(
                  item.id === "plan" ? "explore" : item.id,
                  item.id === "plan",
                );
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
            aria-current={view === "operator" ? "page" : undefined}
            aria-label={tr("Operator dashboard", "Papan pemuka operator")}
            title="Operator"
            onClick={() => {
              navigateTo("operator");
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
          <button
            type="button"
            className="sidebar-rail-toggle-btn"
            aria-expanded={panelOpen}
            aria-controls="journey-panel"
            onClick={() => setPanelOpen((open) => !open)}
            aria-label={
              panelOpen
                ? tr("Collapse sidebar", "Kecilkan panel")
                : tr("Expand sidebar", "Buka panel")
            }
            title={
              panelOpen
                ? tr("Collapse sidebar", "Kecilkan panel")
                : tr("Expand sidebar", "Buka panel")
            }
          >
            {panelOpen ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
          </button>
          <button className="wordmark" onClick={() => navigateTo("explore")}>
            <img
              className="brand-app-icon"
              src="/icons/gerak-app-192.png"
              alt=""
              width={30}
              height={30}
            />
            gerak<span>↗</span>
          </button>
          <span className="brand-divider" />
          <span className="brand-tagline">
            {tr("A better way to move.", "Bergerak lebih baik.")}
          </span>
        </div>
        <div className="topbar-right">
          <AppearancePicker locale={locale} />
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
            aria-label={
              view === "operator"
                ? tr("Passenger view", "Paparan penumpang")
                : tr("Operator console", "Konsol operator")
            }
            title={
              view === "operator"
                ? tr("Passenger view", "Paparan penumpang")
                : tr("Operator console", "Konsol operator")
            }
            onClick={() => {
              navigateTo(view === "operator" ? "explore" : "operator");
            }}
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
      <div
        className="mobile-view-switch"
        role="group"
        aria-label={tr("Passenger workspace", "Paparan penumpang")}
      >
        <button
          aria-pressed={panelVisible}
          onClick={() => {
            setPanelRouteOpen(true);
            setPanelOpen(true);
          }}
        >
          <Route size={17} />
          {sectionLabel}
        </button>
        <button aria-pressed={!panelVisible} onClick={showMap}>
          <MapPin size={17} />
          {tr("Map", "Peta")}
        </button>
      </div>
      <main className={`workspace ${panelVisible ? "" : "panel-collapsed"}`}>
        <section
          id="journey-panel"
          ref={panelRef}
          hidden={!panelVisible}
          className={`side-panel tab-${view} ${planning ? "planning-panel" : ""} ${view === "explore" || view === "routes" ? "browse-panel" : ""}`}
          aria-label={tr(
            "Journey and network details",
            "Butiran perjalanan dan rangkaian",
          )}
        >
          <div className="panel-heading">
            <div className="panel-heading-row">
              <span className="eyebrow">
                <span className="tiny-star">✳</span>{" "}
                {view === "operator"
                  ? tr("CONTROL CENTRE", "PUSAT KAWALAN")
                  : tr("YOUR CITY, CONNECTED", "BANDAR ANDA, TERHUBUNG")}
              </span>
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={showMap}
                aria-label={tr("Collapse sidebar", "Kecilkan panel sisi")}
                title={tr("Collapse sidebar (minimize)", "Kecilkan panel sisi")}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            <h1 tabIndex={-1}>{sectionTitle}</h1>
            <p>
              {planning
                ? tr(
                    "Choose two stops to compare route connections.",
                    "Pilih dua hentian untuk bandingkan sambungan laluan.",
                  )
                : view === "explore"
                  ? tr(
                      "Find a bus, then select it to follow on the map.",
                      "Pilih bas untuk mengikutinya di peta.",
                    )
                  : view === "routes"
                    ? tr(
                        "Choose a route to explore its buses and stops.",
                        "Pilih laluan untuk teroka bas dan hentian.",
                      )
                    : view === "community"
                      ? tr(
                          "Report a local issue and follow its progress.",
                          "Laporkan isu setempat dan ikuti perkembangannya.",
                        )
                      : view === "saved"
                        ? tr(
                            "Your favourite stops, routes and travel budget.",
                            "Hentian, laluan kegemaran dan bajet perjalanan.",
                          )
                        : tr(
                            "Fleet operations and the community inbox.",
                            "Operasi armada dan peti masuk komuniti.",
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
              {(planning || view === "saved") && (
                <button
                  className={`journey-cta ${showPlanner ? "open" : ""}`}
                  onClick={() => navigateTo("explore", true)}
                  aria-expanded={planning}
                >
                  <div className="journey-cta-icon">
                    <Navigation size={19} />
                  </div>
                  <span>
                    <strong>
                      {tr("Plan a journey", "Rancang perjalanan")}
                    </strong>
                    <small>
                      {tr("Plan your next journey", "Rancang perjalanan anda")}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {planning && (
                <div className="planner">
                  <LocationSearch
                    label={tr("From", "Dari")}
                    stops={regionStops}
                    candidates={originChoices}
                    value={origin}
                    locale={locale}
                    emptyMessage={
                      originChoices.length
                        ? undefined
                        : tr(
                            `No route reaches ${stopName(destination)} from anywhere here.`,
                            `Tiada laluan ke ${stopName(destination)} dari sini.`,
                          )
                    }
                    onChange={(id) => {
                      setOrigin(id);
                      setPlanned(false);
                      if (
                        id &&
                        destination &&
                        !reachableStops(
                          id,
                          regionRoutes,
                          regionStops,
                          accessible,
                          true,
                        ).has(destination)
                      )
                        setDestination("");
                    }}
                  />
                  <button
                    className="swap-button icon-button"
                    aria-label={tr(
                      "Swap origin and destination",
                      "Tukar asal dan destinasi",
                    )}
                    onClick={() => {
                      setOrigin(destination);
                      setPlanned(false);
                      // Many corridors are one-way: keep the new origin, but never
                      // carry over a destination it cannot actually reach.
                      const onward = destination
                        ? reachableStops(
                            destination,
                            regionRoutes,
                            regionStops,
                            accessible,
                            true,
                          )
                        : null;
                      setDestination(onward?.has(origin) ? origin : "");
                    }}
                  >
                    <ArrowDownUp size={15} />
                  </button>
                  <LocationSearch
                    label={tr("To", "Ke")}
                    stops={regionStops}
                    candidates={destinationChoices}
                    value={destination}
                    locale={locale}
                    emptyMessage={
                      destinationChoices.length
                        ? undefined
                        : tr(
                            `Nothing is reachable from ${stopName(origin)}. Try another origin.`,
                            `Tiada destinasi dari ${stopName(origin)}. Cuba tempat lain.`,
                          )
                    }
                    onChange={(id) => {
                      setDestination(id);
                      setPlanned(false);
                      if (
                        id &&
                        origin &&
                        !reachableStops(
                          id,
                          regionRoutes,
                          regionStops,
                          accessible,
                          false,
                        ).has(origin)
                      )
                        setOrigin("");
                    }}
                  />
                  {journeyInputIssue(regionStops, origin, destination) && (
                    <p className="planner-validation" role="status">
                      {journeyInputIssue(regionStops, origin, destination) ===
                      "same"
                        ? tr(
                            "Choose a different destination.",
                            "Pilih destinasi yang berbeza.",
                          )
                        : tr(
                            "Select both stops from the suggestions.",
                            "Pilih kedua-dua hentian daripada cadangan.",
                          )}
                    </p>
                  )}
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
                    disabled={Boolean(
                      journeyInputIssue(regionStops, origin, destination),
                    )}
                    onClick={() => setPlanned(true)}
                  >
                    {tr("Find a journey", "Cari perjalanan")}
                    <ArrowRight size={16} />
                  </button>
                  <p className="fineprint">
                    {usingOfficial
                      ? tr(
                          "Connections from published GTFS stop order. Ride time is a proportional estimate; excludes waiting and transfers. Route connections only; service dates and departure times are not checked.",
                          "Sambungan daripada urutan hentian GTFS. Masa perjalanan ialah anggaran berkadar; tidak termasuk masa menunggu dan pertukaran. Sambungan laluan sahaja; tarikh perkhidmatan dan masa berlepas tidak disemak.",
                        )
                      : tr(
                          "Illustrative corridor planner · no published timetable or fares. Accessibility is demo data.",
                          "Perancang koridor contoh · bukan jadual atau tambang rasmi. Aksesibiliti ialah data demo.",
                        )}
                  </p>
                  <PassengerSelector
                    profile={farePreferences.profile}
                    onChange={farePreferences.saveProfile}
                    locale={locale}
                  />
                  <WhatIf
                    key={`${region}:${origin}:${destination}`}
                    from={origin}
                    to={destination}
                    routes={regionRoutes}
                    stops={regionStops}
                    accessible={accessible}
                    locale={locale}
                    profile={farePreferences.profile}
                    onLocate={showLocation}
                    onScenario={setMapScenario}
                  />
                  {planned &&
                    (journey.length ? (
                      sortedJourneys.map((j, i) => (
                        <div key={i} className="fare-journey-card">
                          <details className="journey-options">
                            <summary className="journey-result">
                              <span>
                                <strong>
                                  {j.minutes
                                    ? `${j.minutes} ${tr("min ride estimate", "min anggaran perjalanan")}`
                                    : tr(
                                        "Route connection",
                                        "Sambungan laluan",
                                      )}
                                </strong>
                                <small>
                                  {j.transfers
                                    ? tr("1 transfer", "1 pertukaran")
                                    : tr("Direct journey", "Perjalanan terus")}
                                </small>
                              </span>
                              <span className="journey-expand-label">
                                {tr("View buses", "Lihat bas")}{" "}
                                <ChevronDown size={14} />
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
                            </summary>
                            <JourneyBuses
                              routes={j.routes}
                              vehicles={snapshot.vehicles}
                              locale={locale}
                              selectedId={selectedId}
                              onSelect={(id, routeId) => {
                                setFilter(routeId);
                                selectVehicle(id);
                              }}
                              onRoute={(routeId) => {
                                setFilter(routeId);
                                setSelectedId(null);
                                setDetailVehicleId(null);
                                setFollow(false);
                                setSelectedStop(null);
                                setFocusLocation(null);
                                if (
                                  window.matchMedia("(max-width: 960px)")
                                    .matches
                                )
                                  showMap();
                              }}
                            />
                          </details>
                          <JourneyFare
                            journey={j}
                            from={origin}
                            to={destination}
                            stops={regionStops}
                            profile={farePreferences.profile}
                            locale={locale}
                            onAdd={() => {
                              farePreferences.saveBudget({
                                ...farePreferences.budget,
                                recurringTrips: [
                                  ...farePreferences.budget.recurringTrips,
                                  {
                                    id: crypto.randomUUID(),
                                    region,
                                    from: origin,
                                    to: destination,
                                    routeIds: j.routes.map((r) => r.id),
                                    patternIds: j.routes.map(
                                      (r) => r.patterns?.[0]?.id ?? null,
                                    ),
                                    tripsPerDay: 1,
                                    days: 0,
                                    direction: "one_way",
                                    enabled: true,
                                  },
                                ],
                              });
                              notify(ft(locale, "saved"));
                            }}
                          />
                        </div>
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
                    view === "routes"
                      ? "Search routes or stops"
                      : view === "saved"
                        ? "Search your saved routes or stops"
                        : "Search plate, route or stop",
                    view === "routes"
                      ? "Cari laluan atau hentian"
                      : view === "saved"
                        ? "Cari laluan atau hentian disimpan"
                        : "Cari plat, laluan atau hentian",
                  )}
                  aria-label={tr(
                    view === "routes"
                      ? "Search routes or stops"
                      : view === "saved"
                        ? "Search your saved routes or stops"
                        : "Search plate, route or stop",
                    view === "routes"
                      ? "Cari laluan atau hentian"
                      : view === "saved"
                        ? "Cari laluan atau hentian disimpan"
                        : "Cari plat, laluan atau hentian",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="icon-button"
                    aria-label={tr("Clear search", "Padam carian")}
                    onClick={() => setSearch("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </>
          )}
          {filter && !planning && (
            <div className="active-route-context">
              <span>
                <small>{tr("Selected route", "Laluan dipilih")}</small>
                <strong>
                  {regionRoutes.find((r) => r.id === filter)?.name ?? filter}
                </strong>
              </span>
              <button
                aria-label={tr("Clear route filter", "Padam penapis laluan")}
                onClick={() => {
                  setFilter(null);
                  setFocusLocation(null);
                }}
              >
                <X size={16} />
              </button>
              <button
                className="route-context-action"
                onClick={() => navigateTo("explore")}
              >
                <BusFront size={15} />
                {tr("View buses", "Lihat bas")}
              </button>
              <button
                className="route-context-action"
                onClick={() => {
                  setSelectedId(null);
                  setSelectedStop(null);
                  const route = regionRoutes.find((r) => r.id === filter);
                  if (route?.path.length)
                    showLocation(route.path[Math.floor(route.path.length / 2)]);
                }}
              >
                <MapPin size={15} />
                {tr("Show on map", "Lihat peta")}
              </button>
            </div>
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
                    ? new Date(snapshot.updatedAt).toLocaleTimeString("en-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        timeZone: "Asia/Kuala_Lumpur",
                      }) + " MYT"
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
            {view === "saved" && (
              <div className="collection-intro">
                <span className="collection-icon">
                  <Bookmark size={22} />
                </span>
                <div>
                  <strong>
                    {tr("Your everyday places", "Tempat harian anda")}
                  </strong>
                  <p>
                    {regionRoutes.filter((r) => favourite(r.id)).length}{" "}
                    {tr("routes", "laluan")} ·{" "}
                    {regionStops.filter((s) => favourite(s.id)).length}{" "}
                    {tr("stops in this area", "hentian di kawasan ini")}
                  </p>
                  <small>
                    {tr("Saved on this device", "Disimpan pada peranti ini")}
                  </small>
                </div>
              </div>
            )}
            {(view === "explore" || view === "routes" || view === "saved") && (
              <>
                {view === "explore" && (
                  <VehiclePicker
                    vehicles={snapshot.vehicles}
                    routes={regionRoutes}
                    selectedId={selectedId}
                    filter={filter}
                    search={search}
                    locale={locale}
                    onSelect={selectVehicle}
                    onFilter={(id) => {
                      setFilter(id);
                      setSelectedId(null);
                      setFollow(false);
                    }}
                  />
                )}
                {view !== "explore" && (
                  <>
                    <div className="section-title">
                      <h2>
                        {view === "saved"
                          ? tr("Saved routes", "Laluan disimpan")
                          : tr("Around your city", "Sekitar bandar anda")}
                      </h2>
                      <span>
                        {
                          searchedRoutes.filter(
                            (r) => view !== "saved" || favourite(r.id),
                          ).length
                        }{" "}
                        {tr("routes", "laluan")}
                      </span>
                    </div>
                    {!searchedRoutes.filter(
                      (r) => view !== "saved" || favourite(r.id),
                    ).length &&
                      (view !== "saved" || search) && (
                        <div className="tab-empty">
                          <Route size={22} />
                          <strong>
                            {tr("No matching routes", "Tiada laluan sepadan")}
                          </strong>
                          <p>
                            {search
                              ? tr(
                                  "Try a route number or a different destination.",
                                  "Cuba nombor laluan atau destinasi lain.",
                                )
                              : tr(
                                  "Route information is not available for this service yet.",
                                  "Maklumat laluan belum tersedia untuk perkhidmatan ini.",
                                )}
                          </p>
                          {search && (
                            <button
                              className="secondary-button"
                              onClick={() => setSearch("")}
                            >
                              {tr("Clear search", "Padam carian")}
                            </button>
                          )}
                        </div>
                      )}
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
                                aria-pressed={filter === route.id}
                                onClick={() => {
                                  setFilter((f) =>
                                    f === route.id ? null : route.id,
                                  );
                                  setSelectedId(null);
                                  setFollow(false);
                                  setSelectedStop(null);
                                  setFocusLocation(null);
                                  requestAnimationFrame(() => {
                                    if (panelRef.current)
                                      panelRef.current.scrollTop = 0;
                                  });
                                }}
                              >
                                <div className="route-card-top">
                                  <span className="route-badge">
                                    <BusFront size={13} />
                                    {route.name.split(/\s+\u00b7\s+/)[0]}
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
                                    {route.stops.length}{" "}
                                    {tr("stops", "hentian")}
                                  </span>
                                  {route.source === "demo" && (
                                    <Wheelchair size={13} />
                                  )}
                                </div>
                              </button>
                              <button
                                className={`save-route ${favourite(route.id) ? "is-saved" : ""}`}
                                aria-label={`${favourite(route.id) ? tr("Unsave", "Buang simpanan") : tr("Save", "Simpan")} ${route.name}`}
                                aria-pressed={favourite(route.id)}
                                onClick={() => toggleFavourite(route.id)}
                              >
                                <Bookmark
                                  size={16}
                                  fill={
                                    favourite(route.id)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
                {view === "saved" &&
                  !regionRoutes.some((r) => favourite(r.id)) && (
                    <div className="empty-state">
                      <Bookmark size={28} />
                      <h3>
                        {tr(
                          "No saved routes here yet",
                          "Belum ada laluan disimpan di sini",
                        )}
                      </h3>
                      <p>
                        {tr(
                          "Tap the bookmark on any route or stop. Your favourites stay on this device.",
                          "Tekan penanda buku pada laluan atau hentian. Pilihan disimpan pada peranti ini.",
                        )}
                      </p>
                      <button
                        className="secondary-button"
                        onClick={() => navigateTo("routes")}
                      >
                        {tr("Browse routes", "Lihat laluan")}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                <div className="section-title">
                  <h2>
                    {view === "saved"
                      ? tr("Saved stops", "Hentian disimpan")
                      : tr("Stops to know", "Hentian pilihan")}
                  </h2>
                  <span>
                    {
                      searchedStops.filter(
                        (s) => view !== "saved" || favourite(s.id),
                      ).length
                    }
                  </span>
                </div>
                {!searchedStops.filter(
                  (s) => view !== "saved" || favourite(s.id),
                ).length && (
                  <p className="tab-empty-hint">
                    {view === "saved"
                      ? tr(
                          "Save a stop using its bookmark button. Your favourites stay on this device.",
                          "Simpan hentian dengan butang penanda buku. Pilihan kekal pada peranti ini.",
                        )
                      : tr(
                          "No stops match this search. Try another name.",
                          "Tiada hentian sepadan. Cuba nama lain.",
                        )}
                  </p>
                )}
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
                          showLocation(stop.coordinate);
                          if (window.matchMedia("(max-width: 960px)").matches)
                            showMap();
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
                        aria-label={`${favourite(stop.id) ? tr("Unsave stop", "Buang hentian") : tr("Save stop", "Simpan hentian")} ${stop.name}`}
                        aria-pressed={favourite(stop.id)}
                        onClick={() => toggleFavourite(stop.id)}
                      >
                        <Bookmark
                          size={15}
                          fill={favourite(stop.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  ))}
                {view === "explore" && (
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
                )}
              </>
            )}
            {view === "saved" && (
              <details className="saved-budget-disclosure">
                <summary>
                  <span>{tr("Transport budget", "Bajet pengangkutan")}</span>
                  <small>
                    {tr(
                      "Estimate your monthly travel costs",
                      "Anggar kos perjalanan bulanan",
                    )}
                  </small>
                </summary>
                <BudgetPanel
                  budget={farePreferences.budget}
                  profile={farePreferences.profile}
                  onChange={farePreferences.saveBudget}
                  onProfile={farePreferences.saveProfile}
                  locale={locale}
                  routes={regionRoutes}
                  stops={regionStops}
                  storageError={farePreferences.storageError}
                />
              </details>
            )}
            {view === "community" && (
              <>
                <div className="collection-intro community-intro">
                  <span className="collection-icon">
                    <MessageSquare size={22} />
                  </span>
                  <div>
                    <strong>
                      {tr(
                        "A better neighbourhood, together",
                        "Kejiranan lebih baik bersama",
                      )}
                    </strong>
                    <p>
                      {tr(
                        "Damaged stops, unsafe paths or access barriers? Send a public report to the operator inbox and track its progress here.",
                        "Hentian rosak, laluan tidak selamat atau halangan akses? Hantar laporan awam ke peti masuk operator dan ikuti perkembangannya di sini.",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  className="primary-button wide"
                  onClick={() => {
                    setPicked(null);
                    setShowReport(true);
                  }}
                >
                  <Plus size={18} />
                  {tr("Report an issue", "Laporkan isu")}
                </button>
                <div className="community-totals">
                  <div>
                    <strong>{reports.length}</strong>
                    <span>{tr("reports", "laporan")}</span>
                  </div>
                  <div>
                    <strong>
                      {reports.filter((r) => r.status === "in-progress").length}
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
                {reportFilters}
                <label className="community-search">
                  <Search size={16} />
                  <input
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    aria-label={tr(
                      "Search community reports",
                      "Cari laporan komuniti",
                    )}
                    placeholder={tr(
                      "Search issue or place",
                      "Cari isu atau tempat",
                    )}
                  />
                  {reportSearch && (
                    <button
                      type="button"
                      aria-label={tr(
                        "Clear report search",
                        "Padam carian laporan",
                      )}
                      onClick={() => setReportSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <p className="collection-result" aria-live="polite">
                  {communityReports.length}{" "}
                  {tr("reports · newest first", "laporan · terkini dahulu")}
                </p>
                {communityReports.length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare />
                    <h3>
                      {reports.length
                        ? tr(
                            "No reports in this view",
                            "Tiada laporan dalam paparan ini",
                          )
                        : tr("Be the first voice", "Jadi suara pertama")}
                    </h3>
                    <p>
                      {tr(
                        "Submit an issue and follow its progress here.",
                        "Hantar isu dan ikuti perkembangannya di sini.",
                      )}
                    </p>
                    {(reportSearch || reportFilter !== "all") && (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setReportSearch("");
                          setReportFilter("all");
                        }}
                      >
                        {tr("Show all reports", "Lihat semua laporan")}
                      </button>
                    )}
                  </div>
                ) : (
                  communityReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      locale={locale}
                      onSelect={() => {
                        setSelectedId(null);
                        setSelectedStop(null);
                        showLocation(report.coordinate);
                        showMap();
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
                    aria-label={authenticated ? "Sign out" : "Operator sign in"}
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
                      aria-pressed={opsTab === t}
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
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span className="mini-plate">
                              {v.licensePlate || v.label}
                            </span>
                          </strong>
                          <small>
                            {v.routeId} ·{" "}
                            {v.speedKnown === false ? "—" : Math.round(v.speed)}{" "}
                            km/h
                          </small>
                        </span>
                        <span className={v.delay ? "text-amber" : "text-green"}>
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
                    <ReportDemo
                      locale={locale}
                      scenario={reportDemoScenario}
                      stage={reportDemoStage}
                      onScenario={(value) => {
                        setReportDemoScenario(value);
                        setReportDemoStage(0);
                      }}
                      onStage={setReportDemoStage}
                    />
                    <div className="section-title">
                      <h2>{tr("Community inbox", "Peti masuk komuniti")}</h2>
                      <span>{reports.length}</span>
                    </div>
                    {reportFilters}
                    {visibleReports.length === 0 && (
                      <div className="empty-state">
                        <CheckCircle2 />
                        <h3>
                          {tr(
                            "No reports in this view",
                            "Tiada laporan dalam paparan ini",
                          )}
                        </h3>
                        <p>
                          {tr(
                            "Passenger reports appear here automatically.",
                            "Laporan penumpang muncul di sini secara automatik.",
                          )}
                        </p>
                      </div>
                    )}
                    {visibleReports.map((report) => (
                      <div key={report.id}>
                        <ReportCard
                          report={report}
                          locale={locale}
                          onOpen={() => {
                            if (authenticated) {
                              setManagingReport(report);
                              return;
                            }
                            setPendingManageReport(report);
                            setShowLogin(true);
                          }}
                        />
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
                            <span title={r.name}>
                              {r.name.split(/\s+\u00b7\s+/)[0]}
                            </span>
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
        <section
          className="map-workspace"
          aria-label={tr(
            "Interactive transport map",
            "Peta pengangkutan interaktif",
          )}
        >
          {!panelVisible && (
            <button
              type="button"
              className="sidebar-floating-restore-btn"
              onClick={() => setPanelOpen(true)}
              aria-label={tr(
                `Back to ${sectionLabel.toLowerCase()}`,
                `Kembali ke ${sectionLabel.toLowerCase()}`,
              )}
              title={tr("Expand sidebar", "Buka panel")}
            >
              <PanelLeftOpen size={16} />
              <span>
                {tr(
                  `Back to ${sectionLabel.toLowerCase()}`,
                  `Kembali ke ${sectionLabel.toLowerCase()}`,
                )}
              </span>
            </button>
          )}
          <TransportMap
            onModeChange={(next) => {
              setSelectedId(null);
              setSelectedStop(null);
              setFollow(false);
              setFocusLocation(null);
              setMode(next);
            }}
            locale={locale}
            journeyFrom={
              planning
                ? regionStops.find((stop) => stop.id === origin)
                : undefined
            }
            journeyTo={
              planning
                ? regionStops.find((stop) => stop.id === destination)
                : undefined
            }
            focusLocation={focusLocation}
            scenario={planning ? mapScenario : null}
            onTrafficReport={(coordinate, context) => {
              setTrafficReportContext(context);
              setPicked(coordinate);
              setPicking(false);
              setShowReport(true);
            }}
            mode={mode}
            region={region}
            vehicles={displayedVehicles}
            selectedVehicleId={selectedId}
            onSelectVehicle={selectVehicle}
            vehicleDetailsOpen={!!selectedId && detailVehicleId === selectedId}
            onOpenVehicleDetails={(id) => {
              selectVehicle(id);
              setDetailVehicleId(id);
            }}
            onFollowChange={setFollow}
            onOverview={() => {
              setFocusLocation(null);
              if (!window.matchMedia("(max-width: 960px)").matches)
                setPanelOpen(true);
              setSelectedId(null);
              setSelectedStop(null);
              setFollow(false);
              setFilter(null);
            }}
            follow={follow}
            routes={displayedRoutes}
            stops={mapStops}
            reports={reports}
            onSelectReport={(report) => {
              setSelectedId(null);
              setSelectedStop(null);
              showLocation(report.coordinate);
              setViewingReport(report);
            }}
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
          {userLocation &&
            showSurroundings &&
            nearestStop &&
            !vehicle &&
            !selectedStop && (
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
                    aria-label={tr(
                      "Close surroundings",
                      "Tutup maklumat sekitar",
                    )}
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
                    · ~
                    {Math.max(1, Math.round(nearestStop.distanceMeters / 80))}{" "}
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
                  <span>
                    {tr("View stop & arrivals", "Lihat hentian & ketibaan")}
                  </span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          {vehicle && detailVehicleId === vehicle.id && (
            <div
              className="vehicle-detail ride-detail"
              data-source={vehicle.source}
              aria-live="polite"
            >
              <div className="detail-top">
                <span
                  className="route-badge"
                  style={{ color: vehicleRoute?.color ?? "#6f9ff1" }}
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
                    setDetailVehicleId(null);
                  }}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="license-plate-header">
                <span
                  className="plate-badge"
                  title="Nombor Pendaftaran Bas / Vehicle Registration Plate"
                >
                  <span className="plate-flag">🇲🇾</span>
                  <span className="plate-code">
                    {vehicle.licensePlate || vehicle.label}
                  </span>
                </span>
                <span className="plate-route-chip">
                  {vehicleRoute?.name ?? vehicle.routeId}
                </span>
              </div>
              <h2>{vehicle.label}</h2>
              <p>
                {vehicleRoute?.destination ??
                  tr(
                    "Official vehicle position · route metadata unavailable",
                    "Kedudukan rasmi · metadata laluan tidak tersedia",
                  )}
              </p>
              <RideStatus
                vehicle={vehicle}
                route={vehicleRoute}
                stops={regionStops}
              />
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
                        : vehicle.speedKnown === false
                          ? tr("Unknown", "Tidak diketahui")
                          : vehicle.speed < 1
                            ? tr("Stopped", "Berhenti")
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
                      <div
                        className="upcoming-stop"
                        key={`${stop?.id || i}-${i}`}
                      >
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
                  ? tr("Stop following", "Berhenti mengikuti")
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
              {regionRoutes.length > 0 ? (
                <>
                  {(filter
                    ? [
                        regionRoutes.find((r) => r.id === filter)!,
                        ...regionRoutes
                          .filter((r) => r.id !== filter)
                          .slice(0, 4),
                      ].filter(Boolean)
                    : regionRoutes.slice(0, 5)
                  ).map((r) => (
                    <button
                      className="legend-route"
                      aria-label={tr(
                        `Filter route ${r.name}`,
                        `Tapis laluan ${r.name}`,
                      )}
                      aria-pressed={filter === r.id}
                      key={r.id}
                      onClick={() => setFilter(filter === r.id ? null : r.id)}
                      style={{
                        cursor: "pointer",
                        opacity: filter && filter !== r.id ? 0.45 : 1,
                        transition: "opacity 0.2s ease",
                      }}
                      title={
                        filter === r.id
                          ? tr("Show all routes", "Tunjuk semua laluan")
                          : `${tr("Filter route", "Tapis laluan")}: ${r.name}`
                      }
                    >
                      <i style={{ background: r.color }} />
                      {r.name.split(/\s+\u00b7\s+/)[0]}
                    </button>
                  ))}
                  {regionRoutes.length > 5 && (
                    <button
                      className="legend-route"
                      onClick={() => navigateTo("routes")}
                      style={{
                        cursor: "pointer",
                        opacity: 0.75,
                        fontSize: "9px",
                      }}
                      title={tr(
                        "View all routes in panel",
                        "Lihat semua laluan di panel",
                      )}
                    >
                      +{regionRoutes.length - 5} {tr("more", "lagi")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span>
                    <i style={{ background: "#6f9ff1" }} />
                    {tr("Route 1", "Laluan 1")}
                  </span>
                  <span>
                    <i style={{ background: "#75baff" }} />
                    {tr("Route 2", "Laluan 2")}
                  </span>
                </>
              )}
              {filter && (
                <button
                  onClick={() => {
                    setFilter(null);
                    setFocusLocation(null);
                  }}
                >
                  <X size={12} />
                  {tr("Clear filter", "Padam penapis")}
                </button>
              )}
            </div>
            <button
              className="report-fab"
              aria-label={tr("Report an issue", "Laporkan isu")}
              title={tr("Report an issue", "Laporkan isu")}
              onClick={() => {
                setPicked(null);
                setShowReport(true);
              }}
            >
              <Plus size={17} />
              <span>{tr("Report", "Lapor")}</span>
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
          </div>
        </section>
      </main>
      {showReport && (
        <ReportDialog
          trafficContext={trafficReportContext}
          locale={locale}
          region={region}
          networkStops={regionStops}
          picked={picked}
          online={online}
          onClose={() => {
            setShowReport(false);
            setTrafficReportContext("");
          }}
          onPick={() => {
            setShowReport(false);
            setPicking(true);
            setSelectedId(null);
            setSelectedStop(null);
            setFollow(false);
            if (window.matchMedia("(max-width: 960px)").matches) showMap();
            setMode("2d");
          }}
          onSubmit={(report) => {
            addReport(report);
            setShowReport(false);
            setTrafficReportContext("");
            void refreshReports(true);
            notify(
              tr(
                `Report ${report.id} submitted. It is now visible to the community and operator.`,
                `Laporan ${report.id} dihantar. Laporan kini boleh dilihat oleh komuniti dan operator.`,
              ),
            );
          }}
        />
      )}
      {showLogin && (
        <Dialog
          title={tr("Welcome to operations.", "Selamat datang ke operasi.")}
          onClose={() => {
            setShowLogin(false);
            setPendingManageReport(null);
          }}
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
      {viewingReport && (
        <ReportDetailDialog
          report={viewingReport}
          locale={locale}
          onClose={() => setViewingReport(null)}
        />
      )}
      {editingReport && (
        <EditReportDialog
          report={editingReport}
          locale={locale}
          onClose={() => setEditingReport(null)}
          onSaved={async () => {
            setEditingReport(null);
            await refreshReports(true);
            notify(
              tr("Report details updated.", "Butiran laporan dikemas kini."),
            );
          }}
        />
      )}
      {managingReport && (
        <ManageReportDialog
          report={managingReport}
          locale={locale}
          onClose={() => setManagingReport(null)}
          onStatus={(status) => void updateStatus(managingReport, status)}
          onEdit={() => {
            setManagingReport(null);
            setEditingReport(managingReport);
          }}
          onDelete={() => void deleteCommunityReport(managingReport)}
        />
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
  const titleId = useId();
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
      aria-labelledby={titleId}
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
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
function ReportCard({
  report,
  locale,
  onSelect,
  onOpen,
}: {
  report: CivicReport;
  locale: Locale;
  onSelect?: () => void;
  onOpen?: () => void;
}) {
  const category = categories.find((c) => c.id === report.category),
    Icon = category?.icon ?? MapPin;
  const cardAction = onOpen ?? onSelect;
  return (
    <article
      className={`report-card ${cardAction ? "report-card-manageable" : ""}`}
      role={cardAction ? "button" : undefined}
      tabIndex={cardAction ? 0 : undefined}
      aria-label={
        onOpen
          ? `Manage report ${report.id}: ${report.title}`
          : onSelect
            ? `Show ${report.title} on the map at ${report.location}`
            : undefined
      }
      onClick={cardAction}
      onKeyDown={(event) => {
        if (cardAction && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          cardAction();
        }
      }}
    >
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
        {onSelect ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            <MapPin size={12} />
            {report.location}
          </button>
        ) : (
          <span className="report-location">
            <MapPin size={12} />
            {report.location}
          </span>
        )}
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
function ReportDetailDialog({
  report,
  locale,
  onClose,
}: {
  report: CivicReport;
  locale: Locale;
  onClose: () => void;
}) {
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  return (
    <Dialog title={report.title} onClose={onClose}>
      <div className="report-detail-meta">
        <span className={`report-status ${report.status}`}>
          {statusNames[report.status][locale === "en" ? 0 : 1]}
        </span>
        <span>{report.id}</span>
      </div>
      <ReportCard report={report} locale={locale} />
      <p className="fineprint report-detail-coordinate">
        <MapPin size={13} />
        {tr("Reported location", "Lokasi dilaporkan")}:{" "}
        {report.coordinate[1].toFixed(5)}, {report.coordinate[0].toFixed(5)}
      </p>
    </Dialog>
  );
}
function ManageReportDialog({
  report,
  locale,
  onClose,
  onStatus,
  onEdit,
  onDelete,
}: {
  report: CivicReport;
  locale: Locale;
  onClose: () => void;
  onStatus: (status: ReportStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const nextStatuses: ReportStatus[] =
    report.status === "submitted"
      ? ["acknowledged", "resolved"]
      : report.status === "acknowledged"
        ? ["in-progress", "resolved"]
        : report.status === "in-progress"
          ? ["resolved", "acknowledged"]
          : ["acknowledged"];
  return (
    <Dialog
      title={tr(`Manage ${report.id}`, `Urus ${report.id}`)}
      onClose={onClose}
    >
      <p>
        <strong>{report.title}</strong>
        <br />
        {report.location}
      </p>
      <label className="form-label">
        {tr("Change status", "Tukar status")}
        <select
          value={report.status}
          onChange={(event) => onStatus(event.target.value as ReportStatus)}
        >
          <option value={report.status}>
            {statusNames[report.status][locale === "en" ? 0 : 1]}
          </option>
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {statusNames[status][locale === "en" ? 0 : 1]}
            </option>
          ))}
        </select>
      </label>
      <div className="report-manage-actions">
        <button type="button" className="secondary-button" onClick={onEdit}>
          <Pencil size={15} />
          {tr("Edit details", "Sunting butiran")}
        </button>
        <button
          type="button"
          className="report-delete-button"
          onClick={onDelete}
        >
          <Trash2 size={15} />
          {tr("Delete report", "Padam laporan")}
        </button>
      </div>
    </Dialog>
  );
}
function EditReportDialog({
  report,
  locale,
  onClose,
  onSaved,
}: {
  report: CivicReport;
  locale: Locale;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const [category, setCategory] = useState(report.category);
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [location, setLocation] = useState(report.location);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, description, location }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw Error(data?.error ?? "Unable to update report");
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update report",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={tr(`Edit ${report.id}`, `Sunting ${report.id}`)}
      onClose={onClose}
    >
      <p>
        {tr(
          "Correct the public report details. Its map position and history are preserved.",
          "Betulkan butiran laporan awam. Kedudukan peta dan sejarahnya dikekalkan.",
        )}
      </p>
      <form onSubmit={submit}>
        <label className="form-label">
          {tr("Category", "Kategori")}
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as ReportCategory)
            }
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item[locale === "en" ? "en" : "ms"]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          {tr("Issue title", "Tajuk isu")}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={5}
            maxLength={120}
            required
          />
        </label>
        <label className="form-label">
          {tr("Description", "Penerangan")}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength={10}
            maxLength={2000}
            rows={4}
            required
          />
        </label>
        <label className="form-label">
          {tr("Location name", "Nama lokasi")}
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            minLength={2}
            maxLength={200}
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            {tr("Cancel", "Batal")}
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            {tr("Save changes", "Simpan perubahan")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function ReportDialog({
  trafficContext = "",
  locale,
  region,
  networkStops,
  picked,
  online,
  onClose,
  onPick,
  onSubmit,
}: {
  trafficContext?: string;
  locale: Locale;
  region: Region;
  networkStops: Stop[];
  picked: Coordinate | null;
  online: boolean;
  onClose: () => void;
  onPick: () => void;
  onSubmit: (report: CivicReport) => void;
}) {
  const tr = (en: string, ms: string) => (locale === "en" ? en : ms);
  const availableStops = networkStops;
  const [category, setCategory] = useState<ReportCategory>(
      trafficContext ? "infrastructure" : "damaged-stop",
    ),
    [title, setTitle] = useState(
      trafficContext
        ? tr("Signal / crossing problem", "Masalah isyarat / lintasan")
        : "",
    ),
    [description, setDescription] = useState(
      trafficContext ? `${trafficContext}\n` : "",
    ),
    [locationId, setLocationId] = useState(availableStops[0]?.id ?? ""),
    [image, setImage] = useState<string | undefined>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draftSaved, setDraftSaved] = useState(false);
  const stop = availableStops.find((s) => s.id === locationId);
  useEffect(() => {
    if (!picked && !stop && availableStops[0]) {
      setLocationId(availableStops[0].id);
    }
  }, [availableStops, picked, stop]);
  useEffect(() => {
    if (trafficContext) return;
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
    const coordinate = picked ?? stop!.coordinate;
    const location = picked
      ? `${tr("Map location", "Lokasi peta")} · ${picked[1].toFixed(5)}, ${picked[0].toFixed(5)}`
      : stop!.name;
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
          coordinate,
          location,
          image,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw Error(
          data && typeof data.error === "string"
            ? data.error
            : tr(
                "The report service is unavailable. Please save a draft and try again.",
                "Perkhidmatan laporan tidak tersedia. Sila simpan draf dan cuba lagi.",
              ),
        );
      if (!data?.report) throw Error("The report response was incomplete.");
      localStorage.removeItem("gerak:report-draft");
      onSubmit(data.report as CivicReport);
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
              <>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={availableStops.length === 0}
                  required
                >
                  {availableStops.length === 0 ? (
                    <option value="">
                      {tr(
                        "Pick a location on the map",
                        "Pilih lokasi pada peta",
                      )}
                    </option>
                  ) : (
                    availableStops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
                {!stop && (
                  <small className="location-help">
                    {tr(
                      "No stop list is available for this area yet. Choose a point on the map.",
                      "Senarai hentian belum tersedia untuk kawasan ini. Pilih titik pada peta.",
                    )}
                  </small>
                )}
              </>
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
