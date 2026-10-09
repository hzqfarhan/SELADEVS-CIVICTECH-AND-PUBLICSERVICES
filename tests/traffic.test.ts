import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCameras,
  normalizeSignals,
  cameraFresh,
} from "../src/lib/traffic";
import { getTrafficCameras } from "../src/lib/server/traffic";
const row = {
  camera_id: "2701",
  timestamp: "2026-10-08T17:05:25+08:00",
  image: "https://images.data.gov.sg/api/traffic-images/test.jpg",
  location: { latitude: 1.447, longitude: 103.771 },
};
const feed = (camera = row) => ({ items: [{ cameras: [camera] }] });
test("camera normalization preserves provider time and limits coverage to border area", () => {
  const result = normalizeCameras({
    items: [
      {
        cameras: [
          row,
          {
            ...row,
            camera_id: "south",
            location: { latitude: 1.25, longitude: 103.82 },
          },
        ],
      },
    ],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "lta:2701");
  assert.deepEqual(result[0].coordinate, [103.771, 1.447]);
  assert.equal(result[0].observedAt, row.timestamp);
});
test("untrusted media hosts, malformed timestamps and coordinates are rejected", () => {
  for (const image of [
    "http://images.data.gov.sg/a",
    "https://evil.example/a",
    "https://images.data.gov.sg.evil.example/a",
    "https://x@images.data.gov.sg/a",
  ])
    assert.throws(() => normalizeCameras(feed({ ...row, image })));
  assert.throws(() =>
    normalizeCameras(feed({ ...row, timestamp: "not-a-date" })),
  );
  assert.throws(() =>
    normalizeCameras(
      feed({ ...row, location: { latitude: 99, longitude: 103 } }),
    ),
  );
});
test("freshness uses captured time, not successful fetch time; future dates rejected", () => {
  const now = Date.parse(row.timestamp);
  assert.equal(cameraFresh(row.timestamp, now + 299999), true);
  assert.equal(cameraFresh(row.timestamp, now + 300000), false);
  assert.equal(cameraFresh(row.timestamp, now - 120000), false);
  assert.equal(cameraFresh("invalid", now), false);
});
test("signal inventory preserves real node IDs with no simulated phase", () => {
  const signals = normalizeSignals({
    elements: [
      {
        type: "node",
        id: 12,
        lat: 1.5,
        lon: 103.7,
        tags: { highway: "traffic_signals" },
      },
      {
        type: "node",
        id: 13,
        lat: 1.5,
        lon: 103.7,
        tags: { highway: "bus_stop" },
      },
    ],
  });
  assert.equal(signals.length, 1);
  assert.equal(signals[0].id, "osm:node:12");
  assert.equal("phase" in signals[0], false);
  assert.throws(() =>
    normalizeSignals({
      elements: [{ type: "node", id: 1, lat: 20, lon: 103.7 }],
    }),
  );
});
test("camera refresh coalesces concurrent requests and caches metadata", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json(feed());
  };
  try {
    const [a, b] = await Promise.all([
      getTrafficCameras(),
      getTrafficCameras(),
    ]);
    assert.equal(calls, 1);
    assert.equal(a.available, true);
    assert.deepEqual(a, b);
    await getTrafficCameras();
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
