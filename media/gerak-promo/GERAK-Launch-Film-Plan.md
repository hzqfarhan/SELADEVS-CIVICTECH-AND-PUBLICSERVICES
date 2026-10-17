# GERAK public launch film — production plan

**Audience:** riders and local communities.  
**Master:** 30 seconds, English, landscape 16:9, 1920 × 1080, 30 fps.  
**Campaign line:** **Your journey. Your voice.**  
**Creative idea:** Follow one moving bus, then follow one neighbourhood concern being heard.

## What the audience should understand

GERAK helps people see buses moving through their city and gives them a place to report issues around their journeys. The film connects those two uses through the same route and stop, so the civic story feels part of everyday travel.

The emphasis is 14 seconds of bus movement, 13 seconds of civic participation, and a 3-second brand close. Journey planning and budgeting are reserved for separate feature videos. This launch film needs one clear story that a first-time viewer can remember.

## Locked storyboard

| Time | Picture and movement | On-screen headline | Purpose |
| --- | --- | --- | --- |
| 0:00–0:03 | Open immediately on a bus travelling through GERAK's actual 3D map. Frame the bus large enough to recognize; street landmarks pass it. A small GERAK mark is present from the start. | **Every journey matters.** | Establish movement and a human reason to care before introducing controls. |
| 0:03–0:08 | Pull back and match-cut to the same bus in the real 2D view. Its marker advances along the route. Briefly hold the camera still so movement against roads and stops is unmistakable. | **See your bus move.** | Make the core rider benefit clear. Give 2D five uninterrupted seconds. |
| 0:08–0:14 | Use the existing 3D control, then follow the same bus through a visible turn or past recognizable landmarks. Keep its route colour and identity consistent. Let the camera settle for the final second near a stop. | **Follow the journey.** | Deliver the visual high point and demonstrate that 2D and 3D describe the same journey. |
| 0:14–0:18 | Shift attention to a nearby stop or walkway. Return to 2D and use GERAK's actual location picker to place a demonstration issue. A restrained editorial ring connects the stop to the report location. | **Make local issues visible.** | Connect transport to the conditions people encounter on the way to a stop. |
| 0:18–0:22 | Magnify the actual report interface: select Unsafe walkway, show a short prepared description, then submit. Match-cut from the location pin to the resulting report card. | **Give your neighbourhood a voice.** | Show the action a resident can take. Keep the interface legible and the steps short. |
| 0:22–0:27 | Show that same report in GERAK's operator Community inbox. Change Submitted to Acknowledged, then return to the resident's report card showing the updated status. The title and location remain identical across the cut. | **See the response.** | Complete a visible resident-to-operator feedback loop. Hold the final status for at least 1.5 seconds. |
| 0:27–0:30 | Let the route line lead into the existing GERAK logo. Keep a subtle moving map underneath, then settle into a clean navy end card. | **GERAK** / **Your journey. Your voice.** | Give the audience a simple brand promise to remember. |

The exact turns and stop used will be chosen from usable footage. The film must not invent a bus stopping, a route connection, or a physical street defect to fit the edit.

## Civic story and public benefit

Use one example throughout: **a blocked walkway near a bus stop**, submitted under the existing Unsafe walkway category. Suggested local demonstration title: “Demo: blocked walkway near bus stop”. The location is selected inside GERAK and is not presented as a verified real-world obstruction.

Three benefits should be visible:

1. **For riders:** the bus and its route are easier to see and understand.
2. **For the neighbourhood:** a concern gains a location and a clear description, giving people a way to speak up.
3. **For the operator and reporter:** the concern reaches GERAK's inbox and its acknowledgement is visible to the person who reported it.

Use isolated demonstration data and a readable “Demonstration” label throughout the report sequence. End the example at **Acknowledged**. The app also supports In progress and Resolved, but those states would imply additional events that this short story does not establish. GERAK's current workflow is internal; the film must not suggest automatic delivery to a council, a confirmed authority partnership, or a completed repair.

## Motion and visual direction

Aim for a confident, contemporary public-service startup launch: purposeful movement, clear typography, and enough breathing room to understand the product.

- Use the existing navy, electric blue, GERAK logo, Space Grotesk headings, and DM Sans supporting text. Preserve actual route colours and map attribution.
- Make the bus the visual anchor. Use one short hero shot, one readable 2D overview, and one sustained 3D follow shot. At least one shot must clearly show the bus crossing the frame against fixed geographic landmarks.
- Let route lines, stop rings, and report pins motivate transitions. A route becomes a path to a stop; attention moves from the stop to the issue pin; the issue pin leads into its report card.
- Use full-screen product footage, followed by deliberate close crops for reporting and status changes. Avoid shrinking the whole application into a small decorative device frame.
- Keep one headline on screen at a time. At 1080p, target 64–88 px headlines and 30–36 px essential supporting text, with a 96 px title-safe margin. Check readability at half size.
- Allow titles to enter with a short 8–12 frame movement, then stay still long enough to read. Use smooth match cuts rather than repeated glitch effects or camera spins.
- Treat the real interfaces as the product evidence. Editorial highlights and typography can be added around them; do not draw replacement product screens or invented controls.

## Sound and optional voiceover

Use an instrumental electronic score around 120 BPM, with a warm pulse and a clear lift at the 3D reveal. Add subtle movement swells, a pin-placement sound, and a soft acknowledgement cue. Reduce musical density during the civic flow so its meaning has room to land.

The existing original GERAK soundtrack can be re-edited to these beats. The film must communicate fully with sound off. Voiceover is optional; this 58-word draft leaves space for pauses across 30 seconds:

> Every day, our city moves. With GERAK, see your bus and follow its journey. From the wider picture to the streets around you. And when something gets in the way, make it visible. Put a local issue on the map. Give your neighbourhood a voice, and see it acknowledged. GERAK. Your journey. Your voice. Let's move forward, together.

If voiceover is used, provide English captions and mix music below the speech. Avoid loud interface clicks or a triumphant repair sound that suggests an issue has already been fixed.

## Capture plan using the existing codebase

1. **Prepare the actual app.** Use a clean local session and an isolated demonstration report store. Keep the production UI, real map rendering, vehicle models, and existing report workflow.
2. **Find usable bus movement.** Capture during active service and verify successive fresh GPS observations show meaningful geographic movement. Respect the existing feed refresh interval. The previous overnight footage contains too little bus travel for this concept.
3. **Capture matching views.** Record a longer sequence of one identifiable bus in 2D and 3D, with enough footage before and after the intended cut. Preserve route, vehicle, and geographical continuity; do not imply the two shots are simultaneous if their observation times differ.
4. **Use the existing simulator only as a disclosed alternative.** If official moving footage is unavailable, record the app's own simulator with its demonstration label visible. Do not animate a stationary official vehicle through invented GPS positions or present simulated footage as live.
5. **Capture the complete civic loop.** Create one local demonstration report, open its operator record, acknowledge it through the existing authenticated or explicitly enabled local demo workflow, then capture the updated passenger view. Do not send an external report.
6. **Assemble a silent first cut.** Review movement, story, reading time, and civic continuity before adding sound. Retain source footage and create an editable composition for revisions.

Recorded official-feed footage is a recording of observations at capture time. Retain source/freshness cues and a discreet capture-date note. Do not add live arrival countdowns, guaranteed waiting-time improvements, accessibility guarantees, or unsupported service claims.

## Final review gates and outputs

- A first-time viewer can answer: “What does GERAK let me see?” and “How can my neighbourhood be heard?”
- The bus visibly changes position along a road; camera motion alone does not satisfy the movement requirement.
- The 2D view is identifiable, readable, and present for a full five-second sequence.
- The same bus and route connect the principal map shots.
- The civic sequence shows location → report → operator acknowledgement → visible updated status.
- The same report appears in both views, and “Acknowledged” remains readable for at least 1.5 seconds.
- Demonstration labels and map credits survive cropping. No private information appears.
- The end card holds for three seconds, and the story works with audio muted.

Deliver a 30-second 1080p MP4, a matching cover image, an editable composition, and a caption file if voiceover is produced. Keep the current films as earlier versions.

The end card can carry a verified public URL or QR code once a launch destination is supplied. Until then, use the finished brand statement without a placeholder address, store badge, or availability claim.

## Codebase references used for this plan

- `src/components/transport-map.tsx`: actual 2D/3D map, vehicle motion states, and civic markers.
- `src/components/map-motion.ts`: route-based vehicle movement.
- `src/components/gerak-app.tsx`: passenger reporting, Community inbox, and acknowledgement controls.
- `src/lib/server/reports.ts`: supported report states and transitions.
- `docs/DEMO_SCRIPT.md`: official-data and civic demonstration boundaries, including the geographic 3D update.
- `docs/CIVIC_EXPANSION_PLAN.md`: separates existing capabilities from proposed civic features.
- `media/gerak-promo/codebase/README.md`: previous footage provenance and edit structure.

**Status:** the launch film has been rendered in `launch/GERAK-Launch-Film-1080p.mp4`. See `launch/README.md` for the final edit and capture provenance. The civic example uses the app's stop selector at OPP Plaza Pelangi, and the soundtrack is instrumental with on-screen copy.
