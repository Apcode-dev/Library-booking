# 07. Complete API Documentation

This document serves as the comprehensive REST API specification for **LibSpace**.

---

## 1. Global API Conventions

### Base URLs
- **Production API:** `https://library-booking-49tt.onrender.com/api`
- **Local Development:** `http://localhost:5000/api`

### Standard Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Universal Response Structure
All endpoints return standard JSON responses:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

---

## 2. Authentication API (`/api/auth`)

### 2.1. Send Registration Email OTP
- **Method:** `POST`
- **Route:** `/api/auth/register-otp/send`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "name": "Aarav Sharma"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Verification OTP sent to student@example.com. Code valid for 10 minutes."
  }
  ```

### 2.2. Verify Registration Email OTP
- **Method:** `POST`
- **Route:** `/api/auth/register-otp/verify`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "otp": "481902"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "verified": true,
    "message": "Email address verified successfully!"
  }
  ```

### 2.3. User Registration
- **Method:** `POST`
- **Route:** `/api/auth/register`
- **Auth:** Public (Requires prior OTP verification)
- **Request Body:**
  ```json
  {
    "name": "Aarav Sharma",
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "phone": "+919876543210",
    "role": "USER"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-9842-uuid",
      "name": "Aarav Sharma",
      "email": "student@example.com",
      "role": "USER"
    }
  }
  ```

### 2.4. User Login
- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "expectedRole": "USER"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-9842-uuid",
      "name": "Aarav Sharma",
      "email": "student@example.com",
      "role": "USER"
    }
  }
  ```

### 2.5. Get Current User Profile
- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Auth:** Bearer Token (Single-device session validated)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "u-9842-uuid",
      "name": "Aarav Sharma",
      "email": "student@example.com",
      "role": "USER",
      "phone": "+919876543210"
    }
  }
  ```

---

## 3. Library Exploration API (`/api/libraries`)

### 3.1. Public Search & Discovery
- **Method:** `GET`
- **Route:** `/api/libraries`
- **Auth:** Public / Optional
- **Query Parameters:**
  - `search` *(optional)*: Text search matching name, city, address
  - `city` *(optional)*: Filter by city
  - `state` *(optional)*: Filter by state
  - `lat` & `lng` *(optional)*: User GPS coordinates for proximity sorting
  - `maxPrice` *(optional)*: Maximum hourly rate filter (e.g. `80`)
  - `passType` *(optional)*: `"ALL"` \| `"PASSES"` \| `"HOURLY"`
  - `facilities` *(optional)*: Comma-separated amenities (e.g. `WiFi,AC`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 12,
    "libraries": [
      {
        "id": "lib-uuid-1",
        "lid": "LID-101",
        "name": "Central Study Oasis",
        "slug": "central-study-oasis",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "hourlyRate": 40,
        "monthlyRate": 1200,
        "bannerImage": "https://images.unsplash.com/...",
        "interiorImage": "https://images.unsplash.com/...",
        "amenitiesImage": "https://images.unsplash.com/...",
        "facilities": ["Air Conditioned", "High-Speed WiFi", "Power Sockets"],
        "totalSeats": 25,
        "availableSeats": 18,
        "rating": 4.8,
        "reviewCount": 42,
        "distanceKm": 1.4
      }
    ]
  }
  ```

### 3.2. Get Library Details by ID or Slug
- **Method:** `GET`
- **Route:** `/api/libraries/:idOrSlug`
- **Auth:** Public / Optional
- **Success Response (200 OK):** Returns complete library metadata, contact details, 3-image showcase, pricing plans, and reviews.

---

## 4. Seat Availability API (`/api/seats`)

### 4.1. Real-Time Seat Availability Map
- **Method:** `GET`
- **Route:** `/api/seats/availability/:libraryId`
- **Auth:** Public / Optional
- **Query Parameters:** `date=YYYY-MM-DD`, `startTime=HH:MM`, `endTime=HH:MM`, `bookingType=HOURLY`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "libraryId": "lib-uuid-1",
    "zones": [
      {
        "id": "zone-1",
        "name": "Silent Focus Zone",
        "seats": [
          {
            "id": "seat-01",
            "seatNumber": "S-01",
            "seatType": "STANDARD",
            "category": "HOURLY",
            "hourlyPrice": 40,
            "hasPowerSocket": true,
            "hasLamp": true,
            "status": "AVAILABLE",
            "isLocked": false
          }
        ]
      }
    ]
  }
  ```

---

## 5. Booking & Checkout API (`/api/bookings`)

### 5.1. Lock Seat (5-Minute Atomic Hold)
- **Method:** `POST`
- **Route:** `/api/bookings/lock`
- **Auth:** Bearer Token (User)
- **Request Body:**
  ```json
  {
    "seatId": "seat-01",
    "date": "2026-10-30",
    "startTime": "10:00",
    "endTime": "13:00",
    "bookingType": "HOURLY"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "lockToken": "lock_7f8a9b2c...",
    "expiresAt": "2026-10-30T10:05:00.000Z",
    "lockDurationSeconds": 300,
    "pricing": {
      "durationHours": 3.0,
      "hourlyRate": 40.0,
      "seatAmount": 120.0,
      "taxAmount": 21.6,
      "platformFee": 10.0,
      "totalAmount": 151.6
    }
  }
  ```

### 5.2. Confirm Booking and Process Payment
- **Method:** `POST`
- **Route:** `/api/bookings/confirm`
- **Auth:** Bearer Token (User)
- **Request Body:**
  ```json
  {
    "lockToken": "lock_7f8a9b2c...",
    "paymentMethod": "UPI"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "booking": {
      "id": "b-uuid-101",
      "bookingCode": "LIB-2026-X89",
      "status": "CONFIRMED",
      "totalAmount": 151.6,
      "qrCode": "data:image/png;base64,iVBORw0KGgo...",
      "seatNumber": "S-01",
      "libraryName": "Central Study Oasis"
    }
  }
  ```

### 5.3. Cancel Booking (50% Refund)
- **Method:** `POST`
- **Route:** `/api/bookings/:id/cancel`
- **Auth:** Bearer Token (Owner of booking)
- **Success Response (200 OK):** Returns refund amount, initiates payment reversal, and releases seat.

---

## 6. Owner Management API (`/api/owner`)

### 6.1. Add Library Branch
- **Method:** `POST`
- **Route:** `/api/owner/libraries`
- **Auth:** Bearer Token (`OWNER` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "name": "Apex Study Hub",
    "tagline": "Quiet air-conditioned study hall",
    "address": "45 Park Avenue, Hazratganj",
    "city": "Lucknow",
    "district": "Lucknow",
    "state": "Uttar Pradesh",
    "pincode": "226001",
    "bannerImage": "data:image/jpeg;base64,...",
    "interiorImage": "data:image/jpeg;base64,...",
    "amenitiesImage": "data:image/jpeg;base64,...",
    "hourlyRate": 40,
    "enableMonthly": true,
    "monthlyRate": 1200,
    "enableYearly": true,
    "yearlyRate": 12000,
    "hourlySeats": 10,
    "monthlySeats": 5,
    "yearlySeats": 5,
    "openingTime": "07:00",
    "closingTime": "23:00",
    "facilities": ["Air Conditioned", "High-Speed WiFi", "Power Sockets"]
  }
  ```
- **Success Response (201 Created):** Returns newly created library with `status: "PENDING"`.

### 6.2. Verify Student QR Code Pass
- **Method:** `POST`
- **Route:** `/api/owner/verify-qr`
- **Auth:** Bearer Token (`OWNER` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "bookingCode": "LIB-2026-X89",
    "libraryId": "lib-uuid-1"
  }
  ```
- **Success Response (200 OK):** Returns student name, desk number, pass validity, and attendance status for today.

### 6.3. Check-In Booking / Punch Gate Attendance
- **Method:** `POST`
- **Route:** `/api/owner/check-in`
- **Auth:** Bearer Token (`OWNER` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "bookingId": "b-uuid-101"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Check-in confirmed and attendance recorded successfully!",
    "attendance": {
      "id": "att-uuid-1",
      "date": "2026-10-30",
      "checkInTime": "2026-10-30T10:14:22.000Z"
    }
  }
  ```

---

## 7. Platform Governance & Admin API (`/api/admin`)

### 7.1. Platform KPI Metrics & Analytics
- **Method:** `GET`
- **Route:** `/api/admin/stats`
- **Auth:** Bearer Token (`ADMIN`)
- **Response:** Automatically scopes metrics to the Sub-Admin's state if `SUB_ADMIN`, or returns national Pan-India metrics if `MASTER_ADMIN`.

### 7.2. Approve or Reject Library
- **Method:** `PATCH`
- **Routes:**
  - `/api/admin/libraries/:id/approve`
  - `/api/admin/libraries/:id/reject` *(Body: `{ "rejectionReason": "..." }`)*
  - `/api/admin/libraries/:id/forward` *(Body: `{ "forwardReason": "..." }`)*

### 7.3. Sub-Admin Management (Master Admin Only)
- **Method:** `POST`
- **Route:** `/api/admin/sub-admins`
- **Auth:** Bearer Token (Master Admin)
- **Request Body:**
  ```json
  {
    "name": "Vikram Singh",
    "email": "admin.up@libspace.com",
    "password": "SubAdminPassword123!",
    "assignedState": "Uttar Pradesh"
  }
  ```
