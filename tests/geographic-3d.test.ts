import test from "node:test";
import assert from "node:assert/strict";
import { busFootprint } from "../src/components/geographic-3d";

test("geographic 3D buses preserve GPS anchor and rotate clockwise from north", () => {
  const anchor: [number, number] = [103.7633, 1.4625];
  for (const heading of [0, 45, 90, 180, 270]) {
    const polygon = busFootprint(anchor, heading, 12, 2.6);
    const ring = polygon.coordinates[0];
    assert.deepEqual(ring[0], ring[4]);
    assert.ok(
      Math.abs(
        ring.slice(0, 4).reduce((sum, p) => sum + p[0], 0) / 4 - anchor[0],
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        ring.slice(0, 4).reduce((sum, p) => sum + p[1], 0) / 4 - anchor[1],
      ) < 1e-9,
    );
  }
  const north = busFootprint(anchor, 0, 12, 2.6).coordinates[0];
  const east = busFootprint(anchor, 90, 12, 2.6).coordinates[0];
  assert.ok(north[2][1] > north[1][1]);
  assert.ok(east[2][0] > east[1][0]);
});
