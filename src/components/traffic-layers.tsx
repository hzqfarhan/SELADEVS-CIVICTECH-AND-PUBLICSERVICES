"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import { Camera, Layers, ExternalLink, X, MapPin } from "lucide-react";
import {
  cameraFresh,
  type TrafficCamera,
  type TrafficSignal,
} from "@/lib/traffic";
import type { Coordinate, Locale, Region } from "@/lib/types";
import "./traffic-layers.css";
type Feed<T> = { data: T[]; available: boolean; fetchedAt: string | null };
export default function TrafficLayers({
  map,
  locale = "en",
  region,
  picking,
  onInspect,
  onReport,
}: {
  map: LibreMap;
  locale?: Locale;
  region: Region;
  picking?: boolean;
  onInspect: () => void;
  onReport?: (coordinate: Coordinate, context: string) => void;
}) {
  const tr = (en: string, ms: string) => (locale === "ms" ? ms : en);
  const detail = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false),
    [camerasOn, setCamerasOn] = useState(false),
    [signalsOn, setSignalsOn] = useState(false),
    [routesOn, setRoutesOn] = useState(true);
  const [cameras, setCameras] = useState<Feed<TrafficCamera>>({
      data: [],
      available: false,
      fetchedAt: null,
    }),
    [signals, setSignals] = useState<Feed<TrafficSignal>>({
      data: [],
      available: false,
      fetchedAt: null,
    });
  const [selected, setSelected] = useState<
      TrafficCamera | TrafficSignal | null
    >(null),
    [imageFailed, setImageFailed] = useState(false),
    [loading, setLoading] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (selected && detail.current && panel.current) {
      panel.current.scrollTo({
        top:
          panel.current.scrollTop +
          detail.current.getBoundingClientRect().top -
          panel.current.getBoundingClientRect().top -
          12,
      });
    }
  }, [selected?.id]);
  useEffect(() => {
    try {
      const p = JSON.parse(
        localStorage.getItem("gerak:traffic-layers:v1") || "{}",
      );
      setCamerasOn(p.cameras === true);
      setSignalsOn(p.signals === true);
    } catch {}
  }, []);
  function toggle(kind: "cameras" | "signals", value: boolean) {
    if (kind === "cameras") setCamerasOn(value);
    else setSignalsOn(value);
    setSelected(null);
    try {
      localStorage.setItem(
        "gerak:traffic-layers:v1",
        JSON.stringify({
          cameras: kind === "cameras" ? value : camerasOn,
          signals: kind === "signals" ? value : signalsOn,
        }),
      );
    } catch {}
  }
  useEffect(() => {
    setSelected(null);
  }, [region]);
  useEffect(() => {
    if (!camerasOn && !signalsOn) return;
    const controller = new AbortController();
    let busy = false;
    async function load() {
      if (busy || document.hidden) return;
      busy = true;
      setLoading(true);
      try {
        await Promise.all([
          ...(camerasOn
            ? [
                fetch("/api/traffic/cameras", { signal: controller.signal })
                  .then((r) => {
                    if (!r.ok) throw Error();
                    return r.json();
                  })
                  .then(setCameras)
                  .catch(() => {
                    if (!controller.signal.aborted)
                      setCameras((p) => ({ ...p, available: false }));
                  }),
              ]
            : []),
          ...(signalsOn && region === "johor"
            ? [
                fetch("/api/traffic/signals", { signal: controller.signal })
                  .then((r) => {
                    if (!r.ok) throw Error();
                    return r.json();
                  })
                  .then(setSignals)
                  .catch(() => {
                    if (!controller.signal.aborted)
                      setSignals((p) => ({ ...p, available: false }));
                  }),
              ]
            : []),
        ]);
      } finally {
        busy = false;
        if (!controller.signal.aborted) {
          setNow(Date.now());
          setLoading(false);
        }
      }
    }
    void load();
    const timer = setInterval(load, 60000);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [camerasOn, signalsOn, region]);
  useEffect(() => {
    for (const id of ["route-glow", "route-outline", "route-line"])
      if (map.getLayer(id))
        map.setLayoutProperty(id, "visibility", routesOn ? "visible" : "none");
    return () => {
      for (const id of ["route-glow", "route-outline", "route-line"])
        if (map.getLayer(id))
          map.setLayoutProperty(id, "visibility", "visible");
    };
  }, [map, routesOn]);
  useEffect(() => {
    for (const [id, data, color] of [
      ["traffic-cameras", camerasOn ? cameras.data : [], "#75baff"],
      [
        "traffic-signals",
        signalsOn && region === "johor" ? signals.data : [],
        "#c1cad9",
      ],
    ] as const) {
      const geo = {
        type: "FeatureCollection" as const,
        features: data.map((d) => ({
          type: "Feature" as const,
          properties: { id: d.id },
          geometry: { type: "Point" as const, coordinates: d.coordinate },
        })),
      };
      if (map.getSource(id)) (map.getSource(id) as GeoJSONSource).setData(geo);
      else {
        map.addSource(id, { type: "geojson", data: geo });
        map.addLayer({
          id,
          type: "circle",
          source: id,
          minzoom: id === "traffic-signals" ? 15 : 0,
          paint: {
            "circle-radius": id === "traffic-signals" ? 5 : 8,
            "circle-color": color,
            "circle-stroke-color": "#0c1729",
            "circle-stroke-width": 3,
          },
        });
      }
    }
  }, [map, camerasOn, signalsOn, cameras, signals, region]);
  useEffect(() => {
    const click = (e: { point: { x: number; y: number } }) => {
      if (picking) return;
      const layers = ["traffic-cameras", "traffic-signals"].filter(
        (id) => !!map.getLayer(id),
      );
      const hit = map.queryRenderedFeatures([e.point.x, e.point.y], {
        layers,
      })[0];
      if (hit) {
        const item = [...cameras.data, ...signals.data].find(
          (d) => d.id === hit.properties.id,
        );
        if (item) {
          setSelected(item);
          setImageFailed(false);
          setOpen(true);
        }
      }
    };
    map.on("click", click);
    return () => {
      map.off("click", click);
    };
  }, [map, cameras, signals, picking]);
  useEffect(
    () => () => {
      for (const id of ["traffic-cameras", "traffic-signals"]) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
    },
    [map],
  );
  const camera =
    selected && "image" in selected
      ? cameras.data.find((c) => c.id === selected.id) || selected
      : null;
  const fresh =
    !!camera && cameras.available && cameraFresh(camera.observedAt, now);
  function inspect(coordinate: Coordinate, zoom: number) {
    onInspect();
    map.easeTo({ center: coordinate, zoom, pitch: 40, duration: 700 });
  }
  return createPortal(
    <div className="traffic-tools">
      <button
        className="traffic-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Layers size={16} />
        {tr("Layers", "Lapisan")}
      </button>
      {open && (
        <section
          ref={panel}
          className="traffic-panel"
          aria-label={tr("Traffic layers", "Lapisan trafik")}
        >
          <header>
            <strong>
              {tr("Around your journey", "Sekitar perjalanan anda")}
            </strong>
            <button
              aria-label={tr("Close layers", "Tutup lapisan")}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <p>
            {tr(
              "Your bus stays visible. Add context when you need it.",
              "Bas anda kekal kelihatan. Tambah maklumat apabila perlu.",
            )}
          </p>
          <label>
            <input
              type="checkbox"
              checked={routesOn}
              onChange={(e) => setRoutesOn(e.target.checked)}
            />
            {tr("Route lines", "Garisan laluan")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={camerasOn}
              onChange={(e) => toggle("cameras", e.target.checked)}
            />
            <Camera size={15} />
            {tr(
              "Border camera snapshots · Singapore",
              "Imej kamera sempadan · Singapura",
            )}
          </label>
          <label>
            <input
              type="checkbox"
              checked={signalsOn}
              onChange={(e) => toggle("signals", e.target.checked)}
            />
            {tr(
              "Signal locations · Johor pilot",
              "Lokasi lampu isyarat · Rintis Johor",
            )}
          </label>
          {signalsOn && (
            <>
              <p>
                {region === "johor"
                  ? tr(
                      "OSM mapped junctions · visible at street zoom. Live light state unavailable.",
                      "Persimpangan OSM · zum aras jalan. Keadaan langsung tidak tersedia.",
                    )
                  : tr(
                      "Signal coverage currently available only in Johor Bahru.",
                      "Liputan isyarat kini hanya di Johor Bahru.",
                    )}
              </p>
              {region === "johor" && (
                <p>
                  {loading && !signals.fetchedAt
                    ? tr("Checking signal source…", "Menyemak sumber isyarat…")
                    : signals.available
                      ? `${signals.data.length} ${tr("mapped junctions", "persimpangan dipetakan")}`
                      : tr(
                          "Signal source unavailable. Try again later.",
                          "Sumber isyarat tidak tersedia. Cuba lagi nanti.",
                        )}{" "}
                  ·{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                  >
                    © OpenStreetMap
                  </a>
                </p>
              )}
            </>
          )}
          {loading && (
            <p role="status">{tr("Checking sources…", "Menyemak sumber…")}</p>
          )}
          {selected && (
            <article className="traffic-detail" ref={detail}>
              <strong>{selected.name}</strong>
              {camera ? (
                <>
                  <p className={fresh ? "" : "traffic-stale"}>
                    {fresh
                      ? tr("Recent snapshot", "Imej terkini")
                      : tr(
                          "Stale / unavailable snapshot",
                          "Imej lama / tidak tersedia",
                        )}{" "}
                    ·{" "}
                    {new Date(camera.observedAt).toLocaleString(
                      locale === "ms" ? "ms-MY" : "en-MY",
                      { timeZone: "Asia/Kuala_Lumpur" },
                    )}{" "}
                    MYT
                  </p>
                  {!imageFailed ? (
                    <img
                      key={camera.image}
                      src={camera.image}
                      alt={`${tr("Traffic snapshot", "Imej trafik")} · ${camera.name}`}
                      referrerPolicy="no-referrer"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <p>
                      {tr(
                        "Image could not load. Open the official viewer below.",
                        "Imej gagal dimuatkan. Buka paparan rasmi di bawah.",
                      )}
                    </p>
                  )}
                  <a
                    href="https://onemotoring.lta.gov.sg/content/onemotoring/home/digitalservices/view-traffic-cameras.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tr("Official camera viewer", "Paparan kamera rasmi")} ↗
                  </a>
                </>
              ) : (
                <>
                  <p>
                    {tr(
                      "Community-mapped junction, not a surveyed pole. No live phase or countdown.",
                      "Persimpangan dipetakan komuniti, bukan tiang yang diukur. Tiada fasa atau kira detik langsung.",
                    )}
                  </p>
                  <button
                    onClick={() => {
                      onReport?.(
                        selected.coordinate,
                        `${selected.name} (${selected.id})`,
                      );
                      setOpen(false);
                    }}
                  >
                    {tr(
                      "Report a signal / crossing problem",
                      "Lapor masalah isyarat / lintasan",
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => inspect(selected.coordinate, camera ? 13 : 17)}
              >
                <MapPin size={14} />
                {tr(
                  "Inspect location · leaves bus follow",
                  "Lihat lokasi · hentikan ikut bas",
                )}
              </button>
            </article>
          )}
          {camerasOn && (
            <>
              <p>
                {tr(
                  "Periodic images, not live video. Singapore-side coverage.",
                  "Imej berkala, bukan video langsung. Liputan sebelah Singapura.",
                )}
              </p>
              {!cameras.available && !loading && (
                <p role="status">
                  {tr(
                    "Camera source unavailable; cached images may be old.",
                    "Sumber kamera tidak tersedia; imej cache mungkin lama.",
                  )}
                </p>
              )}
              <div className="traffic-camera-list">
                {cameras.data.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelected(c);
                      setImageFailed(false);
                    }}
                    aria-pressed={selected?.id === c.id}
                  >
                    <Camera size={14} />
                    {c.name}
                    <span>SG</span>
                  </button>
                ))}
              </div>
              <a
                href="https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view"
                target="_blank"
                rel="noreferrer"
              >
                LTA / data.gov.sg · {tr("Source & licence", "Sumber & lesen")}
              </a>
            </>
          )}
          <details>
            <summary>
              {tr(
                "Official Malaysian traffic views",
                "Paparan trafik rasmi Malaysia",
              )}
            </summary>
            <p>
              {tr(
                "External viewers; embedded feeds are not verified.",
                "Paparan luar; suapan terbenam belum disahkan.",
              )}
            </p>
            {[
              [
                "MBJB · Johor Bahru",
                "https://itrafik.mbjb.gov.my/itrafik/list_cctv",
              ],
              ["DBKL · Kuala Lumpur", "https://klccc.dbkl.gov.my/"],
              [
                "LLM · Highways / Tuju",
                "https://www.llm.gov.my/cctv1/get_traffic_cctv",
              ],
            ].map(([name, url]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {name}
                <ExternalLink size={13} />
              </a>
            ))}
          </details>
        </section>
      )}
    </div>,
    map.getContainer().closest(".map-workspace") ??
      map.getContainer().parentElement!,
  );
}
