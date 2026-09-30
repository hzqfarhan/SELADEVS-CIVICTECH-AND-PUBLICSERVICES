import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Region, TransitRoute, Stop } from '@/lib/types';
import { routes, stops } from '@/lib/transit';
export interface TransitNetwork { routes: TransitRoute[]; stops: Stop[]; source: 'official' | 'demo'; importedAt?: string; feedUrl?: string }
export async function getNetwork(region: Region): Promise<TransitNetwork> {
  if (region === 'johor') {
    try {
      const filename = path.join(process.env.GERAK_DATA_DIR || path.join(process.cwd(), '.runtime'), 'network.json');
      const network = JSON.parse(await fs.readFile(filename, 'utf8')) as TransitNetwork;
      if (network.source === 'official' && Array.isArray(network.routes) && Array.isArray(network.stops)) return network;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Imported network unavailable:', error instanceof Error ? error.message : error);
    }
  }
  return { routes: routes.filter(r => r.region === region), stops: stops.filter(s => s.region === region), source: 'demo' };
}
