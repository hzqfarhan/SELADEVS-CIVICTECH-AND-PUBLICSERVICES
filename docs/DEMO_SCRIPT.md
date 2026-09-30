# Live demo script

Target length: approximately **3 minutes**. Use a fresh, tested production build with two browser tabs, one passenger and one operator. Have a phone-width view ready. The demo must work in explicitly labeled simulation mode even outside bus service hours.

## Before presenting

Run the checks in `TESTING.md`. Load the app once while online so local assets and the PWA fallback are available. Confirm the configured operator sign-in path. Use non-sensitive example images and report text. Keep the source label visible; do not switch to an empty live feed just to imply a live-data integration.

For the optional official-data segment, run `npm run ingest` before the presentation and inspect live mode immediately before starting. The development verification received 75 official vehicle observations and imported 21 routes/988 stops, but those counts are a historical sample, not a promised live result. Keep the main three-minute story in demo mode so ETA, occupancy and dispatch demonstrations retain their explicit synthetic basis.

## 0:00–0:25 — The city is moving

**Say:** “GERAK helps Malaysians understand their next journey and improve the places around it.”

Open Johor. Pause long enough to see vehicles move. Point to the visible source badge: “This demonstration fleet is simulated. GERAK also has an adapter for official Malaysian vehicle-position data.”

If a verified live feed is in use, describe the actual source and observation age instead. Never call synthetic positions live operator telemetry.

## 0:25–0:55 — Make one journey concrete

Select a moving bus. Show its route, stops and next estimated arrival. Save a favourite. Plan a same-region trip, such as JB Sentral to KSL City.

**Say:** “The passenger sees the route and an understandable estimate. The demonstration planner works over these illustrative corridors; it does not pretend to be a nationwide timetable engine.”

## 0:55–1:25 — A small world with a purpose

Switch to 3D with the same vehicle selected, then enable follow. Let its orientation and movement become visible. Briefly show the ability to return to 2D.

**Say:** “The bus remains the same object as we change perspective. Movement is interpolated between updates, with an approachable miniature city inspired by Jalan KL and Abeto Messenger. The buildings here are illustrative.”

Do not claim surveyed building accuracy or a GPS reading on every animation frame.

## 1:25–2:15 — Turn an obstacle into an actionable report

Create a report near a stop. Pick a location and category, enter “Blocked ramp beside bus stop,” add a short description and optionally an example photo. Submit and show the returned report ID.

Switch to the operator tab. Wait for the refresh, locate that same ID, and acknowledge it. Show its updated status to the passenger.

**Say:** “This is a persisted report shared between passenger and operator views. The status belongs to GERAK's workflow; connecting a council or campus team requires a real operational agreement.”

## 2:15–2:45 — Show local relevance and resilience

Switch BM/English. Open the UTHM pilot region and identify its simulation label. If rehearsed, demonstrate offline fallback briefly and then reconnect.

**Say:** “UTHM already has shuttle tracking. Our proposed pilot adds this rider experience and civic feedback loop through an authorized adapter. The app is installable, with a useful fallback when connectivity drops.”

## 2:45–3:00 — Close with the concrete next step

**Say:** “The next step is one authorized campus route, verified stop information, and an operations team. We will measure data freshness, arrival-estimate error and report response time.”

End on the selected vehicle and the acknowledged report. No invented users, partnership or impact numbers are needed.

## Recovery moves

| Problem | Rehearsed response |
| --- | --- |
| Official feed unavailable or empty | Use labeled demo mode and show the feed status |
| Third-party basemap unavailable | Use the fallback or miniature view; explain the source outage briefly |
| 3D/WebGL fails on venue device | Continue the exact passenger/report flow in 2D |
| Operator sign-in unavailable | Fix configuration before the live pitch; use the verified recording if required |
| Report submission fails offline | Show the draft/pending state honestly; reconnect before claiming delivery |

Keep a recording of this actual build as backup. A recording should show the same source labels and limitations as the live app.
