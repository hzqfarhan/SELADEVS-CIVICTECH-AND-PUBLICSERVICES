import { statusSchema, updateReport } from "@/lib/server/reports";
import {
  apiError,
  limitRequest,
  readJson,
  requireSameOrigin,
} from "@/lib/server/http";
import { requireOperator } from "@/lib/server/auth";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    requireOperator(request);
    limitRequest(request, "reports-update", 60);
    const { status } = statusSchema.parse(await readJson(request, 1_024));
    const { id } = await context.params;
    return Response.json({ report: await updateReport(id, status) });
  } catch (error) {
    return apiError(error);
  }
}
