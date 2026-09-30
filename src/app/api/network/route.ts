import { getNetwork } from '@/lib/server/network';
import { apiError, limitRequest, regionSchema } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    limitRequest(request, 'network', 120);
    const region = regionSchema.parse(new URL(request.url).searchParams.get('region') || 'johor');
    return Response.json(await getNetwork(region), { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) { return apiError(error); }
}
