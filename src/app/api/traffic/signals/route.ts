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
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
