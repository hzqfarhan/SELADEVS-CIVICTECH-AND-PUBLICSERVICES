import test from "node:test";
import assert from "node:assert/strict";
import { searchStops, journeyInputIssue } from "../src/lib/stop-search";
import type { Stop } from "../src/lib/types";
const stops: Stop[] = [
  {
    id: "jb:2",
    name: "Opp JB Sentral",
    region: "johor",
    coordinate: [103, 1],
    accessible: false,
  },
  {
    id: "jb:1",
    name: "JB Sentral",
    region: "johor",
    coordinate: [103, 1],
    accessible: true,
  },
  {
    id: "jb:3",
    name: "Café terminal",
    region: "johor",
    coordinate: [103, 1],
    accessible: false,
  },
];
test("stop search handles tokens, accents and IDs without mutating source order", () => {
  assert.deepEqual(
    searchStops(stops, "  JB sentral ").map((s) => s.id),
    ["jb:1", "jb:2"],
  );
  assert.equal(searchStops(stops, "terminal cafe")[0].id, "jb:3");
  assert.equal(searchStops(stops, "jb:2")[0].id, "jb:2");
  assert.equal(stops[0].id, "jb:2");
  assert.equal(searchStops(stops, "Singapore").length, 0);
  assert.equal(searchStops(stops, "", 1).length, 1);
});
test("journey inputs reject unselected text, removed stops and identical endpoints", () => {
  assert.equal(journeyInputIssue(stops, "", "jb:1"), "missing");
  assert.equal(journeyInputIssue(stops, "old-id", "jb:1"), "missing");
  assert.equal(journeyInputIssue(stops, "jb:1", "jb:1"), "same");
  assert.equal(journeyInputIssue(stops, "jb:1", "jb:2"), null);
});
