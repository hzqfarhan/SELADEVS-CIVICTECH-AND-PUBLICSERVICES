import test from "node:test";
import assert from "node:assert/strict";
import {
  distance,
  positionOnPath,
  simulateVehicles,
  planJourney,
  etaForVehicle,
  routes,
} from "../src/lib/transit";
test("haversine uses meters and stationary coordinates are zero", () => {
  assert.equal(distance([103, 1], [103, 1]), 0);
  assert.ok(distance([103, 1], [103.01, 1]) > 1100);
});
test("distance weighted interpolation wraps loop and headings follow path", () => {
  const path: [number, number][] = [
    [103, 1],
    [103.01, 1],
    [103, 1],
  ];
  assert.ok(
    Math.abs(positionOnPath(path, 0.25).coordinate[0] - 103.005) < 0.0001,
  );
  assert.deepEqual(positionOnPath(path, 0), positionOnPath(path, 1));
  assert.ok(positionOnPath(path, 0.25).bearing > 89);
  assert.ok(positionOnPath(path, 0.75).bearing > 269);
});
test("simulator is deterministic, region separated and never pretends to be live", () => {
  const fleet = simulateVehicles("johor", 10000);
  assert.deepEqual(fleet, simulateVehicles("johor", 10000));
  assert.equal(fleet.length, 12);
  assert.ok(
    fleet.every((v) => v.source === "simulator" && v.region === "johor"),
  );
  assert.notDeepEqual(
    fleet[0].coordinate,
    simulateVehicles("johor", 30000)[0].coordinate,
  );
});
test("planning validates regions, accessible endpoints and provides direct routes", () => {
  assert.equal(planJourney("jb-sentral", "uthm-gate").length, 0);
  assert.equal(planJourney("jb-sentral", "heritage", true).length, 0);
  assert.ok(planJourney("jb-sentral", "ksl")[0].minutes > 0);
  assert.equal(planJourney("jb-sentral", "ksl")[0].transfers, 0);
});
test("ETA does not invent live arrivals or unrelated stops", () => {
  const vehicle = simulateVehicles("johor", 10000)[0];
  assert.ok(etaForVehicle(vehicle, routes[0].stops[0])! > 0);
  assert.equal(
    etaForVehicle({ ...vehicle, source: "gtfs-rt" }, "jb-sentral"),
    null,
  );
  assert.equal(etaForVehicle(vehicle, "uthm-gate"), null);
});
