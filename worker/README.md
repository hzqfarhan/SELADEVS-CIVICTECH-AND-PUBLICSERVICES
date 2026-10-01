# 🚌 GERAK UTHM Continuous Scraper Worker

Continuous Katsana telematics scraper & live transit ingestion worker for UTHM shuttle buses (Parit Raja & Pagoh), ready for instant deployment to [Railway](https://railway.app).

---

## 🌟 Features

- **Continuous Real-Time Telematics**: Connects via WebSocket to `wss://ws.shuttle.katsana.com/stream/1`.
- **Automatic Reconnection**: Self-healing WebSocket with exponential backoff and heartbeat pings.
- **Malaysian License Plate Parsing**: Extracts official registration plates (e.g. `JQF 7400`, `JPJ 7300`, `JRE 9100`).
- **Campus Separation & Geofencing**: Automatically detects and groups:
  - UTHM Main Campus (Parit Raja) — Routes 10 (KK TF/TDI) & 11 (KK Perwira)
  - UTHM Pagoh Campus — Route 12
  - KKTU (Kolej Kediaman Taman Universiti) geofenced buses
- **Optional PostgreSQL Persistence**:
  - Automatically provisions tables `vehicle_observations` (matches `db/schema.sql`) and `latest_vehicles`.
  - Upserts current vehicle positions and appends geographic observation logs.
- **Built-in HTTP API & Health Check**:
  - `GET /health` or `GET /` — Health check endpoint for Railway deployment monitoring.
  - `GET /vehicles` — Live JSON snapshot of all active shuttle buses.
  - `GET /vehicles/uthm` — Live Parit Raja buses.
  - `GET /vehicles/pagoh` — Live Pagoh buses.

---

## 🚀 How to Deploy to Railway

### Method 1: Deploy from GitHub Repository (Recommended)

1. Push your repository to GitHub.
2. Go to [railway.app](https://railway.app) and open your project.
3. Click **"+ New"** → **"GitHub Repo"** → Select your repository.
4. Go to the service **"Settings"**:
   - Set **"Root Directory"** to: `/worker`
   - Set **"Healthcheck Path"** to: `/health`
5. *(Optional PostgreSQL)*:
   - Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**.
   - In your worker service's **"Variables"** tab, add:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
6. Click **Deploy**! Railway will automatically build using the included `Dockerfile` and start scraping 24/7.

---

### Method 2: Deploy using Railway CLI

```bash
# 1. Install Railway CLI (if not already installed)
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Navigate into worker folder and link or init project
cd worker
railway init

# 4. Deploy directly
railway up
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Auto (Railway) | `8080` | Port for the HTTP healthcheck and REST API. |
| `DATABASE_URL` | Optional | *None* | PostgreSQL connection string. If provided, observations are saved. |
| `KATSANA_WS_URL` | Optional | `wss://ws.shuttle.katsana.com/stream/1` | Katsana telematics WebSocket URL. |
| `VERBOSE` | Optional | `false` | Set to `true` to log every individual GPS ping in the console. |

---

## 💻 Local Development

```bash
# Navigate to worker folder
cd worker

# Install dependencies
npm install

# Run in development mode with live reload
npm run dev

# Or build and start production bundle
npm run build
npm start
```

Visit `http://localhost:8080/health` or `http://localhost:8080/vehicles` in your browser.
