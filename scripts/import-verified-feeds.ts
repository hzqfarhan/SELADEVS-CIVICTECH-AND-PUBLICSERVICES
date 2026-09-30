import { readFile, writeFile, mkdir } from "node:fs/promises";
import { SERVICES } from "../src/lib/feeds";
import { parseStaticGtfs } from "../src/lib/server/gtfs-static";
import { namespaceNetwork, networkFile } from "../src/lib/server/network";
async function main() {
  await mkdir(".runtime", { recursive: true });
  const result = [];
  for (const service of SERVICES)
    for (const endpoint of service.endpoints) {
      try {
        const bytes = await readFile(
          `.runtime/feed-downloads/${endpoint.id}.zip`,
        );
        const data = namespaceNetwork(
          parseStaticGtfs(bytes, endpoint.staticUrl, service.id),
          endpoint,
          service.id,
        );
        await writeFile(networkFile(endpoint.id), JSON.stringify(data));
        result.push({
          endpoint: endpoint.id,
          routes: data.routes.length,
          stops: data.stops.length,
        });
      } catch (error) {
        result.push({ endpoint: endpoint.id, error: String(error) });
      }
    }
  await writeFile(
    ".runtime/static-verification.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}
main();
