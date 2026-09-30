export const REGION_IDS = [
  "johor",
  "kangar",
  "alor-setar",
  "kota-bharu",
  "kuala-terengganu",
  "ipoh",
  "seremban",
  "melaka",
  "kuching",
  "ktmb",
  "rapid-kl",
  "mrt-feeder",
  "rapid-penang",
  "rapid-kuantan",
  "rapid-rail",
  "uthm",
] as const;
export type FeedRegion = (typeof REGION_IDS)[number];
export interface Endpoint {
  id: string;
  staticUrl: string;
  realtimeUrl?: string;
}
export interface Service {
  id: FeedRegion;
  name: string;
  operator: string;
  center: [number, number];
  kind: "bus" | "rail" | "pilot";
  endpoints: Endpoint[];
}
const endpoint = (
  id: string,
  agency: string,
  category?: string,
  realtime = true,
): Endpoint => {
  const suffix = agency + (category ? `?category=${category}` : "");
  return {
    id,
    staticUrl: `https://api.data.gov.my/gtfs-static/${suffix}`,
    ...(realtime
      ? {
          realtimeUrl: `https://api.data.gov.my/gtfs-realtime/vehicle-position/${suffix}`,
        }
      : {}),
  };
};
export const SERVICES: Service[] = [
  ...(
    [
      ["johor", "Johor Bahru", 103.7565, 1.4835],
      ["kangar", "Kangar", 100.198, 6.441],
      ["alor-setar", "Alor Setar", 100.368, 6.124],
      ["kota-bharu", "Kota Bharu", 102.239, 6.125],
      ["kuala-terengganu", "Kuala Terengganu", 103.14, 5.33],
      ["ipoh", "Ipoh", 101.09, 4.598],
      ["seremban", "Seremban", 101.938, 2.726],
      ["melaka", "Melaka", 102.25, 2.2],
      ["kuching", "Kuching", 110.35, 1.55],
    ] as const
  ).map(([id, name, lng, lat]): Service => ({
    id,
    name,
    operator: "BAS.MY",
    center: [lng, lat],
    kind: "bus",
    endpoints:
      id === "seremban"
        ? [
            endpoint("seremban-a", "mybas-seremban-a"),
            endpoint("seremban-b", "mybas-seremban-b"),
          ]
        : [endpoint(id, `mybas-${id}`)],
  })),
  {
    id: "ktmb",
    name: "KTMB · Peninsular rail",
    operator: "KTMB",
    center: [101.686, 3.139],
    kind: "rail",
    endpoints: [endpoint("ktmb", "ktmb")],
  },
  ...(
    [
      ["rapid-kl", "Rapid KL", "rapid-bus-kl", 101.686, 3.139],
      ["mrt-feeder", "MRT feeder buses", "rapid-bus-mrtfeeder", 101.686, 3.139],
      ["rapid-penang", "Rapid Penang", "rapid-bus-penang", 100.329, 5.414],
      ["rapid-kuantan", "Rapid Kuantan", "rapid-bus-kuantan", 103.326, 3.807],
      [
        "rapid-rail",
        "Rapid KL rail · schedules only",
        "rapid-rail-kl",
        101.686,
        3.139,
      ],
    ] as const
  ).map(([id, name, category, lng, lat]): Service => ({
    id,
    name,
    operator: "Prasarana",
    center: [lng, lat],
    kind: id === "rapid-rail" ? "rail" : "bus",
    endpoints: [endpoint(id, "prasarana", category, id !== "rapid-rail")],
  })),
  {
    id: "uthm",
    name: "UTHM · Parit Raja pilot",
    operator: "UTHM pilot",
    center: [103.0862, 1.8548],
    kind: "pilot",
    endpoints: [],
  },
];
export const serviceFor = (region: FeedRegion) =>
  SERVICES.find((s) => s.id === region)!;
export const feedId = (endpointId: string, rawId: string) =>
  endpointId === "johor" ? rawId : `${endpointId}:${rawId}`;
