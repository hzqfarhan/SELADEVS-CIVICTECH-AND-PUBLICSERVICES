import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  boundaryBounds,
  boundaryContains,
  type Boundary,
} from "../src/components/malaysia-boundaries";
import {
  buildBus,
  wheelTurn,
  BUS_WHEEL_RADIUS,
} from "../src/components/bus-model";
import { uniqueRouteColors } from "../src/lib/route-colors";

const read = (name: string): Boundary[] =>
  JSON.parse(readFileSync(`public/data/boundaries/${name}.geojson`, "utf8"))
    .features;
test("DOSM geography includes both halves of Malaysia and real Johor district outlines", () => {
  const country = read("country")[0],
    states = read("states"),
    districts = read("districts");
  assert.equal(states.length, 16);
  assert.equal(districts.length, 160);
  for (const point of [
    [103.741, 1.492],
    [116.073, 5.981],
    [110.344, 1.553],
  ] as [number, number][])
    assert.equal(boundaryContains(country, point), true);
  assert.equal(boundaryContains(country, [103.819, 1.352]), false);
  const johor = states.find((f) => f.properties.state === "Johor")!;
  const jb = districts.find(
    (f) =>
      f.properties.state === "Johor" && f.properties.district === "Johor Bahru",
  )!;
  assert.ok(jb);
  assert.equal(boundaryContains(jb, [103.741, 1.492]), true);
  assert.equal(
    districts.filter((f) => f.properties.state === "Johor").length,
    10,
  );
  const bounds = boundaryBounds(johor);
  assert.ok(bounds[0][0] < 103.741 && bounds[1][0] > 103.741);
});
test("route colours are unique and stable regardless of feed ordering", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `J${i}`);
  const forward = uniqueRouteColors(ids),
    backward = uniqueRouteColors([...ids].reverse());
  assert.deepEqual(forward, backward);
  assert.equal(new Set(forward.values()).size, ids.length);
});
test("bus has four independent rolling tyres and stationary wheels do not spin", () => {
  const bus = buildBus("#75baff", 1);
  assert.equal(bus.wheels.length, 4);
  assert.equal(new Set(bus.wheels).size, 4);
  assert.ok(bus.body.children.length > 20);
  assert.equal(wheelTurn(0), 0);
  assert.ok(
    Math.abs(wheelTurn(2 * Math.PI * BUS_WHEEL_RADIUS) - 2 * Math.PI) < 1e-9,
  );
  bus.dispose();
});
