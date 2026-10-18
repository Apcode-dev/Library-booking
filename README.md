# 📚 LibSpace - Modern Library Seat Booking & Pass Management Platform

A modern, full-stack, mobile-responsive, and high-concurrency **Library Seat Booking Platform** built with **React**, **TypeScript**, **Tailwind CSS**, **Node.js + Express**, and **Prisma ORM** (supporting SQLite & PostgreSQL).

---

## 📱 Live Mobile & Desktop Access

- 🚀 **Live Cloudflare Mobile Link (No Install / Works on any phone)**:  
  👉 **[https://grams-thank-unexpected-paintball.trycloudflare.com](https://grams-thank-unexpected-paintball.trycloudflare.com)**
- 💻 **Frontend (Localhost)**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend API (Localhost)**: [http://localhost:5000](http://localhost:5000)
- 🩺 **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🚀 Step-by-Step Running Instructions (Commands)

Follow these simple commands to setup and run the complete project locally on your machine.

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Git**

```bash
# Verify your installations:
node -v
npm -v
git --version
```

---

### 2. Clone the Repository
```bash
git clone https://github.com/Apcode-dev/Library-booking.git
cd Library-booking
```

---

### 3. Backend Setup & Run

Open a terminal in the root directory:

```bash
# Navigate to backend directory
cd backend

# 1. Install all dependencies
npm install

# 2. Setup Environment Variables
# On Windows PowerShell:
Copy-Item .env.example .env
# On Linux / macOS / Bash:
# cp .env.example .env

# 3. Synchronize Database Schema (Creates SQLite dev.db automatically)
npx prisma db push

# 4. Generate Prisma Client
npx prisma generate

# 5. Seed Initial Admin & Demo Data (Optional)
npm run prisma:seed

# 6. Start Backend Development Server (with auto-reload)
npm run dev
```

> **Backend runs at:** `http://localhost:5000`  
> Automated cleanup, seat unlock, reminders, and refund cron services will start automatically.

---

### 4. Frontend Setup & Run

Open a **second terminal** in the root directory:

```bash
# Navigate to frontend directory
cd frontend

# 1. Install all dependencies
npm install

# 2. Setup Environment Variables
# On Windows PowerShell:
Copy-Item .env.example .env
# On Linux / macOS / Bash:
# cp .env.example .env

# 3. Start Frontend Development Server
npm run dev
```

> **Frontend runs at:** `http://localhost:5173` (accessible locally and on your Wi-Fi network).

---

### 5. Mobile Tunnel Access (Optional)

To test the application on your mobile phone or share it with anyone over the internet:

```powershell
# In root directory on Windows:
powershell -ExecutionPolicy Bypass -File .\start-tunnel.ps1
```
*Or directly via cloudflared:*
```bash
.\cloudflared.exe tunnel --protocol http2 --url http://localhost:5173
```
Copy the generated `https://xxxx.trycloudflare.com` link and open it in any smartphone browser!

---

### 6. Production Build Commands

```bash
# Build Backend
cd backend
npm run build
npm start

# Build Frontend
cd frontend
npm run build
npm run preview
```

---

## ✨ Key Features & Capabilities

### 🎓 1. Student / Seeker Experience
- **Real-Time Dynamic Time Slot**: Live clock active by default; automatically calculates upcoming slot with 3-hour default duration.
- **Category-Wise Desks & Passes**:
  - **⏱️ Hourly Slot**: Quick revisions and flexible study hours.
  - **👑 Premium Monthly Pass**: 30-day continuous pass, dedicated desk, unlimited daily hours, and 1x daily QR scan attendance.
  - **👑 Yearly VIP Pass**: 365-day fixed desk, 2 months free discount, personal locker, and daily attendance tracking.
- **Interactive Seat Map**: Real-time desk availability with color coding:
  - 🟢 Green: Available
  - 🔵 Blue: Selected
  - 🟡 Amber: Locked (5-minute hold)
  - ⚪ Gray: Booked / Occupied
- **Auto-Plan Synchronization**: Clicking any Monthly or Yearly desk seamlessly syncs the plan without blocking alerts.
- **Transparent Price Breakdown**: Clear estimate showing Base Price, Owner Tax %, and Service & Maintenance fee before payment.
- **5-Minute Temporary Seat Hold**: Prevents double-booking via atomic database transactions.
- **Dual Payment Options**:
  - **Razorpay**: Official UPI (GPay, PhonePe, Paytm), Cards, NetBanking.
  - **Instant Simulation**: 1-click test checkout for quick demo reviews.
- **Instant Digital QR Pass**: Boarding-pass style digital QR pass generated upon booking.
- **Rebook / Extend Time**: A "Rebook / Extend" button appears 15 minutes before session expiry.
- **Automated Refund & Reminders**:
  - 50% refund on voluntary cancellation.
  - 30% automatic refund on no-show expiry.
  - Automated check-in reminders at 30 mins and 90 mins.

### 🏢 2. Library Owner Dashboard
- **Real-Time Seat Occupancy & Color Map**: Clean separation between Hourly Seats, Monthly Pass Slots, and Yearly VIP Pass Slots.
- **1-Click Maintenance Toggle**: Instantly mark desks under maintenance or re-activate them.
- **Membership & Pricing Controls**:
  - Enable/Disable Monthly and Yearly passes independently.
  - Update Monthly and Yearly rates and perk descriptions.
  - Configure Tax Percentage and Service/Maintenance fee.
- **Reception QR Scanner**: Camera scanner + manual input to verify student QR passes and record daily gate attendance.
- **Student Roster & Logs**: View Daily Bookings, Active Monthly/Yearly Pass Holders, and Check-in History.

### 🛡️ 3. Platform Administration
- **Approval Workflow**: Review submitted libraries before public listing.
- **KPI Metrics**: Platform GMV, total seat capacity, and system health monitoring.

---

## 🔑 Pre-Seeded Test Credentials

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Platform Admin** | `admin@libspace.com` | `Admin@123456` | Master verification & oversight |
| **Library Owner** | `owner@delhilibrary.com` | `owner123` | Library, seats & scanner management |
| **Student** | `user@student.com` | `password123` | Seat booking & QR pass generation |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Canvas-Confetti, Axios.
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, JWT Authentication, Nodemailer.
- **Database**: SQLite (`file:./dev.db`) for zero-config local dev; PostgreSQL supported out of the box via `schema.prisma`.
- **Payment Gateway**: Razorpay Checkout SDK + Simulated Sandbox.
- **Real-Time Concurrency**: Strict database-level transaction locking to guarantee zero double-booking collisions:
  $$\text{Overlap} \iff (\text{Existing.Start} < \text{Requested.End}) \land (\text{Existing.End} > \text{Requested.Start})$$

---

## 📄 License

This project is licensed under the ISC License.
