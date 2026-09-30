# Roadmap

The sequence below is a proposed delivery order, not a promise of partnerships or dated releases. The current verified state lives in `PROGRESS.md`.

## 1. Demonstration release

Complete and rehearse the same connected flow on desktop and phone: moving Johor buses, details and estimates, 3D follow, civic submission and operator lifecycle. Preserve demo/live source labels. Ship a reproducible install, production build, tests, documentation and PWA fallback.

Exit gate: another developer can run the repository and repeat `DEMO_SCRIPT.md`; a recorded run shows no hidden manual repair.

## 2. Official Johor data quality

- Validate each static feed import and preserve feed version, checksum and service dates.
- Join realtime vehicles to official route/trip metadata without conflating synthetic IDs.
- Track source age, decode failures, invalid positions and static/realtime ID match rate.
- Add route-aware map matching and ETA confidence only after evaluation against observed arrivals.
- Improve scheduled service handling, including calendars, exceptions and times after midnight.

Exit gate: a multi-day observation run produces documented freshness and matching metrics; stale, empty and unavailable feeds behave correctly.

## 3. Authorized UTHM pilot

Agree on access with the university and existing telemetry provider, select a real route, audit stops with users, and identify the team responsible for reports. Supply an adapter rather than replacing established tracking infrastructure without cause. Separate operator telemetry from passenger location and publish a clear retention policy.

Use the contract and rollout gates in [UTHM_PILOT.md](UTHM_PILOT.md). The current UTHM mode remains a simulator; neither a private provider API nor university endorsement is implied.

Exit gate: authorized live telemetry, verified stop data, named operations ownership and consented pilot feedback. Measure ETA error and report response times; do not substitute demo statistics.

## 4. Production service

Move all durable records to managed PostgreSQL/PostGIS and images to object storage. Add shared caching and rate limits, a single elected ingestion scheduler, institutional identity, actor-specific audit history, monitoring, backups and restore rehearsals. Validate keyboard/screen-reader workflows and low-end Android performance with real devices.

Exit gate: rollback/restore tested, demo access disabled, permissions reviewed, documented incident ownership and operational SLOs.

## 5. Regional platform

Integrate OpenTripPlanner for walking, transfers and timetable-aware itineraries. Add jurisdiction routing or Open311 interoperability only with a real receiving authority. Expand operator coverage with individual data-quality gates. Offer aggregated planning insights after privacy and data-quality reviews.

Exit gate: each new integration has a source contract, realistic quota, freshness policy and owner; no synthetic data is mixed into impact reporting.

## Deferred on purpose

Payments, ticketing, driver instructions, emergency dispatch, nationwide routing, occupancy prediction and photorealistic digital twins are outside this MVP. Each needs its own operational or data foundation. Improve the reliability of the core journey before adding them.
