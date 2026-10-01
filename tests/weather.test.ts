import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/weather/route";
import { weatherDescription } from "../src/lib/weather";
test("weather caches validated current conditions by region and rejects unsupported places", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      current: {
        time: Math.floor(Date.now() / 1000),
        temperature_2m: 29,
        apparent_temperature: 33,
        relative_humidity_2m: 75,
        precipitation: 0.2,
        wind_speed_10m: 8,
        weather_code: 61,
        is_day: 1,
      },
    });
  });
  const request = new Request("http://localhost/api/weather?region=johor");
  const first = await GET(request);
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.equal(body.temperature, 29);
  assert.equal(body.stale, false);
  assert.equal(weatherDescription(body.code), "Rain");
  await GET(request);
  assert.equal(calls, 1);
  assert.equal(
    (await GET(new Request("http://localhost/api/weather?region=invalid")))
      .status,
    400,
  );
});
test("weather never invents a reading when upstream is unavailable", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 503 }),
  );
  const response = await GET(
    new Request("http://localhost/api/weather?region=kuching"),
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).temperature, undefined);
});
