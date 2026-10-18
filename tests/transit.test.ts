import test from "node:test";
import assert from "node:assert/strict";
import {
  distance,
  positionOnPath,
  simulateVehicles,
  planJourney,
  reachableStops,
  etaForVehicle,
  routes,
  stops,
} from "../src/lib/transit";
import type { Stop, TransitRoute } from "../src/lib/types";
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
test("reachable stops are exactly the pairs planJourney can solve", () => {
  for (const accessible of [false, true])
    for (const from of stops) {
      const onward = reachableStops(from.id, routes, stops, accessible, true),
        backward = reachableStops(from.id, routes, stops, accessible, false);
      for (const to of stops) {
        const solvable =
          planJourney(from.id, to.id, accessible, routes, stops).length > 0;
        assert.equal(
          onward.has(to.id),
          solvable,
          `${from.id} -> ${to.id} forward accessible:${accessible}`,
        );
        assert.equal(
          backward.has(to.id),
          solvable,
          `${to.id} -> ${from.id} backward accessible:${accessible}`,
        );
      }
    }
});
test("reachable stops follow official direction, transfers and step-free ends", () => {
  const stop = (id: string, accessible = true): Stop => ({
    id,
    name: id,
    coordinate: [103, 1],
    accessible,
    region: "johor",
  });
  const route = (
    id: string,
    sequence: string[],
    source: TransitRoute["source"],
  ): TransitRoute => ({
    id,
    name: id,
    destination: id,
    color: "#000",
    stops: sequence,
    path: sequence.map(() => [103, 1] as [number, number]),
    duration: 20,
    region: "johor",
    operator: "test",
    source,
  });
  const network = [route("one", ["a", "b", "c"], "official")];
  const all = [stop("a"), stop("b"), stop("c"), stop("x")];
  // A published one-way corridor never promises the reverse trip.
  assert.deepEqual([...reachableStops("a", network, all)], ["b", "c"]);
  assert.deepEqual([...reachableStops("c", network, all)], []);
  assert.equal(reachableStops("missing", network, all).size, 0);
  assert.equal(reachableStops("x", network, all).size, 0);
  // Connecting journeys count, so the far end of a transfer must be offered.
  const withTransfer = [...network, route("two", ["c", "d"], "official")];
  assert.deepEqual(
    [...reachableStops("a", withTransfer, [...all, stop("d")])],
    ["b", "c", "d"],
  );
  // Step-free mode cannot advertise a stop the user cannot board or alight at.
  assert.deepEqual(
    [
      ...reachableStops(
        "a",
        network,
        [stop("a"), stop("b", false), stop("c")],
        true,
      ),
    ],
    ["c"],
  );
  assert.equal(
    reachableStops("b", network, [stop("a"), stop("b", false), stop("c")], true)
      .size,
    0,
  );
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
test("proximity calculations correctly identify closest stop and walking distance", () => {
  const userNearJb: [number, number] = [103.7635, 1.4627];
  const closest = stops.reduce((prev, curr) =>
    distance(userNearJb, curr.coordinate) <
    distance(userNearJb, prev.coordinate)
      ? curr
      : prev,
  );
  assert.equal(closest.id, "jb-sentral");
  assert.ok(distance(userNearJb, closest.coordinate) < 50);
});
