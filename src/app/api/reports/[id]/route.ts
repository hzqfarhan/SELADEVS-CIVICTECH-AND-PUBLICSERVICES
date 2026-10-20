import {
  deleteReport,
  editReport,
  reportEditSchema,
  statusSchema,
  updateReport,
} from "@/lib/server/reports";
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
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    requireOperator(request);
    limitRequest(request, "reports-edit", 60);
    const input = reportEditSchema.parse(await readJson(request, 16_384));
    const { id } = await context.params;
    return Response.json({ report: await editReport(id, input) });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    requireOperator(request);
    limitRequest(request, "reports-delete", 30);
    const { id } = await context.params;
    await deleteReport(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
