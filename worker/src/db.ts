import pg from "pg";
import type { ScrapedBus } from "./types.js";

const { Pool } = pg;

export class DatabaseManager {
  private pool: pg.Pool | null = null;
  private isInitialized = false;
  public totalInserts = 0;
  public isConnected = false;

  constructor(databaseUrl = process.env.DATABASE_URL) {
    if (databaseUrl && databaseUrl.trim().length > 0) {
      try {
        this.pool = new Pool({
          connectionString: databaseUrl,
          ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
      } catch (err) {
        console.warn("[DB] Failed to configure Postgres pool:", err);
      }
    }
  }

  public async init(): Promise<boolean> {
    if (!this.pool) {
      console.log("[DB] No DATABASE_URL provided. Worker running in standalone memory + API mode.");
      return false;
    }

    try {
      const client = await this.pool.connect();
      try {
        console.log("[DB] Connected to PostgreSQL. Initializing transit tables...");

        // Ensure postgis extension if permitted
        try {
          await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
        } catch {
          // Ignore if user lacks superuser permissions
        }

        // Table 1: Historical observations (matching db/schema.sql)
        await client.query(`
          CREATE TABLE IF NOT EXISTS vehicle_observations (
            vehicle_id text NOT NULL,
            observed_at timestamptz NOT NULL,
            route_id text,
            location geography(Point, 4326) NOT NULL,
            bearing real,
            speed_mps real,
            source text NOT NULL,
            PRIMARY KEY(vehicle_id, observed_at)
          );
          CREATE INDEX IF NOT EXISTS vehicle_observations_time_idx ON vehicle_observations(observed_at DESC);
        `);

        // Table 2: Latest real-time state with license plate
        await client.query(`
          CREATE TABLE IF NOT EXISTS latest_vehicles (
            id text PRIMARY KEY,
            label text NOT NULL,
            license_plate text NOT NULL,
            raw_plate text,
            campus_id text NOT NULL,
            campus_name text NOT NULL,
            route_id text NOT NULL,
            route_name text NOT NULL,
            latitude double precision,
            longitude double precision,
            bearing real DEFAULT 0,
            speed_kmh real DEFAULT 0,
            ignition boolean DEFAULT false,
            status text,
            last_updated timestamptz NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS latest_vehicles_campus_idx ON latest_vehicles(campus_id);
        `);

        this.isInitialized = true;
        this.isConnected = true;
        console.log("[DB] Transit tables ready.");
        return true;
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      console.error("[DB] Failed to connect/initialize PostgreSQL database:", (err as Error).message);
      this.isConnected = false;
      return false;
    }
  }

  public async saveBus(bus: ScrapedBus): Promise<void> {
    if (!this.pool || !this.isInitialized || bus.latitude === null || bus.longitude === null) {
      return;
    }

    try {
      const vehicleId = `uthm-${bus.id}`;
      const observedAt = new Date(bus.lastUpdated).toISOString();
      const speedMps = (bus.speedKmH * 1000) / 3600;

      // 1. Upsert latest vehicle record
      await this.pool.query(
        `
        INSERT INTO latest_vehicles (
          id, label, license_plate, raw_plate, campus_id, campus_name,
          route_id, route_name, latitude, longitude, bearing, speed_kmh,
          ignition, status, last_updated, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          license_plate = EXCLUDED.license_plate,
          raw_plate = EXCLUDED.raw_plate,
          campus_id = EXCLUDED.campus_id,
          campus_name = EXCLUDED.campus_name,
          route_id = EXCLUDED.route_id,
          route_name = EXCLUDED.route_name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          bearing = EXCLUDED.bearing,
          speed_kmh = EXCLUDED.speed_kmh,
          ignition = EXCLUDED.ignition,
          status = EXCLUDED.status,
          last_updated = EXCLUDED.last_updated,
          updated_at = now();
        `,
        [
          vehicleId,
          bus.licensePlate,
          bus.licensePlate,
          bus.rawPlate,
          bus.campusId,
          bus.campusName,
          String(bus.routeId),
          bus.routeName,
          bus.latitude,
          bus.longitude,
          bus.bearing,
          bus.speedKmH,
          bus.ignition,
          bus.status,
          observedAt,
        ]
      );

      // 2. Insert observation history point
      await this.pool.query(
        `
        INSERT INTO vehicle_observations (
          vehicle_id, observed_at, route_id, location, bearing, speed_mps, source
        ) VALUES (
          $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, 'katsana-ws'
        )
        ON CONFLICT (vehicle_id, observed_at) DO NOTHING;
        `,
        [
          vehicleId,
          observedAt,
          bus.routeName,
          bus.longitude,
          bus.latitude,
          bus.bearing,
          speedMps,
        ]
      );

      this.totalInserts++;
    } catch (err: unknown) {
      // Don't crash on sporadic DB write error
      console.warn(`[DB] Error persisting vehicle ${bus.id} (${bus.licensePlate}):`, (err as Error).message);
    }
  }

  public async saveBatch(buses: ScrapedBus[]): Promise<void> {
    for (const bus of buses) {
      await this.saveBus(bus);
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}
