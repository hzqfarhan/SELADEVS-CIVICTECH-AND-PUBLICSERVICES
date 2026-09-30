-- Idempotent MVP schema; execute with `npm run db:migrate`.
-- Provision PostGIS with an administrative role if the app role cannot create it.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS civic_reports (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('damaged-stop','unsafe-walkway','accessibility','flooding','infrastructure','crowding')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','acknowledged','in-progress','resolved')),
  location geography(Point, 4326) NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS civic_reports_location_idx ON civic_reports USING gist(location);
CREATE INDEX IF NOT EXISTS civic_reports_status_idx ON civic_reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS report_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id text NOT NULL REFERENCES civic_reports(id),
  status text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Prepared normalized transit tables for a future persistent collector.
CREATE TABLE IF NOT EXISTS transit_routes (
  id text PRIMARY KEY,
  agency text NOT NULL,
  name text NOT NULL,
  region text NOT NULL,
  shape geometry(LineString, 4326),
  metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS transit_stops (
  id text PRIMARY KEY,
  name text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  wheelchair_boarding smallint NOT NULL DEFAULT 0 CHECK (wheelchair_boarding IN (0,1,2)),
  metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS transit_stops_location_idx ON transit_stops USING gist(location);
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
CREATE TABLE IF NOT EXISTS pilot_devices (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL,
  token_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz
);
