import { getTrafficCameras } from "@/lib/server/traffic";
import { apiError, limitRequest } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    limitRequest(request, "traffic-cameras", 60);
    return Response.json(
      {
        ...(await getTrafficCameras()),
        provider: "LTA / data.gov.sg",
        coverage: "Singapore border area",
        sourceUrl:
          "https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
