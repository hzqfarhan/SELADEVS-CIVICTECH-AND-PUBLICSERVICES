"use client";
import { useEffect, useState } from "react";
import type { Region } from "@/lib/types";
import { weatherDescription, type CurrentWeather } from "@/lib/weather";
export function MapWeather({
  region,
  onWeather,
}: {
  region: Region;
  onWeather?: (weather: CurrentWeather | null) => void;
}) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setWeather(null);
    onWeather?.(null);
    setFailed(false);
    const refresh = async () => {
      try {
        const response = await fetch(
          `/api/weather?region=${encodeURIComponent(region)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Unavailable");
        const data: CurrentWeather = await response.json();
        if (!controller.signal.aborted) {
          setWeather(data);
          onWeather?.(data);
          setFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          onWeather?.(null);
        }
      }
    };
    void refresh();
    const timer = setInterval(refresh, 15 * 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [region, onWeather]);
  return (
    <details className="gerak-weather">
      <summary>
        {weather
          ? `${weather.code >= 51 ? "☂" : weather.isDay ? "☀" : "☾"} ${Math.round(weather.temperature)}°C · ${weatherDescription(weather.code)}${weather.stale || failed ? " · stale" : ""}`
          : failed
            ? "Weather unavailable"
            : "Loading local weather…"}
      </summary>
      {weather && (
        <div>
          <strong>{weather.location} · area centre</strong>
          <p>
            Feels like {Math.round(weather.feelsLike)}°C · humidity{" "}
            {weather.humidity}%<br />
            Wind {weather.wind} km/h · precipitation {weather.precipitation} mm
          </p>
          <p>
            Model time:{" "}
            {new Date(weather.observedAt).toLocaleTimeString("en-MY", {
              timeZone: "Asia/Kuala_Lumpur",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            MYT
          </p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          · modelled current conditions
        </div>
      )}
      {!weather && (
        <div>
          Current weather for the selected service area. No simulated weather is
          shown.
        </div>
      )}
    </details>
  );
}
