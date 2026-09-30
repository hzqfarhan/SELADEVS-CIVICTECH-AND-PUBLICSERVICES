/** GERAK display colours, not official operator liveries. Stable across feed ordering. */
export function routeColor(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `hsl(${(hash >>> 0) % 360}, 78%, 64%)`;
}

export function uniqueRouteColors(ids: string[]) {
  const result = new Map<string, string>();
  const used = new Set<number>();
  for (const id of [...new Set(ids)].sort()) {
    let hue = Number(routeColor(id).match(/\d+/)![0]);
    for (let attempts = 0; used.has(hue) && attempts < 360; attempts++)
      hue = (hue + 17) % 360;
    used.add(hue);
    result.set(id, `hsl(${hue}, 78%, 64%)`);
  }
  return result;
}
