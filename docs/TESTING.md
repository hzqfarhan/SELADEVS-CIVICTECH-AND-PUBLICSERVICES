# Testing and verification

Run from the repository root:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm start
```

`npm test` uses Node's test runner through `tsx`. `PROGRESS.md` records actual results; the checklist below is a verification plan, not an assertion that every environment has passed.

## Automated coverage

The transit tests exercise distance units, path wraparound, heading, deterministic/source-labeled simulation, region separation, accessible endpoint handling and refusal to fabricate live ETA. Server tests should verify valid/invalid reports, session tampering/expiry, rate-limit windows, permitted status transitions and protobuf normalization. Keep these tests tied to user-visible failure modes rather than styling details.

## End-to-end acceptance

| Scenario | Expected result |
| --- | --- |
| Load default Johor live | Map and source label appear; vehicles visibly move |
| Select bus, then switch 2D/3D | Same vehicle remains selected; route details remain useful |
| Follow vehicle | Camera tracks; leaving follow restores manual exploration |
| Plan JB Sentral to KSL City | A same-region illustrative itinerary appears |
| Plan Johor to UTHM | No invented cross-region route |
| Save favourite, reload | The same browser retains the preference |
| Change BM/English | Navigation and action labels update; place names stay recognizable |
| Submit geotagged report with valid image | Server returns an ID; report appears in operator view |
| Acknowledge and resolve through allowed stages | Shared status changes; passenger sees the update |
| Unauthenticated status update | Rejected; no persistent mutation |
| Invalid coordinates / oversized image / malformed JSON | Clear client error; no record is created |
| Upstream absent, empty, malformed or stale | Honest source/freshness state; no silent simulator substitution |
| Basemap fails or WebGL unavailable | Fallback remains understandable and controls usable |
| Offline after an online visit | Offline state appears; cached shell/fallback and drafts remain useful |

Use two tabs to establish that reports travel through the server, rather than just changing local component state. Use a new browser profile to confirm favourites are local preferences, not a falsely advertised account sync.

## Phone and accessibility checks

Test at approximately 390 × 844 and 768 × 1024, plus desktop. Check touch targets, panel scrolling, safe-area spacing, no accidental horizontal scrolling, and visible dismissal of dialogs. Navigate core controls with Tab/Enter/Escape. Inspect labels, contrast, focus visibility and reduced-motion behavior. Check that unknown live accessibility is never shown as a verified accessible stop or vehicle.

Measure performance on an actual ordinary phone before publishing a frame-rate claim. Record device, browser, map mode, fleet size and thermal/power conditions. Confirm that a background tab is not performing unnecessary animation and that 2D remains an available lower-cost option.

## Deployment-specific checks

- Run with demo operator access disabled and confirm missing production secrets fail closed.
- Verify HTTPS, secure cookies and the exact `APP_ORIGIN` behind the reverse proxy.
- Exercise PostgreSQL migration, report creation, transition and restart persistence in a disposable database.
- Restart the Node process and verify report durability for the chosen storage mode.
- Confirm upstream polling remains within quota with multiple browsers and overlapping requests.
- Verify service-worker installation and update using the production build; development behavior is not equivalent.
- Confirm offline pages do not misleadingly label cached positions as live.

No full load test, penetration test, independent accessibility audit or real-device performance certification is implied by passing unit tests and a production build.

## Verification record — 30 September 2026

25 automated tests passed, TypeScript passed, and the production build passed. Production dependency audit reported zero known vulnerabilities. A fresh official import returned 21 routes and 988 stops; the 11:28:49 UTC observation sample contained 96 real vehicles. Counts vary with service operations.

Final interactive browser revalidation was blocked by the browser tool URL-policy rejection. Do not interpret automated checks as a completed passenger-to-operator browser walkthrough. PostgreSQL/Docker deployment, public hosting and physical-phone performance remain unverified.

Production HTTP smoke verification also passed for passenger/operator/source pages, health, network, vehicles, reports, sources, manifest, service worker and map worker. The subsequent live request returned 99 vehicles with `source: gtfs-rt` and `stale: false`; official topology contained 21 routes and 988 stops. UTHM live returned no invented positions, while explicit demo mode returned simulator observations. `npm start` was verified using the standalone launcher. Formatting checks passed.

## Nationwide expansion verification — 1 October 2026

33 tests pass, including Seremban feed merging/ID isolation and Prasarana trip-suffix resolution. TypeScript, production build and formatting pass. HTTP checks verified 13 usable service networks totalling 398 routes and 15,532 stops, real Seremban/Rapid KL responses and empty schedules-only Rapid KL rail positions. All 31 official URLs were probed separately; details and upstream gaps are in FEED_VERIFICATION.md. Updated preview runs on port 3001. Final visual browser verification remains blocked by the previously recorded tool restriction.
