import test from "node:test";
import assert from "node:assert/strict";
import { planJourney } from "../src/lib/transit";
import { compareStopClosure } from "../src/lib/what-if";
import type { Stop, TransitRoute } from "../src/lib/types";

const stops: Stop[] = ["a", "b", "c", "d", "e"].map((id, index) => ({
  id,
  name: id,
  coordinate: [103 + index * 0.001, 1],
  accessible: true,
  region: "johor",
}));
function route(id: string, ids: string[]): TransitRoute {
  return {
    id,
    name: id,
    destination: ids.at(-1)!,
    color: "#123456",
    stops: ids,
    path: ids.map((id) => stops.find((s) => s.id === id)!.coordinate),
    duration: 20,
    region: "johor",
    operator: "test",
    source: "official",
  };
}
test("stop closure blocks endpoints but preserves through travel and source geometry", () => {
  const routes = [route("r", ["a", "b", "c"])];
  const original = JSON.stringify(routes);
  assert.equal(
    planJourney("a", "c", false, routes, stops, new Set(["a"])).length,
    0,
  );
  assert.equal(
    planJourney("a", "c", false, routes, stops, new Set(["c"])).length,
    0,
  );
  const baseline = planJourney("a", "c", false, routes, stops);
  const after = planJourney("a", "c", false, routes, stops, new Set(["b"]));
  assert.deepEqual(after, baseline);
  assert.equal(JSON.stringify(routes), original);
});
test("closing a transfer chooses the next valid transfer and can disconnect a journey", () => {
  const routes = [route("r1", ["a", "b", "c"]), route("r2", ["b", "c", "d"])];
  assert.deepEqual(planJourney("a", "d", false, routes, stops)[0].via, ["b"]);
  assert.deepEqual(
    planJourney("a", "d", false, routes, stops, new Set(["b"]))[0].via,
    ["c"],
  );
  assert.equal(
    planJourney("a", "d", false, routes, stops, new Set(["b", "c"])).length,
    0,
  );
});
test("closure comparison finds an open nearby boarding stop without suggesting the destination as boarding", () => {
  const routes = [route("r", ["a", "b", "c"])];
  const result = compareStopClosure("a", "c", "a", routes, stops);
  assert.equal(result.baseline.length, 1);
  assert.equal(result.after.length, 0);
  assert.deepEqual(
    result.alternatives.map((item) => item.stop.id),
    ["b"],
  );
  assert.equal(
    compareStopClosure("a", "c", "c", routes, stops).alternatives.length,
    0,
  );
  const inaccessible = stops.map((stop) => ({
    ...stop,
    accessible: stop.id !== "b",
  }));
  assert.equal(
    compareStopClosure("a", "c", "a", routes, inaccessible, true).alternatives
      .length,
    0,
  );
});
test("no hypothetical alternatives are suggested for an already disconnected baseline", () => {
  const result = compareStopClosure(
    "e",
    "c",
    "e",
    [route("r", ["a", "b", "c"])],
    stops,
  );
  assert.equal(result.baseline.length, 0);
  assert.equal(result.alternatives.length, 0);
});
