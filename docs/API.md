# GERAK API

All endpoints are same-origin Next.js Node route handlers. Coordinates are `[longitude, latitude]`; vehicle speeds are km/h; vehicle timestamps are Unix milliseconds and report timestamps are ISO 8601 UTC. Errors use `{ "error": "message" }`; invalid fields may include `details`. Dynamic data and session responses are not cached by the browser. No API key is needed for public reads or civic submission.

## Endpoints

| Method and path | Contract | Authentication |
| --- | --- | --- |
| `GET /api/vehicles?region=johor&mode=live` | `{ vehicles, source, updatedAt, stale, message }` | Public |
| `GET /api/network?region=johor` | `{ routes, stops, source, importedAt?, feedUrl? }` | Public |
| `GET /api/reports` | `{ reports: CivicReport[] }`, latest 500 | Public |
| `POST /api/reports` | Validated report below → `201 { report }` | Public, same-origin |
| `PATCH /api/reports/:id` | `{ status }` → `{ report }` | Operator cookie, same-origin |
| `GET /api/session` | `{ authenticated, demoAvailable, mode }` | Public |
| `POST /api/session` | `{ demo: true }` or `{ password: "…" }` | Same-origin |
| `DELETE /api/session` | Clears operator cookie | Same-origin |
| `GET /api/events?region=johor&mode=live` | Server-Sent Events | Public |
| `GET /api/health` | Process status, storage selection, official feed cache state | Public |

Supported regions are `johor` and `uthm`; modes are `demo` and `live`, defaulting to live. Invalid values return 400. Johor live mode uses actual data.gov.my positions. UTHM live requests return an empty unavailable snapshot until authorized telemetry is connected. Simulation requires explicit `mode=demo`. A failed first official request returns no vehicles; subsequent failures retain the original observations and timestamps, marked stale. No failure silently substitutes invented vehicles. Snapshots become stale after 90 seconds; inspect each vehicle timestamp too.

`/api/network` automatically imports the official Johor static feed and refreshes its persisted cache after 24 hours. Failed imports retain any cached official network with its freshness notice; otherwise they return an empty official network. UTHM topology is explicitly illustrative. The public HTTP cache lasts 60 seconds. Official journey planning supports direct/one-transfer representative stop sequences; it is not timetable-aware, excludes waiting time, and does not claim live arrivals.

`GET /api/sources` returns the complete attributed source registry, also available at `/sources` and in `docs/SOURCES.md`.

## Submit and update a civic report

```json
{
  "category": "accessibility",
  "title": "Ramp is obstructed",
  "description": "The wheelchair ramp is blocked by a loose barrier.",
  "coordinate": [103.7633, 1.4625],
  "location": "JB Sentral"
}
```

Categories: `damaged-stop`, `unsafe-walkway`, `accessibility`, `flooding`, `infrastructure`, `crowding`. Title is 5–120 characters, description 10–2,000, and location 2–200. Longitude is bounded to 99–120 and latitude 0–8 (an operational bounding box, not a Malaysian boundary polygon). The optional `image` is a base64 PNG, JPEG or WebP data URL, maximum decoded size 1 MiB. SVG, mismatched signatures, extra fields and client-supplied status are rejected. Entire requests are limited to 1.5 MB. Images are public as part of the report; do not upload personal or sensitive material. Production requires image decoding, metadata removal, moderation and object storage.

Creation assigns an ID such as `GRK-1A2B3C4D`, `source: community`, timestamps and `status: submitted`. Status updates allow:

```text
submitted → acknowledged
acknowledged → in-progress | resolved
in-progress → acknowledged | resolved
resolved → acknowledged (reopen)
```

Repeating the current status is allowed. Invalid transitions return 409; absent reports return 404. A GET immediately after a successful mutation observes the stored result. Other clients receive report changes on their next SSE tick, normally within five seconds. GERAK reports are internal application records, not municipal tickets automatically forwarded to an authority.

## Operator session

Successful login sets `gerak_operator`, an HMAC-signed `HttpOnly; SameSite=Strict; Path=/` cookie with an eight-hour lifetime. HTTPS requests or `COOKIE_SECURE=true` add `Secure`. Set a persistent random `AUTH_SECRET` (at least 32 characters) and `OPERATOR_PASSWORD` for password access. Development/demo sessions can use an ephemeral process secret, so a restart invalidates them. Set `ALLOW_DEMO_OPERATOR=false` for a public operational deployment.

Browser mutations must send their exact `Origin`; requests with cookies and no Origin are rejected. `APP_ORIGIN` sets the expected origin and otherwise the request URL origin is used. Cross-site fetch metadata is rejected. API clients without cookies can submit a public report without Origin. Operator clients must supply both Origin and the session cookie. No staff identities, password reset or individual roles exist in this pilot credential model.

## Realtime stream

```js
const events = new EventSource('/api/events?region=johor&mode=live');
events.addEventListener('vehicles', event => {
  const snapshot = JSON.parse(event.data);
});
events.addEventListener('reports', event => {
  const { reports } = JSON.parse(event.data);
});
// Close on component unmount or region/mode change.
events.close();
```

Vehicle events run every five seconds; report events are emitted when ID/update-time revisions change. `service-error` contains a reconnect-safe message. Connections end at 55 seconds with a three-second EventSource retry hint. Disconnects cancel timers. Reverse proxies must disable buffering (`X-Accel-Buffering: no`) and allow these request durations. The official feed cache coalesces requests and refreshes no faster than every 35 seconds in one Node process, regardless of browser count.

## Limits and operations

The current fixed-window limiter is process-local and returns 429 plus `Retry-After: 60`. Per-minute budgets: vehicles 600, network 120, reports read 300, reports create 12, report updates 60, session logins 10, SSE connections 60. Without `TRUST_PROXY=true`, callers share a local bucket. Enable proxy trust only when the trusted edge overwrites forwarded addresses, and adopt a shared limiter before scaling.

`/api/health` is a liveness and diagnostic endpoint. `status: ok` means the handler executed; it is **not** a database connectivity test or proof that upstream data is fresh. `feed.hasObservations`, `feed.lastObservation` and `feed.lastError` describe that Node process's cache. Logs emit structured `gtfs_refresh`, `gtfs_refresh_failed` and `api_error` events. Do not expose credentials in request logs.

Types: `src/lib/types.ts`. Validation: `src/lib/server/reports.ts`. End-to-end route-handler tests: `tests/backend.test.ts`. Deployment boundaries: `DEPLOYMENT.md`.
