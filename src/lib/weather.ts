export interface CurrentWeather {
  region: string;
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  wind: number;
  code: number;
  isDay: boolean;
  observedAt: number;
  fetchedAt: number;
  stale: boolean;
}
export function weatherDescription(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 95) return "Thunderstorms";
  if (code >= 80 && code <= 82) return "Rain showers";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 51 && code <= 57) return "Drizzle";
  return "Conditions unavailable";
}
