import { distance, planJourney } from "./transit";
import type { Stop, TransitRoute } from "./types";

/** A stop closure prevents boarding/alighting/transfer, not passage along a road. */
export function compareStopClosure(
  from: string,
  to: string,
  closed: string,
  routes: TransitRoute[],
  stops: Stop[],
  accessible = false,
) {
  const baseline = planJourney(from, to, accessible, routes, stops);
  const excluded = new Set([closed]);
  const after = planJourney(from, to, accessible, routes, stops, excluded);
  const origin = stops.find((stop) => stop.id === from);
  const alternatives =
    !after.length && baseline.length && origin && closed !== to
      ? stops
          .filter(
            (stop) =>
              stop.region === origin.region &&
              stop.id !== from &&
              stop.id !== to &&
              !excluded.has(stop.id),
          )
          .map((stop) => ({
            stop,
            metres: distance(origin.coordinate, stop.coordinate),
          }))
          .filter(({ metres }) => metres <= 1000)
          .sort((a, b) => a.metres - b.metres)
          .slice(0, 20)
          .map((candidate) => ({
            ...candidate,
            journeys: planJourney(
              candidate.stop.id,
              to,
              accessible,
              routes,
              stops,
              excluded,
            ),
          }))
          .filter(({ journeys }) => journeys.length)
          .slice(0, 3)
      : [];
  return { baseline, after, alternatives };
}
