# GERAK cross-platform implementation plan

Status: planning only; no application development authorized by this document.
Prepared: 18 October 2026. Repository inspected at `db12eb6`.

## 1. Scope and delivery rules

Add an Expo TypeScript app with Expo Router for iOS and Android, retaining the existing Next.js public website and backend. Implement one journey domain driving iOS Live Activities, Dynamic Island, notifications and WidgetKit; use an Android ongoing notification as the Live Activity equivalent. Android widgets are out of scope.

Future implementation order is **store → native bridge → Live Activity → notifications → widgets**. At the end of each phase, show the actual diff, verification results and remaining limitations, then stop for explicit confirmation before the next phase. This document does not authorize starting phase 1. No dependency installation, scaffolding, code changes, native project generation or deployment belongs to this planning task.

### Release scope and mobile parity

The readiness checkpoint in section 3 precedes those five phases. **MVP is complete after phases 1–4 and their backend work packages pass release checks.** Phase 5 is a subsequent widget release, not a prerequisite for the first mobile release. Deferred features remain part of the full requested scope; an MVP release must not be described as completing the entire migration.

| Capability | First mobile release | Later delivery / existing web |
| --- | --- | --- |
| Map, route/stop search, vehicle selection | Required, using verified live routes and a validated native map adapter. | Advanced 3D/map presentation may remain web-only. |
| One active journey, ETA, end tracking, stale/offline states | Required, including restart recovery and denied-permission behaviour. | Multiple simultaneous journeys are out of scope. |
| iOS Live Activity / Dynamic Island | Required on supported devices; graceful fallback elsewhere. | No additional activity types in MVP. |
| Android ongoing notification | Required with Stop/Open map actions and verified background limits. | Android home-screen widgets remain out of scope. |
| Server arrival notifications and notification settings | Required; optional started banner follows the suppression rule. | Delay alerts deferred. |
| WidgetKit | Deferred from MVP. | Phase 5a: small/medium widgets; phase 5b: accessories, route list and configurable favourites. |
| Saved journeys and fare/budget tools | Not required for the first journey-tracking release. | Keep existing web access; prioritize native parity after MVP feedback. |
| Community reporting, operator tools and other ancillary pages | Web-only initially. | Require separate mobile scope approval. |

Product owner must sign off this parity matrix at readiness review. During implementation, attach a screen inventory and identify any existing feature not represented here. Preserve the public website throughout rollout.

## 2. Existing code and verified gaps

| Existing asset | Reuse / implication |
| --- | --- |
| `package.json` | Next.js `^16.3.7`, React `^19.3.0`, TypeScript, `tsx --test`; no Expo dependency currently declared. Preserve web scripts and isolate mobile dependency versions. |
| `src/lib/types.ts` | Reuse `TransitRoute`, `Stop`, `Vehicle`, `VehicleSnapshot`, `Region`; `Vehicle.licensePlate` maps to journey `plate`. Do not create competing transit models. |
| `src/lib/server/network.ts` | `TransitNetwork` exists beside Node filesystem imports. Extract its type into a platform-neutral shared location before mobile reuse; do not import this server module at runtime. |
| `src/lib/use-network.ts` | Existing fetch integration polls vehicles every 5 seconds when visible. Extract its request/response handling; replace DOM, navigator and visibility dependencies with native lifecycle/connectivity adapters. |
| `src/app/api/network/route.ts` | Existing `GET /api/network?region=…` returns network metadata. |
| `src/app/api/vehicles/route.ts` | Existing `GET /api/vehicles?region=…&mode=live` returns vehicle snapshots. Preserve schemas, rate limits, caching and explicit stale indicators. |
| `src/lib/route-colors.ts` | Reuse assigned route colours; serialize a resolved RGB/hex colour for Swift rather than independently hashing route IDs. |
| `src/lib/transit.ts` | `etaForVehicle` explicitly returns null for non-simulator vehicles and clamps simulated estimates to at least 1 minute. It cannot provide production arrival or zero-ETA detection. |
| `src/lib/transit.ts` | G01–G03 belong to illustrative route definitions, with bidirectional destination labels. They are not verified production routes all terminating at JB Sentral. |
| `src/lib/server/auth.ts` | Existing authentication is for the operator workspace; it is not a mobile installation/token ownership contract. |
| `tests/` | Existing transit, live-contract, backend and multi-feed tests should remain regression coverage. |
| Font dependencies | DM Sans and Space Grotesk are installed for web. Obtain licensed native-compatible font files; web font packaging alone does not register SwiftUI fonts. |

Missing from the inspected app: journey lifecycle store, native bridge/targets, notification registration/subscription contracts, production stop ETA/arrival authority and ActivityKit push handling. Audit the worker before selecting a scheduler; do not assume its existing ingestion infrastructure supplies these features.

The public site could not be retrieved by the research tool, and the supplied GitHub URL returned 404 through that tool. Local source is the implementation baseline. The separate browser prototype was not available for visual inspection; obtain its source or reference captures before signing off visual parity. The supplied prompt remains the behavioural specification.

## 3. Prerequisites and architecture decisions

1. **Live data:** establish an approved ETA provider or explicitly scoped server ETA calculation using the existing route patterns, vehicle trip/direction and stop sequence. Define freshness, accuracy, stop arrival detection and vehicle reassignment. Unknown ETA must never become zero or a fabricated countdown.
2. **Route identity:** map real feed route/stop IDs to verified display labels and the correct JB Sentral direction. Until verified, G01–G03 appear only in fixtures/previews. Production route lists use available official routes or an unavailable state.
3. **Compatibility:** pin a supported Expo SDK >=51, React Native, Expo Router, notification library and Xcode combination that actually supports an iOS 16.2 deployment target. Some newer SDKs may require a higher minimum; lowering a build setting cannot override that dependency requirement. Resolve this before scaffolding. Do not silently raise the requested minimum.
4. **Native ownership:** use a local Expo module plus an idempotent config plugin to create and configure the Widget Extension. `expo-apple-targets` is an alternative only after compatibility validation. Check regeneration preserves target membership, entitlements and signing.
5. **Minimum OS:** host app requires iOS 16.2. Widget layouts should use iOS 16-compatible APIs, but users on iOS 16.0–16.1 cannot install widgets bundled with a 16.2-minimum host. Separate support for those versions would require a changed host deployment requirement.
6. **Shared domain:** keep web at the repository root initially; add `apps/mobile`, `packages/transit-core` and `packages/journey-core`. Extract types and safe pure functions with compatibility re-exports for web. Never import browser map code or Node server code into React Native.
7. **Mobile parity:** inventory existing map, route/stop search, bus selection, saved journeys, fares, settings and ancillary pages. Build the journey/map/settings slice first. Select and validate a native map adapter; MapLibre GL JS/DOM/Three.js components cannot simply be imported. Record remaining screen parity separately before calling the entire app migrated.

### Readiness checkpoint — before phase 1

Owners below are responsibilities, not assigned people. Assign a named owner and reviewer to each row before implementation. All items start **open**; this document does not claim compatibility or production ETA readiness has been proven.

| Gate | Accountable role | Evidence required to pass |
| --- | --- | --- |
| Real route/stop identity | Transit-data owner | Approved feed IDs, boarding directions, vehicle/trip mapping and sampled real journeys; resolve whether G01–G03 are valid production labels. |
| ETA and arrival authority | Backend/transit-data owner | Document provider or algorithm, freshness and no-bus rules, and arrival evidence. Evaluate representative journeys against observed arrival times; agree numerical error/coverage targets and sample size before measuring, then attach results. Countdown reaching zero alone is not arrival evidence. |
| Mobile compatibility | Mobile lead | Exact Expo SDK, React Native, Router, notifications, native module/plugin, map library, Node, package manager, Xcode/Swift and Android toolchain versions; documented iOS/Android minima and dependency compatibility references. No `latest` or unbounded versions in the approved matrix. |
| Product/visual baseline | Product/design owner | Approved MVP/parity matrix, browser prototype references, permission UX and unavailable/stale designs. |
| Delivery and operations | Backend/release owner | Approved contract schemas, installation ownership approach, worker/storage design, credential access, forecast concurrency/update rates and measurable release thresholds. |

The version matrix is deliberately **unresolved pending verification**, rather than populated with guessed versions. Record it as a versioned decision during readiness work. If no supported combination satisfies iOS 16.2, present the verified alternatives and obtain a minimum-OS decision before coding. Phase 2 must then prove the selected matrix with real host/extension and Android builds before feature implementation proceeds. Readiness work itself requires future authorization; no spike or build is performed by this documentation update.

Readiness review output: evidence links, named owners, approved decisions, remaining risks and explicit permission to start phase 1. An unavailable live ETA source blocks production scope; fixture-based development may proceed only as an explicitly approved prototype and cannot satisfy the release gate.

### Synchronization limits that must inform acceptance

A single logical state can have serialized, read-only projections in multiple processes; it cannot literally be one shared JavaScript object across the app and extensions. Use one versioned journey envelope and transition contract, with no independent surface reducers.

ActivityKit pushes update ActivityKit content; they do not automatically execute the app's JavaScript, write shared UserDefaults, or reload WidgetKit. Silent pushes and background execution are not guaranteed, particularly after force quit. Widget reload requests are scheduled by iOS, not synchronous refresh commands. Therefore strict same-second consistency across all surfaces while the app is closed is not a deliverable that this design can guarantee.

Recommended contract: immediate serialized fan-out while the app runs; server-authoritative activity/notification delivery when suspended; best-effort widget catch-up when execution is granted, with honest stale timestamps. Reconcile on resume before publishing local changes. If stronger closed-app widget freshness is required, separately scope an authenticated widget snapshot fetch and/or supported widget push mechanism, subject to OS limits; neither endpoint nor capability is assumed to exist.

### State ownership and reconciliation contract

Keep the server authoritative for accepted journey observations and remote events regardless of app lifecycle. Foreground/background transitions change delivery paths, not ownership; this avoids a fragile sender handoff on suspension. The app owns immediate user intent and the local projection. Extensions only render projections.

| Situation | Owner and allowed behaviour | Recovery / conflict rule |
| --- | --- | --- |
| Foreground, online | App applies start/end/preferences immediately; server validates commands and assigns canonical revisions. Approved fresh observations drive local display while remote registration is pending. | Local pending intents have separate command IDs/sequences, never fabricated server revisions. Reconcile acknowledgements before republishing accepted snapshots. |
| Background / terminated | Server processes observations, generates events and sends ActivityKit/APNs/FCM updates. | No assumption that JavaScript, App Group writes or widget reloads execute. Widgets retain last-known data and become stale. |
| Offline | App may show cached data and immediately end/mute locally; no new fresh ETA or predicted-arrival event is manufactured. | Persist pending commands durably. Remote alerts can still arrive until the server receives mute/end; disclose pending synchronization in settings/journey status. |
| Resume / reconnect | App loads its durable snapshot and pending commands, sends terminal/mute intents, then fetches canonical state. | Reject wrong-journey and older server revisions. A local end tombstone wins over an active snapshot; retry end against the latest revision without reviving UI. |
| Extension render | Read-only snapshot and countdown projection. | No independent phase transitions, event claims or journey creation. |

Within a journey, server revisions order canonical changes; local command IDs provide idempotency. Observation time determines freshness, not conflict precedence. An accepted end is terminal for that journey ID; starting again creates a new ID. Apply queued preference commands in their recorded order and ignore obsolete actions from older journeys. Store `serverRevision` separately from any local projection sequence in the envelope.

For MVP, the server is the **only sender of arriving/arrived alerts**, including when the app is foregrounded. The client may emit the started banner once after determining Live Activity startup failed/unavailable. Do not implement local arrival fallback or sender leases in MVP; that complexity belongs to a separate reviewed enhancement. Persist event generation once in the server outbox, and distinguish provider acceptance from actual device display. A delivery timeout is ambiguous, so retries must follow an explicit duplicate-versus-missed-alert policy and must not be described as guaranteed exactly-once delivery.

## 4. Shared journey model and invariants

Preserve the requested public model and action names:

```ts
type Phase = 'idle' | 'tracking' | 'arriving' | 'arrived'
type JourneyState = {
  routeId: string
  boardingStopId: string
  vehicleId?: string
  plate?: string
  etaMinutes: number
  progress: number
  phase: Phase
  updatedAt: string
  notificationsEnabled: boolean
}
type Action =
  | { type: 'selectRoute'; routeId: string }
  | { type: 'selectStop'; stopId: string }
  | { type: 'start' }
  | { type: 'etaUpdate'; etaMinutes: number; progress: number; plate?: string }
  | { type: 'end' }
  | { type: 'toggleNotifications' }
```

Use a pure reducer with injected time plus a single effect coordinator. Add versioned envelope metadata rather than overloading route ID as journey identity:

- Unique `journeyId` per successful start, schema version, monotonically ordered revision, region/feed identity and authoritative observation timestamp.
- Resolved route/stop labels and colour, derived from reused transit types, for offline native rendering.
- `etaAvailable`, data status (`fresh`, `stale`, `no-active-bus`, `unavailable`), `arrivalAt` and `staleAt`. Keep last known numeric ETA when unavailable, but render `—`; never represent unknown as zero.
- Durable event IDs/claims, server acknowledgement and local pending effects. Store credentials/tokens separately in secure storage, not in widget-readable JSON.
- Selected vehicle comes from the existing `Vehicle` selection adapter before `start`; the minimal action list does not itself support choosing a vehicle. Define a typed internal observation/hydration event for vehicle identity, missing data and authoritative at-stop detection.

| Input | Expected transition |
| --- | --- |
| `selectRoute`, `selectStop` while idle | Validate against official network; route changes clear incompatible stop/vehicle and ETA metadata. |
| Selection while active | Require `end` first, avoiding silent retargeting of an existing journey. |
| `start` from idle | Validate route/stop/vehicle and available ETA; assign journey ID; enter tracking. Immediately process the current observation so an initial ETA <=2 does not wait for another poll. |
| Fresh ETA >2 | Remain tracking, or retain arriving if already advanced. |
| Fresh ETA in (0,2] | Tracking → arriving; never regress later if ETA increases. |
| Fresh ETA =0 / verified at-stop event | Tracking or arriving → arrived. A direct jump to arrived emits only arrival, not an obsolete arriving alert. |
| ETA after arrived | Do not reopen; reject phase regression. |
| `end` from any phase | Idle, cancel pending journey effects/subscription, retain settings, clear active display. Repeated end is idempotent. |
| `toggleNotifications` | Persist preference without changing phase; switching on does not replay prior events. |
| Repeated start / stale observation / old journey | No duplicate journey, no rollback, no resurrection after end. |

Reject non-finite/negative ETAs and clamp valid progress to [0,1]. Define progress from the vehicle's tracked segment toward the boarding stop, not blindly from whole-route progress. Preserve the source observation time on settings changes so stale data never becomes fresh merely because a toggle changed.

Countdown is a projection from one `arrivalAt` and injected clock, using the same minute rounding in TypeScript and Swift. It must not trigger arrival or notifications by itself. When observations become stale at 120 seconds, stop implying a fresh arrival; show last-known ETA/time. Only a trusted new observation advances phase.

For every accepted state mutation, the coordinator writes the envelope, reconciles start/update/end on the activity adapter, then requests widget reload. Run effects in revision order with bounded retries; widget reload still runs if ActivityKit is unavailable. Idle updates reconcile to no activity. Preferences update the same envelope; unknown/stale conditions never synthesize transit data. Persistence failure must be surfaced and retried rather than reported as synchronized success.

## 5. Phase 1 — shared store and tests

Planned files: `packages/transit-core/`, `packages/journey-core/`, journey tests and `__fixtures__/journey/`. Existing web imports receive compatibility re-exports where extraction is needed.

- Extract reusable transit contracts and fetch logic without replacing backend schemas. Native requests use a configured HTTPS base URL and preserve region/live parameters.
- Implement reducer, selectors, serialization, migration, effect interface and durable event ledger. Keep React bindings thin.
- Implement the ownership contract in section 3 with separate server revisions, pending command IDs and ended-journey tombstones. Server snapshots hydrate through validation, not surface-specific state edits.
- Test every table row: boundary ETAs 3/2/1/0, starting at 2 or 0, ETA increases, direct arrival, repeated actions, selection guards, invalid progress/ETA, missing bus, stale/out-of-order updates, restart hydration and end races.
- Test duplicate arriving/arrival suppression across replays, crashes and toggle changes. A unique `(journeyId,eventType)` server event record is required; an in-memory Set is insufficient. Assert that the client never independently sends arrival alerts in MVP.
- Test shared TS/Swift JSON fixture expectations and countdown rounding contract, with fixtures isolated from production imports.

Backend dependency: B1 contract and shared transition rules below must be reviewable in this phase. Exit: store tests and existing relevant regression tests pass; inspect the diff and request confirmation before phase 2.

## 6. Phase 2 — Expo shell, native bridge and storage

Planned files: `apps/mobile/app/{_layout,index,settings}.tsx`, `apps/mobile/app/journey/[routeId].tsx`, `apps/mobile/app.config.ts`, local Expo module, config plugin and Swift shared schema/storage helpers. Paths are proposed, not currently present.

- Add a development build, Expo Router and baseline native journey/map navigation; retain existing web deployment.
- Register `gerak` scheme. Validate/decode route IDs, wait for hydration on cold launch and handle missing routes safely.
- Provision host and Widget Extension bundle IDs, Apple team, Push Notifications capability and the same App Group, provisionally `group.my.hyun.gerak`. Configure `NSSupportsLiveActivities` and relevant notification capabilities; enable background modes only for the chosen implementation.
- Use shared UserDefaults suite with one encoded envelope and schema migration. Serialize writers; never rely on multiple independently written keys as a transaction. Use Android persistent storage for the equivalent envelope.
- Add capability/error reporting, hydration reads, activity-status events and push-token change events in addition to the six required operations.

| Required bridge function | Planned responsibility |
| --- | --- |
| `startActivity(envelope)` | Check authorization, request token-enabled activity, return activity ID or typed unavailable result; idempotent by journey ID. |
| `updateActivity(envelope)` | Apply newer revisions to matching activity using ActivityContent and stale date. |
| `endActivity(envelope, dismissal)` | End matching activity; arrived retains final content for 5 minutes, explicit stop dismisses immediately. |
| `getPushToken(activityId)` | Return current per-activity token if available; asynchronous token event stream handles initial availability and rotation. |
| `writeSharedState(envelope)` | Validate/encode one App Group snapshot with revision protection. |
| `reloadWidgets()` | Call `WidgetCenter.shared.reloadAllTimelines()`; report requested, not rendered. |

Use platform adapters so unsupported iOS operations are safe on Android/web. Persist/retry the latest desired projection after failure, reconcile existing ActivityKit activities on app restart, and remove obsolete subscriptions.

Backend dependency: B2 installation/subscription storage and reconciliation integration must pass against a test environment. Exit: native round-trip fixture, capability-denied tests, deep-link smoke test, regenerated-project check, TypeScript and iOS/Android development builds pass using the approved version matrix. Show diff and confirm before phase 3.

## 7. Phase 3 — Live Activity and Dynamic Island

Planned Widget Extension files: shared attributes/content state, `GerakLiveActivity`, reusable typography/colour/progress views and fixture-only previews.

- Lock Screen/banner: route-coloured badge, status (`On the way`, `Arriving`, `Arrived`), `To {stop}`, large `{eta} min` / `Board now`, plate or unavailable label, and bus-marker progress bar.
- Island compact: coloured route leading, `{eta} min` / `Here` trailing. Minimal: route ID. Expanded: route, stop, ETA, plate and progress.
- Start locally on valid start; do not await notification permission or remote token registration. Update on accepted observations and end on arrival with `.after(arrivedAt + 5 minutes)`; repeated retries must not extend dismissal.
- Set stale date to source observation +2 minutes and show `Last updated hh:mm` using local time formatting. Keep stale UI legible and distinguish unavailable bus/ETA.
- Use `gerak://journey/{encodedRouteId}` on every activity surface.
- Use shared absolute countdown anchor. Validate minute display parity on device; system timer rendering may differ from a custom integer label. Do not promise a minute-by-minute JavaScript background timer.
- Apply `.contentTransition(.numericText())` where available with an availability guard and iOS 16 fallback; respect Reduce Motion.
- Register per-activity token and rotations with the future backend. ActivityKit tokens are distinct from APNs notification tokens. Treat dismissal, disabled activities, token invalidation and expiry as normal lifecycle events.
- Server worker uses the same transition rules to produce ActivityKit update/end payloads while the app is suspended. No production background-push claim until the missing server contract is implemented and tested.

Backend dependency: B3 ActivityKit worker and token lifecycle. Exit: device checks on iOS 16.2 and iOS 17+, Dynamic Island hardware, stale/offline/denied states, local start timing and sandbox background update/end delivery. Local-only completion is a prototype milestone, not a passed production phase. Show diff and confirm before phase 4.

## 8. Phase 4 — notifications and Android ongoing status

Use `expo-notifications` in the development build for permission, categories, local alerts and responses. Use native APNs/FCM tokens for direct server delivery; do not confuse them with Expo Push Service tokens. Expo supports native token retrieval and notification response/deep-link handling ([Expo documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)).

Ask in context on the first tracking attempt; denial must not block the journey. Respect both OS permission and `notificationsEnabled`, including the backend subscription preference. Settings links to system settings and reports current permission state.

| Event | Title | Body | Policy |
| --- | --- | --- | --- |
| Started | `{route} tracking started` | `Bus heading to {stop} · {eta} min` | Once; skip after successful Live Activity start. |
| Arriving | `{route} arriving soon` | `{eta} min to {stop}` | Once on arriving transition; time-sensitive interruption level if permitted. |
| Arrived | `{route} has arrived` | `Board now at {stop}` | Once on trusted arrival transition. |
| Optional delay | `{route} delayed` | Explain new ETA | >=5-minute increase between fresh observations; at most once per journey. |

- Set `threadIdentifier = journeyId` on iOS (APNs `thread-id`). Add category actions `Stop tracking` and `Open map`.
- `Stop tracking` dispatches end, persists a tombstone, ends native status, reloads widgets and queues server unsubscribe. Handle terminated/cold-start action delivery and repeated taps. If background action execution is insufficient, open the app to complete end rather than claim it executed.
- `Open map` and notification taps resolve the validated journey deep link after hydration. Ignore old-journey actions that would affect a newer journey.
- Use stable event IDs and a server uniqueness constraint/outbox. The server alone sends arriving/arrived alerts in MVP, whether the app is foregrounded or suspended. Do not add local arrival fallback. APNs collapse identifiers alone do not ensure exactly-once delivery. On ambiguous delivery, prefer avoiding a second alert send; document potential missing delivery. OS banner display cannot be guaranteed exactly once.
- Avoid retroactive alerts when notifications are re-enabled. Server toggles and end requests use revisions so delayed requests cannot restore an old subscription. Already delivered banners cannot be recalled reliably.
- Android: create a low-noise ongoing status channel and replace one notification per journey; provide route, stop, ETA and Stop/Open map actions. Use a separate alert channel for arrival events and handle Android runtime notification permission.
- Validate whether expo-notifications suffices for the chosen background lifecycle. If persistent execution is required, scope a native Android notification receiver/service with applicable foreground-service rules; do not assume a JavaScript timer survives suspension or force stop. Server FCM updates and stale content remain the fallback.

Backend dependency: B4 alert delivery and B5 operational readiness. Exit: permission/toggle matrix, action lifecycle tests, event deduplication tests, APNs/FCM device delivery and Android build pass. This is the MVP candidate milestone, subject to section 13. Show diff and obtain separate confirmation for release and for proceeding to phase 5; neither follows automatically.

## 9. Phase 5 — WidgetKit and accessories

Add widgets to the same Widget Extension bundle as Live Activity, sharing schema, storage and display helpers.

Deliver phase 5a (small/medium widgets and static favourite defaults) first, then phase 5b (accessories, route list and configurable favourites). Both belong to the full requested scope. Review the diff and confirm between these subphases; shipping 5a does not mark phase 5 complete.

| Family | Content |
| --- | --- |
| Small | Route-coloured ID, large ETA / `Now`, `min away` / `at stop`, stop name. |
| Medium | Small content plus blue GERAK status tile, status and plate. |
| Large or medium Routes | Verified G01–G03/JB Sentral mappings when available; highlight active route, show `—` for untracked routes. Never invent simultaneous ETAs from one journey. |
| accessoryCircular | ETA gauge with accessible label. |
| accessoryRectangular | Route, ETA, stop. |
| accessoryInline | Example fixture format: `G01 · 4 min`. |

Read the envelope from App Group storage. Generate minute-spaced entries from the shared ETA anchor within its freshness window, followed by explicit stale content; do not count stale estimates into a false `Now`. Idle timeline requests refresh after 15 minutes. System scheduling remains authoritative. Reload requests are best effort ([WidgetKit update documentation](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)).

On iOS 17+, use AppIntentConfiguration for favourite route/stop selection from cached official metadata and `containerBackground`. On iOS 16, use StaticConfiguration with favourites chosen in the app, clearly documenting that configuration UI differs. A favourite does not start a journey or independently fetch an ETA. Mismatched/untracked favourites show `—` and open that route. Empty state: `Start a journey in GERAK`.

Every widget links to the route. Bundle DM Sans/Space Grotesk with extension font registration and SF fallback. Use navy `#0b101b`, blue `#6f9ff1`, accessible light/dark palettes, system spacing/radii and measured text contrast >=4.5:1. Adjust badge foregrounds without changing route identity. Support Dynamic Type, truncation, VoiceOver (for example `Route G01, 4 minutes away, arriving at Larkin Sentral`) and Reduce Motion. Verify large accessibility sizes and long real stop names.

Exit: all family previews, physical-device timelines, stale/empty/favourite cases and end-to-end acceptance pass. Show the final phase diff and seek release approval separately; no automatic deployment.

## 10. Backend contract notes — required, not existing endpoints

### Backend work packages and dependencies

These packages are implementation work included within the relevant future phase reviews, not optional documentation tasks or permission to begin development now. Assign named backend owners at readiness review. They do not change the five-phase client order.

| Package | Scope and deliverables | Completion evidence / consuming phase |
| --- | --- | --- |
| B1 — live observations and domain contract | Approved ETA/arrival authority, real route mappings, versioned snapshot/command schemas, shared transition rules and replay fixtures from sanitized real observations. | Readiness validates data feasibility; phase 1 implements the contract and verifies no false arrival on stale/no-bus/direction-mismatch data. |
| B2 — installations and subscriptions | Authenticated installation ownership, token storage/rotation, journey start/end/preferences, idempotent commands, canonical revisions, durable tombstones and reconciliation operation. | Phase 2 integration tests cover unauthorized access, restart, offline end/mute, concurrent commands and schema migration. |
| B3 — ActivityKit delivery | Durable observation worker, activity-token binding, coalesced updates, update/end outbox, invalid-token cleanup and environment separation. | Phase 3 proves sandbox device delivery while suspended, token rotation, worker restart and end/update ordering. |
| B4 — alert and Android delivery | Unique arrival events, APNs/FCM payloads, preference enforcement, notification action integration and Android ongoing-status updates. | Phase 4 verifies foreground/background delivery, no client/server double send, repeated event processing, and suppression after accepted end/mute. |
| B5 — operations and capacity | Metrics, failure handling, load test, feature controls, retention policy, staged rollout and rollback runbook. | Phase 4 MVP release gate; repeat relevant checks for widget releases and material scale changes. |

### Capacity strategy

Start with the existing backend plus durable worker/storage after auditing current infrastructure. Do not introduce separate services solely for this migration. Ingest each upstream feed once per configured cadence, cache normalized observations and calculate reusable ETA results by feed/trip/vehicle/boarding-stop as appropriate. Fan out results to indexed active subscriptions rather than fetching upstream or repeating identical calculations per user.

Coalesce superseded activity/status updates, prioritize arrival/end events, bound queue size and retry age, and expire abandoned subscriptions. Recheck journey terminal status and preferences before sending queued work. Push rate limits and source request budgets constrain fan-out; do not promise a push for every GPS sample.

At readiness, record expected active vehicles, concurrent journeys, subscriptions per vehicle, upstream cadence and maximum accepted queue lag. Load-test that forecast plus an agreed burst/headroom factor. Measure feed calls, ETA computation cost, queue age, provider throttling, delivery attempts and database contention. Failure must preserve terminal commands and expose stale data, not silently accumulate unlimited work.

### Required operations

Do not call invented URLs. The following operations need backend design approval and implementation; paths are deliberately unassigned. Keep existing network/vehicle endpoints unchanged unless a reviewed migration is required.

| New operation | Required payload / behaviour |
| --- | --- |
| Register/update installation | Installation ID, platform, app version, bundle/package ID, APNs environment, APNs/FCM device token, notification authorization and preference; authenticated ownership, rotate/revoke tokens. |
| Subscribe/start journey | Journey ID, region/feed, real route/stop/vehicle IDs, start time, revision and preferences; return canonical snapshot, freshness and supported delivery capabilities. |
| Register activity token | Installation/journey/activity IDs, token, sandbox/production environment and revision; replace on rotation, reject ended journeys. |
| Update preferences/end journey | Journey ID, expected revision, idempotency key and notification preference or end command; atomically stop future events and emit native termination. |
| Reconcile journey | Retrieve authoritative snapshot/revision/event ledger and ended status after restart; no assumptions about URL or polling cadence. |

Server observation pipeline must produce real ETA, progress, plate, observation time and arrival evidence. Use existing transit types and approved official sources; reject simulator inputs. A durable worker owns transitions, event uniqueness and transactional outbox delivery. Retry transient failures with backoff, remove invalid tokens, isolate sandbox/production, enforce ownership/rate limits and redact tokens in logs. Do not expose APNs keys, FCM service credentials or signing keys to the app.

ActivityKit APNs envelopes need `aps.timestamp` (epoch seconds), `event` (`update`/`end`), `content-state` matching Swift Codable keys, `stale-date` and, on arrival end, `dismissal-date = arrival epoch +300`. Use `apns-push-type: liveactivity` and the host bundle topic suffixed `.push-type.liveactivity`; choose priority within Apple's current delivery budget. See [ActivityKit push documentation](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications).

Notification payloads carry alert title/body, category, `thread-id`, event/journey/revision identifiers and validated deep-link data; arriving uses `interruption-level: time-sensitive`. Android FCM payloads use the same domain identifiers and update the ongoing notification through the selected native delivery path. Backend acceptance tests must include races between ETA, end, token rotation and preference changes.

## 11. README and operational deliverables

Future `apps/mobile/README.md` must document:

- Exact pinned versions, supported OS matrix, Apple account/team, bundle IDs, App Group on host/extension, signing and entitlements, notification capabilities and environment separation.
- Dependency setup, repeatable config-plugin/prebuild flow, device development builds, Metro connection, Android setup and release build checks. Expo Go is unsuitable for the custom native bridge.
- Approved API base URL, actual token/subscription contracts once implemented, credential provisioning and server worker deployment/rollback.
- Native fonts, fixture-only previews, accessibility checks, supported widget families and background-delivery limitations.
- Troubleshooting denied permissions, missing App Group/signing, token rotation, no bus, stale feeds and extension decoding errors.

Include executable push examples once real bundle IDs and schema fixtures exist. Planned command shapes below are documentation templates, not commands executed for this plan:

```sh
# Ordinary notification simulation; fixture includes the agreed category/data.
xcrun simctl push booted "$GERAK_BUNDLE_ID" __fixtures__/push/arriving.apns

# Real sandbox ActivityKit update to an already started activity.
curl --http2 --request POST \
  --header "authorization: bearer $GERAK_APNS_JWT" \
  --header "apns-topic: ${GERAK_BUNDLE_ID}.push-type.liveactivity" \
  --header "apns-push-type: liveactivity" \
  --header "apns-priority: 5" \
  --data-binary @__fixtures__/push/activity-update.json \
  "https://api.sandbox.push.apple.com/3/device/$GERAK_ACTIVITY_TOKEN"

# Real sandbox ordinary arrival notification uses a different device token/topic.
curl --http2 --request POST \
  --header "authorization: bearer $GERAK_APNS_JWT" \
  --header "apns-topic: $GERAK_BUNDLE_ID" \
  --header "apns-push-type: alert" \
  --header "apns-priority: 10" \
  --data-binary @__fixtures__/push/arrived.json \
  "https://api.sandbox.push.apple.com/3/device/$GERAK_DEVICE_TOKEN"
```

Document secure ES256 APNs provider JWT generation using team/key IDs and the `.p8` key, refresh expiry, replace fixture timestamps at test time, and include update/end JSON matching the final schema. Never commit secrets. `simctl push` is useful for notification rendering/actions; it is not proof of ActivityKit APNs delivery, registration, credentials or closed-app execution. Verify those paths with sandbox APNs and physical devices.

## 12. Acceptance and validation matrix

| Requirement | Verification and practical boundary |
| --- | --- |
| Activity visible within 1 second | Measure from valid foreground start on supported authorized device; no network/token/notification-prompt dependency. Report actual timings. Permission denial yields in-app tracking. |
| Same ETA across surfaces | Shared snapshot revision, anchor and rounding tests; compare after a granted widget timeline refresh. Background widget divergence is visibly stale, not silently claimed synchronized. |
| Arriving once at <=2 minutes | Reducer/event ledger tests plus local/server ownership races and device pushes. Exactly-once event generation, best-effort OS delivery. |
| Arrival and dismissal | Trusted arrival ends activity with final `Board now` content and dismissal date +5 minutes; test local and pushed end. User/system may remove it sooner. |
| Stop from notification | Foreground, background and cold-start paths end matching journey, update storage/widgets/activity, cancel pending events and retry server unsubscribe offline. |
| Denied permissions | Notifications denied, activities disabled, both denied, Android channel/runtime denial and time-sensitive disabled still allow app tracking. |
| No network / no bus | Honest unavailable/stale rendering with last observation time; no simulator fallback or false arrival. |
| Styling/accessibility | All widget sizes and island modes; light/dark, large text, VoiceOver, Reduce Motion, long names and contrast checks. |
| Builds/tests | Existing `npm run typecheck`, `npm test`; new mobile/shared typechecks and unit suites; Xcode host+extension build at supported minimum and newer OS, plus Android build/smoke test. Final exact native scheme/workspace commands recorded after scaffolding. |
| Production readiness | Real route mapping and ETA/arrival authority, token contracts, durable push worker, credentials and prototype parity verified. Missing items remain release blockers. |

Apply this matrix to the release's declared scope: MVP requires phases 1–4 and B1–B5; widget rows become mandatory for their phase 5 release. All originally requested widget families and configuration remain required before declaring the full plan complete.

Future phase reviews must report actual checks run and failures rather than mark this plan's checklist as implemented. This planning change requires only Markdown/diff review; no application build or test results are claimed.

## 13. Release, observability and rollback

### Measurable release gates

Before the pilot, record numerical pass/fail targets, measurement windows, sample sizes and owners for the following measures. Those values require real data and forecast load; unset targets are a release blocker rather than an implicit pass.

| Measure | Required evidence |
| --- | --- |
| ETA quality | Error distribution against observed arrivals, coverage by route/direction and false-arrival count; evaluate the approved readiness targets. |
| Data freshness | Observation age and percentage of active journeys exceeding the 120-second stale threshold; distinguish feed outages from processing lag. |
| Native reliability | Crash-free sessions, failed bridge/storage operations, cold-start reconciliation failures and measured sub-1-second local activity startup. |
| Push pipeline | Observation-to-enqueue and queue-to-provider-acceptance latency, invalid tokens, retries, dropped/ambiguous sends and duplicate event generation. Provider acceptance is not proof of device receipt. |
| User actions | End/mute acknowledgement latency, pending offline command age and any alerts sent after the server accepted end/mute. |
| Capacity | Agreed forecast and burst load completed within queue/latency budgets without exceeding upstream/provider limits. |

Use structured, redacted logs with correlation by journey/event/revision and pseudonymous installation identifiers. Add mobile/native crash reporting and server queue/feed health alerts. Avoid logging precise location histories or push tokens; define access, retention and deletion for installation/subscription data before launch. Assign an incident owner and escalation route.

### Staged rollout

1. Internal device testing: exercise real routes, permission combinations, airplane mode, background/termination, worker restart, long stop names and end/arrival races. Attach evidence and known limitations.
2. Limited pilot: use TestFlight and an Android internal/closed track with an explicitly selected route/user cohort. Keep the website available. Monitor the agreed windows and gather ETA/notification feedback.
3. Gradual production expansion: increase cohort size only after each observation window passes; stop expansion on a breached gate. Release approval is separate from phase completion.
4. Widget rollout: after MVP stability, repeat pilot checks for phase 5a/5b and verify stale-state behaviour under actual system scheduling.

### Rollback and feature controls

Provide independently controllable server flags for new subscriptions, arrival alerts and activity/status pushes. Worker send paths must check those controls immediately before dispatch. Disabling alerts stops queued unsent alerts without preventing end/unsubscribe processing. For an incident requiring activity shutdown, send terminal updates while delivery remains enabled, then disable further updates; already delivered notifications cannot be recalled reliably.

Record how to pause enrollment, drain or discard affected queued work, restore a prior server/worker release and retain backwards-compatible snapshots for installed clients. Prefer additive schema migrations; do not require an immediate app update to recover. Native binary fixes require the app distribution process, so a server flag cannot be treated as a native-code rollback. Verify the runbook in the pilot environment.

### Phase review record

Each future review must include: phase/subphase and owner, actual diff, checks run with results, backend package status, unresolved risks, scope deviations, rollback impact and the next explicit approval requested. Keep readiness decisions and release evidence linked from this plan or the mobile README. Do not mark deferred work or untested device behaviour complete.
