# Malaysia boundaries and animated buses

## Geographic hierarchy

Open the Malaysia / Explore boundaries panel on the map. Choose All Malaysia, a state/federal territory, then a district. Clicking a state or district also selects it while the panel is expanded. The camera frames the selected polygon, with a lime perimeter and a dark mask outside its actual geometry. Both Peninsular and East Malaysia are included. Zoom into Johor or follow a bus to see detailed 3D models.

The three boundary GeoJSON files come directly from Department of Statistics Malaysia's data-open repository: 1 country feature, 16 state/federal-territory features, and 160 district features (10 in Johor). This is a published snapshot, not a guarantee that every later administrative change is represented. Source URLs, SHA-256 hashes and retrieval timestamp are bundled in public/data/boundaries/provenance.json; the DOSM Open Data License is alongside them. Data is JSON-minified without simplifying or inventing geometry. Basemap roads, coastline and buildings remain OpenStreetMap via OpenFreeMap. Live transit coverage remains Johor; other states are not populated with invented buses.

## Original bus design

Three.js renders an original 11.5-metre bus model on MapLibre's shared WebGL canvas: four independent tyres with visible spokes, mirrors, doors, glazing and window pillars, front/rear lights, destination panel, roof unit, contrasting roof and livery stripe. Wheels rotate by displayed travel distance divided by tyre radius and stop when positions stop changing. GPS anchors and clockwise headings remain authoritative. Symbolic model size is enlarged at lower zoom for readability; these are not surveyed vehicle dimensions or real tyre telemetry. Models appear at local zoom (11+); route and boundary views remain available nationwide.

Each route receives a deterministic distinct GERAK display colour, stable across feed reordering. Route cards, geographic paths and buses share it. Vehicle IDs choose roof/stripe variants. These are display liveries, not a claim about the operator's actual paint. The existing geographic hit layer supports selecting buses, and camera follow remains available.

## Verification

Tests verify Malaysia contains sample points in Johor, Sabah and Sarawak, excludes Singapore, and has expected state/district counts; route colour stability/uniqueness; four wheels; zero rotation at rest and a full turn per wheel circumference. Final browser visual verification remains blocked by the earlier browser URL-policy restriction. Physical-phone frame rate has not been measured.


## Facades and motion refinement (1 October 2026)

Visible OSM building walls receive decorative window frames and warm/dark panes at zoom 15.5+. These are procedural visual details, not surveyed window or occupancy data. The detail layer uses two instanced draw batches, up to 2,400 windows across 80 nearby buildings, refreshed at most every 1.4 seconds while the camera is still. Footprints remain geographic; heights use published render heights or the existing fallback. Close 2D zooms show clearer footprint outlines. Selected bus routes are emphasized; vehicle labels appear on selection, focus or hover.

Official vehicles within 80 metres of a published route can use route-based dead reckoning between observations. Each vehicle runs on the one-way pattern shape that matches the `trip.direction_id` its feed reports, falling back to the route's representative shape when no pattern matches. Speed is the last reported value, otherwise the lower median of the recent along-route movements, after a noise floor below which two observations support neither speed nor course. The estimate advances only along that shape and never further than the observation window that produced the speed, so a slowdown in traffic cannot build a long lead. New fixes reconcile over six seconds from the displayed progress; when a fix lands more than 60 metres behind an over-run estimate the marker is re-anchored to the fix and labelled as correcting instead of being animated backwards, and only a sustained series of backward movements flips the predicted course. Prediction never changes the authoritative GPS data or timestamps, never substitutes simulator vehicles, holds reported zero speed, clamps open route endpoints, and pauses three minutes after the last GPS observation. Vehicles whose position cannot be matched to a shape retain observation-only interpolation. The map labels estimated positions and paused estimates; 2D predicted markers have dashed borders and re-anchored ones dotted. No live ETA is manufactured.

### Realtime motion repair (18 October 2026)

Measured on the live BAS.MY Johor feed, 14 polls over 5.6 minutes covering 88 vehicles and 888 consecutive fix pairs: no `position.speed` or `position.bearing` is published (0.0% populated), fixes arrive on an exact 30-second grid and are already 25 seconds old at the median (p90 36, max 40), and 30.0% of pairs move under 25 metres.

Projecting each vehicle onto its route's single representative shape read 37.8% of pairs as travelling backwards (29.2% by more than 25 m; median 217 m, p90 568 m) because roughly half the fleet runs the opposite direction. Projecting onto the pattern shape selected by `trip.direction_id` reduces that to 7.1% of pairs, 2.2% beyond 25 m, median 4 m; the reported direction agreed with the nearest one-way shape for all 802 pairs that could be matched. Direction is carried through the feed reader only with explicit field presence, because `direction_id` 0 is a real direction.

Replaying the recorded fix stream through the display engine at half-second frames, scoring each marker against its own last 12 seconds of displayed travel: visible backwards steps fell from 8.8% to 1.3%, sustained backwards slides of at least 1.5 s from 257 to 7, total backwards distance from 35.2 km to 2.9 km, and buses that ever reversed from 75 of 88 to 15 of 88. The remaining 177 steps above 300 m in that window are instant re-anchors to a fix from a displayed position that no longer lies on a published shape; they exist in both engines and are not animated reversal.

Freshness ceiling: the upstream response carries no validator (`cache-control: private`, `cf-cache-status: BYPASS`), so a conditional GET cannot shorten it, and positions are already about 25 seconds old when they arrive. Server refresh is 15 seconds within a realtime bucket of six upstream requests a minute, static feed refreshes use a separate two-a-minute bucket, and `/api/vehicles` is served with `s-maxage=5, stale-while-revalidate=10`. End-to-end position latency is therefore roughly 30-40 seconds; anything below the 30-second batch cadence needs operator AVL or SmartMobility integration, which is not part of this data source. The interface keeps stating it: "Last GPS update" shows the feed timestamp, "Stale GPS" appears past 120 seconds, and the status line reports how many positions were re-anchored to GPS.

Tyres track displayed travel distance. Bus body suspension and cornering sway are subtle decorative animation; body sway respects reduced-motion preferences. These do not represent measured vehicle suspension telemetry.

### Additional visual polish

The 3D lighting button cycles day, dusk and night. Lighting is a user-selected visual treatment, not current measured weather or time. Window patterns use coordinate-derived seeds to remain stable when the camera changes, with more illuminated panes at night. Up to 600 instanced roof-edge trims follow existing footprint edges. A route-coloured selection halo identifies the chosen bus; camera follow gently turns towards its travel direction. Stop-lamp placement updates at most every 800 ms instead of scanning all stops each frame.
