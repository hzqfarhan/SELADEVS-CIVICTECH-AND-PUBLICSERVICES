# Deployment plan

GERAK is a **Node-backed Next.js application**. Use a Node host or container with a reverse proxy; a static-only host cannot run the report, authentication and feed APIs. No cloud deployment or external account provisioning is implied by the local build.

## Local development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local`. Follow the Node version in the README/package metadata. No database is required for the local demo: reports use `.runtime/reports.json` unless `GERAK_DATA_DIR` changes the location. Never commit `.env.local`, report images or runtime data.

## Production build on one Node host

```sh
npm ci
npm run typecheck
npm test
npm run build
npm start
```

Use a process supervisor or container restart policy. Expose only the HTTPS proxy publicly. Forward Web/SSE traffic with suitable buffering/timeouts if the selected realtime endpoint streams events. Set `APP_ORIGIN` to the exact public HTTPS origin. Ensure the proxy forwards the original scheme correctly; set `COOKIE_SECURE=true` for HTTPS deployment if needed.

The minimum safe topology is one application process with durable storage. Do not run multiple replicas against a local JSON report file. Do not deploy the local file repository on an ephemeral serverless filesystem.

## Configuration responsibilities

`.env.example` is the complete implementation reference. Security/storage values currently used by server modules include:

| Variable | Deployment intent |
| --- | --- |
| `APP_ORIGIN` | Exact public origin for mutation checks |
| `AUTH_SECRET` | Random secret of at least 32 characters; keep in a secret store |
| `OPERATOR_PASSWORD` | Operator credential for the bounded pilot |
| `ALLOW_DEMO_OPERATOR` | Set `false` on a public operational deployment |
| `COOKIE_SECURE` | Require secure cookies behind HTTPS |
| `TRUST_PROXY` | Enable only when a trusted proxy overwrites forwarded client headers |
| `GERAK_DATA_DIR` | Writable persistent directory for local mode and generated artifacts |
| `DATABASE_URL` | PostgreSQL connection string to enable the database repository |

Changing `AUTH_SECRET` invalidates existing sessions. The current single operator credential is not a substitute for individual staff accounts and role management. The process-local limiter shares a bucket when proxy trust is disabled; configure the deployment deliberately rather than trusting arbitrary forwarded addresses.

## PostgreSQL/PostGIS

Provision PostgreSQL with PostGIS support, configure `DATABASE_URL`, then run the repository migration:

```sh
npm run db:migrate
```

Run migrations once per release, not in every web replica. Use a role with the smallest necessary runtime privileges after schema setup. Verify report creation, geospatial storage, status changes and persistence through a restart. Local JSON records do not automatically become database records: migrate them explicitly if they must be retained. Back up the database and rehearse restoring into a separate environment.

## Container release

Build from the committed lockfile in a supported Node Linux image, run the build in a separate stage, and launch the application as a non-root user. This repository configures `output: standalone`: package `.next/standalone`, copy `public` beside its `server.js`, copy `.next/static` to its `.next/static`, then launch `node server.js` from the packaged directory. Bind port 3000 internally. A local demonstration container may mount a persistent data volume; a multi-replica service should use PostgreSQL and shared infrastructure.

Keep secrets out of images and build arguments. Configure a health check against the implemented health endpoint and distinguish process health from degraded upstream feed state. Pin the image digest for a release and retain the preceding known-good image for rollback. Where Docker files are supplied in this repository, use their exact commands and check their environment assumptions before deploying.

## Ingestion and mapping

Run `npm run ingest` according to its documented options for GTFS Schedule import; the default is the official Johor feed and the generated network is written to `.runtime/network.json`. Use a scheduled job for validated daily refresh. `scripts/poll.ts` is a standalone realtime snapshot collector at 35-second intervals. Do **not** run that collector alongside independent app polling unless you have centralized ingestion: they do not share an upstream quota cache.

A shared elected realtime worker and Redis cache are required before horizontally scaling upstream polling. At four published requests/minute, independent polling by replicas or browsers can exhaust the national API quota.

The default basemap is OpenFreeMap's dark vector style, requiring no map API key. Its public service offers no availability SLA; an operational launch should choose support or hosting appropriate to its uptime needs. Display the style's OpenMapTiles/OpenStreetMap attribution. The installed MapLibre 6 worker is copied locally by the asset preparation script; keep that build step when packaging `public`. The packaged fallback and miniature scene keep the demo usable; they do not establish production terrain/building coverage. Do not bulk-cache third-party map tiles without permission.

## Before a public operational launch

1. Disable demo login; replace shared credentials with institutional OIDC/RBAC and actor-specific audit records.
2. Use PostgreSQL, shared rate limits/cache and a single ingestion scheduler.
3. Move images to object storage with image decoding, metadata removal, moderation and retention controls.
4. Add logs/metrics/alerts for API errors, source age, rejected GPS fixes, report failures and storage health.
5. Configure database backups, TLS renewal, secret rotation, dependency updates and restore/rollback rehearsals.
6. Test real devices, accessibility and malformed/unavailable upstream data; confirm legal data-sharing and service ownership with operators.

Redis, OIDC, object storage and monitoring accounts are proposed production components, not automatically provisioned dependencies. The working MVP does not constitute an audited production service.
