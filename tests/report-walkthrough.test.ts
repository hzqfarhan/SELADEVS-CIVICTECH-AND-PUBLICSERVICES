import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceWalkthrough,
  createWalkthrough,
  parseWalkthrough,
  stageLabels,
  submitWalkthrough,
  walkthroughScenarios,
} from "../src/lib/report-walkthrough";

test("recording walkthrough uses the same editable report across resident, operator and passenger views", () => {
  const draft = {
    ...createWalkthrough(),
    title: "  Pothole beside the crossing  ",
    photoAttached: true,
  };
  assert.throws(() => advanceWalkthrough(draft), /Submit/);
  const submitted = submitWalkthrough(draft, "2026-10-21T14:00:00.000Z");
  assert.equal(submitted.stage, 1);
  assert.equal(submitted.title, "Pothole beside the crossing");
  assert.throws(() => submitWalkthrough(submitted), /already/);
  let current = submitted;
  for (const stage of [2, 3, 4]) {
    current = advanceWalkthrough(current, "2026-10-21T14:01:00.000Z");
    assert.equal(current.stage, stage);
    assert.equal(current.reportId, submitted.reportId);
    assert.equal(current.photoAttached, true);
    assert.equal(current.view, "operator");
    const passenger = { ...current, view: "passenger" as const };
    assert.deepEqual(
      parseWalkthrough(JSON.parse(JSON.stringify(passenger))),
      passenger,
    );
  }
  assert.equal(stageLabels[current.stage], "Resolved");
  assert.equal(advanceWalkthrough(current), current);
  assert.equal(draft.stage, 0);
});

test("walkthrough reset replaces the report and restores every scenario to an editable draft", () => {
  const ids = new Set<string>();
  for (const scenario of walkthroughScenarios) {
    const state = createWalkthrough(scenario.id);
    ids.add(state.reportId);
    assert.equal(state.scenarioId, scenario.id);
    assert.equal(state.title, scenario.title);
    assert.equal(state.stage, 0);
    assert.equal(state.photoAttached, false);
    assert.equal(state.view, "resident");
    assert.equal(state.updatedAt, null);
  }
  assert.equal(ids.size, 4);
  assert.deepEqual(createWalkthrough("unknown"), createWalkthrough());
});

test("walkthrough rejects incomplete forms and recovers safely from invalid saved state", () => {
  const state = createWalkthrough();
  assert.throws(() => submitWalkthrough(state), /photo/);
  assert.throws(() => submitWalkthrough({ ...state, title: "x" }), /title/);
  assert.throws(
    () => submitWalkthrough({ ...state, description: "short" }),
    /description/,
  );
  assert.throws(
    () => submitWalkthrough({ ...state, location: "" }),
    /location/,
  );
  for (const invalid of [
    null,
    {},
    { ...state, stage: 8 },
    { ...state, scenarioId: "unknown" },
    { ...state, stage: 2, updatedAt: null },
    { ...state, reportId: "LIVE-1234" },
  ])
    assert.deepEqual(parseWalkthrough(invalid), createWalkthrough());
});
