/** Shared across all official static/realtime adapters in one Node process.
 * Vehicle positions arrive from the operator about every 30 seconds, so the
 * realtime bucket is polled far more often than a multi-megabyte static zip
 * refresh; one shared limit would let the larger download starve live GPS. */
const limits = { realtime: 6, static: 2 } as const;
const requests = new Map<keyof typeof limits, number[]>();
export function reserveOfficialRequest(
  kind: keyof typeof limits,
  now = Date.now(),
) {
  const used = requests.get(kind) ?? [];
  while (used.length && used[0] <= now - 60000) used.shift();
  if (used.length >= limits[kind])
    throw new Error(
      "Official API request budget busy. Cached data retained; retry shortly.",
    );
  used.push(now);
  requests.set(kind, used);
}
