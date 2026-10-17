# GERAK promotional film

**Latest edition:** [GERAK public launch film — Your journey. Your voice.](launch/GERAK-Launch-Film-1080p.mp4). It highlights moving buses in 2D and 3D and a complete civic report-to-acknowledgement sequence. See [the launch edition notes](launch/README.md) for capture provenance and editable sources. The previous [codebase edition](codebase/GERAK-Codebase-Promo-1080p.mp4) is preserved, and the files described below preserve the first, illustrative edition.

**A better way to move.** A 30-second landscape motion-graphics promo in English.

## Deliverables

- `GERAK-Promo-1080p.mp4` — 1920 × 1080, 16:9, 30 fps, H.264, AAC stereo. Ready for presentations and YouTube.
- `GERAK-Promo-Cover.png` — full-resolution closing card for a thumbnail or cover.
- `storyboard.png` — six-scene overview.
- `composition.html` — editable, self-contained local animation preview with playback and seeking. Keep its `assets` folder beside it. The HTML preview is silent; the exported MP4 includes the music.
- `soundtrack-original.wav` — original 30-second electronic cue, 48 kHz stereo.

## Sequence

| Time | Scene |
| --- | --- |
| 0–4 s | Your city. In motion. |
| 4–9 s | Meet GERAK / floating phone |
| 9–14 s | Routes, stops and vehicle positions |
| 14–19 s | Fare estimates and monthly budgets |
| 19–24 s | Community reports and progress |
| 24–30 s | Brand close / Let's GERAK |

## Creative notes

Uses the existing GERAK icon, Space Grotesk and DM Sans, with the project's midnight navy and blue palette. The diagrams and product screens are original, illustrative motion graphics, labelled within the film. They are not recordings of live telemetry. The RM 84 / RM 120 budget is an explicitly labelled example. Copy reflects the existing app's documented functions; it does not claim live arrival predictions, universal fare coverage, or automatic delivery of reports to municipal authorities.

The instrumental soundtrack and transition sounds were synthesized for this film without sampled recordings or third-party music. No voiceover. Fonts are distributed under their included SIL Open Font License texts. The existing project logo is reused unchanged.

## Editing and rendering

`composition.html` exposes `window.renderFrame(seconds)` for deterministic rendering. The artwork is drawn directly at 1920 × 1080. Edit copy, timings and graphics there. `make_soundtrack.py` regenerates the score using Python and NumPy. `render.mjs` captures 900 frames and exports the soundtrack with H.264 video and streaming-friendly MP4 metadata.

The renderer accepts `CODEX_NODE_MODULES`, `CHROME_PATH`, and `FFMPEG_PATH` environment overrides for portability. Its defaults point to the current machine's bundled Playwright/Sharp runtime and the local FFmpeg download. Run `node media/gerak-promo/render.mjs --stills` to regenerate only the stills, or omit `--stills` to export the film.

Application source files and application dependencies were not changed.
