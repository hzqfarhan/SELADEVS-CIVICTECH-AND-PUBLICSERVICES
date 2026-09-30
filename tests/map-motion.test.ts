import test from "node:test";
import assert from "node:assert/strict";
import {
  createProjection,
  positionOnPath,
  sampleMotion,
  updateMotions,
  type VehicleMotion,
} from "../src/components/map-motion";
import type { Coordinate, TransitRoute, Vehicle } from "../src/lib/types";

const path: Coordinate[] = [
  [103, 1],
  [103.01, 1],
  [103.01, 1.01],
  [103, 1.01],
  [103, 1],
];
const route: TransitRoute = {
  id: "T1",
  name: "Test loop",
  destination: "Test",
  color: "#aaff66",
  stops: [],
  path,
  duration: 10,
  region: "johor",
  operator: "Test",
  source: "demo",
};
const vehicle = (progress: number, timestamp: number): Vehicle => ({
  id: "bus-1",
  label: "Bus 1",
  routeId: route.id,
  ...positionOnPath(path, progress),
  progress,
  timestamp,
  speed: 12,
  occupancy: "low",
  accessible: true,
  delay: 0,
  source: "simulator",
  region: "johor",
});
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);

test("motion follows route corners instead of cutting through buildings", () => {
  const motions = new Map<string, VehicleMotion>();
  updateMotions(motions, [vehicle(0.1, 1000)], [route], 0);
  updateMotions(motions, [vehicle(0.4, 4000)], [route], 3000);
  const mid = sampleMotion(motions.get("bus-1")!, 4500);
  const expected = positionOnPath(path, 0.25);
  close(mid.coordinate[0], expected.coordinate[0]);
  close(mid.coordinate[1], expected.coordinate[1]);
});

test("loop crossing stays forward and clamps at latest observation when updates stop", () => {
  const motions = new Map<string, VehicleMotion>();
  updateMotions(motions, [vehicle(0.98, 1000)], [route], 0);
  updateMotions(motions, [vehicle(0.02, 3000)], [route], 2000);
  const mid = sampleMotion(motions.get("bus-1")!, 3000);
  close(mid.coordinate[0], path[0][0]);
  close(mid.coordinate[1], path[0][1]);
  close(sampleMotion(motions.get("bus-1")!, 100000).progress!, 0.02);
});

test("long gaps do not reverse a forward-running simulator bus", () => {
  const motions = new Map<string, VehicleMotion>();
  updateMotions(motions, [vehicle(0.1, 1000)], [route], 0);
  updateMotions(motions, [vehicle(0.8, 10000)], [route], 9000);
  close(sampleMotion(motions.get("bus-1")!, 12000).progress!, 0.45);
});

test("a new GPS target starts at the displayed position and ignores stale responses", () => {
  const motions = new Map<string, VehicleMotion>();
  const first = {
    ...vehicle(0.1, 1000),
    source: "gtfs-rt" as const,
    coordinate: [103, 1] as Coordinate,
    bearing: 350,
  };
  updateMotions(motions, [first], [route], 0);
  updateMotions(
    motions,
    [{ ...first, timestamp: 3000, coordinate: [104, 2], bearing: 10 }],
    [route],
    2000,
  );
  const halfway = sampleMotion(motions.get("bus-1")!, 3000);
  close(halfway.coordinate[0], 103.5);
  close(halfway.coordinate[1], 1.5);
  close(halfway.bearing, 360);
  updateMotions(
    motions,
    [{ ...first, timestamp: 4000, coordinate: [104.5, 2.5] }],
    [route],
    3000,
  );
  assert.deepEqual(
    sampleMotion(motions.get("bus-1")!, 3000).coordinate,
    halfway.coordinate,
  );
  updateMotions(motions, [first], [route], 3200);
  assert.equal(motions.get("bus-1")!.timestamp, 4000);
  assert.equal(
    motions.get("bus-1")!.route,
    undefined,
    "official GPS is never snapped to demo routes",
  );
});

test("unchanged observations do not reset interpolation; removed vehicles are cleaned up", () => {
  const motions = new Map<string, VehicleMotion>();
  const observation = vehicle(0.3, 1000);
  updateMotions(motions, [observation], [route], 0);
  const original = motions.get("bus-1");
  updateMotions(motions, [observation], [route], 500);
  assert.equal(motions.get("bus-1"), original);
  updateMotions(motions, [], [route], 1000);
  assert.equal(motions.size, 0);
});

test("projection preserves coordinates in both directions and places north upwards", () => {
  const projection = createProjection([route], "johor");
  const coordinate: Coordinate = [103.004, 1.007];
  const restored = projection.unproject(projection.project(coordinate));
  close(restored[0], coordinate[0]);
  close(restored[1], coordinate[1]);
  assert.ok(
    projection.project([103, 1.01])[1] < projection.project([103, 1])[1],
  );
  assert.ok(Number.isFinite(createProjection([], "uthm").width));
});

test("degenerate shape points do not create NaN positions or incorrect initial headings", () => {
  assert.deepEqual(positionOnPath([], 0.5), { coordinate: [0, 0], bearing: 0 });
  assert.deepEqual(
    positionOnPath(
      [
        [103, 1],
        [103, 1],
      ],
      0.5,
    ),
    { coordinate: [103, 1], bearing: 0 },
  );
  close(
    positionOnPath(
      [
        [103, 1],
        [103, 1],
        [103.01, 1],
      ],
      0,
    ).bearing,
    90,
  );
});

test("expanded 3D geography spreads objects without changing GPS coordinates or 2D bounds", () => {
  const flat = createProjection([route], "johor");
  const city = createProjection([route], "johor", 260);
  assert.deepEqual(city.bounds, flat.bounds);
  const a = flat.project(path[0]),
    b = flat.project(path[1]);
  const c = city.project(path[0]),
    d = city.project(path[1]);
  assert.ok(
    Math.hypot(c[0] - d[0], c[1] - d[1]) >
      3 * Math.hypot(a[0] - b[0], a[1] - b[1]),
  );
  const gps = city.unproject(c);
  assert.ok(Math.abs(gps[0] - path[0][0]) < 1e-9);
  assert.ok(Math.abs(gps[1] - path[0][1]) < 1e-9);
});

test("official prediction follows corners, reconciles continuously and stops after a bounded outage", () => {
  const officialRoute = { ...route, source: "official" as const };
  const motions = new Map<string, VehicleMotion>();
  const initial = {
    ...vehicle(0.245, 100000),
    source: "gtfs-rt" as const,
    speed: 36,
    bearingKnown: true,
  };
  updateMotions(motions, [initial], [officialRoute], 0, 100000);
  const predicted = sampleMotion(motions.get("bus-1")!, 35000);
  assert.ok(
    predicted.coordinate[1] > initial.coordinate[1],
    "turns north along the route",
  );
  close(predicted.coordinate[0], 103.01);
  assert.equal("estimated" in predicted && predicted.estimated, true);
  const next = { ...initial, ...positionOnPath(path, 0.3), timestamp: 135000 };
  updateMotions(motions, [next], [officialRoute], 35000, 135000);
  const reconciled = sampleMotion(motions.get("bus-1")!, 35000);
  close(reconciled.coordinate[0], predicted.coordinate[0]);
  close(reconciled.coordinate[1], predicted.coordinate[1]);
  const paused = sampleMotion(motions.get("bus-1")!, 215000);
  assert.deepEqual(
    sampleMotion(motions.get("bus-1")!, 600000).coordinate,
    paused.coordinate,
  );
  assert.equal("predictionPaused" in paused && paused.predictionPaused, true);
  assert.equal(
    motions.get("bus-1")!.timestamp,
    135000,
    "estimated positions do not change the GPS timestamp",
  );
});

test("prediction honours zero speed, route ends, reverse direction and off-route observations", () => {
  const straight = {
    ...route,
    source: "official" as const,
    path: [
      [103, 1],
      [103.001, 1],
    ] as Coordinate[],
  };
  const base = {
    ...vehicle(0, 100000),
    source: "gtfs-rt" as const,
    coordinate: [103.0005, 1] as Coordinate,
    bearing: 90,
    speed: 36,
  };
  const motions = new Map<string, VehicleMotion>();
  updateMotions(motions, [{ ...base, speed: 0 }], [straight], 0, 100000);
  close(
    sampleMotion(motions.get(base.id)!, 90000).coordinate[0],
    base.coordinate[0],
  );
  motions.clear();
  updateMotions(motions, [base], [straight], 0, 100000);
  close(sampleMotion(motions.get(base.id)!, 90000).coordinate[0], 103.001);
  motions.clear();
  updateMotions(motions, [{ ...base, bearing: 270 }], [straight], 0, 100000);
  close(sampleMotion(motions.get(base.id)!, 90000).coordinate[0], 103);
  motions.clear();
  updateMotions(
    motions,
    [{ ...base, coordinate: [104, 2] }],
    [straight],
    0,
    100000,
  );
  assert.equal(motions.get(base.id)!.prediction, undefined);
});
