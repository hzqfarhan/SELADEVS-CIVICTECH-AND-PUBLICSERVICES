import { getVehicles } from "@/lib/server/vehicles";
import {
  apiError,
  limitRequest,
  modeSchema,
  regionSchema,
} from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    limitRequest(request, "vehicles", 600);
    const url = new URL(request.url);
    const region = regionSchema.parse(
      url.searchParams.get("region") || "johor",
    );
    const mode = modeSchema.parse(url.searchParams.get("mode") || "live");
    return Response.json(await getVehicles(region, mode), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
