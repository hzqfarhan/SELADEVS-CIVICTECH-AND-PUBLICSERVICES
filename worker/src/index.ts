import "dotenv/config";
import { KatsanaContinuousScraper } from "./katsana.js";
import { DatabaseManager } from "./db.js";
import { createWorkerHttpServer } from "./server.js";

const PORT = Number(process.env.PORT || 8080);
const startedAt = new Date().toISOString();

async function main() {
  console.log("==========================================================");
  console.log(" 🚌 GERAK UTHM CONTINUOUS TELEMATICS WORKER ");
  console.log(" Ready for Railway Deployment & Continuous Scraping ");
  console.log("==========================================================");

  // 1. Initialize PostgreSQL if configured
  const db = new DatabaseManager();
  await db.init();

  // 2. Initialize Katsana WebSocket Scraper
  const scraper = new KatsanaContinuousScraper();

  // Hook database persistence
  scraper.onPing(async (bus) => {
    await db.saveBus(bus);
    if (process.env.VERBOSE === "true") {
      console.log(
        `[PING] [${bus.campusName}] ${bus.licensePlate} (${bus.routeName}) - ${bus.speedKmH} km/h @ ${bus.latitude?.toFixed(5)}, ${bus.longitude?.toFixed(5)}`
      );
    }
  });

  scraper.onState(async (batch) => {
    await db.saveBatch(batch);
  });

  // 3. Start Katsana Continuous Scraper
  scraper.start();

  // 4. Start HTTP Server for Railway Healthchecks & API
  const server = createWorkerHttpServer(scraper, db, startedAt);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[HTTP] Worker API & health check server listening on port ${PORT}`);
    console.log(`[HTTP] Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`[HTTP] Vehicles API: http://0.0.0.0:${PORT}/vehicles`);
  });

  // 5. Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);
    scraper.stop();
    server.close();
    await db.close();
    console.log("[Worker] Cleanup finished. Exiting process.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[Fatal Error] Worker crashed:", err);
  process.exit(1);
});
