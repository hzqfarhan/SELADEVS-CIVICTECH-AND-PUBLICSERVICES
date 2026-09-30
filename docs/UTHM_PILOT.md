# UTHM / KATSANA public tracker inspection

Verified 1 October 2026 (Malaysia time). Source: https://uthm.katsana.com/

The public HTML embeds three routes across Batu Pahat and Pagoh, including checkpoint names, IDs, coordinates, sequence and route polylines. GERAK now uses this published geometry in the explicitly labelled campus simulator, replacing the previously illustrative campus corridors. The snapshot contains 23 unique checkpoints. Vehicle movement, duration, occupancy and accessibility are still simulated or unverified; this is not a published timetable.

## Sources and endpoints

- Public page: `https://uthm.katsana.com/` — HTTP 200; inline `campuses` JSON was parsed without executing vendor code.
- Public stream advertised by that page: `wss://ws.shuttle.katsana.com/stream/1` — connected without credentials and delivered `connected`, `vehicle.state`, and `vehicles.ping` events.
- Initial sample: 25 vehicle records, 16 with a non-null ping. Individual GPS freshness and complete route assignment were not validated. A responsive stream is not proof that every vehicle is currently running.
- Ping fields observed: `latitude`, `longitude`, `course`, `speed`, `tracked_at`, `received_at` and ancillary telemetry. Public display integration should retain only required position fields.
- Local factual snapshot: `/data/uthm-katsana.json`, with retrieval timestamp and source URL. No Google Maps key, vendor imagery, application bundle or personal account data is included.

## Integration status

GERAK does not yet consume this stream continuously. Campus vehicle markers remain explicitly simulated. A production adapter needs reconnect/backoff, ping timestamp parsing, stale expiry, null-ping handling, vehicle-to-route mapping, speed-unit verification, bounded message validation and a shared server connection. Do not replace stale data with invented live positions.

No explicit redistribution licence or service-level agreement was identified on the inspected page. Confirm ongoing reuse terms with UTHM/KATSANA before production redistribution. This is a public-page inspection, not a claim of partnership or private API access.

## Verification

Campus paths and checkpoint coordinates preserve the published longitude/latitude ordering. Accessibility is unknown, represented conservatively as unavailable to accessibility-only planning. Simulator journey durations are estimates. Confirm current campus operations and stop accessibility on site before using this for operational journey advice.
