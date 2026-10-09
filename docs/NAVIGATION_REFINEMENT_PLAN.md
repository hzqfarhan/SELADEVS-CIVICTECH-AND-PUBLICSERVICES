# Navigation refinement — 9 October 2026

## Problems confirmed in the implementation

- Browse and Map describe surfaces but do not identify the passenger's current task.
- Journey planning is buried inside several sections, alongside unrelated lists.
- The side panel unmounts when showing the map, losing child input state and scroll position.
- Home, route cards and the route legend use different navigation behavior; some change sections without revealing the panel.
- Operator access occupies primary passenger navigation and is duplicated in the header.
- Route filters can remain active without an obvious explanation or reset.

## Implementation plan

1. Use five passenger destinations: Live buses, Plan journey, Routes, Community and Saved. Keep operator access separate. Mark the active destination for visual and assistive navigation.
2. Give each destination an explicit heading and short instruction. Journey planning gets a focused screen; retain official-data limitations and existing fare behavior.
3. Centralize section navigation, reveal its panel, clear cross-section search text, and reset scroll only when changing tasks. Preserve mounted panel state and scroll when temporarily opening the map.
4. Make the phone surface switch contextual. Keep desktop panels side by side and restore the last task when leaving the expanded map.
5. Show the active route filter and its reset action. Route selection should retain route context, with an explicit map action.
6. Verify phone, tablet and desktop widths, English/BM, keyboard focus, vehicle selection/return, planner switching, route filters, civic report entry and operator access. Run production build and relevant tests if behavior requires them.

## Scope and acceptance

This is a navigation/UI increment, not a new transport-data pipeline. Preserve live/demo separation, real GTFS data, current report APIs and authentication. No external deployment. Success means primary tasks have visible entry points, switching surfaces preserves work, navigation always reveals the expected section, and tested layouts have no horizontal overflow or competing controls.

Physical iOS/Android keyboards and safe-area behavior remain device QA items; browser viewport checks are not equivalent to physical-device testing.

## Verified outcomes

- Implemented five passenger destinations, separate operator access, section headings and current-page semantics.
- Centralized task navigation and cleared irrelevant search text on task/region changes. Preserved panel mount, typed search and scroll during map round trips.
- Added contextual phone/tablet surface labels; compact layout now extends through 960px, with desktop side-by-side above that width.
- Added selected-route actions/reset; route cards retain their section. Stop and report location actions now move the camera, waiting for hidden maps to become visible and respecting reduced motion.
- Journey result selection preserves the planning section and results. Stop names remain visible in compact detail cards.
- Improved keyboard map-mode/legend controls and dialog labelling. Empty vehicle feeds no longer claim a search mismatch.

Validation: 72 existing unit tests passed. Production compilation and TypeScript passed. Browser checks covered 320x640, 390x844, 820x700, 1024x600 and 1440x900, with no document overflow at measured sizes; draft/scroll preservation, journey-result return, selected route actions, stop centering, Home restoration, community dialog, Saved and operator entry, English/BM and active heading focus. The dedicated physical-device checks above remain outstanding.
