# GERAK live demo — three minutes

Before presenting: run `npm run ingest`, `npm run build`, then `npm start`. Check `/api/health`, `/api/vehicles` and `/sources`. Use an operator account or explicitly enable local demo operator access. Rehearse in passenger and operator tabs; final automated browser access was blocked, so this rehearsal remains necessary.

1. **0:00–0:35 — Johor, real data.** Open the default live map. Show the official source and GPS timestamp. Explain that positions are observations animated between updates; count varies by service hours.
2. **0:35–1:10 — A real bus and route.** Select a bus, inspect its official identifier and route. Show stops and journey planning. State that planning is based on representative route topology; live arrival predictions, occupancy and delays are unavailable, not fabricated.
3. **1:10–1:40 — 3D and follow.** Switch to 3D and follow the selected vehicle. Real route/vehicle coordinates drive an illustrative miniature city; buildings are not a surveyed digital twin.
4. **1:40–2:20 — Civic participation.** Select a map location and submit a clearly titled demonstration report, optionally with an image. The report is an internal GERAK record and is not sent to a municipality.
5. **2:20–2:45 — Operator response.** Open the authenticated operator view, find the report and acknowledge it. Show the passenger view receiving the status change.
6. **2:45–3:00 — Scale responsibly.** Switch language and show the attributed sources page. Explain that UTHM requires an authorized campus telemetry partnership.

If the official feed is unavailable or outside service hours, retain the honest empty/stale state. Only then explicitly select the labeled simulator to demonstrate movement and synthetic ETA behavior. Never describe simulated buses as live official observations. For devices without WebGL use the schematic fallback; postpone 3D if needed.


## Geographic 3D update — 30 September 2026

The active 3D mode now shares the MapLibre geographic basemap with 2D, replacing the procedural miniature city described in earlier sections. OpenFreeMap/OpenStreetMap supply real Johor coastline, roads and building footprints. Extrusions use provider render heights or an estimated minimum height, not surveyed elevation. GPS-anchored bus footprints animate with observed headings; model size is exaggerated at regional zoom for readability. The MY overview control frames Johor, while follow zooms to the selected bus. Sources: https://openfreemap.org/quick_start/ and https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/. A Johor Bahru z14 tile was verified to contain 70 building features, 7 water features and 1,140 transportation features.
