import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { loadEnvConfig } from "@next/env";
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL before running npm run db:migrate.");
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
  });
  try {
    const schema = await fs.readFile(
      path.join(process.cwd(), "db", "schema.sql"),
      "utf8",
    );
    await sql.begin(async (tx) => {
      await tx.unsafe(schema);
    });
    console.log("GERAK PostgreSQL/PostGIS schema is ready.");
  } finally {
    await sql.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
