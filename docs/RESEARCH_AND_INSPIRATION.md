# Research and inspiration

Research date: **30 September 2026**. References inform architecture and interaction design; GERAK is an original implementation. Repository links are primary sources. Check the exact license of any code or asset before reuse; a research citation does not grant asset rights.

## Requested visual references

### Jalan KL

[Jalan KL](https://kl.jalanmalaysia.com/) was accessible through the research browser. Its visible page describes a miniature Kuala Lumpur with neighbourhood exploration, map/camera controls, a 2D map/3D globe choice, location pins and approachable local storytelling. Its Malaysian identity is expressed through places and everyday activity.

GERAK interpretation: make Johor feel specific through Malaysian place names, language and coherent city scale; keep exploration playful while preserving transit legibility. Use one clear selected vehicle, modest model detail, warm surfaces, readable route colours and a deliberately composed tilted view. These are GERAK design decisions, not claims about Jalan KL's internal technology. Do not copy its map models, text, logo or artwork.

### Abeto Messenger

[Messenger by Abeto](https://messenger.abeto.co/) is the second user-specified experiential reference. A browser visual inspection showed a teal background, a small richly illustrated low-polygon 3D world, soft colours and shadows, chunky typography and an inviting start screen. The text extractor returned no readable body. Neither observation establishes its underlying framework or asset pipeline.

GERAK's interpretation is a small, inviting 3D world with responsive motion and an immediately understandable focal subject. Apply that feeling to a bus-follow camera and miniature city. Retain a conventional 2D view and explicit controls so the experience remains useful on ordinary phones. Do not claim source-code reuse or affiliation.

## Transit and civic foundations

| Primary project | What was reviewed | GERAK decision |
| --- | --- | --- |
| [OneBusAway application modules](https://github.com/OneBusAway/onebusaway-application-modules) | Separates transit data, realtime APIs, service alerts, rider interfaces and feed monitoring | Keep normalized data independent of map rendering; expose stop/route/vehicle APIs and freshness health |
| [OneBusAway Wayfinder](https://github.com/OneBusAway/wayfinder) | Modern rider frontend, localization configuration and transit-region configuration | Give passengers fast stop and arrival access; make region, language and timezone explicit |
| [OpenTripPlanner](https://github.com/opentripplanner/OpenTripPlanner) | Dedicated multimodal planning engine | Bound the MVP planner to its actual route graph; plan a separate OTP service for walking, transfers, calendars and realtime planning |
| [FixMyStreet](https://github.com/mysociety/fixmystreet) | Location/category reporting, public visibility, updates and authority routing | Use a geotag-first civic flow, transparent status lifecycle and future jurisdiction routing |
| [Open311 GeoReport v2](https://wiki.open311.org/GeoReport_v2/) | Standardized service types, service requests, locations and request status | Keep civic records exportable; do not call the internal API Open311-compliant until conformance is implemented |

GERAK combines mobility and civic reporting around the same places. It should help a passenger discover a route, understand uncertainty, and report an obstacle near the stop without losing context. The operator view completes the loop by receiving and triaging that report. No municipal delivery is implied by an internal status update.

## 3D maps and realtime visualization

| Primary project or documentation | Relevant pattern | GERAK application |
| --- | --- | --- |
| [Mini Tokyo 3D](https://github.com/nagix/mini-tokyo-3d) | Animated public transport with tracking, playback, layers and eco controls | Animate along geometry; make follow mode deliberate; expose power-conscious rendering |
| [Mini Tokyo 3D developer guide](https://github.com/nagix/mini-tokyo-3d/blob/master/DEVELOPER_GUIDE-en.md) | Library configuration and integration guidance | Keep transport data adapters independent from 3D presentation |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | Interactive vector maps and compatible style ecosystem | Geographic foundation for route layers, stops, vehicles and civic locations |
| [MapLibre Three.js custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/) | Geographic model transforms and a renderer sharing the map context | Place simple bus geometry at real coordinates with the same camera/projection |
| [Three.js](https://github.com/mrdoob/three.js) | Reusable geometry, materials and WebGL rendering | Pool simple low-polygon vehicle models; avoid per-frame React state updates |
| [deck.gl](https://github.com/visgl/deck.gl) and [TripsLayer](https://deck.gl/docs/api-reference/geo-layers/trips-layer) | GPU geospatial layers and timestamped animated trajectories | Future large-fleet trails and analytical layers, rather than an additional renderer in the MVP |

### Rendering decisions

- Compute route distance once. Animate vehicle progress with `requestAnimationFrame` and interpolate bearings through the shortest angle.
- Distinguish movement inferred between received fixes from a new measured position. Bound extrapolation and show staleness.
- Reuse a shared geometry/material per vehicle style. Do not load detailed vehicle models for every bus.
- Prefer map-native line, circle, heatmap and extrusion layers for geographic content. Reserve Three.js for the vehicle form where it adds visual meaning.
- Cap pixel ratio on phones; pause heavy work in hidden tabs; respect reduced motion; allow 2D fallback when WebGL is unavailable.
- Follow the selected vehicle with a damped camera and let manual pan end following. Avoid continuous camera jumps.
- Keep a screen-space hit target large enough to select a bus on touch, even when its geographic model is small.
- Buildings and terrain are provider/coverage dependent. Synthetic city blocks must be disclosed as illustrative rather than surveyed building data.

## GTFS processing and reliability

| Primary repository | Role | Use in GERAK |
| --- | --- | --- |
| [MobilityData GTFS Realtime bindings](https://github.com/MobilityData/gtfs-realtime-bindings) | Generated protobuf bindings, including Node/TypeScript | Decode the official binary feed without custom binary parsing |
| [MobilityData GTFS Schedule validator](https://github.com/MobilityData/gtfs-validator) | Canonical static feed validation | Production ingestion gate and feed quality evidence |
| [MobilityData GTFS Realtime validator](https://github.com/MobilityData/gtfs-realtime-validator) | Realtime validation and diagnostics | Monitor freshness, identifiers and geographic anomalies |
| [node-gtfs](https://github.com/BlinkTagInc/node-gtfs) | GTFS import/query/export using SQLite | Reference for static schema, spatial queries and import workflows |
| [GTFS-to-GeoJSON](https://github.com/BlinkTagInc/gtfs-to-geojson) | Route shapes and stops converted to GeoJSON | Reference for preparing efficient client map payloads |

Research found the older CUTR realtime-validator repository points to MobilityData's maintained repository. Use the maintained location in new tooling.

## PWA architecture

[Next.js's PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) is the primary integration reference for App Router manifest and service-worker support. [Serwist](https://github.com/serwist/serwist) supplies a broader service-worker toolkit; its repository is useful for advanced cache and update strategies.

GERAK's principles: installable manifest with valid icons; versioned shell cache; an understandable offline fallback; network-first transit snapshots with cache timestamps; and no service-worker caching of privileged mutation responses. A cached vehicle is never described as live. A production offline report queue needs client-generated idempotency keys, explicit pending/sent state and retry semantics; do not silently promise delivery.

## Evidence and license boundaries

- Data-provider attribution and runtime availability are tracked in `API_AND_DATA_SOURCES.md`.
- Third-party sites are visual references only. No downloaded artwork or cloned layouts are required for this implementation.
- FixMyStreet and Wayfinder have license obligations that need review before copying implementation code. Architecture study alone does not add either codebase as a dependency.
- GERAK's source and dependency lockfile are the authority for what was actually installed. This research list is not a list of running services.
- No measured performance, rider adoption, accessibility certification or impact figures are claimed by these references.


## Geographic 3D update — 30 September 2026

The active 3D mode now shares the MapLibre geographic basemap with 2D, replacing the procedural miniature city described in earlier sections. OpenFreeMap/OpenStreetMap supply real Johor coastline, roads and building footprints. Extrusions use provider render heights or an estimated minimum height, not surveyed elevation. GPS-anchored bus footprints animate with observed headings; model size is exaggerated at regional zoom for readability. The MY overview control frames Johor, while follow zooms to the selected bus. Sources: https://openfreemap.org/quick_start/ and https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/. A Johor Bahru z14 tile was verified to contain 70 building features, 7 water features and 1,140 transportation features.
