# GERAK public launch film

**Your journey. Your voice.**

30 seconds · English · landscape 16:9 · 1920 × 1080 · 30 fps · original instrumental music.

## Deliverables

- `GERAK-Launch-Film-1080p.mp4`: the finished launch film.
- `GERAK-Launch-Film-Cover.png`: matching brand cover.
- `storyboard.png`: seven-scene overview.
- `composition.html`: editable composition with a silent timeline preview.
- `launch-soundtrack.wav`: original music with additional civic-action cues.
- `recordings/` and `screens/`: footage and close-ups of the running application.

## Final edit

| Time | Content |
| --- | --- |
| 0–3 s | Moving J22 bus in the real 3D map; “Every journey matters.” |
| 3–8 s | The same bus in a fixed-camera 2D view; “See your bus move.” |
| 8–14 s | Actual 3D follow footage; “Follow the journey.” |
| 14–18 s | A location-marked civic demonstration at OPP Plaza Pelangi; “Make local issues visible.” |
| 18–22 s | Actual report form, followed by its Submitted card; “Give your neighbourhood a voice.” |
| 22–27 s | Actual operator acknowledgement and the same report in the community view. |
| 27–30 s | Clean GERAK brand close; “Your journey. Your voice.” |

Bus movement occupies 14 seconds and the civic story 13 seconds. Planning and budget screens are omitted to keep the public launch focused.

## Provenance and scope

The running application was captured locally on **16 October 2026, Malaysia time**, using its official Johor feed. Bus **VDJ8519**, route **J22**, appears in the principal 2D and 3D sequences. The 3D footage was captured near Jalan Harimau Tarom / Plaza Pelangi. The later fixed-camera 2D footage was captured farther along its journey near Cahaya Kota Puteri. They demonstrate the same bus and route at different observation times, rather than a continuous real-time journey.

The app's existing motion rendering uses GPS observations and route-based estimates between updates. No official bus positions were invented or replaced with simulator data. The film labels recorded footage and condensed time. Source captures contain 20 screenshots per output second; their metadata records elapsed wall time, which varies with browser rendering. The final composition exports at 30 fps. No live ETA or delay prediction is claimed.

The civic example is a local demonstration titled **“Demo: blocked walkway near bus stop”**, at **OPP Plaza Pelangi**, report **GRK-3597FC95**. It was submitted through the actual form and acknowledged through the app's existing local demo operator session. The same stored record is shown in the operator and community views. Its data lives in the isolated `.runtime/launch-capture` store. Nothing was forwarded to an external authority.

The final report uses the app's stop selector to attach OPP Plaza Pelangi. The original plan's free-position map picker was rehearsed, but that take is not used in the final edit. The map shot shows the actual report marker at the selected stop.

Reporting shots retain a “Community demonstration” label. Acknowledgement is the final demonstrated state; no physical repair or government partnership is implied. High-resolution close-ups were captured from the same application interface. The form was re-opened to capture a sharper image without submitting a second report.

The final edit combines recordings, actual app screenshots, editorial typography, framing, route-line graphics and sound. No replacement product screens were drawn. The app's development indicator was hidden only in the recording browser. No application functionality was changed for this film.

The existing GERAK logo, DM Sans and Space Grotesk are reused. Font licenses are in `../assets/`. Music is the project's original synthesized score, with locally synthesized submission and acknowledgement tones. There is no spoken narration; the story is carried by on-screen text.

## Editing and rendering

Open `composition.html` with local-file media access enabled for a silent preview. Run `node media/gerak-promo/launch/render.mjs --stills` for scene previews, or omit `--stills` to export the film. The renderer currently uses this machine's bundled Playwright, Chromium, Sharp and FFmpeg paths.

`capture.mjs` supports interactive app capture. `capture-fixed-view.mjs` records the 2D shot after disabling Follow through the real interface. `capture-details.mjs` captures civic details at twice the pixel density. These scripts expect the local app on port 3100 and, for civic capture, the isolated demonstration store and local demo operator mode.

`mix_audio.py` adds original action cues to the existing score. The MP4 render normalizes the soundtrack and exports H.264 video with AAC stereo audio and web-friendly fast start.

Earlier cuts remain in the parent and `../codebase/` folders. A public URL or QR code can be added once a verified launch destination exists.
