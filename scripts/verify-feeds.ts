import { mkdir, writeFile } from "node:fs/promises";
import Gtfs from "gtfs-realtime-bindings";
import { SERVICES } from "../src/lib/feeds";
async function main() {
  await mkdir(".runtime/feed-downloads", { recursive: true });
  const results: unknown[] = [];
  for (const service of SERVICES)
    for (const endpoint of service.endpoints)
      for (const kind of ["realtime", "static"] as const) {
        const url =
          kind === "realtime" ? endpoint.realtimeUrl : endpoint.staticUrl;
        if (!url) continue;
        await new Promise((resolve) => setTimeout(resolve, 16500));
        const result: Record<string, unknown> = {
          region: service.id,
          endpoint: endpoint.id,
          kind,
          url,
          checkedAt: new Date().toISOString(),
        };
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
          result.status = r.status;
          if (r.ok) {
            const bytes = new Uint8Array(await r.arrayBuffer());
            result.bytes = bytes.length;
            if (kind === "realtime") {
              const decoded = Gtfs.transit_realtime.FeedMessage.decode(bytes);
              result.observations = decoded.entity.filter(
                (e) => e.vehicle?.position,
              ).length;
              result.feedTime = String(decoded.header.timestamp);
            }
            await writeFile(
              `.runtime/feed-downloads/${endpoint.id}.${kind === "static" ? "zip" : "pb"}`,
              bytes,
            );
          }
        } catch (error) {
          result.error = String(error);
        }
        results.push(result);
        await writeFile(
          ".runtime/feed-verification.json",
          JSON.stringify(results, null, 2),
        );
        console.log(JSON.stringify(result));
      }
}
main();
