import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  getSession,
  operatorShowcaseEnabled,
  requireOperator,
} from "../src/lib/server/auth";
import {
  GET as sessionInfo,
  POST as login,
  DELETE as logout,
} from "../src/app/api/session/route";
import {
  GET as listReports,
  POST as postReport,
} from "../src/app/api/reports/route";
import { PATCH as patchReport } from "../src/app/api/reports/[id]/route";

const origin = "https://gerak.seladevs.my";
const production = {
  NODE_ENV: "production",
  APP_ORIGIN: origin,
  OPERATOR_SHOWCASE_MODE: undefined,
  ALLOW_DEMO_OPERATOR: "false",
  OPERATOR_PASSWORD: undefined,
  AUTH_SECRET: undefined,
};

async function withEnv(
  values: Record<string, string | undefined>,
  run: () => Promise<void>,
) {
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function sessionRequest(method = "GET", body?: unknown, cookie?: string) {
  return new Request(`${origin}/api/session`, {
    method,
    headers: {
      origin,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

test("production showcase works without cookies, a password or a valid auth secret", async () => {
  for (const secret of [undefined, "too-short"]) {
    await withEnv({ ...production, AUTH_SECRET: secret }, async () => {
      assert.equal(operatorShowcaseEnabled(), true);
      const request = sessionRequest();
      const session = requireOperator(request);
      assert.equal(session.role, "operator");
      assert.equal(session.mode, "demo");
      assert.ok(session.exp > Date.now() / 1000);
      assert.equal(
        getSession(sessionRequest("GET", undefined, "gerak_operator=invalid"))
          ?.role,
        "operator",
      );

      const response = await sessionInfo(request);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const state = await response.json();
      assert.equal(state.authenticated, true);
      assert.equal(state.showcase, true);
      assert.equal(state.mode, "demo");

      const entered = await login(
        sessionRequest("POST", { password: "anything" }),
      );
      assert.equal(entered.status, 200);
      assert.equal(entered.headers.get("set-cookie"), null);
      const entry = await entered.json();
      assert.equal(entry.authenticated, true);
      assert.equal(entry.showcase, true);
      assert.equal(entry.mode, "demo");

      const deleted = await logout(sessionRequest("DELETE"));
      assert.equal(deleted.status, 200);
      assert.equal((await deleted.json()).authenticated, true);
      assert.equal(getSession(sessionRequest())?.role, "operator");
    });
  }
});

test("showcase report workflow persists operator changes while retaining origin, schema and transition checks", async () => {
  const runtimeDirectory = path.join(process.cwd(), ".runtime");
  await fs.mkdir(runtimeDirectory, { recursive: true });
  const directory = await fs.mkdtemp(
    path.join(runtimeDirectory, "operator-showcase-test-"),
  );
  try {
    await withEnv(
      { ...production, DATABASE_URL: undefined, GERAK_DATA_DIR: directory },
      async () => {
        const input = {
          category: "infrastructure",
          title: "Pothole beside the crossing",
          description:
            "A deep pothole makes the pedestrian crossing difficult to approach.",
          coordinate: [103.763, 1.462],
          location: "JB Sentral",
        };
        const create = (body: unknown) =>
          postReport(
            new Request(`${origin}/api/reports`, {
              method: "POST",
              headers: { origin, "content-type": "application/json" },
              body: JSON.stringify(body),
            }),
          );
        assert.equal(
          (await create({ ...input, status: "resolved" })).status,
          400,
        );
        const created = await create(input);
        assert.equal(created.status, 201);
        const { report } = await created.json();
        assert.equal(report.status, "submitted");
        const update = (body: unknown, headers: Record<string, string> = {}) =>
          patchReport(
            new Request(`${origin}/api/reports/${report.id}`, {
              method: "PATCH",
              headers: {
                origin,
                "content-type": "application/json",
                ...headers,
              },
              body: JSON.stringify(body),
            }),
            { params: Promise.resolve({ id: report.id }) },
          );

        assert.equal(
          (
            await update(
              { status: "acknowledged" },
              { origin: "https://attacker.invalid" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await update(
              { status: "acknowledged" },
              { "sec-fetch-site": "cross-site" },
            )
          ).status,
          403,
        );
        assert.equal(
          (await update({ status: "acknowledged", actor: "operator" })).status,
          400,
        );
        assert.equal((await update({ status: "in-progress" })).status, 409);

        const acknowledged = await update({ status: "acknowledged" });
        assert.equal(acknowledged.status, 200);
        assert.equal((await acknowledged.json()).report.status, "acknowledged");
        const listed = await listReports(new Request(`${origin}/api/reports`));
        assert.equal(
          (await listed.json()).reports.find(
            (item: { id: string }) => item.id === report.id,
          )?.status,
          "acknowledged",
        );
        const saved = JSON.parse(
          await fs.readFile(path.join(directory, "reports.json"), "utf8"),
        );
        assert.equal(
          saved.find((item: { id: string }) => item.id === report.id)?.status,
          "acknowledged",
        );
      },
    );
  } finally {
    assert.ok(
      path
        .resolve(directory)
        .startsWith(path.resolve(runtimeDirectory) + path.sep),
    );
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("showcase session entry still rejects cross-origin requests", async () => {
  await withEnv(production, async () => {
    const response = await login(
      new Request(`${origin}/api/session`, {
        method: "POST",
        headers: {
          origin: "https://attacker.invalid",
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "anything" }),
      }),
    );
    assert.equal(response.status, 403);
  });
});

test("showcase opt-out restores configured password sessions and rejects anonymous operators", async () => {
  await withEnv(
    {
      ...production,
      OPERATOR_SHOWCASE_MODE: "false",
      AUTH_SECRET: "test-only-32-character-secret-key-do-not-deploy",
      OPERATOR_PASSWORD: "test-only-operator-password",
    },
    async () => {
      assert.equal(operatorShowcaseEnabled(), false);
      assert.equal(getSession(sessionRequest()), null);
      assert.throws(() => requireOperator(sessionRequest()), /Sign in/);
      const unauthenticated = await sessionInfo(sessionRequest());
      const state = await unauthenticated.json();
      assert.equal(state.authenticated, false);
      assert.equal(state.showcase, false);
      assert.equal(
        (await login(sessionRequest("POST", { password: "wrong" }))).status,
        401,
      );

      const response = await login(
        sessionRequest("POST", { password: "test-only-operator-password" }),
      );
      assert.equal(response.status, 200);
      const cookieHeader = response.headers.get("set-cookie");
      assert.ok(cookieHeader);
      assert.ok(cookieHeader.includes("HttpOnly"));
      assert.ok(cookieHeader.includes("Secure"));
      const cookie = cookieHeader.split(";")[0];
      assert.equal(
        requireOperator(sessionRequest("GET", undefined, cookie)).mode,
        "authenticated",
      );
      const authenticated = await sessionInfo(
        sessionRequest("GET", undefined, cookie),
      );
      assert.equal((await authenticated.json()).authenticated, true);
    },
  );
});
