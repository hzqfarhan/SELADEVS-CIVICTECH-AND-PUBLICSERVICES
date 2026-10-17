import { getTrafficSignals } from "@/lib/server/traffic";
import { apiError, limitRequest } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    limitRequest(request, "traffic-signals", 60);
    return Response.json(
      {
        ...(await getTrafficSignals()),
        provider: "OpenStreetMap contributors",
        coverage: "Johor Bahru pilot area",
        liveStateAvailable: false,
        sourceUrl: "https://www.openstreetmap.org/copyright",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "Vercel-CDN-Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
