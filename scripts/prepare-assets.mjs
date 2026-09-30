import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
// MapLibre v6 uses an explicit module worker URL. Serve the matching installed worker.
await mkdir("public/vendor", { recursive: true });
// The worker is an ES module and imports this sibling at runtime.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(
    path.resolve("node_modules/maplibre-gl/dist", file),
    `public/vendor/${file}`,
  );
}
