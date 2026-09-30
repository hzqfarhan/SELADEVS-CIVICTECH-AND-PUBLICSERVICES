/** Shared across all official static/realtime adapters in one Node process. */
const requests: number[] = [];
export function reserveOfficialRequest(now = Date.now()) {
  while (requests.length && requests[0] <= now - 60000) requests.shift();
  if (requests.length >= 4)
    throw new Error(
      "Official API request budget busy. Cached data retained; retry shortly.",
    );
  requests.push(now);
}
