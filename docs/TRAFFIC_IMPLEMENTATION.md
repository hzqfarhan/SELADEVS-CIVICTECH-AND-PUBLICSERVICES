# Traffic layer implementation

## Available in GERAK

Open **Layers** on the map. Route lines can be hidden without hiding the fleet. Enable Singapore border snapshots to list cameras, view one selected image, inspect its map location or open the official viewer. Camera and signal layer preferences persist on this device. Refreshes pause while the page is hidden; selected camera details do not move the bus-follow camera unless Inspect location is pressed.

The latest generated GERAK icon is used in the header, sidebar, browser favicon, Apple touch icon, installable PWA and offline page. Versioned filenames and service-worker cache v3 avoid reusing the old icon. Existing installed home-screen shortcuts may need removal and reinstallation; native iOS installation has not been tested here.

## APIs

| Endpoint | Response | Source / limitations |
| --- | --- | --- |
| GET /api/traffic/cameras | data: array of id, name, coordinate, image, observedAt, country; fetchedAt; available; provider; coverage; sourceUrl | LTA / data.gov.sg, Singapore border-area filter. Periodic snapshots, not video. IDs retained where authoritative names have not been matched. |
| GET /api/traffic/signals | data: array of id, name, coordinate; fetchedAt; available; provider; coverage; sourceUrl; liveStateAvailable:false | OSM community signal junctions inside 1.35–1.7 N, 103.5–103.95 E. Static locations, not surveyed poles or live light phases. |

Both public endpoints are limited to 60 requests/minute per existing limiter key. Source URLs and bounds are server-owned, not client supplied. JSON downloads are capped at 2 MB with 15-second timeouts and Zod validation. Image URLs must be HTTPS on images.data.gov.sg, without embedded credentials. No arbitrary media proxy exists. Cameras use a 60-second process cache with concurrent-refresh coalescing; source failures retain cached observations and mark availability false. Image freshness is determined from captured time, with a five-minute threshold and future-time rejection. Signal attempts back off for 15 minutes while unavailable and use a daily TTL after an established successful cache; these caches are process-local and require shared coordination before scaling.

The Layers panel links directly to MBJB i-Trafik, DBKL KLCCC and LLM/Tuju. Malaysian media streams are not embedded or presented as licensed APIs. Source inventory is also exposed on /sources.

## Signal reporting

When an actual imported signal marker is available at street zoom, selection opens its details. Report a signal/crossing problem opens the existing civic form with its coordinate, an infrastructure category, a suggested title and OSM node reference in the editable description. Existing community/operator lifecycle handles submission. A previous generic draft does not overwrite this context. Dedicated asset foreign keys, verified malfunction states and external council delivery remain future work.

## Verified limits

- The official camera API returned real border-area metadata during browser verification; per-image timestamps are shown.
- The primary Overpass server returned HTTP 406 for both GET and POST diagnostics. A documented alternative returned HTTP 500. No signal positions were invented or imported from an unverified source. The signal adapter and UI are implemented but current live inventory validation is blocked by these upstream failures.
- Real red/amber/green phases and countdowns remain unavailable. No bus trajectory or speed is changed by a decorative signal.
- Expanded phases in TRAFFIC_AND_CCTV_PLAN.md (dedicated asset schema, council integrations, moderation and live-signal pilot) are not delivered by this first increment.

## Files and checks

UI: src/components/traffic-layers.tsx and .css, transport-map integration and map-types. Data validation: src/lib/traffic.ts. Server: src/lib/server/traffic.ts and the two API routes. Tests: tests/traffic.test.ts. Icon wiring: layout.tsx, manifest.ts, gerak-app.tsx, globals.css and public/sw.js.

Tests cover provider timestamp preservation, border filtering, untrusted image hosts, invalid positions/time, stale observations, OSM node identity, no fabricated signal phase, and coalesced camera requests. Build and browser results are recorded in PROGRESS.md.
