import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { z } from "zod";
import type { CivicReport, ReportStatus } from "@/lib/types";
import { HttpError } from "./http";

const imageSchema = z
  .string()
  .max(1_400_000)
  .refine((value) => {
    const match =
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return false;
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length < 12 || bytes.length > 1_048_576) return false;
    if (match[1] === "png")
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (match[1] === "jpeg")
      return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    return (
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    );
  }, "Use a PNG, JPEG or WebP image smaller than 1 MB.");

export const reportSchema = z
  .object({
    category: z.enum([
      "damaged-stop",
      "unsafe-walkway",
      "accessibility",
      "flooding",
      "infrastructure",
      "crowding",
    ]),
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(10).max(2_000),
    coordinate: z.tuple([
      z.number().finite().min(99).max(120),
      z.number().finite().min(0).max(8),
    ]),
    location: z.string().trim().min(2).max(200),
    image: imageSchema.optional(),
  })
  .strict();
export const statusSchema = z
  .object({
    status: z.enum(["submitted", "acknowledged", "in-progress", "resolved"]),
  })
  .strict();
export const reportEditSchema = reportSchema
  .pick({ category: true, title: true, description: true, location: true })
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide a field to update.",
  );
export type ReportInput = z.infer<typeof reportSchema>;
export type ReportEditInput = z.infer<typeof reportEditSchema>;
const filePath = () =>
  path.join(
    process.env.GERAK_DATA_DIR || path.join(process.cwd(), ".runtime"),
    "reports.json",
  );
let transaction: Promise<unknown> = Promise.resolve();
let sql: ReturnType<typeof postgres> | undefined;
function database() {
  if (!process.env.DATABASE_URL) return undefined;
  return (sql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  }));
}
function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = transaction.then(work, work);
  transaction = next.catch(() => undefined);
  return next;
}
async function readFileReports(): Promise<CivicReport[]> {
  try {
    return JSON.parse(await fs.readFile(filePath(), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
async function saveFileReports(reports: CivicReport[]) {
  const target = filePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(reports, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporary, target);
}
export async function listReports(): Promise<CivicReport[]> {
  const db = database();
  if (db) {
    const rows =
      await db`SELECT payload FROM civic_reports ORDER BY created_at DESC LIMIT 500`;
    return rows.map((row) => row.payload as CivicReport);
  }
  return (await readFileReports())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 500);
}
export async function createReport(input: ReportInput): Promise<CivicReport> {
  const now = new Date().toISOString();
  const report: CivicReport = {
    ...input,
    id: `GRK-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: "submitted",
    source: "community",
    createdAt: now,
    updatedAt: now,
  };
  const db = database();
  if (db) {
    await db`INSERT INTO civic_reports (id, category, status, location, payload, created_at, updated_at) VALUES (${report.id}, ${report.category}, ${report.status}, ST_SetSRID(ST_MakePoint(${report.coordinate[0]}, ${report.coordinate[1]}), 4326), ${db.json(report as unknown as postgres.JSONValue)}, ${now}, ${now})`;
  } else
    await serial(async () => {
      const reports = await readFileReports();
      if (reports.length >= 2_000)
        throw new HttpError(
          507,
          "Demo report storage is full. Configure PostgreSQL to continue.",
        );
      await saveFileReports([report, ...reports]);
    });
  return report;
}
const transitions: Record<ReportStatus, ReportStatus[]> = {
  submitted: ["acknowledged", "resolved"],
  acknowledged: ["in-progress", "resolved"],
  "in-progress": ["resolved", "acknowledged"],
  resolved: ["acknowledged"],
};
export function canTransition(from: ReportStatus, to: ReportStatus) {
  return from === to || transitions[from].includes(to);
}
export async function editReport(
  id: string,
  input: ReportEditInput,
): Promise<CivicReport> {
  const update = (report: CivicReport | undefined): CivicReport => {
    if (!report) throw new HttpError(404, "Report not found.");
    return { ...report, ...input, updatedAt: new Date().toISOString() };
  };
  const db = database();
  if (db) {
    return (await db.begin(async (tx) => {
      const rows =
        await tx`SELECT payload FROM civic_reports WHERE id = ${id} FOR UPDATE`;
      const report = update(rows[0]?.payload as CivicReport | undefined);
      await tx`UPDATE civic_reports SET category = ${report.category}, updated_at = ${report.updatedAt}, payload = ${tx.json(report as unknown as postgres.JSONValue)} WHERE id = ${id}`;
      return report;
    })) as unknown as CivicReport;
  }
  return serial(async () => {
    const reports = await readFileReports();
    const report = update(reports.find((item) => item.id === id));
    await saveFileReports(
      reports.map((item) => (item.id === id ? report : item)),
    );
    return report;
  });
}
export async function deleteReport(id: string): Promise<void> {
  const db = database();
  if (db) {
    await db.begin(async (tx) => {
      const rows =
        await tx`SELECT id FROM civic_reports WHERE id = ${id} FOR UPDATE`;
      if (!rows[0]) throw new HttpError(404, "Report not found.");
      await tx`DELETE FROM report_events WHERE report_id = ${id}`;
      await tx`DELETE FROM civic_reports WHERE id = ${id}`;
    });
    return;
  }
  await serial(async () => {
    const reports = await readFileReports();
    if (!reports.some((item) => item.id === id))
      throw new HttpError(404, "Report not found.");
    await saveFileReports(reports.filter((item) => item.id !== id));
  });
}
export async function updateReport(
  id: string,
  status: ReportStatus,
): Promise<CivicReport> {
  const update = (report: CivicReport | undefined): CivicReport => {
    if (!report) throw new HttpError(404, "Report not found.");
    if (!canTransition(report.status, status))
      throw new HttpError(
        409,
        `A ${report.status} report cannot move directly to ${status}.`,
      );
    return { ...report, status, updatedAt: new Date().toISOString() };
  };
  const db = database();
  if (db) {
    return (await db.begin(async (tx) => {
      const rows =
        await tx`SELECT payload FROM civic_reports WHERE id = ${id} FOR UPDATE`;
      const report = update(rows[0]?.payload as CivicReport | undefined);
      await tx`UPDATE civic_reports SET status = ${status}, updated_at = ${report.updatedAt}, payload = ${tx.json(report as unknown as postgres.JSONValue)} WHERE id = ${id}`;
      await tx`INSERT INTO report_events(report_id, status, actor) VALUES (${id}, ${status}, 'operator')`;
      return report;
    })) as unknown as CivicReport;
  }
  return serial(async () => {
    const reports = await readFileReports();
    const report = update(reports.find((r) => r.id === id));
    await saveFileReports(reports.map((r) => (r.id === id ? report : r)));
    return report;
  });
}
export function reportStorage() {
  return process.env.DATABASE_URL ? "postgresql" : "local-json";
}
