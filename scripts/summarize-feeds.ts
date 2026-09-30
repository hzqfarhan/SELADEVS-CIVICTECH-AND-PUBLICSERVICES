import { readFile, writeFile } from "node:fs/promises";
import Gtfs from "gtfs-realtime-bindings";
import { normalizeFeed } from "../src/lib/server/vehicles";
import { SERVICES } from "../src/lib/feeds";
async function main() {
  const checks = JSON.parse(
    await readFile(".runtime/feed-verification.json", "utf8"),
  );
  const imported = JSON.parse(
    await readFile(".runtime/static-verification.json", "utf8"),
  );
  const rows = [];
  for (const service of SERVICES)
    for (const endpoint of service.endpoints) {
      const rt = checks.find(
        (c: any) => c.endpoint === endpoint.id && c.kind === "realtime",
      );
      const gtfs = checks.find(
        (c: any) => c.endpoint === endpoint.id && c.kind === "static",
      );
      const parsed = imported.find((c: any) => c.endpoint === endpoint.id);
      let usable: number | undefined, stale: number | undefined;
      if (rt?.status === 200) {
        const decoded = Gtfs.transit_realtime.FeedMessage.decode(
          await readFile(`.runtime/feed-downloads/${endpoint.id}.pb`),
        );
        const vehicles = normalizeFeed(
          decoded,
          service.id,
          Date.parse(rt.checkedAt) + 1000,
        );
        usable = vehicles.length;
        stale = vehicles.filter(
          (v) => Date.parse(rt.checkedAt) - v.timestamp > 90000,
        ).length;
      }
      rows.push({
        service: service.name,
        endpoint: endpoint.id,
        realtimeUrl: endpoint.realtimeUrl,
        staticUrl: endpoint.staticUrl,
        realtimeStatus: rt?.status ?? "not provided",
        staticStatus: gtfs?.status,
        usableVehicles: usable,
        staleVehicles: stale,
        routes: parsed?.routes ?? 0,
        stops: parsed?.stops ?? 0,
        checkedAt: rt?.checkedAt ?? gtfs?.checkedAt,
        notes: parsed?.error
          ? endpoint.id === "rapid-kuantan"
            ? "Both documented endpoints returned HTTP 404."
            : "Static feed contains no usable network."
          : undefined,
      });
    }
  await writeFile(
    "public/data/feed-verification.json",
    JSON.stringify(rows, null, 2),
  );
  let doc =
    "# Nationwide feed verification — 1 October 2026\n\nChecked against the documented data.gov.my endpoints, with requests spaced to respect the public quota. Counts below are historical observations, not current fleet availability. Checks ran around 01:00–01:10 MYT, outside many bus operating hours. Invalid coordinates/timestamps were excluded; zero valid vehicles does not mean an endpoint is absent.\n\n| Service / endpoint | Realtime HTTP | Valid GPS / stale | Static HTTP | Routes | Stops |\n| --- | --- | --- | --- | --- | --- |\n";
  for (const r of rows)
    doc += `| ${r.endpoint} | ${r.realtimeStatus} | ${r.usableVehicles ?? "—"} / ${r.staleVehicles ?? "—"} | ${r.staticStatus} | ${r.routes} | ${r.stops} |\n`;
  doc +=
    "\nKangar returned HTTP 200 but its static feed had no usable network. Rapid Kuantan static and realtime endpoints returned 404. Rapid KL rail is static-only, as documented. Seremban combines both operator feeds while retaining distinct IDs. GTFS position timestamps, not fetch times, control freshness. All source URLs and sample times are available in `/data/feed-verification.json` and `/api/feeds`.\n\nLive position updates are documented every 30 seconds; GERAK caches each feed for 35 seconds and shares a four-request/minute upstream budget within one Node process. Rapid switching or many simultaneous operators can delay refreshes; cached positions retain original timestamps. Multiple replicas require shared ingestion/rate-limit coordination.\n";
  await writeFile("docs/FEED_VERIFICATION.md", doc);
  console.log(
    JSON.stringify({
      endpoints: rows.length,
      requests: checks.length,
      successful: checks.filter((c: any) => c.status === 200).length,
      routes: rows.reduce((n, r) => n + r.routes, 0),
      stops: rows.reduce((n, r) => n + r.stops, 0),
    }),
  );
}
main();
