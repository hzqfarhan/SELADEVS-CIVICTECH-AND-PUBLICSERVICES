import test from "node:test";
import assert from "node:assert/strict";
import { getVehicles, normalizeFeed } from "../src/lib/server/vehicles";
import { planJourney } from "../src/lib/transit";
import type { Stop, TransitRoute } from "../src/lib/types";
test("live requests never silently replace unavailable GPS with simulator data", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  try {
    const snapshot = await getVehicles("johor", "live");
    assert.equal(snapshot.source, "gtfs-rt");
    assert.equal(snapshot.vehicles.length, 0);
    assert.equal(snapshot.stale, true);
    assert.equal((await getVehicles("johor")).source, "gtfs-rt");
  } finally {
    globalThis.fetch = previous;
  }
});
test("UTHM has no invented real feed; simulation requires an explicit demo request", async () => {
  assert.equal((await getVehicles("uthm", "live")).vehicles.length, 0);
  assert.equal((await getVehicles("uthm-pagoh", "live")).vehicles.length, 0);
  const demoParitRaja = await getVehicles("uthm", "demo");
  assert.equal(demoParitRaja.source, "simulator");
  assert.ok(demoParitRaja.vehicles.length > 0);
  const demoPagoh = await getVehicles("uthm-pagoh", "demo");
  assert.equal(demoPagoh.source, "simulator");
  assert.ok(demoPagoh.vehicles.length > 0);
});
test("missing GPS speed and bearing remain marked unknown", () => {
  const now = Date.now();
  const [v] = normalizeFeed(
    {
      header: { gtfsRealtimeVersion: "2.0", timestamp: Math.floor(now / 1000) },
      entity: [
        {
          id: "bus",
          vehicle: { position: { latitude: 1.5, longitude: 103.7 } },
        },
      ],
    },
    "johor",
    now,
  );
  assert.equal(v.speedKnown, false);
  assert.equal(v.bearingKnown, false);
  assert.equal(v.occupancy, "unknown");
  assert.equal(v.direction, undefined);
});
test("published direction survives presence checking, including direction zero", () => {
  const now = Date.now();
  const entity = (directionId: number) => ({
    id: "bus",
    vehicle: {
      trip: { routeId: "J30", tripId: "t1", directionId },
      position: { latitude: 1.5, longitude: 103.7 },
      timestamp: Math.floor(now / 1000),
    },
  });
  const header = {
    gtfsRealtimeVersion: "2.0",
    timestamp: Math.floor(now / 1000),
  };
  const [outbound] = normalizeFeed(
    { header, entity: [entity(0)] },
    "johor",
    now,
  );
  const [inbound] = normalizeFeed(
    { header, entity: [entity(1)] },
    "johor",
    now,
  );
  assert.equal(outbound.direction, "0");
  assert.equal(inbound.direction, "1");
});
test("official connection planner respects stop direction and never wraps as a demo loop", () => {
  const stops: Stop[] = ["a", "b", "c"].map((id, i) => ({
    id,
    name: id,
    coordinate: [103 + i * 0.01, 1.5],
    region: "johor",
    accessible: true,
  }));
  const route: TransitRoute = {
    id: "official",
    name: "Real fixture",
    destination: "c",
    color: "#fff",
    operator: "test",
    region: "johor",
    source: "official",
    duration: 20,
    stops: ["a", "b", "c"],
    path: stops.map((s) => s.coordinate),
  };
  assert.equal(planJourney("a", "c", false, [route], stops)[0].minutes, 20);
  assert.equal(planJourney("c", "a", false, [route], stops).length, 0);
  assert.equal(
    planJourney("a", "c", false, [{ ...route, duration: 0 }], stops)[0].minutes,
    0,
  );
});
