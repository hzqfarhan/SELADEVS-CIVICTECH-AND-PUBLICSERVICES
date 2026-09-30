import { feedHealth } from '@/lib/server/vehicles';
import { reportStorage } from '@/lib/server/reports';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'ok', service: 'gerak', timestamp: new Date().toISOString(), storage: reportStorage(), feed: feedHealth(), deployment: 'single-process MVP; see docs/ARCHITECTURE.md for production topology' }, { headers: { 'Cache-Control': 'no-store' } });
}
