# 09. Deployment, DevOps and Operations

This document provides complete, step-by-step instructions for deploying, operating, and maintaining the **LibSpace** platform in production.

---

## 1. Hosting Ecosystem Overview

```mermaid
flowchart TD
    subgraph Vercel ["Frontend Hosting (Vercel)"]
        VercelRepo["GitHub: Library-booking\n(Root directory: frontend)"]
        VercelBuild["Vite Build: dist/"]
        VercelLive["🌐 https://library-booking-omega.vercel.app"]
    end

    subgraph Render ["Backend Hosting (Render)"]
        RenderRepo["GitHub: Library-booking\n(Root directory: backend)"]
        RenderBuild["Build: npm install && npx prisma generate && npm run build"]
        RenderRun["Start: node dist/index.js"]
        RenderLive["📡 https://library-booking-49tt.onrender.com"]
    end

    subgraph Neon ["Database Hosting (Neon)"]
        NeonDB[("🐘 Serverless PostgreSQL (SSL)\nConnection Pool: Port 6543\nDirect Migrations: Port 5432")]
    end

    subgraph KeepAlive ["24/7 Uptime Automation"]
        CronBot["⏱️ cron-job.org / UptimeRobot\n(Pings /api/health every 10 mins)"]
    end

    VercelLive -->|REST API Calls| RenderLive
    RenderLive -->|Prisma Pooled Queries| NeonDB
    CronBot -->|Health Check Ping| RenderLive
```

---

## 2. Frontend Deployment on Vercel

### Step 1: Link GitHub Repository
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and select your GitHub repository: `Apcode-dev/Library-booking`.
3. In project settings, set **Root Directory** to `frontend`.

### Step 2: Configure Build Settings
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 3: Set Environment Variables
Add the following key in the Vercel Project Settings > Environment Variables:
```env
VITE_API_URL=https://library-booking-49tt.onrender.com/api
```

### Step 4: Single Page Application (SPA) Routing Rewrite
To ensure direct page refreshes (e.g., `/my-bookings` or `/owner`) do not return 404 errors, `frontend/vercel.json` contains:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Backend Deployment on Render

### Step 1: Create a New Web Service
1. Log into your [Render Dashboard](https://render.com).
2. Click **New +** > **Web Service**.
3. Select your repository: `https://github.com/Apcode-dev/Library-booking`.
4. Configure basic settings:
   - **Name:** `library-booking-backend`
   - **Region:** Singapore / Frankfurt / Oregon
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`

### Step 2: Configure Build & Start Commands
- **Build Command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command:**
  ```bash
  npm start
  ```

> [!IMPORTANT]
> **Production Dependencies on Render:**
> Render sets `NODE_ENV=production` by default during builds, which causes `npm install` to skip `devDependencies`. To ensure the TypeScript compiler (`tsc`) and Prisma generator succeed, all build tools (`typescript`, `@types/*`, `prisma`) are placed under `dependencies` in `backend/package.json`.

### Step 3: Configure Backend Environment Variables
In the Render Web Service **Environment** tab, add:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Port automatically assigned by Render |
| `DATABASE_URL` | `postgresql://neondb_owner:***@ep-***-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` | Neon pooled connection string |
| `DIRECT_URL` | `postgresql://neondb_owner:***@ep-***.us-east-2.aws.neon.tech/neondb?sslmode=require` | Neon direct connection string |
| `JWT_SECRET` | `libspace_super_secret_jwt_key_2026` | 256-bit token signing secret |
| `CLIENT_URL` | `https://library-booking-omega.vercel.app` | Allowed CORS frontend domain |
| `BREVO_API_KEY` | `xkeysib-***` | Transactional email API key |
| `BREVO_SENDER_NAME` | `LibSpace Security` | Sender display name |
| `BREVO_SENDER_EMAIL` | `noreply@libspace.com` | Verified Brevo sender address |

---

## 4. Neon PostgreSQL Setup & Database Synchronization

1. Create a serverless project on [Neon.tech](https://neon.tech).
2. Copy the **Pooled connection string** into `DATABASE_URL` and the **Direct connection string** into `DIRECT_URL`.
3. To apply schema changes from your local machine to the live database:
   ```powershell
   cd backend
   npx prisma db push
   ```
4. To inspect live data in a graphical web UI:
   ```powershell
   npx prisma studio
   ```

---

## 5. 24/7 Keep-Alive Automation (Preventing Sleep)

Free instances on Render automatically go into a dormant "sleep" mode if no traffic is received for 15 minutes, causing a 30 to 50-second cold start delay on the next visit.

### How to Keep the Backend Awake 24/7:
1. Visit [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) and create a free account.
2. Click **Create Cronjob**.
3. **Target URL:**
   ```
   https://library-booking-49tt.onrender.com/api/health
   ```
4. **Execution Schedule:** Every **10 minutes** (`*/10 * * * *`).
5. **Request Method:** `GET`
6. Click **Save**.

Now, a lightweight ping hits `/api/health` every 10 minutes. The Render service remains permanently warm, guaranteeing instant response times for students and library owners around the clock.
