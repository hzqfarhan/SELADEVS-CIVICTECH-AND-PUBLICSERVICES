# GERAK promo — actual codebase edition

This revised film uses recordings of the running GERAK application. All map, bus, journey, fare, budget and report interfaces are rendered by the project's existing React components. The first promo's illustrative phone and schematic map have been replaced with footage of the actual app.

## Deliverables

- `GERAK-Codebase-Promo-1080p.mp4`: 30 seconds, English, 1920 × 1080, 16:9, H.264 video and AAC stereo music.
- `GERAK-Codebase-Promo-Cover.png`: closing card.
- `storyboard.png`: overview of all seven scenes.
- `composition.html`: editable film composition and local preview. Keep the `recordings`, `screens`, and parent `assets` folders with it. Its interactive preview is silent; the MP4 includes the original score.
- `recordings/*.mp4`: source recordings of the application.
- `screens/*.png`: source screenshots taken during capture.

## Film timeline

| Time | Actual app content |
| --- | --- |
| 0–3 s | GERAK brand introduction over the actual Johor 2D network |
| 3–9 s | 2D overview, then selecting a bus to focus the map |
| 9–15 s | Clicking the 3D control and following a bus among geographic buildings |
| 15–20 s | Real journey planner, route selection and calculated fare estimate |
| 20–24 s | Saved monthly budget, recalculated through the app's input controls |
| 24–27 s | Community report form and category selection |
| 27–30 s | Brand close over screenshots of both map views |

## Capture provenance

The app was run locally from this repository on 16 October 2026 (Malaysia time). Its locked dependencies were installed using `npm ci`. Live Johor vehicle observations and the official GTFS route network loaded through the app's own APIs. Network data was stored in the isolated `.runtime/promo-capture` folder. Capture used a fresh browser context, with no existing personal browsing session or saved preferences.

The application supplied the displayed journey from JB Sentral to Jalan Merak 4 Taman Scientex on J22 and its RM4.51 estimated fare. The budget scene demonstrates one journey per day across 20 operating days, with a user-entered RM120 monthly limit; GERAK calculates RM90.20 projected spending. These are example planning preferences, not completed transactions. Vehicles are historical observations from the capture time, not a live feed embedded in the video.

The report form is shown without submitting a report. No reports or operator messages were sent. Official source timestamps and app labels remain in the recorded interface. Map credits are also included in the film.

Only the Next.js development indicator was hidden in the capture browser. Application layouts, map visuals, results and status labels were not recreated or replaced. Editorial titles, framing and transitions sit around or over actual app footage. No functional application source changes were needed.

## Rendering

`../browser-capture.mjs` and `../capture-clip.mjs` captured the application through its browser controls. The clips contain 20 captured frames per second and are encoded at 30 fps. Their camera transitions are edited to fit the promotional timing.

`render.mjs` renders 900 frames from `composition.html`, combines them with `../soundtrack-original.wav`, and exports the final 30 fps MP4. Use `node media/gerak-promo/codebase/render.mjs --stills` for previews, or omit `--stills` for a complete export. Runtime paths currently match this machine.

The first edition remains in the parent folder. The existing GERAK logo, DM Sans and Space Grotesk fonts, and the original synthesized electronic score are retained; font license files are in `../assets`.
