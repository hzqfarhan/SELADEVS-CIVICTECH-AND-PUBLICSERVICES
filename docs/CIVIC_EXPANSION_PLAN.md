# Civic expansion plan

Proposed work, not implemented integrations. Build on the current six report categories, location pin, optional image, public reports and operator status flow. No council partnership or external delivery is implied.

## Priority 1 — Make reporting useful

| Feature | Passenger experience | Operator experience | Acceptance gate |
| --- | --- | --- | --- |
| Nearby duplicates | Show similar nearby reports before submission; support “I also experienced this” | Merge duplicates while preserving original evidence and followers | Same category within a configurable radius/time window is suggested, never silently merged |
| Follow a report | Subscribe to status updates and see a dated timeline | Require a public explanation for each transition | Every status change records actor, timestamp and reason; only authorized staff can change status |
| Stop-linked issues | Attach damaged shelter, missing lighting or blocked access to a GTFS stop | Filter by route, stop, severity and age | Feed refresh cannot silently attach a report to a different stop |
| Resolution evidence | View before/after images and request review if the issue persists | Add a resolution note/photo and reopen with an audit reason | Resolved reports retain evidence and history; community disputes do not automatically overwrite staff status |
| Safer uploads | Preview images; remove EXIF location metadata and offer face/plate redaction | Review flagged content before public display | Enforce MIME/size limits, sanitize public text, prevent precise private-location disclosure |

First vertical slice: report a broken bus-stop lamp → see a nearby existing report → support/follow it → operator acknowledges → repair photo → passenger receives update.

## Priority 2 — Accessibility and walking

- Add structured audits for ramps, kerb crossings, tactile paving, shelter, seating and nighttime lighting. Store observation date and community/verified provenance separately.
- Show last-mile barriers around stops with expiry/review dates. Do not claim a route is wheelchair-safe from a single report or missing data.
- Add offline report drafts with explicit retry and idempotency keys. Reconnection must never submit a duplicate or publish an unfinished draft.
- Add BM/English guided forms and keyboard/screen-reader checks, with a map-free location description alternative.

## Priority 3 — Responsible operations

- Jurisdiction ownership: propose a council/campus/operator based on maintained service boundaries. Staff confirm uncertain ownership. Start with GERAK's internal queue; only transmit externally after an agreed integration exists.
- Triage board: severity, impact on access, assigned team, due date, overdue reason and escalation. Targets are configured service commitments, not invented official SLAs.
- Aggregate dashboard: median acknowledgement/resolution time, unresolved age, recurrence and coverage by district. Suppress sparse location statistics and separate demonstration data.
- Flooding reports: clearly dated community observations with expiry and verification status. They are not emergency warnings or substitutes for official instructions.

## Data and API additions

Use PostgreSQL/PostGIS for proximity queries and jurisdiction polygons. Extend records with stop reference + feed version, observedAt, severity, visibility and jurisdictionId. Add append-only report_events, report_supports (one per account/report), subscriptions, assignments and moderation_events. Store media in object storage with signed uploads and stripped metadata; keep public/private fields separate.

Proposed endpoints: GET /api/reports/nearby; POST /api/reports/:id/support; POST /api/reports/:id/follow; GET /api/reports/:id/events; authenticated POST /api/reports/:id/transitions. Validate transitions server-side, use idempotency keys for offline submission, authorize per role/jurisdiction, rate-limit writes and record audit events. Notifications require explicit opt-in and a working unsubscribe flow.

## Delivery order and release checks

1. Duplicate suggestions + support + immutable timeline.
2. Stop links + resolution evidence + moderation/media privacy.
3. Offline drafts + opt-in updates + accessible forms.
4. Named operational ownership, district analytics and only then external interoperability.

Test duplicate boundaries and false positives, concurrent transitions, authorization, upload validation, offline retry/idempotency, notification opt-out, report reopening and bilingual mobile flows. Pilot with a small consenting campus group before regional expansion. Success measures: fewer duplicates, faster acknowledgement, resolved issues with evidence and fewer repeated accessibility barriers. Do not count simulated reports as impact.

## Research status

Open311 and FixMyStreet remain architecture references from the original project. Their public sites could not be retrieved during this refinement; this plan does not claim newly verified API contracts or copy their implementation. Verify receiving authority contracts before building an adapter.

Traffic-linked civic work is specified in [Traffic and CCTV plan](TRAFFIC_AND_CCTV_PLAN.md): signal faults, pedestrian-button failures, duplicate reports and asset-linked resolution evidence.
