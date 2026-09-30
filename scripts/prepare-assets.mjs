import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
// MapLibre v6 uses an explicit module worker URL. Serve the matching installed worker.
await mkdir('public/vendor', {recursive:true});
await copyFile(path.resolve('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'), 'public/vendor/maplibre-gl-worker.mjs');
