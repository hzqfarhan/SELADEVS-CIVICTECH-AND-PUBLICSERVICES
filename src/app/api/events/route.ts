import { getVehicles } from '@/lib/server/vehicles';
import { listReports } from '@/lib/server/reports';
import { apiError, limitRequest, modeSchema, regionSchema } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    limitRequest(request, 'events', 60);
    const url = new URL(request.url);
    const region = regionSchema.parse(url.searchParams.get('region') || 'johor');
    const mode = modeSchema.parse(url.searchParams.get('mode') || 'demo');
    const encoder = new TextEncoder(); let cleanup: () => void = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let ended = false; let busy = false; let lastReports = '';
        let interval: ReturnType<typeof setInterval> | undefined;
        let deadline: ReturnType<typeof setTimeout> | undefined;
        const close = () => {
          if (ended) return; ended = true;
          clearInterval(interval); clearTimeout(deadline); request.signal.removeEventListener('abort', close);
          try { controller.close(); } catch { /* already disconnected */ }
        };
        cleanup = close;
        const send = (event: string, data: unknown) => { if (!ended) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); };
        const tick = async () => {
          if (busy || ended) return; busy = true;
          try {
            const [snapshot, reports] = await Promise.all([getVehicles(region, mode), listReports()]);
            send('vehicles', snapshot);
            const revision = reports.map(r => `${r.id}:${r.updatedAt}`).join('|');
            if (revision !== lastReports) { send('reports', { reports }); lastReports = revision; }
          } catch { send('service-error', { message: 'Realtime stream interrupted; reconnecting is safe.' }); }
          finally { busy = false; }
        };
        controller.enqueue(encoder.encode('retry: 3000\n\n'));
        request.signal.addEventListener('abort', close, { once: true });
        interval = setInterval(() => void tick(), 5_000);
        // Bound each connection so platform shutdown and reconnects are predictable.
        deadline = setTimeout(close, 55_000);
        void tick();
      },
      cancel() { cleanup(); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
  } catch (error) { return apiError(error); }
}
