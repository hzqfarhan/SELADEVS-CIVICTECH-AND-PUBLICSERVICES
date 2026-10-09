import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { parseStaticGtfs } from "../src/lib/server/gtfs-static";
import { planJourney } from "../src/lib/transit";
import {
  calculateFare,
  resolveDistance,
  defaultProfile,
  fareConfig,
  estimateJourney,
  formatFare,
  type Leg,
} from "../src/lib/fares";
import {
  calculateBudget,
  comparePass,
  budgetSchema,
  type TransportBudget,
} from "../src/lib/transport-budget";
import { restoreBudget, restoreProfile } from "../src/lib/fare-preferences";
import type { Stop, TransitRoute } from "../src/lib/types";
const stops: Stop[] = [
  {
    id: "a",
    name: "A",
    coordinate: [103, 1.5],
    accessible: true,
    region: "johor",
  },
  {
    id: "b",
    name: "B",
    coordinate: [103.01, 1.5],
    accessible: true,
    region: "johor",
  },
  {
    id: "c",
    name: "C",
    coordinate: [103.02, 1.5],
    accessible: true,
    region: "johor",
  },
];
const route: TransitRoute = {
  id: "r",
  name: "Route",
  destination: "C",
  color: "#fff",
  stops: ["a", "b", "c"],
  path: stops.map((s) => s.coordinate),
  duration: 20,
  region: "johor",
  operator: "BAS.MY",
  source: "official",
  patterns: [
    {
      id: "p",
      tripId: "t",
      shapeId: "s",
      direction: "0",
      geometrySource: "gtfs_shape",
      distanceUnit: "metres",
      path: stops.map((s) => s.coordinate),
      stops: [
        { stopId: "a", sequence: 1, shapeDistance: 0 },
        { stopId: "b", sequence: 2, shapeDistance: 2000 },
        { stopId: "c", sequence: 3, shapeDistance: 10000 },
      ],
    },
  ],
};
const leg: Leg = {
  route,
  patternId: "p",
  fromStopId: "a",
  toStopId: "c",
  fromSequence: 1,
  toSequence: 3,
};
const config = fareConfig("johor")!;
const quote = (metres: number | null, profile = defaultProfile, c = config) =>
  calculateFare({
    leg,
    distance:
      metres === null
        ? { metres: null, method: null, reason: "missing" }
        : { metres, method: "route_geometry" },
    profile,
    config: c,
    asOf: "2026-10-08",
  });
for (const [metres, sen] of [
  [0, 0],
  [1000, 94],
  [2000, 94],
  [2100, 103],
  [5000, 122],
  [10000, 169],
])
  test(`fare rounding ${metres}m`, () =>
    assert.equal(quote(metres).fareSen, sen));
for (const metres of [null, -1, NaN, Infinity])
  test(`invalid distance ${metres}`, () =>
    assert.equal(quote(metres).fareSen, null));
test("half-fare eligibility and rounding are explicit", () => {
  for (const category of [
    "uniformed_student",
    "senior_over_60",
    "oku",
  ] as const) {
    assert.equal(
      quote(10000, { ...defaultProfile, category, concessionConfirmed: true })
        .fareSen,
      85,
    );
    assert.equal(quote(10000, { ...defaultProfile, category }).fareSen, 169);
  }
  assert.equal(
    quote(10000, {
      ...defaultProfile,
      category: "university_student",
      concessionConfirmed: true,
    }).fareSen,
    169,
  );
});
test("active concession self-confirmation is distinct from category and citizenship", () => {
  const p = {
    ...defaultProfile,
    citizenship: "malaysian" as const,
    category: "university_student" as const,
    card: "basmy_concession" as const,
    cardActiveConfirmed: true,
  };
  assert.equal(quote(10000, p).fareSen, 0);
  assert.equal(quote(10000, { ...p, cardActiveConfirmed: false }).fareSen, 169);
  assert.equal(quote(10000, { ...p, citizenship: "foreigner" }).fareSen, 169);
});
test("override precedence and incomplete tables fail closed", () => {
  const c = {
    ...config,
    overrides: [
      {
        routeId: "r",
        fromSequence: 1,
        toSequence: 3,
        fareSen: 250,
        concessionAllowed: false,
      },
    ],
  };
  assert.equal(quote(null, defaultProfile, c).fareSen, 250);
  assert.equal(
    quote(
      10000,
      { ...defaultProfile, category: "oku", concessionConfirmed: true },
      c,
    ).fareSen,
    250,
  );
  assert.equal(
    quote(10000, defaultProfile, {
      ...c,
      overrides: [{ ...c.overrides[0], toSequence: 2 }],
    }).fareSen,
    null,
  );
  assert.equal(
    quote(10000, defaultProfile, {
      ...c,
      overrides: [{ ...c.overrides[0], routeId: "other" }],
    }).fareSen,
    169,
  );
});
test("unsupported operator and invalid/expired config never return zero", () => {
  assert.equal(
    calculateFare({
      leg: { ...leg, route: { ...route, region: "ktmb" } },
      distance: { metres: 0, method: "route_geometry" },
      profile: defaultProfile,
      config: null,
      asOf: "2026-10-08",
    }).status,
    "unsupported_operator",
  );
  for (const c of [
    { ...config, sourceUrl: "" },
    { ...config, region: "melaka" },
    { ...config, effectiveUntil: "2026-01-01" },
    { ...config, baseMicros: NaN },
  ])
    assert.equal(quote(2000, defaultProfile, c).fareSen, null);
  assert.equal(fareConfig("kuching"), null);
  assert.equal(formatFare(169), "RM1.69");
});
test("GTFS distance association, order and units", () => {
  assert.deepEqual(resolveDistance(leg, stops), {
    metres: 10000,
    method: "gtfs_shape_dist_traveled",
  });
  assert.equal(
    resolveDistance({ ...leg, patternId: "other" }, stops).metres,
    null,
  );
  assert.equal(
    resolveDistance({ ...leg, fromSequence: 3, toSequence: 1 }, stops).metres,
    null,
  );
  const p = {
    ...route.patterns![0],
    distanceUnit: "kilometres" as const,
    stops: route.patterns![0].stops.map((s) => ({
      ...s,
      shapeDistance: s.shapeDistance! / 1000,
    })),
  };
  assert.equal(
    resolveDistance({ ...leg, route: { ...route, patterns: [p] } }, stops)
      .metres,
    10000,
  );
});
test("geometry fallback uses full route shape and fails without one", () => {
  const p = { ...route.patterns![0], distanceUnit: "unknown" as const };
  const d = resolveDistance(
    { ...leg, route: { ...route, patterns: [p] } },
    stops,
  );
  assert.equal(d.method, "route_geometry");
  assert.ok(d.metres! > 2200 && d.metres! < 2250);
  assert.equal(
    resolveDistance(
      {
        ...leg,
        route: {
          ...route,
          patterns: [{ ...p, geometrySource: "unavailable" }],
        },
      },
      stops,
    ).metres,
    null,
  );
  assert.equal(
    resolveDistance(
      {
        ...leg,
        route: {
          ...route,
          patterns: [
            {
              ...p,
              path: [
                [102, 1],
                [102.1, 1],
              ],
            },
          ],
        },
      },
      stops,
    ).metres,
    null,
  );
});
test("GTFS importer retains distinct patterns, repeated stops and unknown distance units", () => {
  const zip = zipSync(
    Object.fromEntries(
      Object.entries({
        "agency.txt": "agency_id,agency_name\nx,BAS.MY",
        "routes.txt": "route_id,agency_id,route_long_name\nr,x,Route",
        "stops.txt":
          "stop_id,stop_name,stop_lat,stop_lon\na,A,1.5,103\nb,B,1.5,103.01",
        "trips.txt":
          "route_id,trip_id,shape_id,direction_id\nr,t,s,0\nr,t2,s2,1",
        "stop_times.txt":
          "trip_id,stop_id,stop_sequence,shape_dist_traveled\nt,a,1,0\nt,b,2,1000\nt,a,3,2000\nt2,b,1,0\nt2,a,2,1000",
        "shapes.txt":
          "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\ns,1.5,103,1\ns,1.5,103.01,2",
      }).map(([k, v]) => [k, strToU8(v)]),
    ),
  );
  const n = parseStaticGtfs(zip, "https://example.com/gtfs");
  assert.equal(n.routes[0].patterns!.length, 2);
  assert.deepEqual(
    n.routes[0].patterns![0].stops.map((s) => s.stopId),
    ["a", "b", "a"],
  );
  assert.equal(n.routes[0].patterns![0].distanceUnit, "unknown");
});
const budget: TransportBudget = {
  schemaVersion: 1,
  month: "2026-10",
  monthlyLimitSen: 10000,
  recurringTrips: [
    {
      id: "one",
      region: "johor",
      from: "a",
      to: "c",
      routeIds: ["r"],
      patternIds: ["p"],
      tripsPerDay: 2,
      days: 20,
      direction: "one_way",
      enabled: true,
    },
  ],
};
test("planner and budget share the same fare result", () => {
  const journey = planJourney("a", "c", false, [route], stops)[0];
  assert.equal(
    estimateJourney(journey, "a", "c", stops, defaultProfile, "2026-10-08")
      .totalSen,
    169,
  );
  const result = calculateBudget(
    budget,
    [route],
    stops,
    defaultProfile,
    "2026-10-08",
  );
  assert.equal(result.totalSen, 6760);
  assert.equal(result.status, "under");
});
test("return fare requires independently available reverse pattern", () => {
  const b = {
    ...budget,
    recurringTrips: [
      { ...budget.recurringTrips[0], direction: "return" as const },
    ],
  };
  assert.equal(
    calculateBudget(b, [route], stops, defaultProfile, "2026-10-08").totalSen,
    null,
  );
  const reverse = {
    ...route.patterns![0],
    id: "reverse",
    direction: "1",
    stops: [
      { stopId: "c", sequence: 1, shapeDistance: 0 },
      { stopId: "a", sequence: 2, shapeDistance: 2000 },
    ],
  };
  assert.equal(
    calculateBudget(
      b,
      [{ ...route, patterns: [...route.patterns!, reverse] }],
      stops,
      defaultProfile,
      "2026-10-08",
    ).totalSen,
    (169 + 94) * 40,
  );
});
test("budget unknown trips, zero counts, zero budget and invalid numbers", () => {
  assert.equal(
    calculateBudget(budget, [], [], defaultProfile, "2026-10-08").totalSen,
    null,
  );
  const b = {
    ...budget,
    recurringTrips: [{ ...budget.recurringTrips[0], days: 0 }],
  };
  assert.equal(
    calculateBudget(b, [], [], defaultProfile, "2026-10-08").totalSen,
    0,
  );
  assert.equal(
    calculateBudget(
      { ...budget, monthlyLimitSen: 0 },
      [route],
      stops,
      defaultProfile,
      "2026-10-08",
    ).percentage,
    null,
  );
  assert.equal(
    budgetSchema.safeParse({ ...budget, monthlyLimitSen: -1 }).success,
    false,
  );
  assert.equal(
    budgetSchema.safeParse({
      ...budget,
      recurringTrips: [{ ...b.recurringTrips[0], days: Infinity }],
    }).success,
    false,
  );
});
test("mixed pass fares use cumulative dated travel and uncovered legs stay payable", () => {
  const c = {
    ...config,
    pass: { ...config.pass, coverageConfirmed: true, priceSen: 300 },
  };
  const p = { ...defaultProfile, citizenship: "malaysian" as const };
  const events = [
    { day: 1, region: "johor" as const, fareSen: 100 },
    { day: 2, region: "ktmb" as const, fareSen: 500 },
    { day: 3, region: "johor" as const, fareSen: 250 },
  ];
  assert.deepEqual(comparePass(events, c, p, 1), {
    payPerTripSen: 850,
    withPassSen: 800,
    savingSen: 50,
    breakEven: 2,
  });
  assert.equal(comparePass(events, c, defaultProfile, 1), null);
  assert.equal(comparePass(events, config, p, 1), null);
  assert.equal(
    comparePass([{ day: 1, region: "johor", fareSen: 0 }], c, p, 1)!.breakEven,
    null,
  );
  assert.equal(
    comparePass([{ day: 31, region: "johor", fareSen: 400 }], c, p, 1)!
      .savingSen,
    -300,
  );
});
test("persistence is versioned and handles obsolete or malformed data", () => {
  for (const raw of [
    null,
    "{bad",
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify({ ...budget, monthlyLimitSen: -4 }),
  ])
    assert.equal(restoreBudget(raw, "2026-10").recurringTrips.length, 0);
  assert.deepEqual(restoreBudget(JSON.stringify(budget), "2026-10"), budget);
  assert.deepEqual(restoreProfile("{bad"), defaultProfile);
});

test("mixed-operator journey reports a partial total without inventing a fare", () => {
  const other = {
    ...route,
    id: "rail",
    region: "ktmb" as const,
    operator: "KTMB",
  };
  const j = { routes: [route, other], minutes: 20, transfers: 1, via: ["b"] };
  const result = estimateJourney(
    j,
    "a",
    "c",
    stops,
    defaultProfile,
    "2026-10-08",
  );
  assert.equal(result.totalSen, null);
  assert.equal(result.knownSen, 94);
  assert.equal(result.legs[1].fare.status, "unsupported_operator");
});
test("budget status boundaries and duplicate recurring trips use explicit counts", () => {
  const cost = 6760;
  for (const [limit, status] of [
    [cost, "at"],
    [cost - 1, "over"],
    [cost + 1, "under"],
  ] as const)
    assert.equal(
      calculateBudget(
        { ...budget, monthlyLimitSen: limit },
        [route],
        stops,
        defaultProfile,
        "2026-10-08",
      ).status,
      status,
    );
  const b = {
    ...budget,
    recurringTrips: [
      ...budget.recurringTrips,
      { ...budget.recurringTrips[0], id: "two", tripsPerDay: 1, days: 10 },
    ],
  };
  assert.equal(
    calculateBudget(b, [route], stops, defaultProfile, "2026-10-08").totalSen,
    8450,
  );
});
test("rendered journey fares use the shared engine, explanation and source", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { JourneyFare } = await import("../src/components/fare-budget");
  const journey = planJourney("a", "c", false, [route], stops)[0];
  const html = renderToStaticMarkup(
    createElement(JourneyFare, {
      journey,
      from: "a",
      to: "c",
      stops,
      profile: defaultProfile,
      locale: "en",
      onAdd: () => {},
    }),
  );
  assert.match(html, /RM1.69/);
  assert.match(html, /Estimate only/);
  assert.match(html, /https:\/\/bas.my/);
  const unavailable = renderToStaticMarkup(
    createElement(JourneyFare, {
      journey: { ...journey, routes: [{ ...route, patterns: undefined }] },
      from: "a",
      to: "c",
      stops,
      profile: defaultProfile,
      locale: "en",
      onAdd: () => {},
    }),
  );
  assert.match(unavailable, /Fare data not available yet/);
  assert.doesNotMatch(unavailable, /RM0.00/);
});
