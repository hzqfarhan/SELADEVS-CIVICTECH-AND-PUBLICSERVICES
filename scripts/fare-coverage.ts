import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { SERVICES, type Endpoint } from "../src/lib/feeds";
import { parseStaticGtfs } from "../src/lib/server/gtfs-static";
import {
  namespaceNetwork,
  networkFile,
  type TransitNetwork,
} from "../src/lib/server/network";
import { resolveDistance, type Leg } from "../src/lib/fares";
import type { Region, TransitRoute, TripPattern } from "../src/lib/types";

// Samples every pattern's stop pairs (offsets 1, 3, 5) through the fare
// distance resolver and reports which pairs can produce a priced leg.
const offsets = [1, 3, 5];
function samplePairs(p: TripPattern) {
  const pairs: { from: number; to: number }[] = [];
  for (let i = 0; i < p.stops.length; i++)
    for (const o of offsets)
      if (i + o < p.stops.length) pairs.push({ from: i, to: i + o });
  return pairs;
}
async function loadNetwork(
  endpoint: Endpoint,
  region: Region,
  zipDir: string,
): Promise<{ network: TransitNetwork; origin: "zip" | "cache" }> {
  const zip = `${zipDir}/${endpoint.id}.zip`;
  if (existsSync(zip))
    return {
      network: namespaceNetwork(
        parseStaticGtfs(await readFile(zip), endpoint.staticUrl, region),
        endpoint,
        region,
      ),
      origin: "zip",
    };
  const file = networkFile(endpoint.id);
  if (existsSync(file))
    return {
      network: JSON.parse(await readFile(file, "utf8")),
      origin: "cache",
    };
  throw new Error(`no ${endpoint.id}.zip in ${zipDir} and no cache at ${file}`);
}
async function main() {
  const zipDir = process.argv.includes("--zip-dir")
    ? process.argv[process.argv.indexOf("--zip-dir") + 1]
    : ".runtime/feed-downloads";
  await mkdir(".runtime", { recursive: true });
  const report = [];
  for (const service of SERVICES) {
    if (service.operator !== "BAS.MY") continue;
    for (const endpoint of service.endpoints) {
      let entry: Record<string, unknown>;
      try {
        const { network, origin } = await loadNetwork(
          endpoint,
          service.id as Region,
          zipDir,
        );
        const reasons: Record<string, number> = {};
        const methods: Record<string, number> = {};
        let pairs = 0,
          patterns = 0,
          routesWithoutPatterns = 0;
        for (const route of network.routes as TransitRoute[]) {
          if (!route.patterns?.length) {
            routesWithoutPatterns++;
            continue;
          }
          for (const p of route.patterns) {
            patterns++;
            for (const { from, to } of samplePairs(p)) {
              pairs++;
              const leg: Leg = {
                route,
                patternId: p.id,
                fromStopId: p.stops[from].stopId,
                toStopId: p.stops[to].stopId,
                fromSequence: p.stops[from].sequence,
                toSequence: p.stops[to].sequence,
              };
              const d = resolveDistance(leg, network.stops);
              if (d.metres !== null)
                methods[d.method] = (methods[d.method] ?? 0) + 1;
              else reasons[d.reason] = (reasons[d.reason] ?? 0) + 1;
            }
          }
        }
        const resolved = Object.values(methods).reduce((a, b) => a + b, 0);
        entry = {
          region: service.id,
          endpoint: endpoint.id,
          origin,
          routes: network.routes.length,
          patterns,
          routesWithoutPatterns,
          pairs,
          resolved,
          coveragePct: pairs
            ? Number(((resolved / pairs) * 100).toFixed(1))
            : null,
          methods,
          reasons,
        };
      } catch (error) {
        entry = {
          region: service.id,
          endpoint: endpoint.id,
          error: String(error),
        };
      }
      report.push(entry);
      console.log(JSON.stringify(entry));
    }
  }
  await writeFile(
    ".runtime/fare-coverage.json",
    JSON.stringify(report, null, 2),
  );
}
main();
