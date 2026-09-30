# GERAK implementation tracker

- [x] Inspect workspace, available CODEFEST archive and requirements.
- [x] Verify Malaysian official GTFS and GTFS-Realtime integrations.
- [x] Install Next.js, TypeScript and application dependencies.
- [x] Implement passenger, operator and civic reporting interfaces.
- [x] Implement MapLibre 2D and animated Three.js 3D scenes.
- [x] Make official Johor data the default; isolate explicit simulation.
- [x] Import 21 official routes and 988 stops; verify 96-vehicle sample.
- [x] Implement bounded journey planning, favourites, bilingual UI and PWA fallback.
- [x] Add source registry, architecture, API/schema and deployment documentation.
- [x] Pass 25 tests, TypeScript, production build and production dependency audit.
- [x] Verify standalone production startup and HTTP endpoints (99 fresh official vehicles in final sample).
- [ ] Complete final browser walkthrough (browser URL-policy rejection).
- [ ] Validate PostgreSQL/Docker deployment and physical-phone performance.
- [ ] Connect authorized UTHM telemetry and timetable-aware routing.

The shared conversation could not be fetched. The available CODEFEST archive was an event website, not the uploaded judging brief; no unseen rubric is claimed. Live ETAs, trip updates, service alerts, occupancy and real building geometry are not verified integrations. The 3D city is illustrative; bus positions and route geometry can be official.

- [x] Fix missing MapLibre worker shared module; verify both served as JavaScript. Add dependency regression test (26 tests pass). Replace always-visible, distance-scaled 3D tags with one fixed-size selected/hovered bus label and hover-only stop labels. Production build passes; final visual browser verification remains blocked as previously recorded.

- [x] Expand 3D geographic span from 76 to 260 world units, reduce decorative building limits from 150/92 to 80/45, clear route corridors and fit camera to viewport. GPS coordinates preserved; 27 tests and production build pass. Visual verification remains pending due to the previously recorded browser restriction.
