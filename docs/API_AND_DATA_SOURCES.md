# GERAK API and data sources

Research checked: **30 September 2026**. This is a provenance register, not a promise of upstream uptime. See `API.md` for GERAK's own endpoints and `ARCHITECTURE.md` for the deployment design.

## Malaysian transport feeds

The official [GTFS Schedule documentation](https://developer.data.gov.my/realtime-api/gtfs-static) documents ZIP archives containing routes, stops, trips, stop times and calendars, with shapes and frequencies when supplied. Prasarana's static categories include `rapid-bus-kl`, `rapid-bus-mrtfeeder`, `rapid-bus-penang`, `rapid-bus-kuantan` and `rapid-rail-kl`. BAS.MY Johor Bahru is the primary city integration. The documentation recommends a daily refresh around 04:00 before services begin.

| Feed | Official endpoint | Intended use |
| --- | --- | --- |
| BAS.MY Johor Bahru schedule | `https://api.data.gov.my/gtfs-static/mybas-johor` | Import real route geometry and stops |
| KTMB schedule | `https://api.data.gov.my/gtfs-static/ktmb` | Future intercity/rail integration |
| Rapid KL schedule | `https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl` | Future Klang Valley adapter |
| Rapid rail schedule | `https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl` | Future rail network |

The official [GTFS Realtime documentation](https://developer.data.gov.my/realtime-api/gtfs-realtime) currently documents **vehicle positions only**, updated every **30 seconds**, in protobuf. Trip updates and service alerts are described as future work. Static Rapid Rail availability does not establish stable realtime availability. The docs also warn of erroneous GPS outliers and trip/route ID mismatches in some Prasarana feeds.

| Feed | Official vehicle-position endpoint |
| --- | --- |
| BAS.MY Johor Bahru | `https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor` |
| KTMB | `https://api.data.gov.my/gtfs-realtime/vehicle-position/ktmb` |
| Rapid KL buses | `https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl` |

**Verification result, 30 September 2026:** both integrations subsequently succeeded through GERAK's Node runtime. The initial successful vehicle snapshot contained **75 official vehicle observations**, and the static import produced **21 routes and 988 stops**. These are observed sample counts, not guaranteed fleet size or current availability. Earlier direct PowerShell probes failed before receiving an HTTP response because of a local TLS connection error; the later application-level success supersedes that initial limitation. TLS verification remains enabled. Runtime integrations must still report their latest source timestamp, freshness and failure reason.

## Quota, attribution and ingestion policy

The published [rate limits](https://developer.data.gov.my/rate-limit) are **4 requests per minute** for GTFS Static and GTFS Realtime, and also for the data catalogue, OpenDOSM and weather APIs. Treat this as a conservative shared upstream budget; do not assume a separate allowance per route, browser or tenant. The [official FAQ](https://developer.data.gov.my/faq) identifies the platform's data as **CC BY 4.0**. Display attribution such as “Transport data: data.gov.my and the respective operators. CC BY 4.0.” Preserve source URL, retrieval time and transformations with imported records.

Recommended production handling:

1. One elected worker fetches the selected realtime feed every 30 seconds. Browsers consume GERAK's cached normalized snapshot.
2. Coalesce concurrent refresh requests. Use jitter and exponential backoff after failures; respect `Retry-After` if present.
3. Refresh static ZIPs daily in `Asia/Kuala_Lumpur`, with checksum comparison and atomic dataset replacement.
4. Validate archive sizes, required files, encoding, coordinates and foreign keys before promoting an import. Run MobilityData's validator in the production import pipeline.
5. Namespace identifiers by agency and feed version. Preserve source IDs verbatim alongside internal IDs.
6. Keep source observation time separate from ingestion time. A successful HTTP response containing old observations is stale data.
7. Validate geographic bounds and impossible jumps; quarantine suspect observations. Missing speed, bearing, accessibility or occupancy means unknown, not zero or accessible.
8. Use sampled positions for interpolation only within a bounded freshness window. Stop extrapolating when observations are stale and label the last known position.

GTFS schedule times can exceed `24:00:00`; keep service date plus seconds since service-day midnight. GeoJSON uses `[longitude, latitude]`. GTFS speed is metres per second; convert explicitly when displaying km/h. Use [GTFS Schedule](https://gtfs.org/documentation/schedule/reference/) and [GTFS Realtime](https://gtfs.org/documentation/realtime/reference/) as the schema authorities.

## Honest data modes

| Mode | User-facing meaning | Rules |
| --- | --- | --- |
| Live | Current official vehicle observations | Show operator/source and last observation time |
| Stale | Previously received official observations | Show age; do not animate indefinitely or imply a new fix |
| Demo | Deterministic synthetic vehicles and events | Keep a visible demo label; never relabel as official |
| Offline | Cached app/data with no current connection | Show offline state and cache age; permit useful read-only fallback |

An ETA derived from distance, route progress, assumed speed or schedules is a **GERAK estimate**, not an operator prediction. Simulated occupancy, delays, dispatch, incidents and analytics must remain visibly simulated. Locally created community reports are real application records but are not official municipal tickets.

## UTHM pilot

UTHM already publishes a [transportation page](https://www.uthm.edu.my/en/transportation) linking a [KATSANA public shuttle tracker](https://uthm.katsana.com/). The university describes campus and Parit Raja shuttle services. No public documented KATSANA/UTHM ingestion API or data-sharing permission was verified in this research.

GERAK's UTHM pilot therefore uses a separate simulated agency. A production pilot should obtain authorized telemetry access from UTHM and its existing provider, or provision institution-managed GPS devices. Do not scrape private endpoints or claim official integration. The adapter contract should accept vehicle ID, observation time, coordinates, optional heading/speed, route/trip assignment and device accuracy, then enter the same normalization pipeline as GTFS-RT.

Campus route names, synthetic stops and vehicle identities in a demo are illustrative unless explicitly imported from an attributed official feed. Do not confuse UTHM Parit Raja, UTHM Pagoh and Johor Bahru as one contiguous local shuttle network. The proposed partner adapter, security boundary and pilot acceptance criteria are detailed in [UTHM_PILOT.md](UTHM_PILOT.md).

## Civic, basemap and optional context data

- [Open311 GeoReport v2](https://wiki.open311.org/GeoReport_v2/) informs service categories, geotagged service requests, media references and status interoperability. GERAK does not claim an existing Malaysian municipal Open311 endpoint.
- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright) governs OSM-derived data. A map library is not a tile hosting service. Configure a production tile provider with suitable quotas, attribution and caching rights; do not bulk cache public tiles by default.
- The default 2D basemap uses [OpenFreeMap](https://openfreemap.org/) and its dark MapLibre style at `https://tiles.openfreemap.org/styles/dark`. Preserve the style's OpenMapTiles/OpenStreetMap attribution. Its public instance does not require a key, but it does not provide an SLA; the local schematic and miniature renderer remain the fallback. An earlier CARTO raster option was replaced after browser tile loading failed in this development environment.
- The [data.gov.my public transportation dashboard](https://data.gov.my/dashboard/public-transportation) provides official ridership context. Historical ridership must not be presented as today's GERAK fleet occupancy or measured GERAK impact.
- The [official weather API documentation](https://developer.data.gov.my/realtime-api/weather) is a future context source. A user's flood report is not a verified weather warning. Do not imply current flood coverage without an actual integration and timestamps.

## Source readiness register

| Integration | Research confidence | Release boundary |
| --- | --- | --- |
| Johor official static and realtime endpoints | Official docs and application fetch/import verified; initial samples: 75 vehicles, 21 routes, 988 stops | Counts change; runtime freshness and failure handling required |
| UTHM KATSANA | Official university link verified; API unverified | Partner integration; simulator until authorized |
| Operator ETAs/service alerts | No such national feed verified | Derived estimates and GERAK/demo alerts only |
| Municipal ticket delivery | No endpoint or partnership verified | GERAK internal lifecycle only |
| Map tiles/buildings/terrain | Depends on configured provider and coverage | Keep attribution; degrade gracefully |


## Geographic 3D update — 30 September 2026

The active 3D mode now shares the MapLibre geographic basemap with 2D, replacing the procedural miniature city described in earlier sections. OpenFreeMap/OpenStreetMap supply real Johor coastline, roads and building footprints. Extrusions use provider render heights or an estimated minimum height, not surveyed elevation. GPS-anchored bus footprints animate with observed headings; model size is exaggerated at regional zoom for readability. The MY overview control frames Johor, while follow zooms to the selected bus. Sources: https://openfreemap.org/quick_start/ and https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/. A Johor Bahru z14 tile was verified to contain 70 building features, 7 water features and 1,140 transportation features.

## Nationwide expansion — 1 October 2026

The endpoint registry in src/lib/feeds.ts replaces the Johor-only adapter scope described in older sections. All documented BAS.MY cities, both Seremban operators, KTMB and four Prasarana bus categories are registered. Prasarana rapid-rail-kl is static-only. Vehicle and network caches are isolated by endpoint; IDs are namespaced outside legacy Johor. Unique static trip-ID suffix matching resolves Prasarana variants when the route ID is absent/unmatched. All adapters share the process-level four-request/minute budget. The verification report records 29 successful HTTP responses out of 31 checks, 398 imported routes and 15,532 stops, alongside upstream gaps. See FEED_VERIFICATION.md and SOURCES.md.

## UTHM / KATSANA campus snapshot

The public page https://uthm.katsana.com/ supplies three campus route paths and checkpoint coordinates, captured in `/data/uthm-katsana.json`. Its advertised `wss://ws.shuttle.katsana.com/stream/1` endpoint responded with vehicle state and ping events on 1 October 2026. GERAK currently uses the geometry only, with explicitly simulated vehicle motion. See [UTHM_PILOT.md](UTHM_PILOT.md) for fields, verification limits and production adapter requirements.

## Open-Meteo weather
https://api.open-meteo.com/v1/forecast supplies modelled current conditions at registered service centres. See https://open-meteo.com/en/docs. Weather card attributes the provider, shows model time in MYT and labels stale data. City/service selection changes the requested location. This is not a station observation or official severe-weather alert. Commercial deployments must review provider API terms.

Traffic cameras and static signal source details: [Traffic implementation](TRAFFIC_IMPLEMENTATION.md). Camera imagery is Singapore-side; Malaysian providers currently open as official external viewers.
