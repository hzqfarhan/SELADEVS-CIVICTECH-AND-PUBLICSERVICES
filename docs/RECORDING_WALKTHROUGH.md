# Interactive report recording walkthrough

Open `/operator?walkthrough=report`, or select **Open recording demo** in the operator dashboard.

This is a prepared, interactive sample for recording the three-minute video. It uses one browser-local report across resident, operator and passenger perspectives. It does not submit a real community report or claim a real repair. A compact demo label remains visible.

## Capture the three demo sections

| Film section | Recording action |
| --- | --- |
| 01:35–01:59 · 24 seconds | Choose **Pothole near crossing**. In Resident, capture the example photo, review/edit the location, title and description, then submit the demo report. Hold on its Submitted confirmation and reference. |
| 02:04–02:18 · 14 seconds | Switch to Operator. Open the same report and acknowledge it. Hold on Acknowledged. In progress and Resolved are also interactive for additional takes. |
| 02:36–02:44 · 8 seconds | Switch to Passenger. Show the same report reference, photo, location and latest operator status. |

The other scenarios are a damaged shelter, flooding and a blocked access ramp. **Reset** returns the selected scenario to a fresh draft for another take. The chosen report and status survive reopening/reloading; tabs on the same browser origin synchronise through local storage. Browser privacy settings may prevent that persistence, while the open demo still works.

The nearby alert sequence in the motion film remains a proposed feature. This walkthrough demonstrates the sample report and its in-app status, not push notification delivery or council dispatch.

## Operator showcase

The site opens a shared **GERAK Demo Operator** by default, so the team can record without a password or `AUTH_SECRET`. Anyone who can access the site can use operator actions while this showcase is enabled. To restore restricted access, set `OPERATOR_SHOWCASE_MODE=false` and `ALLOW_DEMO_OPERATOR=false`, then configure the production signing secret and operator password.

The real community inbox remains separate from the browser-local recording sample. Existing real report operations still retain their origin, validation and status checks.
