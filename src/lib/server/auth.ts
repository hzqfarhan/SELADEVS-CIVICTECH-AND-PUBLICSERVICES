import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

export const SESSION_COOKIE = "gerak_operator";
const ephemeralSecret = randomBytes(48).toString("hex");
const lifetime = 8 * 60 * 60;
export type OperatorSession = {
  role: "operator";
  mode: "demo" | "authenticated";
  exp: number;
};
export function demoAvailable() {
  return (
    process.env.ALLOW_DEMO_OPERATOR === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEMO_OPERATOR !== "false")
  );
}
function secret() {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production" && !demoAvailable())
    throw new HttpError(503, "Operator authentication is not configured.");
  return ephemeralSecret;
}
function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}
function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function createSession(mode: OperatorSession["mode"], now = Date.now()) {
  const body = Buffer.from(
    JSON.stringify({
      role: "operator",
      mode,
      exp: Math.floor(now / 1000) + lifetime,
    }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function verifySession(
  token: string | undefined,
  now = Date.now(),
): OperatorSession | null {
  if (!token || token.length > 2_048) return null;
  try {
    const [body, signature, extra] = token.split(".");
    if (extra || !body || !signature || !equal(signature, sign(body)))
      return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      data.role !== "operator" ||
      !["demo", "authenticated"].includes(data.mode) ||
      !Number.isFinite(data.exp) ||
      data.exp <= now / 1000
    )
      return null;
    if (data.mode === "demo" && !demoAvailable()) return null;
    return data;
  } catch {
    return null;
  }
}
export function getSession(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySession(token);
}
export function requireOperator(request: Request) {
  const session = getSession(request);
  if (!session)
    throw new HttpError(
      401,
      "Sign in to the operator workspace to update reports.",
    );
  return session;
}
export function passwordMatches(password: string) {
  const expected = process.env.OPERATOR_PASSWORD;
  return (
    !!expected &&
    equal(
      createHmac("sha256", secret()).update(password).digest("hex"),
      createHmac("sha256", secret()).update(expected).digest("hex"),
    )
  );
}
export function sessionCookie(value: string, request: Request, clear = false) {
  const secure =
    new URL(request.url).protocol === "https:" ||
    process.env.COOKIE_SECURE === "true";
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : lifetime}${secure ? "; Secure" : ""}`;
}
