# UTHM pilot integration

UTHM currently uses an explicitly labeled illustrative route and vehicle simulator. No private KATSANA API access, campus GPS observations or partnership is claimed. The official university reference and proposed provider appear in the source registry.

An authorized deployment would place a provider-specific server adapter before the shared normalized Vehicle contract: signed/authenticated telemetry → coordinate/time validation → latest-position cache → passenger SSE and operator views. Keep provider credentials server-side, namespace campus vehicle/route identifiers, retain source timestamps and reject malformed or implausible fixes. Agree on retention, staff access, public location precision and service hours with the university before connecting telemetry.

Acceptance: verify campus route geometry and stop accessibility on site; map telemetry IDs to approved routes; measure freshness and outages; test source attribution, stale status and mobile follow behavior. Pilot public users must never receive invented positions when a real source fails. Database and deployment rollout follow ARCHITECTURE.md and DEPLOYMENT.md.
