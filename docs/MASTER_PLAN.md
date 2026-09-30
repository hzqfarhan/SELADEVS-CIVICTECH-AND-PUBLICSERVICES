# GERAK master plan

## Outcome

Deliver a runnable Malaysian mobility MVP that connects one passenger journey to one operator action: **Johor map → moving bus → route/ETA → 3D follow → civic report → operator acknowledgement**.

This repository is a working demonstration and an extensible foundation. Production deployment requires the operational work in `DEPLOYMENT.md`; the presentation must distinguish implemented capabilities from proposed infrastructure. `PROGRESS.md` records completed verification.

## Product scope

| Area | MVP target | Boundary |
| --- | --- | --- |
| Passenger | Vehicles, route/stop details, estimates, favourites, journey options | Demo corridors are illustrative; live arrival predictions are not invented |
| Maps | Geographic 2D, miniature 3D, vehicle selection/follow | The miniature city is illustrative, not a surveyed digital twin |
| Civic | Geotag, category, description, optional image, report lifecycle | Reports remain inside GERAK; no council dispatch is implied |
| Operations | Fleet visibility, reports, lifecycle updates, simulated tools/analytics | Operations simulation must remain labeled |
| Malaysian data | GTFS-RT adapter and static importer | Source availability and freshness determine live state |
| Campus pilot | UTHM region and reusable telemetry boundary | Synthetic campus data until an authorized integration exists |
| Usability | Mobile layouts, BM/English, installable PWA, fallback, reduced motion | Offline never means fresh transport data |

## Implementation sequence

1. **Foundation:** typed shared contracts, App Router pages/routes, reproducible dependency lockfile, environment configuration.
2. **Reliable motion:** deterministic simulator, routes/stops, route progress and heading; separate source modes before adding official ingestion.
3. **Main experience:** compose the map, discoverable controls, passenger detail panel and mobile bottom navigation.
4. **Complete the loop:** persist civic submissions and authenticate operator status changes; verify cross-tab visibility through the server.
5. **Real data:** fetch and normalize official protobuf, import schedule archives, expose freshness and failure states without losing the demo.
6. **Resilience:** PWA shell/offline fallback, local preferences, API input limits and trustworthy user-facing status.
7. **Release evidence:** typecheck, meaningful tests, production build, browser walkthrough and documented limitations.

## Acceptance gates

- A fresh checkout can install and run without paid map credentials or a database.
- Vehicles visibly move with correct route direction; selecting and following work in both map modes.
- Report creation returns a persistent ID and appears in operations; protected lifecycle updates change the shared record.
- Official data never acquires fabricated occupancy, ETA or service-alert claims.
- The app remains understandable if tiles, WebGL or the upstream feed fail.
- The public app works at phone width, with keyboard navigation and reduced-motion preferences considered.
- Setup, source provenance, architecture, API contracts, tests and deployment steps agree with the actual code.

## Deliberate choices

Use Next.js with a Node runtime because this app has a frontend, server routes, authentication and persistence. Use a deterministic simulator because a stage demo must still function outside service hours. Use a local report store for a zero-setup development path and PostgreSQL/PostGIS for durable multi-process deployment. Use a bounded planner in the MVP and reserve OpenTripPlanner for a complete timetable/walking graph.

Do not expand the feature list at the expense of a working passenger-to-operator sequence. Future work is prioritized in `ROADMAP.md`.
