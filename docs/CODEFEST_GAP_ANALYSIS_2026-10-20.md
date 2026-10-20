# GERAK: CODEFEST requirements and improvement audit

Reviewed 20 October 2026 against the seven screenshots supplied by the user and the current repository.

## Conclusion

GERAK is a strong fit for Track 3 Civic Tech. Its implemented transit tracking, map overlays, civic reporting and operator view cover the core prototype scope and the kinds of stretch features described in the brief. The largest remaining opportunities are complete Bahasa Melayu coverage, evidence of community benefit, a more accountable reporting workflow, and the actual submission package.

This is a source-code and repository-artifact audit. All 86 automated tests passed and TypeScript checking passed during this review. A new browser, phone, production deployment, live-provider availability or PostgreSQL integration test was not performed. Implemented capabilities are not evidence of public adoption or authority participation.

## Requirements compared with the repository

| Supplied requirement | Evidence / assessment | Remaining work |
| --- | --- | --- |
| Working core civic prototype | Transit feeds, 2D/3D maps, journey connections, geotagged reports, persisted report status changes and operator interface are implemented. API workflow tests pass. | Rehearse one complete rider-to-operator journey on the submission build. |
| BM or BM/English support | Main app uses bilingual strings; fare copy also has both languages. | Partial coverage: `src/components/ride-status.tsx` has English-only GPS freshness, next-stop and unavailable-arrival text. Audit primary flows, validation messages and accessible labels in BM. |
| Government open data, live overlay **or** stakeholder dashboard as stretch | Official transit adapters, map overlays and rider/operator views exist. | Show provenance and freshness in the demo; distinguish implementation from a formal operator/government partnership. |
| Software solution | Web application and backend exist. | No hardware or AI feature is necessary to satisfy this requirement. |
| 3–4 team members | Not established by source-code inspection. | Confirm roster, team name and individual roles on slides. |
| Preliminary GitHub repository link | Local source repository exists. | Confirm judge access and clean-machine setup from the submitted URL. |
| Preliminary slides | No finished slide deck found in the inspected repository. | Prepare the six required content sections. Materials may exist outside the repository. |
| Preliminary three-minute demonstration video | `docs/DEMO_SCRIPT.md` exists; the promotional films are 30 seconds. | Produce the actual three-minute demonstration. The launch film can be its introduction, not the entire submission. |
| Finale poster, slides, prototype, five-minute pitch and Q&A | Prototype code exists; no finished poster/deck found in the inspected repository. | Prepare an A1 poster, five-minute rehearsal and evidence-backed Q&A. |
| Measurable impact and feasibility | Snapshot fleet analytics, report counts and fare/budget tools exist. | No completed rider study or measured community-outcome report found. Establish a small pilot and record results. |

The examples of waste, flood, farming and welfare tools are alternatives, not a requirement to implement them all. Likewise, the listed technology areas are possible approaches, not a checklist.

## Priorities

### 1. Complete BM support and prove the core journey

Finish translation coverage before adding another large feature. The requirement is support for BM or a bilingual product; existing language switching is a good foundation but does not cover every primary component.

Acceptance: in BM, a first-time rider can select a bus, understand whether its position is fresh, inspect a journey, submit a report and read its status. Validate errors and screen-reader labels too. Include a real BM interaction in the demonstration.

Evidence: `src/components/ride-status.tsx:62–87`, bilingual strings throughout `src/components/gerak-app.tsx`, and `src/lib/fare-copy.ts`.

### 2. Make the civic response visible and accountable

Reporting already works; do not rebuild it. Add a public report timeline with status, timestamp, response note and responsible team. Require an explanatory resolution note, with optional evidence, when marking a report resolved.

Current limitation: `CivicReport` carries current status and created/updated timestamps, without a complete public history, assignment or resolution evidence. PostgreSQL updates append a `report_events` row with generic actor `operator`; JSON storage retains only the updated report. The event history is not exposed as a citizen-facing timeline.

Acceptance: a rider sees submission and acknowledgement as separate events, an operator can explain action taken, and the same history survives reload in the selected demo storage mode. An in-app status change must not be presented as proof that a council physically fixed an issue.

Evidence: `src/lib/types.ts`, `src/lib/server/reports.ts:107–176`, `db/schema.sql`.

### 3. Connect reports directly to the bus journey

Add “Report a problem at this stop” with the selected stop and route prefilled, and retain structured stop/route IDs. Let operators filter by those fields and prioritise older unacknowledged reports.

This makes the civic value concrete: a rider sees a bus approaching, notices an obstructed boarding area, submits a location-specific report, and receives an acknowledgement from the responsible team.

Existing geotagging and status filters are useful; the missing improvement is structured transport context and responsibility. Add duplicate grouping or “I’m affected too” after this core flow, rather than making a large social platform.

### 4. Measure benefit instead of adding impact claims

Run a proposed small study with 5–10 consenting riders and 1–2 operational stakeholders. These are suggested recruitment targets, not existing users.

| Question | Measurement |
| --- | --- |
| Can riders find a useful bus? | Task success and time to identify the correct route/bus, including BM use. |
| Can people report a barrier? | Successful submissions, time to submit, and where users need assistance. |
| Can operators respond? | Time from submission to first acknowledgement, using durable event timestamps. |
| Is tracking trustworthy? | Fresh/stale/unavailable observations over a defined period; distinguish feed failures from app failures. |
| Does budgeting help? | Whether riders can understand a projected journey/monthly cost and identify unavailable fares. |

Use a comparable baseline task and report sample size, dates and limitations. Current fleet distribution is a snapshot, not historical ridership. Projected fare budgets are not measured savings. Do not claim reduced waiting, emissions or faster municipal resolution without evidence. The brief's cited “up to 40%” is not GERAK's result and was not independently verified in this audit.

### 5. Strengthen practical usability and reliability

Prioritise the 2D experience on an ordinary phone: readable stops, clear selection, large touch targets, predictable back/close behaviour, keyboard navigation and reduced-motion support. Measure performance before choosing optimisation work.

Test a stale feed, no active buses, denied location access and interrupted connectivity. The service worker does not cache API responses; saved routes/drafts should not be described as fully offline live tracking. Keep live GPS, route-estimated movement and simulation visibly distinct.

The journey planner explicitly does not check service dates or departure times. Keep that limitation visible. Calendar-aware planning is a valuable later feature, but it is more substantial than a presentation polish task. Live arrival prediction needs suitable data and validation; do not introduce an invented countdown to improve the demo.

### 6. Demonstrate a credible operating plan

For a limited pilot, document one deployment, storage choice, backups, configured operator authentication and who will handle reports. Estimate hosting from actual expected usage and measured load before claiming a cost.

For broader deployment, address operator identities/roles, moderation, image storage, data retention and shared ingestion/cache. These are production improvements, not all mandatory prototype blockers.

A concrete scaling concern: each SSE connection calls `listReports()` every five seconds and sends the report collection on changes, including images stored in report payloads. Before scaling, measure concurrent-client load and payload sizes; use shared publication, pagination/deltas and separate image delivery where justified. Current report listing is capped at 500, so snapshot counts are not an all-time impact ledger.

Evidence: `src/app/api/events/route.ts`, `src/lib/server/reports.ts:93–104`, `src/lib/server/auth.ts`.

## Submission and documentation corrections

- Preliminary weights: Impact **30%**, Technical Execution **30%**, Usability **25%**, Feasibility **15%**.
- Finale weights: Impact **30%**, Technical Execution **25%**, Usability **25%**, Feasibility **20%**.
- `docs/CODEFEST_STRATEGY.md` predates the supplied screenshots and says the brief was unavailable. Update it against this supplied rubric before preparing the submission.
- That strategy also proposes showing an estimated arrival. Current live ride UI correctly states no live ETA is supplied. Align the pitch with observed location and freshness; `docs/DEMO_SCRIPT.md` already uses more accurate language.
- `docs/UTHM_PILOT.md` says the stream is not consumed continuously, while `src/lib/server/uthm-live.ts` now implements a WebSocket manager and the vehicle service references UTHM handling. Reconcile documentation with the current adapter and verify actual runtime coverage separately. Code existence alone does not prove current feed operation or partnership.
- Refresh stale test counts in testing documentation: this audit ran **86 passing tests**, plus a successful typecheck. A non-failing Three.js CommonJS deprecation warning appeared.
- No CI workflow was found in the inspected repository. Add repeatable test/typecheck checks and a small browser acceptance suite for BM, report submission/status changes and network failure behaviour.

## Recommended three-minute demonstration

| Time | Content |
| --- | --- |
| 0:00–0:20 | Rider problem and GERAK's civic purpose. A short excerpt of the existing launch film can introduce it. |
| 0:20–1:00 | Actual 2D bus tracking, route/stop selection and source freshness. Briefly show 3D if useful. |
| 1:00–1:35 | Submit a stop-related civic report in the actual app. Include BM interaction. |
| 1:35–2:10 | Operator acknowledges it; return to the rider view to show the persisted change. Show only implemented timeline features. |
| 2:10–2:35 | Journey/fare budgeting and the user benefit, with estimate limitations visible. |
| 2:35–3:00 | Architecture, measured evidence if available, pilot plan and limitations. |

Build slides around the six requested sections: project/team; problem/track; solution/value; technical implementation; UX/design; feasibility/impact. Include actual screenshots and an architecture diagram. The strongest narrative is a connected rider-to-operator service, supported by honest data and evidence.

## Suggested next delivery sequence

1. Complete BM core-flow coverage and correct submission-facing documentation.
2. Add the report timeline, response note and stop/route context.
3. Run the small usability study and record results without extrapolating beyond the sample.
4. Rehearse and record the three-minute demo; assemble slides and verify repository access.
5. Prepare finale poster/pitch and address operational hardening in proportion to the intended pilot.

No application code was changed as part of this assessment.
