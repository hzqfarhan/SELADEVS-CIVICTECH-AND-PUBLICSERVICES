import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { getVehicles } from '../src/lib/server/vehicles';
// Standalone ingestion proof. Do not run concurrently with app live polling against
// the same upstream quota in production. Promote this to the sole Redis publisher.
let stopped = false;
process.on('SIGINT', () => { stopped = true; });
process.on('SIGTERM', () => { stopped = true; });
async function main() {
  loadEnvConfig(process.cwd());
  const directory = process.env.GERAK_DATA_DIR || path.join(process.cwd(), '.runtime');
  await fs.mkdir(directory, { recursive: true });
  do {
    const snapshot = await getVehicles('johor', 'live');
    const output = path.join(directory, 'vehicles.json');
    await fs.writeFile(`${output}.tmp`, JSON.stringify(snapshot)); await fs.rename(`${output}.tmp`, output);
    console.log(JSON.stringify({ event: 'vehicle_snapshot', count: snapshot.vehicles.length, source: snapshot.source, stale: snapshot.stale, observed: snapshot.updatedAt }));
    if (process.argv.includes('--once')) break;
    for (let second = 0; second < 35 && !stopped; second++) await new Promise(resolve => setTimeout(resolve, 1000));
  } while (!stopped);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
