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

Official vehicles within 80 metres of a published route can use route-based dead reckoning between observations. Last reported speed (or speed inferred from successive observations) advances along the route, including reverse direction. New fixes reconcile over six seconds from the displayed progress. Prediction never changes the authoritative GPS data or timestamps, never substitutes simulator vehicles, holds reported zero speed, clamps open route endpoints, and pauses three minutes after the last GPS observation. Missing or mismatched routes retain observation-only interpolation. The map labels estimated positions and paused estimates; 2D predicted markers have dashed borders. No live ETA is manufactured.

Tyres track displayed travel distance. Bus body suspension and cornering sway are subtle decorative animation; body sway respects reduced-motion preferences. These do not represent measured vehicle suspension telemetry.

### Additional visual polish

The 3D lighting button cycles day, dusk and night. Lighting is a user-selected visual treatment, not current measured weather or time. Window patterns use coordinate-derived seeds to remain stable when the camera changes, with more illuminated panes at night. Up to 600 instanced roof-edge trims follow existing footprint edges. A route-coloured selection halo identifies the chosen bus; camera follow gently turns towards its travel direction. Stop-lamp placement updates at most every 800 ms instead of scanning all stops each frame.
