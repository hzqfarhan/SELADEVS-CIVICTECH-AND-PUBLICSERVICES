# GERAK Reach: from moving buses to access to everyday life

## Product direction

### Implemented first scenario: What If?

The journey planner now includes **GERAK What If? · Test a stop closure** when the selected origin and destination have a baseline connection. Select a stop and apply the hypothetical closure to compare connections and estimated fares. The map centres on the selected stop; alternative boarding-stop buttons also centre the map.

The planner excludes closed stops from boarding, alighting and transfers while preserving through travel, route geometry and fare calculation. If no connection remains, the comparison checks up to 20 nearby candidate boarding stops within 1 km and displays up to three alternatives. Distances are explicitly straight-line. A closed destination requires choosing another destination.

This first slice uses existing stops, not curated clinic/campus destination cards. The geographic map now displays amber closure markers, numbered alternative boarding candidates and a hypothetical-scenario legend. The schematic fallback also includes scenario symbols and a legend. Resetting or leaving the planner clears the overlay. Animated route comparison and destination verification remain future work. Scenario state is local and resets when journey endpoints or region change; it never updates real service data.

Validation: 90 automated tests passed, including four closure/comparison tests, TypeScript checking passed, and the production build passed. Browser visual acceptance remains to be performed: local browser use is disabled in Work settings.

Proposed signature feature: choose an essential destination and see how the bus network connects you to it. The map tells a human story: home or campus → boarding stop → moving bus → clinic, education or community service.

This is an original product proposal, not a claim that GERAK is the first system to offer these features. Its value must be validated with riders.

Keep transit as the core. Use civic reporting to explain and address barriers along that journey. Avoid adding unrelated welfare, farming or disaster modules.

## Implemented reporting demonstration

The Community view and Operator → Reports now show a separate interactive demonstration:

- Two fictional scenarios: a blocked boarding ramp and a damaged shelter.
- Four stages: submitted, acknowledged, in progress and resolved.
- Scripted team responses and a resolution explanation.
- English and Bahasa Melayu text.
- Shared progress between these views while the app remains mounted.
- Reset and scenario selection; refresh starts the demonstration again.

This is hardcoded frontend state, not an authority integration. The example locations and teams are fictional. Demo progress is not written to the reports database or included in real report counts. Existing report submission and operator authentication remain in place.

## The signature experience

### 1. “Where do you need to go?”

Offer a small curated set of essential destinations around one supported pilot corridor: a clinic, campus and community facility. Each destination must have verified coordinates, source and last-reviewed date before being labelled factual. Do not invent opening hours or imply a facility is currently open.

The rider chooses a starting stop, destination and optional budget. Reuse the existing route-connection and fare engines. Show:

- Available route connection and transfer, where supported.
- Fare estimate, basis and unknown portions.
- Nearby vehicles on the relevant service, with observation age.
- Distance from the destination stop to the facility, initially labelled straight-line distance.
- Access information as verified, reported or unknown.

Do not label a connection “catchable now”: the current planner does not check service calendars, departures or live arrival predictions. “Connection explorer” is the honest first release.

### 2. A map that explains the whole journey

On selection, highlight the relevant route and dim unrelated services. Animate a restrained route reveal, then follow actual vehicle observations. Keep a fixed 2D overview available so the user does not lose orientation.

Show three compact cards: **Your connection**, **Your estimated cost**, **What to check before travelling**. Support reduced motion and keyboard use. The default phone experience should work without a cinematic camera sequence.

The standout visual is a destination lighting up as its transport connection is revealed. It communicates access to healthcare or education rather than merely vehicle movement.

### 3. “What if this stop is unavailable?”

Second phase: select a stop closure in an explicitly labelled scenario. Re-run the connection search excluding that stop and compare available connections and fare estimates.

Display “No alternative found in this dataset” when appropriate. Never draw a supposedly safe walking detour from straight-line geometry. Actual pedestrian directions and accessibility guarantees need validated routing and access data.

This gives operators a useful discussion tool: which destinations lose a connection when a stop cannot be used? A simulated closure must not become a real service alert.

### 4. Community evidence on the route

Later, connect real reports to structured stop and route IDs. Distinguish unverified reports from verified disruptions. A single unverified report should not silently remove a route or declare it unsafe.

The hardcoded reporting walkthrough can illustrate this future workflow in the pitch, but must stay labelled as a demonstration.

## Delivery sequence

| Stage | Work | Completion evidence |
| --- | --- | --- |
| Foundation | Complete BM core-flow copy; verify three pilot destinations and stop associations; agree on one rider scenario. | Every displayed destination is sourced; missing access data says unknown. |
| Reach MVP | Destination cards, start-stop selection, existing connection/fare calculation and route highlighting. | A rider can find a connection, explain its estimated cost and identify its limitations without assistance. |
| Visual polish | Route reveal, destination highlight, 2D overview and optional vehicle follow. | Works on an ordinary phone; reduced-motion mode provides the same information. |
| Scenario explorer | Hypothetical stop closure, recalculation and before/after comparison. | No closed-stop path returned; disconnected destinations are represented honestly. |
| Evidence | Small rider study, measured task success and qualitative feedback. | Results include sample size, dates, failures and limitations. |

Build and validate Reach MVP before committing to the scenario explorer. Estimates require inspecting the destination data and agreeing on the pilot corridor; no delivery-time promise is made here.

## Technical approach using the existing codebase

- Add a small typed, sourced destination dataset; do not depend on a new live external service for the first demonstration.
- Reuse `src/lib/transit.ts` for connection candidates and `src/lib/fares.ts` for estimated fares.
- Use existing vehicle snapshots and freshness handling; keep unknown arrivals unknown.
- Extend the existing map selection/highlight behaviour instead of adding another map renderer.
- Implement the hypothetical closure as a separate planner input. Keep it isolated from published service data and civic-report status.
- Add meaningful tests for destination/stop association, unsupported connections, excluded stops and unavailable fares. Validate the primary journey in BM and English on a phone.

## Claims and success measures

Safe initial claim: “GERAK helps you explore bus connections to everyday services and understand the information available before you travel.”

Do not claim shortest arrival time, verified wheelchair access, guaranteed affordability, reduced emissions or measured waiting-time savings without the necessary data and evaluation.

Measure whether users can identify a useful connection, understand estimated versus unknown information, and complete the task. Any later access-coverage analysis should count destinations reachable within the model's stated assumptions, not people served or trips actually made.

## Launch and competition story

Suggested sequence:

1. “A moving bus means more when it connects someone to care, learning or opportunity.”
2. Choose a clinic or campus; reveal its bus connection on the 2D map.
3. Follow a bus with its real freshness label visible.
4. Show the estimated fare and information still needing confirmation.
5. Demonstrate the fictional stop-report workflow, clearly marked.
6. Close with the validated rider findings or, until available, the proposed pilot.

The 30-second launch video can focus on the visual connection and civic purpose. The required three-minute competition video should prove the actual interactions and clearly identify proposed or simulated behaviour.
