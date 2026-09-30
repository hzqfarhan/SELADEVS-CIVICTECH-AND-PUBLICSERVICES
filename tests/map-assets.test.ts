import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";

test("published MapLibre worker includes every relative module dependency", async () => {
  execFileSync(process.execPath, ["scripts/prepare-assets.mjs"]);
  const visited = new Set<string>();
  async function check(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    await access(file);
    const source = await readFile(file, "utf8");
    const imports = [
      ...source.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g),
    ];
    for (const match of imports) await check(resolve(dirname(file), match[1]));
  }
  await check(resolve("public/vendor/maplibre-gl-worker.mjs"));
  assert.ok(visited.has(resolve("public/vendor/maplibre-gl-shared.mjs")));
});
