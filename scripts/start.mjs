import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

const root = process.cwd();
nextEnv.loadEnvConfig(root, false);
const standalone = resolve(root, ".next/standalone");
await access(resolve(standalone, "server.js"));
await cp(resolve(root, "public"), resolve(standalone, "public"), {
  recursive: true,
});
await cp(resolve(root, ".next/static"), resolve(standalone, ".next/static"), {
  recursive: true,
});
const child = spawn(process.execPath, [resolve(standalone, "server.js")], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "0.0.0.0",
    PORT: process.env.PORT || "3000",
    GERAK_DATA_DIR: resolve(root, process.env.GERAK_DATA_DIR || ".runtime"),
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
