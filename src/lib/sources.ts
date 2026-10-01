import { SERVICES } from "./feeds";
export interface SourceEntry {
  name: string;
  url: string;
  purpose: string;
  kind: "runtime" | "standard" | "inspiration" | "future";
  notes: string;
}
export const sources: SourceEntry[] = [
  {
    name: "Open-Meteo current weather",
    url: "https://open-meteo.com/en/docs",
    purpose: "Current modelled conditions at the selected service-area centre.",
    kind: "runtime",
    notes:
      "Server requests api.open-meteo.com/v1/forecast with current temperature, apparent temperature, humidity, precipitation, wind, weather code and is_day. 15-minute cache; timestamps and stale status shown. Data attribution CC BY 4.0; free API is for non-commercial use, review commercial terms before production.",
  },
  ...SERVICES.filter((s) => s.id !== "johor").flatMap((service) =>
    service.endpoints.flatMap((endpoint) => [
      {
        name: `${service.operator} ${service.name} · ${endpoint.id} GTFS Schedule`,
        url: endpoint.staticUrl,
        purpose:
          "Official routes, stops and representative trip topology for the selected service.",
        kind: "runtime" as const,
        notes:
          "Separate persisted cache per endpoint. Empty or unusable datasets are reported without synthetic replacement. Seremban combines both operator feeds with namespaced IDs.",
      },
      ...(endpoint.realtimeUrl
        ? [
            {
              name: `${service.operator} ${service.name} · ${endpoint.id} vehicle positions`,
              url: endpoint.realtimeUrl,
              purpose:
                "Official vehicle-position protobuf feed; original GPS timestamps preserved.",
              kind: "runtime" as const,
              notes:
                "Publisher documents 30-second updates; application coalesces requests for 35 seconds. Empty, stale or unavailable feeds are labelled. No trip updates or service-alert integration is claimed.",
            },
          ]
        : []),
    ]),
  ),

  {
    name: "DOSM Malaysia, state and district boundary polygons",
    url: "https://github.com/dosm-malaysia/data-open/tree/main/datasets/geodata",
    purpose:
      "Country outline, 16 states/federal territories and 160 districts for geographic selection and shape-following highlights.",
    kind: "runtime",
    notes:
      "Bundled published snapshot, not a claim of current legal boundary adjudication. Original URLs, SHA-256 hashes and retrieval time: /data/boundaries/provenance.json. DOSM Open Data License retained at /data/boundaries/LICENSE.md. No rectangular substitute polygons.",
  },
  {
    name: "DOSM boundary data provenance and licence",
    url: "/data/boundaries/provenance.json",
    purpose:
      "Exact source URLs and hashes for the bundled country, state and district files.",
    kind: "standard",
    notes:
      "Publisher: Department of Statistics Malaysia. Geometry is preserved; files are only JSON-minified. Permission and disclaimers follow the publisher's Open Data License.",
  },
  {
    name: "OneBusAway Wayfinder",
    url: "https://github.com/OneBusAway/wayfinder",
    purpose:
      "Modern rider UI, localisation and transit-region configuration research.",
    kind: "inspiration",
    notes: "Not installed or copied.",
  },
  {
    name: "MapLibre Three.js custom-layer example",
    url: "https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/",
    purpose: "Geographic transforms and map/3D integration research.",
    kind: "inspiration",
    notes:
      "GERAK ultimately uses independent MapLibre and R3F renderers with a shared geographic projection contract, not this custom-layer implementation.",
  },
  {
    name: "node-gtfs",
    url: "https://github.com/BlinkTagInc/node-gtfs",
    purpose: "Static GTFS import/query architecture reference.",
    kind: "inspiration",
    notes:
      "Not installed. GERAK uses fflate and csv-parse for a bounded importer.",
  },
  {
    name: "GTFS-to-GeoJSON",
    url: "https://github.com/BlinkTagInc/gtfs-to-geojson",
    purpose: "Geographic route preparation reference.",
    kind: "inspiration",
    notes: "Not installed; GERAK builds its own GeoJSON route layers.",
  },
  {
    name: "MobilityData realtime validator",
    url: "https://github.com/MobilityData/gtfs-realtime-validator",
    purpose: "Future feed-quality validation.",
    kind: "future",
    notes:
      "Not installed or executed. The current adapter implements its own essential normalization checks.",
  },
  {
    name: "Next.js PWA guide",
    url: "https://nextjs.org/docs/app/guides/progressive-web-apps",
    purpose: "App Router manifest and service-worker integration.",
    kind: "standard",
    notes:
      "The matching installed Next.js documentation was also read locally under node_modules/next/dist/docs/.",
  },
  {
    name: "data.gov.my public transportation dashboard",
    url: "https://data.gov.my/dashboard/public-transportation",
    purpose: "Official historical ridership context research.",
    kind: "future",
    notes:
      "Not ingested. GERAK displays no invented historical ridership or impact metrics.",
  },
  {
    name: "data.gov.my weather API",
    url: "https://developer.data.gov.my/realtime-api/weather",
    purpose: "Potential future weather/flood context.",
    kind: "future",
    notes:
      "Not connected. Community flood reports are not official weather alerts.",
  },
  {
    name: "data.gov.my · BAS.MY Johor GTFS-Realtime",
    url: "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor",
    purpose:
      "Real vehicle IDs, coordinates, route IDs and observation timestamps; speed, heading and occupancy only when supplied.",
    kind: "runtime",
    notes:
      "Protobuf. One shared refresh per 35 seconds in this single-process application. No API key required in the verified request. CC BY 4.0; credit data.gov.my and the respective transport operators.",
  },
  {
    name: "data.gov.my · BAS.MY Johor GTFS Schedule",
    url: "https://api.data.gov.my/gtfs-static/mybas-johor",
    purpose:
      "Official agencies, routes, stops, trips, ordered stop times and route shapes.",
    kind: "runtime",
    notes:
      "ZIP/CSV. Imported automatically when missing or older than 24 hours, or with npm run ingest. The app uses a representative trip per route; it does not yet evaluate calendars or offer departure-time routing.",
  },
  {
    name: "OpenFreeMap · Dark map style",
    url: "https://tiles.openfreemap.org/styles/dark",
    purpose: "MapLibre vector basemap style, linked tiles, glyphs and sprites.",
    kind: "runtime",
    notes:
      "Public instance, no configured API key. Availability has no application-controlled SLA. Style-linked resource URLs are resolved by MapLibre, not hard-coded API assumptions.",
  },
  {
    name: "OpenStreetMap",
    url: "https://www.openstreetmap.org/copyright",
    purpose:
      "Roads, place labels and geographical basemap information through OpenFreeMap.",
    kind: "runtime",
    notes:
      "© OpenStreetMap contributors, ODbL. The application preserves on-map attribution and does not bulk-cache third-party tiles.",
  },
  {
    name: "OpenMapTiles / OpenFreeMap attribution",
    url: "https://openfreemap.org/quick_start/",
    purpose: "Vector tile schema and basemap attribution.",
    kind: "runtime",
    notes:
      "MapLibre displays the attribution supplied by the provider. The active 3D map uses OpenStreetMap building footprints and provider render heights (which may be estimated). No surveyed terrain is claimed.",
  },
  {
    name: "GERAK community reports",
    url: "/api/reports",
    purpose:
      "User-submitted geotags, descriptions, optional images and operator status changes.",
    kind: "runtime",
    notes:
      "Application-owned data in local JSON or PostgreSQL/PostGIS. Not a Malaysian municipal API. No synthetic reports are seeded. Reports are public; images are re-encoded client-side.",
  },
  {
    name: "GTFS Schedule specification",
    url: "https://gtfs.org/documentation/schedule/reference/",
    purpose: "CSV field and coordinate interpretation.",
    kind: "standard",
    notes:
      "Includes service-day time semantics. Calendar-aware routing and all-trip shape matching remain future work.",
  },
  {
    name: "GTFS Realtime specification",
    url: "https://gtfs.org/documentation/realtime/reference/",
    purpose: "VehiclePosition protobuf semantics and optional fields.",
    kind: "standard",
    notes:
      "Omitted occupancy and speed are unknown, not invented observations. The national integration uses VehiclePosition only.",
  },
  {
    name: "data.gov.my realtime documentation",
    url: "https://developer.data.gov.my/realtime-api/gtfs-realtime",
    purpose: "Supported agencies, update frequency and feed limitations.",
    kind: "standard",
    notes:
      "Documents approximately 30-second updates. No connected national TripUpdates or ServiceAlerts endpoint is claimed.",
  },
  {
    name: "data.gov.my static documentation",
    url: "https://developer.data.gov.my/realtime-api/gtfs-static",
    purpose: "Official static endpoints and refresh guidance.",
    kind: "standard",
    notes:
      "Used for all registered BAS.MY cities, KTMB and Prasarana categories. Rapid KL rail has static schedules only; no stable realtime endpoint is claimed.",
  },
  {
    name: "data.gov.my rate limits",
    url: "https://developer.data.gov.my/rate-limit",
    purpose: "Upstream request budgeting.",
    kind: "standard",
    notes:
      "Published limit: 4 requests per minute. In-process coalescing is implemented; multiple production replicas require a shared ingestion owner/cache.",
  },
  {
    name: "data.gov.my FAQ / licence",
    url: "https://developer.data.gov.my/faq",
    purpose: "Government open-data attribution.",
    kind: "standard",
    notes:
      "CC BY 4.0. Field transformations and runtime source timestamps are documented.",
  },
  {
    name: "Jalan KL",
    url: "https://kl.jalanmalaysia.com/",
    purpose:
      "User-requested inspiration for a playful Malaysian miniature city and camera exploration.",
    kind: "inspiration",
    notes: "No code, images or models copied; not a transport data provider.",
  },
  {
    name: "Abeto Messenger",
    url: "https://messenger.abeto.co/",
    purpose:
      "User-requested inspiration for teal scenery, miniature urban forms and approachable 3D presentation.",
    kind: "inspiration",
    notes: "Visually inspected. No code, images or models copied; not an API.",
  },
  {
    name: "Mini Tokyo 3D",
    url: "https://github.com/nagix/mini-tokyo-3d",
    purpose:
      "Moving transit visualization, tracking and performance design research.",
    kind: "inspiration",
    notes:
      "MIT project. Architecture inspiration only; not installed or called.",
  },
  {
    name: "OneBusAway",
    url: "https://github.com/OneBusAway/onebusaway-application-modules",
    purpose:
      "Transit entities, freshness and rider-facing information architecture.",
    kind: "inspiration",
    notes: "Not a GERAK backend dependency; no OneBusAway API is connected.",
  },
  {
    name: "OpenTripPlanner",
    url: "https://github.com/opentripplanner/OpenTripPlanner",
    purpose: "Production multimodal routing architecture research.",
    kind: "inspiration",
    notes:
      "Not deployed. GERAK’s present planner discovers direct/one-transfer connections from a representative official stop sequence.",
  },
  {
    name: "FixMyStreet",
    url: "https://github.com/mysociety/fixmystreet",
    purpose:
      "Public issue-report lifecycle and location-based reporting research.",
    kind: "inspiration",
    notes:
      "No AGPL application code copied or deployed. GERAK implements its own reporting UI and API.",
  },
  {
    name: "Open311 GeoReport v2",
    url: "https://wiki.open311.org/GeoReport_v2/",
    purpose: "Civic service-request interoperability reference.",
    kind: "standard",
    notes:
      "No municipal Open311 gateway is connected. GERAK does not claim Open311 conformance.",
  },
  {
    name: "UTHM transportation",
    url: "https://www.uthm.edu.my/en/transportation",
    purpose:
      "Official confirmation of campus transport and the existing tracking service.",
    kind: "future",
    notes:
      "Institutional source, not a telemetry endpoint. Campus route geometry is sourced separately from the public KATSANA tracker.",
  },
  {
    name: "UTHM KATSANA tracker",
    url: "https://uthm.katsana.com/",
    purpose:
      "Published Batu Pahat and Pagoh route paths and checkpoint coordinates.",
    kind: "runtime",
    notes:
      "Public page inspected 1 October 2026; three routes saved in /data/uthm-katsana.json. Public WebSocket responds, but no live adapter is connected. Vehicles and durations remain simulated; no redistribution licence identified.",
  },
  {
    name: "MobilityData GTFS validator",
    url: "https://github.com/MobilityData/gtfs-validator",
    purpose: "Recommended production import validation.",
    kind: "future",
    notes:
      "Not run or installed in this MVP. The importer currently enforces archive bounds and essential coordinate/CSV checks.",
  },
  {
    name: "deck.gl",
    url: "https://github.com/visgl/deck.gl",
    purpose: "Large-fleet and geospatial visualization research.",
    kind: "inspiration",
    notes:
      "Not installed. Current rendering uses MapLibre and React Three Fiber.",
  },
  {
    name: "Serwist",
    url: "https://github.com/serwist/serwist",
    purpose: "PWA caching architecture research.",
    kind: "inspiration",
    notes:
      "Not installed. GERAK uses a custom service worker and the Next.js manifest API.",
  },
];
