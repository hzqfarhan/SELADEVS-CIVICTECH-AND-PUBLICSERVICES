# GERAK CODEFEST 2026 strategy

## Brief status and evidence

The user's requested uploaded CODEFEST brief was **not present in this repository** when work began. The supplied [shared conversation](https://chatgpt.com/share/6abc592a-a5d8-83ec-83ea-63b0667331f0) could not be retrieved by the research tool. Its unseen contents have not been treated as facts.

A local `Downloads/codefest26-master.zip` was found and inspected without modifying it. It contains event website source, including `app/data/site-config.ts`, rather than a competition brief. That configuration describes a societal-challenge MVP and mentions creativity, technical execution and real-world impact. The archive's provenance and official status are unverified. It is **not an authenticated judging rubric**, and this document assigns no invented scoring weights or official submission requirements. Confirm the actual brief before final submission.

The strategy below follows the user's explicit product scope and is a GERAK proposal.

## Product thesis

**GERAK makes the journey and the street visible together.** A passenger can understand where the bus is, decide how to travel, and report a barrier at the same stop. An operator sees the service and civic issue in one geographic context.

Bahasa Melayu pitch: **“Tahu bila bas tiba. Bantu bandar bergerak.”**

English pitch: **“Know your next move. Help your city move better.”**

The 3D map should earn attention in the first ten seconds, then serve a practical task. The civic feedback loop and transparent data provenance give the presentation substance beyond animation.

## Demo narrative

1. Start in Johor with visible moving vehicles and an unambiguous live/demo source badge.
2. Select a bus; show its route, next stop and estimated arrival, including the estimate's basis.
3. Change to 3D; follow that same vehicle. Keep the selection and details intact.
4. Return attention to a stop with a walking/accessibility problem; submit a geotagged civic report.
5. Open the operator view in a second tab; the report appears. Acknowledge it and show the changed status to the passenger.
6. Explain the extension point: official Malaysian GTFS feeds today, an authorized UTHM telemetry adapter for a campus pilot, and municipal integrations later.

If the official feed has no current vehicles or is unreachable, show the explicit simulator. Reliability of the demonstration is valuable; pretending the simulator is a live operator feed is not.

## What differentiates the project

| Product choice | Demonstrable value | Evidence to bring |
| --- | --- | --- |
| Map and vehicle motion as the main interface | Understand service at a glance | Working 2D/3D sequence on a phone |
| One connected passenger-to-operator civic flow | A report leads to visible action | Same report ID and lifecycle in both views |
| Malaysian official-data adapters | Plausible path from demo to deployment | Source URLs, normalization and freshness state |
| Campus pilot boundary | A manageable first operational setting | Adapter schema and an honestly labeled UTHM simulator |
| BM/English and clear accessibility states | Local usability and truthful information | Language switch and unknown/known accessibility handling |
| Offline and low-power design | Useful under variable connection/device conditions | Offline fallback and 2D mode |

## UTHM pilot proposal

UTHM's [official transportation page](https://www.uthm.edu.my/en/transportation) already links a KATSANA shuttle tracker. Position GERAK as a possible complementary experience and civic workflow, subject to collaboration, rather than claiming the university lacks tracking.

Proposed pilot: agree on one route and one responsible campus operations team; obtain authorized telemetry; map verified stops; recruit a small volunteer rider group; measure arrival-estimate error, stale-data rate, report acknowledgement time and task completion. These are **future measurement targets**, not achieved outcomes. No partnership, permission, user count or reduction in waiting time is implied by the MVP.

## Credible startup direction

The first potential customer is a campus or small fleet operator with an identifiable operations team. The rider app stays easy to access while an operator subscription could fund fleet oversight, incident triage and deployment support. Municipal interoperability and multi-operator planning follow demonstrated use, not the initial pitch.

Validate willingness to use and pay through interviews and a bounded pilot. Keep procurement, support ownership, telemetry rights and privacy responsibilities visible in the deployment plan. Do not introduce invented revenue, traction or market-size numbers into the pitch.

## Presentation preparation

- Use one rehearsed 3-minute story with a backup recording of the same actual build.
- Warm the app once before the presentation; verify phone and projector layouts.
- Keep visible source labels and a clear feed status throughout.
- Prepare one concrete explanation of smooth interpolation, one of the civic lifecycle, and one of the production deployment boundary.
- Include an architecture diagram, source register, passing test evidence and the remaining production work.
- Verify the actual competition brief, eligibility, submission format and intellectual-property rules before submitting.

## Claims discipline

Say “working MVP,” “estimated arrival,” “simulated dispatch,” “proposed campus pilot” and “official feed adapter” where those are accurate. Reserve “production deployment,” “official partnership,” “operator prediction,” “municipal resolution” and measured impact claims for evidence that actually establishes them.

The live demo succeeds when a viewer can follow one bus and one civic report from beginning to end, and can tell which data are official, inferred or simulated.
