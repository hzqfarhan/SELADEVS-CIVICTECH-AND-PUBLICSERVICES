import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import Gtfs from "gtfs-realtime-bindings";
import { SERVICES, serviceFor } from "../src/lib/feeds";
import {
  getNetwork,
  namespaceNetwork,
  resolveTripRoute,
} from "../src/lib/server/network";
import { getVehicles } from "../src/lib/server/vehicles";
import { parseStaticGtfs } from "../src/lib/server/gtfs-static";

test("all documented services are registered and unstable rail realtime is not invented", () => {
  assert.equal(SERVICES.filter((s) => s.operator === "BAS.MY").length, 9);
  assert.equal(serviceFor("seremban").endpoints.length, 2);
  assert.equal(
    SERVICES.filter(
      (s) => s.operator === "Prasarana" && s.endpoints[0].realtimeUrl,
    ).length,
    4,
  );
  assert.equal(serviceFor("rapid-rail").endpoints[0].realtimeUrl, undefined);
});

test("Seremban merges both operators without ID collisions; Prasarana trip suffix matching is unambiguous", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gerak-feeds-"));
  const previousDir = process.env.GERAK_DATA_DIR,
    previousFetch = globalThis.fetch;
  process.env.GERAK_DATA_DIR = directory;
  const files = {
    "agency.txt": "agency_id,agency_name\na,Operator\n",
    "stops.txt":
      "stop_id,stop_name,stop_lat,stop_lon\ns1,First,2.72,101.93\ns2,Second,2.73,101.94\n",
    "routes.txt": "route_id,route_short_name,route_type\nr1,One,3\n",
    "trips.txt": "route_id,service_id,trip_id\nr1,weekday,weekday_trip-1\n",
    "stop_times.txt":
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nweekday_trip-1,08:00:00,08:00:00,s1,1\nweekday_trip-1,08:10:00,08:10:00,s2,2\n",
  };
  const zip = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([key, value]) => [key, strToU8(value)]),
    ),
  );
  const requests: string[] = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes("gtfs-static"))
      return new Response(new Uint8Array(zip).buffer);
    const message = Gtfs.transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: "2.0",
        timestamp: Math.floor(Date.now() / 1000),
      },
      entity: [
        {
          id: "same-id",
          vehicle: {
            vehicle: { id: "same-id" },
            trip: { routeId: "r1", tripId: "weekday_trip-1" },
            position: { latitude: 2.72, longitude: 101.93 },
          },
        },
      ],
    });
    return new Response(
      new Uint8Array(Gtfs.transit_realtime.FeedMessage.encode(message).finish())
        .buffer,
    );
  };
  try {
    const network = await getNetwork("seremban");
    assert.equal(network.routes.length, 2);
    assert.equal(new Set(network.stops.map((s) => s.id)).size, 4);
    assert.ok(network.routes.every((r) => r.region === "seremban"));
    const snapshot = await getVehicles("seremban");
    assert.equal(snapshot.vehicles.length, 2);
    assert.deepEqual(
      snapshot.vehicles.map((v) => v.id),
      ["seremban-a:same-id", "seremban-b:same-id"],
    );
    assert.ok(
      snapshot.vehicles.every((v) =>
        network.routes.some((r) => r.id === v.routeId),
      ),
    );
    await getVehicles("seremban");
    assert.equal(
      requests.length,
      4,
      "cached requests do not multiply upstream traffic",
    );
    const endpoint = serviceFor("rapid-penang").endpoints[0];
    await writeFile(
      path.join(directory, "network-rapid-penang.json"),
      JSON.stringify(
        namespaceNetwork(
          parseStaticGtfs(zip, endpoint.staticUrl, "rapid-penang"),
          endpoint,
          "rapid-penang",
        ),
      ),
    );
    await getNetwork("rapid-penang");
    assert.equal(
      resolveTripRoute("rapid-penang", "trip-1", "unavailable"),
      "rapid-penang:r1",
    );
    assert.equal(requests.length, 4);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousDir === undefined) delete process.env.GERAK_DATA_DIR;
    else process.env.GERAK_DATA_DIR = previousDir;
    await rm(directory, { recursive: true, force: true });
  }
});
