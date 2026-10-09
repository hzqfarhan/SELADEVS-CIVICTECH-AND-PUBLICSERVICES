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

### 2026-10-03 — 3D close-up and motion refinement

- [x] Set a closer 18.35 zoom, 64-degree pitch and front-quarter right/left camera angles. Reserve space for the desktop detail card and phone bottom sheet.
- [x] Remove 3D DOM billboards whose CSS transform displaced labels from geographic positions. Keep Three.js vehicle picking and hide stop names while following.
- [x] Make steering damping frame-rate independent; tie subtle suspension to displayed travel, ease body lean and avoid wheel spin on position corrections. Respect reduced motion for decorative animation.
- [x] Clarify active follow control and keyboard focus; enlarge phone camera touch targets.
- [x] Production build and TypeScript pass; all 40 tests pass. Browser checks at 390x844 and 1440x1000 confirm framing, right/left camera angles, stop-follow behavior, official GPS display and moving demo buses. No console errors observed. Screenshot: `.runtime/closeup-refined.png`.
- [x] Browser verification is now available; older entries reporting a browser restriction describe earlier sessions, not the current verification status. Production preview runs on port 3001.

### 2026-10-03 — Direct sidebar vehicle selection

- [x] Add bilingual Find your bus panel with individual plate-labelled vehicle rows, route colours, selected state, route dropdown and periodically refreshed GPS freshness.
- [x] Extend search to vehicle plates, labels and route destinations; preserve stable alphabetical ordering while observations refresh.
- [x] Route cards filter the fleet rather than automatically selecting the first vehicle. Direct selection retains 3D auto-follow and phone sidebar collapse.
- [x] TypeScript and production build pass. Desktop and phone browser checks confirm route filtering, plate search and selecting JXE5242 opens that vehicle's details. No console errors observed; proof saved to `.runtime/sidebar-bus-picker.png`.

### 2026-10-03 — Compact sidebar and city-scale 3D entry

- [x] Separate Vehicles and Routes in the sidebar. Route selection opens its matching vehicle list. Compact the header, journey action and provenance to leave more space for browsing.
- [x] Make the phone sidebar scroll as one panel with reachable fleet controls and retain automatic collapse on vehicle selection.
- [x] Enter 3D at zoom 16 / pitch 58, preserving closer user zoom. Initial/region 3D views centre on the service city rather than fitting every distant vehicle; Overall remains available explicitly.
- [x] Fix redundant camera-padding resets interrupting the 2D-to-3D animation. Improve city-title contrast over daylight buildings.
- [x] Production build and TypeScript pass. Browser checks confirm visible city buildings on initial load and after mode switching, route-to-fleet navigation, phone scrolling and exact vehicle selection with auto-follow. No console errors observed. Screenshot: `.runtime/city-sidebar-refined.png`.

### 2026-10-08 — Fare estimates, transport budgets and blue theme

- [x] Implement pure fare/distance engines, BAS.MY source configuration, concession eligibility, exact-table override support, integer arithmetic and explicit unknown fares.
- [x] Preserve GTFS trip patterns, original shapes, ordered stop occurrences and raw shape distances; refresh legacy caches. Distance units remain unknown until verified.
- [x] Add bilingual journey fare breakdowns, passenger profile and recurring monthly budgets under Saved; validate versioned local persistence, return directions and partial totals.
- [x] Implement dated pass-comparison engine; public UI keeps comparisons unavailable until city coverage is verified. Actual-spend tracking remains deferred.
- [x] Replace green UI accents with blue/navy and amber, update PWA icons, default lighting to night and remove automatic time/weather lighting changes. Day/dusk remain manual.
- [x] Fix expanded planner overflowing its sidebar. Browser checks verify priced and unavailable journeys, RM0.94 x 20 = RM18.80, mixed incomplete totals, reload persistence and reachable phone controls at 390x844 without horizontal overflow.
- [x] Official Johor static data refreshed successfully; 21 routes / 40 patterns. Live vehicle observations also refreshed. Final production build (including TypeScript) and all 65 tests pass. No browser console errors observed during final checks.
- [x] Changed files formatted. Full format check still reports four pre-existing files: city-scene.tsx, uthm-live.ts, scrape-uthm.ts and transit.test.ts.
- [x] Production preview remains on port 3001. Detailed limits and file map: FARES_AND_BUDGET.md.

### 2026-10-08 — Bus overview and iOS icon

- [x] Replace numbered fleet circles with collision-aware bus symbols; stacked backplates distinguish groups. Add the previously missing singleton overview layer used by the existing vehicle click handler. Group taps retain expansion zoom behavior.
- [x] Generate a blue road-ribbon GERAK iOS icon, preserve the source and export opaque 1024px/180px assets. Configure Apple touch metadata; native iOS install remains unverified.
- [x] Production build and TypeScript pass. Desktop browser shows number-free bus overview with no console errors observed. Screenshot: .runtime/bus-overview-refined.png.
- [x] Document a phased civic expansion plan in CIVIC_EXPANSION_PLAN.md. These are proposed features, not claims of delivered council integrations.

### 2026-10-08 — Traffic and CCTV feasibility
- [x] Research MBJB i-Trafik, DBKL, LLM, OSM signal mapping and Singapore camera API. Inspect a real camera metadata response.
- [x] Save source matrix, UI refinement, schema/API design, rollout gates and civic integration in TRAFFIC_AND_CCTV_PLAN.md. This turn is planning only; no traffic feed or signal-state feature deployed.

### 2026-10-08 — Traffic first increment and latest icon rollout

- [x] Add bilingual Layers panel with route visibility, Singapore border snapshot list, one selected real image, captured-time freshness, official viewer links and explicit Inspect location action that stops bus follow. Preserve layer preferences locally.
- [x] Add validated, rate-limited camera and signal endpoints with bounded requests and process-local coalesced caches. Add source inventory entries and TRAFFIC_IMPLEMENTATION.md.
- [x] Connect imported signal selection to the civic form with selected coordinates and node context, without replacing an unrelated saved draft. Current upstream inventory is unavailable (primary HTTP 406, alternative HTTP 500); real signal marker/report UI could not be exercised end-to-end. No synthetic signals or live phases shown.
- [x] Apply generated GERAK icon to header/sidebar, favicon, Apple touch, PWA any/maskable sizes and offline page. Update service-worker asset version. Native iOS installation remains untested.
- [x] 70 tests and final production build/TypeScript pass. Browser loaded an actual 1920x1080 LTA image with its source timestamp. Phone check at 390x844 confirmed no horizontal overflow; fixed overlay stacking, isolated card scrolling and mobile wordmark wrapping.
- [x] Approval-review usage failure during diagnostics resolved on continuation. Subsequent diagnostics and final builds ran through approved commands.
- [x] Production preview remains on port 3001. Camera metadata and imagery are Singapore-side, not Johor city CCTV. Malaysian viewers remain official outbound links.

### 2026-10-09 — Mobile header fix

- [x] Keep icon/name on one row, remove the redundant phone arrow, compact operator control to an accessible icon button, and provide 44px touch targets with safe-area padding.
- [x] Final production build and TypeScript pass. Browser verification at the active 394px phone viewport confirms a 60px single-row header, no horizontal overflow, working sidebar toggle and English/Bahasa Melayu labels. Requested viewport override did not replace the browser's active device width; no narrower-device result is claimed.
- [x] Screenshot: .runtime/mobile-header-fixed.png. Production preview remains on port 3001.

### 2026-10-09 — Improvement brief: journey-search increment

- [x] Reviewed the supplied website improvement brief and mapped existing foundations, gaps, dependencies and release gates in IMPROVEMENT_BACKLOG.md. Full roadmap remains open.
- [x] Replace From/To native stop dropdowns with a reusable bilingual combobox: name/ID token search, keyboard selection, bounded suggestions, no-match feedback and isolated keyboard list scrolling.
- [x] Reject missing, removed and identical stop IDs; editing invalidates old results. Keep official connection estimates clearly separate from departure/timetable routing.
- [x] 72 tests pass; final production build and TypeScript pass. Browser verified official Johor suggestions, arrows/Enter/Escape, no-match state, same-stop blocking, successful route connections and BM labels. At measured 327px viewport there is no document horizontal overflow. Keyboard selection scrolls the suggestion list.
- [x] Production preview running on port 3001. Screenshot: .runtime/journey-search-mobile.png. Public gerak.hyun.my deployment not changed or verified.
- [ ] Continue with route detail/direction and shareable state, unified data status, opt-in nearest-stop origin, then timetable ingestion and the remaining backlog. No address geocoder or scheduled departure engine added in this increment.

### 2026-10-09 — Mobile workspace usability repair

- [x] Replace competing split-screen panel heights with explicit mobile Browse/Map surfaces. Keep bottom navigation and safe-area sizing; remove redundant sidebar toggles on phones.
- [x] Give lists/forms one full-height scroll container. Keep search suggestions in form flow, remove nested vehicle-list scrolling and increase input/touch sizes. Remove obsolete 35/48/50% mobile height overrides.
- [x] Separate Layers from follow controls; hide auxiliary navigation behind vehicle details and hide details while traffic tools are open. Keep vehicle detail independently scrollable.
- [x] Bus/stop/journey selections open the map; operator shortcut opens its panel. Report map picking clears vehicle selection and camera follow.
- [x] Final production build and TypeScript pass. Browser tested 320x640 and 390x844 with no document horizontal overflow, keyboard/search layout, bus selection, Layers, community dialog/picking/cancel, operator navigation and Malay labels. At 1280x800 desktop retains map/sidebar and hides the mobile switch. Viewport override reset after verification.
- [x] Preview running on port 3001. Screenshot .runtime/mobile-workspace-fixed.png. Actual device soft-keyboard and iOS safe-area behaviour still require physical-device checks; no external deployment performed.

### 2026-10-09 — Planned mobile, tablet and desktop navigation refinement

- [x] Plan and verification recorded in NAVIGATION_REFINEMENT_PLAN.md; audited task entry points, map return, route selection and responsive conflicts before implementation.
- [x] Five passenger destinations: Live buses, Plan journey, Routes, Community, Saved. Operator access stays separate. Added section headings, contextual surface labels, current-page semantics and section focus.
- [x] Centralized navigation; Home reveals content; search clears on task/region changes. Preserve mounted panel, typed search and scroll on list/map round trips. Journey-result selection keeps its results/section (browser verified three results and scroll position retained).
- [x] Explicit selected-route reset / View buses / Show on map; selection retains Routes context. Stop/report camera focus waits for a visible map and respects reduced motion. Stop title visible in phone detail card.
- [x] Compact single-surface layout extends to 960px. Desktop has one panel scroll owner and compact keyboard-accessible route legend. Separated desktop Layers from vehicle detail close button; hide competing overlays while details/tools are open.
- [x] Named dialogs, pressed map modes, honest no-position empty state. No new data sources or dependencies.
- [x] 72 tests passed; final production build and TypeScript passed. Browser checked 320x640, 390x844, 820x700, 1024x600, 1440x900, English/BM, planner/route/map return, stop centering, operator/community/saved entry, Home and panel restoration. No document overflow at checked sizes; final browser error log empty. Viewport override reset.
- [x] Screenshots: .runtime/navigation-mobile.png and .runtime/navigation-desktop.png. Local production preview on port 3001; no public deployment. Physical device keyboard/safe-area QA remains outstanding.

### 2026-10-09 — Consistent tab refinement

- [x] Refined shared sidebar spacing, typography, route/stop cards, save controls and empty states across passenger tabs. Contextual search and counts reflect filtered routes/stops.
- [x] Saved keeps its transport budget in an expandable drawer; added Browse routes guidance. Community promotion appears only in Live buses.
- [x] Community and Operator reports have All/Open/Resolved filters with pressed states and contextual empty feedback. Community totals use equal columns; Operator metrics use two readable columns and chart labels use short route names.
- [x] Preserved compact vehicle details and removal of the floating camera toolbar from the preceding requests.
- [x] Production build and TypeScript passed. Scoped diff whitespace check passed. Browser verified route no-results/clear, budget expansion, report filters, journey form and live fleet; checked layouts at 320px, 390px and 1280px with no document horizontal overflow. Operator metrics measured two columns; Community totals equal widths. Final browser error log empty and viewport override reset.
- [x] Screenshot: .runtime/tabs-community-refined.png. Production preview running on port 3001. No report submission or status mutation tested against the empty report inbox; physical-device keyboard/safe-area testing remains outstanding. No public deployment.

### 2026-10-09 — Light, Dark and System appearance

- [x] Header appearance selector with English/BM labels, stored preference, cross-tab sync and system colour-scheme listener. Dark remains the default; persisted appearance is applied before hydration.
- [x] White-based Light theme with blue live mobility, purple journey/operator, cyan routes, rose community and amber Saved accents. Shared colour tokens cover forms, report dialogs, cards, map overlays, weather and traffic panels while preserving existing Dark colours as fallbacks.
- [x] Appearance changes set map day/night lighting; manual scene lighting remains available independently until appearance changes again. No weather/time auto-theme switching.
- [x] Production build and TypeScript passed. Browser checked Light/Dark switching, System matching the current OS preference, reload persistence, 320px/390px/1280px widths, journey/Saved/Community/report form and daytime map. No document overflow at checked widths; final browser console error log empty. Physical OS theme-change and device testing remain manual QA.
- [x] Screenshots: .runtime/light-mobile.png and .runtime/light-desktop.png. Local production preview remains on port 3001; no external deployment.

### 2026-10-09 — Simple appearance toggle

- [x] Replaced the three-choice dropdown with a 44px sun/moon button. Only Light and Dark remain; removed OS theme listeners and System bootstrap handling. Older System preferences fall back to Dark.
- [x] Preserved local preference persistence, cross-tab updates, bilingual accessible action labels and map appearance synchronization.
- [x] Production build passed; browser verified both toggle directions, reload persistence and 390px layout without horizontal overflow. Screenshot: .runtime/simple-theme-toggle.png. Preview on port 3001.
