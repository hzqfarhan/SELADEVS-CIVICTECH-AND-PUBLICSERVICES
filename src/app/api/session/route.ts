import { z } from "zod";
import {
  createSession,
  demoAvailable,
  getSession,
  operatorShowcaseEnabled,
  passwordMatches,
  sessionCookie,
} from "@/lib/server/auth";
import {
  apiError,
  HttpError,
  limitRequest,
  readJson,
  requireSameOrigin,
} from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = getSession(request);
  return Response.json(
    {
      authenticated: !!session,
      demoAvailable: demoAvailable(),
      mode: session?.mode || null,
      showcase: operatorShowcaseEnabled(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    limitRequest(request, "session", 10);
    const input = z
      .object({
        password: z.string().max(256).optional(),
        demo: z.boolean().optional(),
      })
      .strict()
      .parse(await readJson(request, 2_048));
    if (operatorShowcaseEnabled())
      return Response.json(
        {
          authenticated: true,
          demoAvailable: true,
          mode: "demo",
          showcase: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    const demo = input.demo === true && demoAvailable();
    if (!demo && (!input.password || !passwordMatches(input.password)))
      throw new HttpError(
        401,
        "Invalid operator credentials or demo access is disabled.",
      );
    const mode = demo ? "demo" : "authenticated";
    return Response.json(
      { authenticated: true, demoAvailable: demoAvailable(), mode },
      {
        headers: {
          "Set-Cookie": sessionCookie(createSession(mode), request),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      {
        authenticated: operatorShowcaseEnabled(),
        showcase: operatorShowcaseEnabled(),
      },
      { headers: { "Set-Cookie": sessionCookie("", request, true) } },
    );
  } catch (error) {
    return apiError(error);
  }
}
