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

The shared conversation could not be fetched. The available CODEFEST archive was an event website, not the uploaded judging brief; no unseen rubric is claimed. Live ETAs, trip updates, service alerts and occupancy are not verified integrations. The active 3D map now uses OpenStreetMap building footprints; missing heights and decorative lamps are illustrative.

- [x] Fix missing MapLibre worker shared module; verify both served as JavaScript. Add dependency regression test (26 tests pass). Replace always-visible, distance-scaled 3D tags with one fixed-size selected/hovered bus label and hover-only stop labels. Production build passes; final visual browser verification remains blocked as previously recorded.

- [x] Expand 3D geographic span from 76 to 260 world units, reduce decorative building limits from 150/92 to 80/45, clear route corridors and fit camera to viewport. GPS coordinates preserved; 27 tests and production build pass. Visual verification remains pending due to the previously recorded browser restriction.

- [x] Add DOSM Malaysia/state/district polygons and shape-following selection; retain source licence and hashes.
- [x] Replace stacked bus blocks with original Three.js buses, movement-driven tyres and distinct route liveries.
- [ ] Visually verify latest geographic 3D and boundary panel on browser/physical phone (tool restriction remains).

- [x] TypeScript, 31 tests and production build pass. Updated preview started on localhost:3001 because 3000 is occupied; HTTP checks passed for application, source page, all three boundary files, provenance, licence and network API.

- [x] Integrate nine BAS.MY cities, merged Seremban A/B, KTMB, four Prasarana bus feeds and static-only Rapid KL rail.
- [x] Probe all 31 documented URLs with bounded request frequency: 29 HTTP 200; Rapid Kuantan static/realtime 404. Import 398 routes / 15,532 stops; record empty Kangar static feed.
- [x] Increase bus model size, closer 3D follow camera (17.5), and manual zoom range (3–22).

- [x] Final checks: 33 tests, TypeScript, clean production build and formatting pass. Port 3001 serves all 13 usable regional networks (398 routes / 15,532 stops), merged Seremban, valid realtime responses and schedules-only rail status. Browser visual verification remains unverified because of the recorded tool restriction.

- [x] Refine rounded bus bodywork, grille, ventilation, emissive lamps, warm scene lighting and height-shaded real building footprints. Add at most 40 instanced decorative stop lamps.
- [x] Inspect public UTHM/KATSANA HTML and stream; replace illustrative campus geometry with three published routes across Batu Pahat and Pagoh. Keep campus vehicle motion explicitly simulated; document pending live adapter and reuse terms in UTHM_PILOT.md.

- [x] Refine rounded bus bodywork, grille, ventilation, emissive lamps, warm lighting and height-shaded real building footprints. Add at most 40 instanced decorative stop lamps.
- [x] Inspect public UTHM/KATSANA HTML and stream; replace illustrative campus geometry with three published routes across Batu Pahat and Pagoh. Campus vehicle motion remains explicitly simulated; document pending live adapter and reuse terms in UTHM_PILOT.md.

- [x] Refinement validation: 33 tests, TypeScript, formatting and production build pass. Updated server on port 3001 returns HTTP 200 for app, sources, campus snapshot and APIs; campus network serves 3 routes / 23 unique checkpoints. Final visual walkthrough remains unverified because of the browser-tool restriction.

- [x] Add instanced facade windows/lighting on real footprints, clearer 2D building outlines, quieter labels and selected-route emphasis.
- [x] Add bounded route-based position prediction between GPS updates with smooth reconciliation, explicit estimate labels, direction/stopped/off-route guards and no fabricated GPS timestamps.
- [x] Animate bus body suspension/cornering independently of rolling wheels; respect reduced motion for decorative body animation.
- [x] 35 tests pass, including route corners, reverse movement, endpoints, zero speed, GPS reconciliation and outage expiry.
- [x] Production build/type checking and formatting pass; updated port 3001 serves passenger, operator and health endpoints. Visual walkthrough remains unverified due to the previously recorded browser-tool restriction.

- [x] Further polish: day/dusk/night control, stable facade lighting, instanced roof-edge trims, selected-bus halo, gentle heading-follow camera and throttled lamp updates. 35 tests, TypeScript, production build and formatting pass; passenger/operator/health HTTP checks pass on port 3001. Browser visual verification remains pending under the previously recorded tool restriction.

- [x] Fix drifting stop names/dots: remove relative positioning from stop marker roots and anchor MapLibre markers absolutely to the canvas origin. Production build passes; updated stylesheet served on port 3001. Browser visual verification remains pending.

- [x] Declutter stop names: replace DOM stop markers with geographic circle/symbol layers, zoom-gated names and native label collision avoidance. Small dots start at zoom 12, names at 14.5; clicks still open stop details. Filter stops by selected geographic boundary. TypeScript and production build pass; visual verification remains pending.

- [x] Stabilize 2D bus interaction: remove marker-root scaling and transform transitions, reduce desktop markers to 32px with 22px icons, retain 38px touch targets, suppress map-drag initiation on marker presses, and hold pressed markers still until release. TypeScript and production build pass; interactive browser verification remains pending.

- [x] Selecting a bus now smoothly centres and zooms to its displayed/interpolated position in both map modes, without requiring Follow. Preserves a closer existing zoom. Production build and TypeScript pass.

- [x] 3D click automatically follows from the bus right-hand side; tyres enlarged from radius 0.48 to 0.70 with matching wheel rotation. Ground route layers placed before building/fleet layers.
- [x] Day mode now recolours the basemap and is available in both 2D/3D. Added service-area current weather from Open-Meteo with timestamps, caching, stale/unavailable states and source attribution. 38 tests and TypeScript pass.
- [x] Production build completes and weather API returns validated HTTP 200 current model data for Johor Bahru and Kuching on port 3001. Browser visual verification remains pending. Full-repository formatting check reports seven concurrently modified files outside the weather/day-palette additions; these were not reformatted wholesale.
