import { createHash } from "node:crypto";
import { z } from "zod";
import { REGION_IDS } from "../feeds";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Bounded single-process limiter. Use a shared Redis limiter before scaling replicas. */
const buckets = new Map<string, { count: number; reset: number }>();
export function allowRate(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  if (buckets.size > 5_000) {
    for (const [id, bucket] of buckets)
      if (bucket.reset <= now) buckets.delete(id);
    if (buckets.size > 5_000) return false;
  }
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function limitRequest(
  request: Request,
  scope: string,
  count: number,
  windowMs = 60_000,
) {
  // Forwarded addresses are trusted only behind a proxy configured to overwrite them.
  const address =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "local";
  const fingerprint = createHash("sha256")
    .update(address)
    .digest("hex")
    .slice(0, 16);
  if (!allowRate(`${scope}:${fingerprint}`, count, windowMs))
    throw new HttpError(429, "Too many requests. Please try again shortly.");
}

export function requireSameOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== expected)
    throw new HttpError(403, "Cross-origin mutation is not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Cross-site mutation is not allowed.");
  // Browser authenticated mutations must carry Origin; curl API calls without cookies are allowed.
  if (!origin && request.headers.get("cookie"))
    throw new HttpError(
      403,
      "Origin header is required for authenticated mutations.",
    );
}

export async function readJson(
  request: Request,
  maxBytes = 1_500_000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Use application/json.");
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new HttpError(413, "Request is too large.");
  if (!request.body) throw new HttpError(400, "JSON body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export function apiError(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: "Invalid request.",
        details: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.status === 429 ? { "Retry-After": "60" } : undefined,
      },
    );
  console.error(
    JSON.stringify({
      level: "error",
      event: "api_error",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  return Response.json(
    { error: "The request could not be completed." },
    { status: 500 },
  );
}

export const regionSchema = z.enum(REGION_IDS);
export const modeSchema = z.enum(["demo", "live"]);
