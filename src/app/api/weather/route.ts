import { z } from "zod";
import { serviceFor } from "@/lib/feeds";
import { apiError, limitRequest, regionSchema } from "@/lib/server/http";
import { readResponseBytes } from "@/lib/server/upstream";
import type { CurrentWeather } from "@/lib/weather";
export const runtime = "nodejs";
const cache = new Map<
  string,
  {
    data?: CurrentWeather;
    retryAt: number;
    failed?: boolean;
    pending?: Promise<CurrentWeather>;
  }
>();
const schema = z.object({
  current: z.object({
    time: z.number(),
    temperature_2m: z.number().min(-60).max(65),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number().min(0).max(100),
    precipitation: z.number().nonnegative(),
    wind_speed_10m: z.number().nonnegative(),
    weather_code: z.number().int().min(0).max(99),
    is_day: z.union([z.literal(0), z.literal(1)]),
  }),
});
export async function GET(request: Request) {
  try {
    limitRequest(request, "weather", 60);
    const region = regionSchema.parse(
      new URL(request.url).searchParams.get("region") || "johor",
    );
    const service = serviceFor(region);
    let entry = cache.get(region);
    if (!entry) {
      entry = { retryAt: 0 };
      cache.set(region, entry);
    }
    if (!entry.pending && Date.now() >= entry.retryAt) {
      entry.retryAt = Date.now() + 60000;
      const target = entry;
      entry.pending = (async () => {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({
          latitude: String(service.center[1]),
          longitude: String(service.center[0]),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,is_day,wind_speed_10m",
          timeformat: "unixtime",
          timezone: "Asia/Kuala_Lumpur",
        }).toString();
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Weather provider unavailable");
        const parsed = schema.parse(
          JSON.parse(
            new TextDecoder().decode(await readResponseBytes(response, 64000)),
          ),
        ).current;
        const data: CurrentWeather = {
          region,
          location: service.name,
          temperature: parsed.temperature_2m,
          feelsLike: parsed.apparent_temperature,
          humidity: parsed.relative_humidity_2m,
          precipitation: parsed.precipitation,
          wind: parsed.wind_speed_10m,
          code: parsed.weather_code,
          isDay: parsed.is_day === 1,
          observedAt: parsed.time * 1000,
          fetchedAt: Date.now(),
          stale: false,
        };
        target.data = data;
        target.failed = false;
        target.retryAt = Date.now() + 15 * 60000;
        return data;
      })().finally(() => {
        target.pending = undefined;
      });
    }
    let failed = false;
    if (entry.pending) {
      try {
        await entry.pending;
      } catch {
        failed = true;
        entry.failed = true;
      }
    }
    if (!entry.data)
      return Response.json(
        { message: "Weather temporarily unavailable" },
        { status: 503 },
      );
    return Response.json(
      {
        ...entry.data,
        stale:
          failed ||
          Date.now() - entry.data.fetchedAt > 20 * 60000 ||
          Date.now() - entry.data.observedAt > 60 * 60000,
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
