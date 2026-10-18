import type { Stop } from "./types";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Search only the loaded service's actual stops; never manufacture geocoded places. */
export function searchStops(
  stops: Stop[],
  query: string,
  limit = Infinity,
): Stop[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return stops
    .filter((stop) =>
      tokens.every((token) =>
        normalize(`${stop.name} ${stop.id}`).includes(token),
      ),
    )
    .sort((a, b) => {
      const prefix = normalize(query);
      return (
        Number(normalize(b.name).startsWith(prefix)) -
          Number(normalize(a.name).startsWith(prefix)) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
      );
    })
    .slice(0, Math.max(0, limit));
}

export function journeyInputIssue(stops: Stop[], from: string, to: string) {
  if (
    !stops.some((stop) => stop.id === from) ||
    !stops.some((stop) => stop.id === to)
  )
    return "missing";
  return from === to ? "same" : null;
}
