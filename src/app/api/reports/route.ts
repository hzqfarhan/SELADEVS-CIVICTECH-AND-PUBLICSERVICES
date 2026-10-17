import { createReport, listReports, reportSchema } from "@/lib/server/reports";
import {
  apiError,
  limitRequest,
  readJson,
  requireSameOrigin,
} from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    limitRequest(request, "reports-read", 300);
    const fresh = new URL(request.url).searchParams.has("fresh");
    return Response.json(
      { reports: await listReports() },
      {
        headers: {
          "Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": fresh
            ? "no-store"
            : "public, s-maxage=5, stale-while-revalidate=25",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    limitRequest(request, "reports-create", 12);
    const input = reportSchema.parse(await readJson(request));
    const report = await createReport(input);
    return Response.json({ report }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
