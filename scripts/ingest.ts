import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { parseStaticGtfs } from '../src/lib/server/gtfs-static';
import { readResponseBytes } from '../src/lib/server/upstream';
const source = process.argv[2] || 'https://api.data.gov.my/gtfs-static/mybas-johor';
async function main() {
  loadEnvConfig(process.cwd());
  let bytes: Uint8Array;
  if (/^https:\/\//.test(source)) {
    // data.gov.my returns 406 for a strict application/zip Accept value.
    const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`GTFS fetch failed: HTTP ${response.status}`);
    bytes = await readResponseBytes(response, 32 * 1024 * 1024);
  } else bytes = await fs.readFile(path.resolve(source));
  const network = parseStaticGtfs(bytes, source);
  const directory = process.env.GERAK_DATA_DIR || path.join(process.cwd(), '.runtime');
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, 'network.json');
  await fs.writeFile(`${output}.tmp`, JSON.stringify(network)); await fs.rename(`${output}.tmp`, output);
  console.log(JSON.stringify({ event: 'gtfs_static_imported', routes: network.routes.length, stops: network.stops.length, output }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
