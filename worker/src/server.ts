import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { KatsanaContinuousScraper } from "./katsana.js";
import type { DatabaseManager } from "./db.js";
import type { WorkerStats } from "./types.js";

export function createWorkerHttpServer(
  scraper: KatsanaContinuousScraper,
  db: DatabaseManager,
  startedAt: string
) {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // CORS headers so web clients / GERAK can query directly
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    // 1. Healthcheck endpoint (used by Railway deploy healthcheck)
    if (pathname === "/" || pathname === "/health") {
      const stats: WorkerStats = {
        startedAt,
        uptimeSeconds: Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
        connected: scraper.isConnected,
        totalPingsReceived: scraper.totalPings,
        activeBusesCount: scraper.getBuses().length,
        paritRajaCount: scraper.getParitRajaBuses().length,
        pagohCount: scraper.getPagohBuses().length,
        lastPingTimestamp: scraper.lastPingTime,
        dbConnected: db.isConnected,
        dbInsertsCount: db.totalInserts,
      };

      res.writeHead(200);
      res.end(
        JSON.stringify(
          {
            status: "ok",
            service: "gerak-uthm-worker",
            version: "1.0.0",
            ...stats,
          },
          null,
          2
        )
      );
      return;
    }

    // 2. All vehicles JSON
    if (pathname === "/vehicles") {
      const buses = scraper.getBuses();
      res.writeHead(200);
      res.end(
        JSON.stringify(
          {
            count: buses.length,
            updatedAt: new Date().toISOString(),
            buses,
          },
          null,
          2
        )
      );
      return;
    }

    // 3. Parit Raja (Main Campus) buses
    if (pathname === "/vehicles/uthm" || pathname === "/vehicles/parit-raja") {
      const buses = scraper.getParitRajaBuses();
      res.writeHead(200);
      res.end(
        JSON.stringify(
          {
            campus: "parit-raja",
            campusName: "UTHM Parit Raja (Main Campus)",
            count: buses.length,
            updatedAt: new Date().toISOString(),
            buses,
          },
          null,
          2
        )
      );
      return;
    }

    // 4. Pagoh campus buses
    if (pathname === "/vehicles/pagoh" || pathname === "/vehicles/uthm-pagoh") {
      const buses = scraper.getPagohBuses();
      res.writeHead(200);
      res.end(
        JSON.stringify(
          {
            campus: "pagoh",
            campusName: "UTHM Pagoh Campus",
            count: buses.length,
            updatedAt: new Date().toISOString(),
            buses,
          },
          null,
          2
        )
      );
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found", availableRoutes: ["/health", "/vehicles", "/vehicles/uthm", "/vehicles/pagoh"] }));
  });

  return server;
}
