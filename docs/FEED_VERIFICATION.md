# Nationwide feed verification — 1 October 2026

Checked against the documented data.gov.my endpoints, with requests spaced to respect the public quota. Counts below are historical observations, not current fleet availability. Checks ran around 01:00–01:10 MYT, outside many bus operating hours. Invalid coordinates/timestamps were excluded; zero valid vehicles does not mean an endpoint is absent.

| Service / endpoint | Realtime HTTP | Valid GPS / stale | Static HTTP | Routes | Stops |
| --- | --- | --- | --- | --- | --- |
| johor | 200 | 4 / 0 | 200 | 21 | 988 |
| kangar | 200 | 1 / 1 | 200 | 0 | 0 |
| alor-setar | 200 | 9 / 0 | 200 | 7 | 229 |
| kota-bharu | 200 | 1 / 1 | 200 | 1 | 35 |
| kuala-terengganu | 200 | 1 / 0 | 200 | 9 | 394 |
| ipoh | 200 | 0 / 0 | 200 | 17 | 2078 |
| seremban-a | 200 | 1 / 0 | 200 | 11 | 966 |
| seremban-b | 200 | 0 / 0 | 200 | 11 | 1423 |
| melaka | 200 | 1 / 1 | 200 | 22 | 678 |
| kuching | 200 | 1 / 1 | 200 | 7 | 300 |
| ktmb | 200 | 0 / 0 | 200 | 9 | 156 |
| rapid-kl | 200 | 2 / 0 | 200 | 137 | 4053 |
| mrt-feeder | 200 | 0 / 0 | 200 | 91 | 2112 |
| rapid-penang | 200 | 0 / 0 | 200 | 47 | 1933 |
| rapid-kuantan | 404 | — / — | 404 | 0 | 0 |
| rapid-rail | not provided | — / — | 200 | 8 | 187 |

Kangar returned HTTP 200 but its static feed had no usable network. Rapid Kuantan static and realtime endpoints returned 404. Rapid KL rail is static-only, as documented. Seremban combines both operator feeds while retaining distinct IDs. GTFS position timestamps, not fetch times, control freshness. All source URLs and sample times are available in `/data/feed-verification.json` and `/api/feeds`.

Live position updates are documented every 30 seconds; GERAK caches each feed for 35 seconds and shares a four-request/minute upstream budget within one Node process. Rapid switching or many simultaneous operators can delay refreshes; cached positions retain original timestamps. Multiple replicas require shared ingestion/rate-limit coordination.
