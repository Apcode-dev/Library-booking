# 📚 LibSpace - Modern Library Seat Booking Platform

A full-stack, responsive, and high-concurrency **Library Seat Booking Platform** built with **React**, **Tailwind CSS**, **Node.js + Express.js**, and **PostgreSQL (Prisma ORM)**.

---

## 📱 Live Access Links

- **🚀 Cloudflare Public Link (Direct on any Mobile - No Password required)**:
  ### [https://retired-coral-ladder-strip.trycloudflare.com](https://retired-coral-ladder-strip.trycloudflare.com)

- **Desktop Localhost**: [http://localhost:5173](http://localhost:5173)
- **Wi-Fi Local IP**: [http://192.168.100.11:5173](http://192.168.100.11:5173)
- **Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🎯 Key Roles & Features

### 1. 🎓 Seeker / Student User
- **Location-Based Search**: Auto-detects nearest libraries using Geolocation API with distance in kilometers.
- **Dynamic Search & Filters**: Multi-criteria filters for Air Conditioning, High-speed WiFi, Power Sockets, Silent Zones, and hourly price slider.
- **Interactive Desk Layout Map**: Visual canvas showing desk positions, room zones, power socket icons, and real-time status.
- **5-Minute Temporary Seat Lock**: Prevents race conditions by placing an exclusive 5-minute hold with a live countdown timer during checkout.
- **Zero Double-Booking Guarantee**: Strict database-level overlapping time window checks.
- **Simulated Payment & QR Pass**: Generates digital boarding pass with scannable QR code for contactless reception check-in.
- **Booking History**: Track active, upcoming, and past reservations with 1-click cancellation & refund.

### 2. 🏢 Library Owner
- **Onboarding & Submission**: Submit library profiles, facilities, photos, and hourly rates for admin verification.
- **Seat & Zone Builder**: Configure zones (Silent Bay, AC Cabins) and desks.
- **Maintenance Controller**: Toggle seats into maintenance mode with 1 click.
- **Revenue Dashboard**: Track Gross Revenue, Owner Net Payout (after platform fee), Today's earnings, and live occupancy rate.

### 3. 🛡️ Platform Admin
- **Master Governance**: Platform GMV, total commission earned, and system KPIs.
- **Verification Queue**: Review and approve or reject newly submitted libraries before they appear on the public feed.
- **User & Library Directory**: Moderate all registered students, owners, and active libraries.

---

## 🏗️ Clean Project Structure

```
lib/
├── backend/                             # Node.js + Express + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma                # Clean PostgreSQL models & relationships
│   │   └── seed.ts                      # Demo seed script for instant testing
│   ├── scripts/
│   │   └── switch-db.js                 # 1-click switch between PostgreSQL & SQLite
│   ├── src/
│   │   ├── config/                      # Environment and Prisma singletons
│   │   ├── controllers/                 # Business logic for all 3 roles
│   │   │   ├── auth.controller.ts       # Auth, JWT, Google/Demo login
│   │   │   ├── library.controller.ts    # Search, distance formula, filters
│   │   │   ├── seat.controller.ts       # Real-time seat map calculator
│   │   │   ├── booking.controller.ts    # 5-min lock, payment, QR passes
│   │   │   ├── owner.controller.ts      # Owner revenue & seat management
│   │   │   └── admin.controller.ts      # Platform verification & moderation
│   │   ├── middlewares/                 # Auth JWT, Role Guard (RBAC), Validation
│   │   ├── routes/                      # Clean RESTful API endpoints
│   │   ├── services/                    # Locking engine & double-booking math
│   │   ├── utils/                       # QR generator, token helpers, time utils
│   │   └── index.ts                     # Express server entry point
│   ├── test-api.ts                      # Automated 12-test verification suite
│   ├── .env                             # Environment configuration
│   └── package.json
│
├── frontend/                            # React + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                  # Navbar with 1-click role switcher, Footer, AuthModal
│   │   │   ├── library/                 # LibraryCard with ratings & distance badges
│   │   │   ├── seat/                    # InteractiveSeatGrid with visual zones
│   │   │   └── booking/                 # SeatLockTimer (5-min), CheckoutModal, QRCodePass
│   │   ├── context/                     # AuthContext with persistent JWT session
│   │   ├── lib/                         # Axios client with dynamic mobile host resolution
│   │   ├── pages/                       # Home, LibraryDetails, MyBookings, Owner, Admin
│   │   ├── types/                       # TypeScript interfaces
│   │   ├── App.tsx                      # Router configuration
│   │   ├── main.tsx                     # React root
│   │   └── index.css                    # Tailwind directives & custom animations
│   ├── tailwind.config.js
│   ├── vite.config.ts                   # Exposes server to network (0.0.0.0)
│   └── package.json
│
└── README.md                            # Comprehensive Documentation
```

---

## ⚡ Concurrency & Double-Booking Prevention Logic

Two bookings or locks for the same `seatId` collide if and only if their intervals overlap:

$$\text{Overlap} \iff (\text{Existing.Start} < \text{Requested.End}) \land (\text{Existing.End} > \text{Requested.Start})$$

1. **Step 1 (Temporary Lock)**: When a student picks an available desk, `POST /api/bookings/lock` executes inside a database transaction:
   - Validates that no active booking exists in that time window.
   - Validates that no active temporary lock (`status = ACTIVE` and `expiresAt > NOW()`) from another user exists.
   - Creates a `SeatLock` record with `expiresAt = NOW() + 5 minutes`.
2. **Step 2 (Confirmation)**: When payment is completed, `POST /api/bookings/confirm` marks the lock as `CONVERTED` and creates a confirmed `Booking` with QR code pass.
3. If the user closes the browser or cancels, the lock automatically expires after 5 minutes and returns to the available pool.

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Quick Switch |
|---|---|---|---|
| **Student** | `user@student.com` | `password123` | Click **🎓 Student** in top bar |
| **Library Owner** | `owner@delhilibrary.com` | `owner123` | Click **🏢 Owner** in top bar |
| **Admin** | `admin@libspace.com` | `admin123` | Click **🛡️ Admin** in top bar |
