import { sources } from "@/lib/sources";
export function GET() {
  return Response.json({
    sources,
    transportAttribution:
      "Transport data: data.gov.my and respective transport operators. CC BY 4.0.",
    basemapAttribution:
      "OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors",
    simulator: "Explicit opt-in only; never a live-data replacement.",
  });
}
