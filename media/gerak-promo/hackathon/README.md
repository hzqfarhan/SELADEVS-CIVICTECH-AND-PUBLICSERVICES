# GERAK hackathon pitch

Target: 180 seconds, landscape, with fresh recordings of the current app, English female synthetic narration, original instrumental music and sound effects.

## Audio

- Voice: `en-US-AvaNeural`, generated speech. This replaces the earlier Andrew narration for the intended final film.
- `GERAK-Pitch-Female-Audio-Preview.mp3`: female narration, original synthesized music and transition/interface effects, normalized for preview.
- `final-mix-female.wav`: uncompressed mix.
- `voice-ava-*.mp3`: twelve separate female narration takes.
- `script.md` and `scenes.json`: narration and scene timing. Malay text is a summary caption, not a complete translation of the spoken script.
- `make_film.py`: reproducible speech and audio-mix source.

The previous male preview and source takes are retained as earlier versions, not selected for the final film.

## Video status

Final output: `GERAK-Hackathon-Pitch-Female-1080p.mp4` (180 seconds, 1920×1080, 30 fps, H.264/AAC).

`render_final.py` renders the film using only the fresh screencast frames in `fresh/`, captured from the running GERAK app on 20 October 2026. No footage from sibling `launch` or `codebase` folders is used. Source recordings are 1600×900, arranged within a 1080p motion-graphic composition. Detail panels enlarge the same actual interface frames. Short takes hold their final frame rather than loop a vehicle observation.

The final composition includes original animated typography and route illustrations, new app captures, female synthetic narration, an original synthesized score, transition whooshes and interface tones. The Bahasa Melayu text is a summary, not a full subtitle translation.

Fresh takes cover bus selection, the map mode switch, journey results, an illustrative RM100 monthly budget with 22 operating days, scripted community report status progression, a hypothetical JB Sentral closure, and alternative boarding candidates. Reporting examples are explicitly labelled demonstrations, and closure footage is explicitly labelled hypothetical. No real issue was submitted to an authority.

The reporting sequence demonstrates the scripted community timeline, rather than a live authority response. The pilot and impact discussion describes future validation, not measured social outcomes. Core interface language support is partial, as described by the narration.

Render: `python media/gerak-promo/hackathon/render_final.py`
