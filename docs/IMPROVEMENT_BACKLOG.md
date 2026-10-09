# Website improvement backlog

Reviewed 9 October 2026 against the supplied Website Improvement & Feature Development Plan and the local implementation. This is an incremental delivery tracker, not a claim that the full roadmap is complete. Public deployment was not verified or changed.

## Delivered in this increment

- Reusable English/Bahasa Melayu stop search replaces the planner's large native dropdowns.
- Suggestions use loaded stop names and IDs, bounded to eight results, with accent-insensitive token matching and deterministic ordering.
- Keyboard arrows, Enter and Escape; labelled comboboxes; 44px input targets and 16px phone input text.
- Editing clears the old selection. Missing/removed stops and identical endpoints cannot submit. Swap remains available.
- Planner explicitly states that service dates and departure times are not checked. No new ETA, timetable or location API claims.

## Ordered delivery plan

| Priority / area | Existing foundation | Remaining work / acceptance gate |
| --- | --- | --- |
| P0 Search | Searchable GTFS stop inputs, swap, validation; map geolocation and nearby stop calculation | Opt-in nearest-stop origin with distance and denied-location recovery; explicit network-loading/error states; saved searches. Never imply straight-line distance is a walkable route. |
| P0 Route detail | Routes, route filters, ordered GTFS patterns, map selection, local favourites | Dedicated direction selector and stop timeline, selected pattern map geometry, shareable URLs and missing-route recovery. |
| P0 Timetable routing | Direct/one-transfer corridor connections and estimated ride duration | Ingest calendar/calendar_dates, trip stop times and timezone; retain times beyond 24:00; date-aware direct trips first, then transfers and walking. Test service exceptions, midnight and minimum transfer time before advertising departure planning. |
| P0 Data trust | Official/demo separation, source inventory, stale GPS treatment, feed endpoints | One shared status model across cards, map, operator and sources; distinguish last fetch from last successful observation; localize all states. |
| P1 Saved | Local favourites and recurring fare budget trips | Saved journey rename/remove, unavailable-route recovery, versioned migrations. Account sync is a separate authenticated feature. |
| P1 Community | Geotagged reports, images, categories, draft recovery, status lifecycle, operator updates | Duplicate suggestions; confirmation/follow; moderation and spam controls; privacy review; actor-labelled immutable history and server permission tests. No public exact personal location. |
| P1 Operator | Authentication, live fleet, report inbox/status actions, feed information, simulated dispatch | Role matrix, assignments, internal notes, filters and audit history; verify authorization at API boundaries before UI rollout. |
| P1 Map / mobile | 2D/3D, follow camera, clustering, mobile header, traffic layers | Profile phone frame rate and memory; reduced-motion audit, preserve selection between views, render budgets and accessible list alternatives. |
| P1 PWA / language | Manifest/icons, service worker/offline page, bilingual main interface | Offline saved-route UX, update prompt, cache-expiry tests, language persistence audit, missing-string and keyboard audits. Never present cached GPS as live. |
| P2 Observability / performance | Logging, existing tests and deployment docs | Endpoint latency/error baselines, bundle measurement, ingestion failure alerts, meaningful user-flow regression coverage and deployment smoke checks. |

## Validation and release gates

For each increment: run relevant unit tests and production build; exercise English/BM, phone layout, empty/error states, and keyboard paths in the browser. Routing changes additionally need known fixture journeys with ordered stops, service dates, transfers and overnight times. Auth/report changes need unauthorized and cross-role API tests. Record actual outcomes in PROGRESS.md.

No new dependencies or external APIs were added by this increment. Search is local to the loaded service network; it is not address geocoding. Existing data integrations and limitations remain documented in API_AND_DATA_SOURCES.md and TRAFFIC_IMPLEMENTATION.md.
