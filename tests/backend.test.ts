import assert from "node:assert/strict";
import { test, after } from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { normalizeFeed } from "../src/lib/server/vehicles";
import { parseStaticGtfs } from "../src/lib/server/gtfs-static";
import { createSession, verifySession } from "../src/lib/server/auth";
import { allowRate, requireSameOrigin } from "../src/lib/server/http";
import { reportSchema, canTransition } from "../src/lib/server/reports";
import {
  GET as listReports,
  POST as postReport,
} from "../src/app/api/reports/route";
import { PATCH as patchReport } from "../src/app/api/reports/[id]/route";
import { POST as login } from "../src/app/api/session/route";
import {
  GET as sessionInfo,
  DELETE as logout,
} from "../src/app/api/session/route";
import { GET as eventStream } from "../src/app/api/events/route";
import { readResponseBytes } from "../src/lib/server/upstream";

const origin = "http://localhost:3000";
let testDataDirectory: string;
after(async () => {
  if (
    testDataDirectory &&
    path
      .resolve(testDataDirectory)
      .startsWith(path.resolve(process.cwd(), ".runtime") + path.sep)
  )
    await fs.rm(testDataDirectory, { recursive: true, force: true });
});

test("GTFS normalization preserves observation time, converts speed, discards invalid GPS and duplicates", () => {
  const now = 1_780_000_000_000;
  const vehicles = normalizeFeed(
    {
      header: { gtfsRealtimeVersion: "2.0", timestamp: now / 1000 },
      entity: [
        {
          id: "older",
          vehicle: {
            vehicle: { id: "JHR1" },
            trip: { routeId: "J10" },
            position: {
              latitude: 1.46,
              longitude: 103.76,
              speed: 10,
              bearing: -10,
            },
            timestamp: now / 1000 - 20,
          },
        },
        {
          id: "latest",
          vehicle: {
            vehicle: { id: "JHR1", label: "Bus 10" },
            trip: { routeId: "J10" },
            position: {
              latitude: 1.47,
              longitude: 103.76,
              speed: 10,
              bearing: 90,
            },
            timestamp: now / 1000 - 5,
          },
        },
        {
          id: "bad",
          vehicle: { position: { latitude: 999, longitude: 103.76 } },
        },
        {
          id: "deleted",
          isDeleted: true,
          vehicle: { position: { latitude: 1.46, longitude: 103.76 } },
        },
        {
          id: "future",
          vehicle: {
            position: { latitude: 1.46, longitude: 103.76 },
            timestamp: now / 1000 + 3600,
          },
        },
      ],
    },
    "johor",
    now,
  );
  assert.equal(vehicles.length, 1);
  assert.equal(vehicles[0].speed, 36);
  assert.equal(vehicles[0].timestamp, now - 5000);
  assert.equal(vehicles[0].occupancy, "unknown");
  assert.equal(vehicles[0].source, "gtfs-rt");
  assert.equal(vehicles[0].label, "Bus 10");
});

test("GTFS static import joins official route, shape, stops and timetable duration", () => {
  const zip = zipSync({
    "agency.txt": strToU8("agency_id,agency_name\na1,BAS.MY Johor\n"),
    "routes.txt": strToU8(
      "route_id,agency_id,route_short_name,route_long_name,route_color\nr1,a1,J10,Sentral to Larkin,66AAFF\n",
    ),
    "stops.txt": strToU8(
      "stop_id,stop_name,stop_lon,stop_lat,wheelchair_boarding\ns1,JB Sentral,103.763,1.462,1\ns2,Larkin,103.743,1.493,0\n",
    ),
    "trips.txt": strToU8(
      "route_id,service_id,trip_id,shape_id,trip_headsign\nr1,wk,t1,shape1,Larkin Sentral\n",
    ),
    "stop_times.txt": strToU8(
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,25:00:00,25:00:00,s1,1\nt1,25:30:00,25:30:00,s2,2\n",
    ),
    "shapes.txt": strToU8(
      "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,1.462,103.763,1\nshape1,1.493,103.743,2\n",
    ),
  });
  const network = parseStaticGtfs(zip, "fixture");
  assert.equal(network.source, "official");
  assert.equal(network.routes[0].duration, 30);
  assert.deepEqual(network.routes[0].stops, ["s1", "s2"]);
  assert.equal(network.routes[0].color, "#66AAFF");
  assert.equal(network.stops[0].accessible, true);
  assert.equal(network.stops[1].accessible, false);
  assert.throws(
    () =>
      parseStaticGtfs(
        zipSync({ "routes.txt": strToU8("route_id\nr1") }),
        "fixture",
      ),
    /missing stops/,
  );
});

test("protobuf omitted occupancy remains unknown instead of defaulting to an empty bus", () => {
  const now = Date.now();
  const bytes = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: "2.0", timestamp: Math.floor(now / 1000) },
    entity: [
      {
        id: "unknown",
        vehicle: { position: { latitude: 1.46, longitude: 103.76 } },
      },
      {
        id: "empty",
        vehicle: {
          position: { latitude: 1.46, longitude: 103.76 },
          occupancyStatus: 0,
        },
      },
    ],
  }).finish();
  const vehicles = normalizeFeed(
    GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes),
    "johor",
    now,
  );
  assert.equal(vehicles.find((v) => v.id === "unknown")?.occupancy, "unknown");
  assert.equal(vehicles.find((v) => v.id === "empty")?.occupancy, "low");
});

test("upstream downloads enforce both declared and streamed byte bounds", async () => {
  assert.equal(
    (await readResponseBytes(new Response("valid"), 5)).byteLength,
    5,
  );
  await assert.rejects(
    readResponseBytes(
      new Response("large", { headers: { "content-length": "100" } }),
      10,
    ),
    /exceeds/,
  );
  await assert.rejects(
    readResponseBytes(new Response("undeclared oversized response"), 10),
    /exceeds/,
  );
  await assert.rejects(readResponseBytes(new Response(null), 10), /no body/);
});

test("operator session rejects tampering, expiration and disabled demo mode", () => {
  process.env.ALLOW_DEMO_OPERATOR = "true";
  process.env.AUTH_SECRET =
    "test-only-32-character-secret-key-please-do-not-deploy";
  const now = Date.now();
  const token = createSession("demo", now);
  assert.equal(verifySession(token, now)?.role, "operator");
  assert.equal(verifySession(token + "tamper", now), null);
  assert.equal(verifySession(token, now + 9 * 3600_000), null);
  process.env.ALLOW_DEMO_OPERATOR = "false";
  assert.equal(verifySession(token, now), null);
  process.env.ALLOW_DEMO_OPERATOR = "true";
});

test("origin protection and fixed window limiter reject cross-site writes and excessive traffic", () => {
  assert.throws(
    () =>
      requireSameOrigin(
        new Request(`${origin}/api/reports`, {
          method: "POST",
          headers: { origin: "https://attacker.invalid" },
        }),
      ),
    /Cross-origin/,
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request(`${origin}/api/reports`, {
          method: "POST",
          headers: { cookie: "gerak_operator=test" },
        }),
      ),
    /Origin header/,
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request(`${origin}/api/reports`, {
        method: "POST",
        headers: { origin },
      }),
    ),
  );
  const key = `test-${Date.now()}`;
  assert.equal(allowRate(key, 2, 1000, 100), true);
  assert.equal(allowRate(key, 2, 1000, 100), true);
  assert.equal(allowRate(key, 2, 1000, 100), false);
  assert.equal(allowRate(key, 2, 1000, 1101), true);
});

test("report schema rejects unsafe images, out-of-region locations and invalid lifecycle transitions", () => {
  const report = {
    category: "flooding",
    title: "Flood near shelter",
    description: "Water is blocking access to the shelter.",
    coordinate: [103.76, 1.46],
    location: "JB Sentral",
  };
  assert.equal(reportSchema.safeParse(report).success, true);
  assert.equal(
    reportSchema.safeParse({
      ...report,
      image: "data:image/svg+xml;base64,PHN2Zz4=",
    }).success,
    false,
  );
  assert.equal(
    reportSchema.safeParse({ ...report, coordinate: [0, 0] }).success,
    false,
  );
  assert.equal(
    reportSchema.safeParse({ ...report, status: "resolved" }).success,
    false,
  );
  assert.equal(canTransition("submitted", "resolved"), false);
  assert.equal(canTransition("submitted", "acknowledged"), true);
});

test("API workflow persists a civic report and requires a signed operator session to change status", async () => {
  await fs.mkdir(path.join(process.cwd(), ".runtime"), { recursive: true });
  testDataDirectory = await fs.mkdtemp(
    path.join(process.cwd(), ".runtime", "backend-test-"),
  );
  process.env.GERAK_DATA_DIR = testDataDirectory;
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const input = {
      category: "accessibility",
      title: "Ramp is obstructed",
      description: "The wheelchair ramp is blocked by a loose barrier.",
      coordinate: [103.763, 1.462],
      location: "JB Sentral",
    };
    const created = await postReport(
      new Request(`${origin}/api/reports`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    assert.equal(created.status, 201);
    const { report } = await created.json();
    const read = await listReports(new Request(`${origin}/api/reports`));
    assert.ok(
      (await read.json()).reports.some(
        (r: { id: string }) => r.id === report.id,
      ),
    );
    const updateRequest = (cookie?: string) =>
      new Request(`${origin}/api/reports/${report.id}`, {
        method: "PATCH",
        headers: {
          origin,
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ status: "acknowledged" }),
      });
    assert.equal(
      (
        await patchReport(updateRequest(), {
          params: Promise.resolve({ id: report.id }),
        })
      ).status,
      401,
    );
    const session = await login(
      new Request(`${origin}/api/session`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ demo: true }),
      }),
    );
    assert.equal(session.status, 200);
    const cookie = session.headers.get("set-cookie")!.split(";")[0];
    assert.ok(session.headers.get("set-cookie")!.includes("HttpOnly"));
    const updated = await patchReport(updateRequest(cookie), {
      params: Promise.resolve({ id: report.id }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).report.status, "acknowledged");
    const state = await sessionInfo(
      new Request(`${origin}/api/session`, { headers: { cookie } }),
    );
    assert.equal((await state.json()).authenticated, true);
    const updateStatus = (status: string) =>
      patchReport(
        new Request(`${origin}/api/reports/${report.id}`, {
          method: "PATCH",
          headers: { origin, "content-type": "application/json", cookie },
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: report.id }) },
      );
    assert.equal((await updateStatus("submitted")).status, 409);
    assert.equal((await updateStatus("in-progress")).status, 200);
    assert.equal((await updateStatus("resolved")).status, 200);
    assert.equal((await updateStatus("acknowledged")).status, 200);
    const saved = JSON.parse(
      await fs.readFile(path.join(testDataDirectory, "reports.json"), "utf8"),
    );
    assert.equal(
      saved.find((r: { id: string }) => r.id === report.id).status,
      "acknowledged",
    );
    const cleared = await logout(
      new Request(`${origin}/api/session`, {
        method: "DELETE",
        headers: { origin, cookie },
      }),
    );
    assert.equal(cleared.status, 200);
    assert.ok(cleared.headers.get("set-cookie")!.includes("Max-Age=0"));
  } finally {
    if (previousDatabase) process.env.DATABASE_URL = previousDatabase;
    else delete process.env.DATABASE_URL;
    delete process.env.GERAK_DATA_DIR;
  }
});

test("SSE publishes vehicles and initial civic state and closes on cancellation", async () => {
  const abort = new AbortController();
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const response = await eventStream(
    new Request(`${origin}/api/events?region=uthm&mode=demo`, {
      signal: abort.signal,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let received = "";
  try {
    for (let i = 0; i < 4 && !received.includes("event: reports"); i++) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += decoder.decode(chunk.value);
    }
    assert.match(received, /retry: 3000/);
    assert.match(received, /event: vehicles/);
    assert.match(received, /"source":"simulator"/);
    assert.match(received, /event: reports/);
  } finally {
    abort.abort();
    await reader.cancel();
    reader.releaseLock();
    if (previousDatabase) process.env.DATABASE_URL = previousDatabase;
  }
});
