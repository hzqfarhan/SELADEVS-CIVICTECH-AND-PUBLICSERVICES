import { readdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { networkFile, type TransitNetwork } from "../src/lib/server/network";

// Transcribes published operator fare-table posters (data/fare-tables/*.json)
// into route fare overrides validated against the imported GTFS networks.
// Two direction formats are supported:
//  - "matrix": full between-stop table. Poster stops map to GTFS either
//    positionally (Q05, same stop list) or by explicit gtfsStopId subset
//    (Q08/Q10, where the poster table lists stops the current pattern lacks;
//    unmapped stops carry gtfsStopId null and only cross their pairs).
//  - "terminal": linear terminal->destination table emitted as
//    boarding = fromStop (the pattern's first stop), one fare per destination.
// When two directions price the same route/pattern/stop pair, the one with
// the newer sourceDate wins (May 2025 matrices vs Sept 2025 reductions).
const stopRef = z.object({ gtfsStopId: z.string(), posterName: z.string() });
const fareSen = z.number().int().positive().max(100000);
const baseDirection = {
  patternId: z.string(),
  direction: z.string(),
  sourceUrl: z.string().url().optional(),
  sourceDate: z.string().date().optional(),
};
const tableSchema = z.object({
  id: z.string(),
  region: z.string(),
  routeName: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.string().url(),
  sourceDate: z.string().date(),
  verifiedAt: z.string().date(),
  concessionAllowed: z.boolean(),
  notes: z.string().optional(),
  directions: z.array(
    z.discriminatedUnion("format", [
      z.object({
        ...baseDirection,
        format: z.literal("matrix"),
        stops: z.array(
          z.object({
            gtfsStopId: z.string().nullable(),
            posterName: z.string(),
          }),
        ),
        // fares[i][j] prices boarding stop i, alighting stop i+j+1 (sen).
        fares: z.array(z.array(fareSen)),
      }),
      z.object({
        ...baseDirection,
        format: z.literal("terminal"),
        fromStop: stopRef,
        destinations: z.array(z.object({ ...stopRef.shape, fareSen })),
      }),
    ]),
  ),
});
type FareTable = z.infer<typeof tableSchema>;
type Pattern = NonNullable<
  TransitNetwork["routes"][number]["patterns"]
>[number];
type Override = {
  routeId: string;
  patternId: string;
  fromSequence: number;
  toSequence: number;
  fareSen: number;
  concessionAllowed: boolean;
  sourceUrl: string;
};

function validateMatrix(id: string, n: number, rows: number[][]) {
  if (rows.length !== n - 1)
    throw new Error(`${id}: expected ${n - 1} fare rows, got ${rows.length}`);
  rows.forEach((row, i) => {
    if (row.length !== n - i - 1)
      throw new Error(
        `${id}: row ${i + 1} has ${row.length} values, expected ${n - i - 1}`,
      );
    for (let j = 1; j < row.length; j++)
      if (row[j] < row[j - 1])
        throw new Error(`${id}: row ${i + 1} not monotonic at column ${j}`);
  });
  // Fare to a fixed alighting stop must not rise when boarding later.
  for (let k = 2; k < n; k++)
    for (let i = 0; i < k - 1; i++)
      if (rows[i][k - i - 1] < rows[i + 1][k - i - 2])
        throw new Error(
          `${id}: alighting stop ${k + 1} fare rises when boarding later`,
        );
}

function seqOf(pattern: Pattern, id: string, label: string) {
  const stop = pattern.stops.find((s) => s.stopId === id);
  if (!stop)
    throw new Error(`${label}: stop ${id} not in pattern ${pattern.id}`);
  return stop.sequence;
}

async function main() {
  const dir = "data/fare-tables";
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const networks = new Map<string, TransitNetwork>();
  const regions: Record<
    string,
    {
      formulaVerified: boolean;
      sourceUrl: string;
      verifiedAt: string;
      overrides: Override[];
    }
  > = {};
  const byKey = new Map<string, Override & { sourceDate: string }>();
  let superseded = 0;
  for (const file of files.sort()) {
    const table = tableSchema.parse(
      JSON.parse(await readFile(`${dir}/${file}`, "utf8")),
    ) as FareTable;
    let network = networks.get(table.region);
    if (!network) {
      network = JSON.parse(
        await readFile(networkFile(table.region), "utf8"),
      ) as TransitNetwork;
      networks.set(table.region, network);
    }
    const region = (regions[table.region] ??= {
      formulaVerified: table.region === "kuching" ? false : true,
      sourceUrl: table.sourceUrl,
      verifiedAt: table.verifiedAt,
      overrides: [],
    });
    // Older source dates first so newer tables overwrite shared pairs.
    const ordered = [...table.directions].sort((a, b) =>
      (a.sourceDate ?? table.sourceDate).localeCompare(
        b.sourceDate ?? table.sourceDate,
      ),
    );
    for (const d of ordered) {
      const route = network.routes.find((r) =>
        r.patterns?.some((p) => p.id === d.patternId),
      );
      const pattern = route?.patterns?.find((p) => p.id === d.patternId);
      if (!route || !pattern)
        throw new Error(`${table.id}: pattern ${d.patternId} not in network`);
      const sourceUrl = d.sourceUrl ?? table.sourceUrl;
      const sourceDate = d.sourceDate ?? table.sourceDate;
      const pairs: [number, number, number][] = [];
      if (d.format === "matrix") {
        if (d.stops.length !== d.fares.length + 1)
          throw new Error(
            `${table.id} ${d.direction}: ${d.fares.length} fare rows for ${d.stops.length} poster stops`,
          );
        validateMatrix(`${table.id} ${d.direction}`, d.stops.length, d.fares);
        const seq = d.stops.map((s) =>
          s.gtfsStopId === null
            ? null
            : seqOf(pattern, s.gtfsStopId, `${table.id} ${d.direction}`),
        );
        const mapped = seq.filter((v): v is number => v !== null);
        for (let i = 1; i < mapped.length; i++)
          if (mapped[i] <= mapped[i - 1])
            throw new Error(
              `${table.id} ${d.direction}: poster stop order diverges from GTFS at mapped stop ${i + 1}`,
            );
        if (mapped[0] !== pattern.stops[0].sequence)
          throw new Error(
            `${table.id} ${d.direction}: first mapped poster stop is seq ${mapped[0]}, pattern starts at ${pattern.stops[0].sequence}`,
          );
        for (let i = 0; i < d.fares.length; i++)
          for (let j = 0; j < d.fares[i].length; j++) {
            const from = seq[i];
            const to = seq[i + j + 1];
            if (from === null || to === null) continue;
            pairs.push([from, to, d.fares[i][j]]);
          }
        console.log(
          `${table.id} ${d.direction}: matrix ${d.stops.length} poster stops (${mapped.length} mapped) on ${route.id} × ${pattern.id}`,
        );
      } else {
        const boarding = seqOf(
          pattern,
          d.fromStop.gtfsStopId,
          `${table.id} ${d.direction}`,
        );
        if (boarding !== pattern.stops[0].sequence)
          throw new Error(
            `${table.id} ${d.direction}: linear table boards at seq ${boarding}, but pattern ${pattern.id} starts at ${pattern.stops[0].sequence}`,
          );
        let lastSeq = boarding;
        let lastFare = 0;
        for (const dest of d.destinations) {
          const to = seqOf(
            pattern,
            dest.gtfsStopId,
            `${table.id} ${d.direction}`,
          );
          if (to <= lastSeq)
            throw new Error(
              `${table.id} ${d.direction}: ${dest.posterName} (seq ${to}) not after previous destination (seq ${lastSeq})`,
            );
          if (dest.fareSen < lastFare)
            throw new Error(
              `${table.id} ${d.direction}: ${dest.posterName} fare drops below previous destination`,
            );
          pairs.push([boarding, to, dest.fareSen]);
          lastSeq = to;
          lastFare = dest.fareSen;
        }
        console.log(
          `${table.id} ${d.direction}: linear table from ${d.fromStop.posterName}, ${d.destinations.length} current fares on ${route.id} × ${pattern.id}`,
        );
      }
      for (const [fromSequence, toSequence, fare] of pairs) {
        const key = `${route.id}|${pattern.id}|${fromSequence}|${toSequence}`;
        const prev = byKey.get(key);
        if (prev) {
          const cmp = prev.sourceDate.localeCompare(sourceDate);
          if (cmp > 0) continue;
          if (cmp === 0 && prev.fareSen !== fare)
            throw new Error(
              `${table.id} ${d.direction}: conflicting fares for ${key} from two same-dated tables (${prev.fareSen} vs ${fare})`,
            );
          if (prev.fareSen !== fare) superseded++;
        }
        byKey.set(key, {
          routeId: route.id,
          patternId: pattern.id,
          fromSequence,
          toSequence,
          fareSen: fare,
          concessionAllowed: table.concessionAllowed,
          sourceUrl,
          sourceDate,
        });
      }
    }
  }
  const list = [...byKey.values()].sort(
    (a, b) =>
      a.routeId.localeCompare(b.routeId) ||
      a.patternId.localeCompare(b.patternId) ||
      a.fromSequence - b.fromSequence ||
      a.toSequence - b.toSequence,
  );
  for (const [regionName, region] of Object.entries(regions))
    region.overrides = list
      .filter((o) => o.routeId.startsWith(`${regionName}:`))
      .map(({ sourceDate: _sourceDate, ...o }) => o);
  const total = list.length;
  await writeFile(
    "src/lib/fare-overrides.generated.json",
    `${JSON.stringify({ generatedAt: "2026-10-18", regions }, null, 2)}\n`,
  );
  console.log(
    `wrote src/lib/fare-overrides.generated.json: ${total} overrides across ${Object.keys(regions).length} region(s), ${superseded} superseded pair write(s)`,
  );
}
main();
