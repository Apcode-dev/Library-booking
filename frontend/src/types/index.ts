export type UserRole = 'USER' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export interface Library {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  photos: string[];
  facilities: string[];
  hourlyRate: number;
  dailyRate?: number;
  monthlyRate?: number;
  yearlyRate?: number;
  enableMembership?: boolean;
  enableMonthly?: boolean;
  monthlyDetails?: string;
  enableYearly?: boolean;
  yearlyDetails?: string;
  taxPercent?: number;
  serviceFee?: number;
  extraChargesDesc?: string;
  hourlySeats?: number;
  monthlySeats?: number;
  yearlySeats?: number;
  categoryStats?: {
    hourly: { total: number; available: number; booked: number; occupied: number; maintenance: number };
    monthly: { total: number; available: number; booked: number; occupied: number; maintenance: number };
    yearly: { total: number; available: number; booked: number; occupied: number; maintenance: number };
    all: { total: number; available: number; booked: number; occupied: number; maintenance: number };
  };
  openingTime: string;
  closingTime: string;
  totalSeats: number;
  availableSeats?: number;
  rating: number;
  reviewCount: number;
  distanceKm?: number | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  owner?: { id?: string; name: string; email: string; phone?: string };
  seatZones?: SeatZone[];
  reviews?: Review[];
}

export interface SeatZone {
  id: string;
  name: string;
  description?: string;
  seats: Seat[];
}

export interface Seat {
  id: string;
  seatNumber: string;
  seatType: 'STANDARD' | 'PREMIUM_ERGONOMIC' | 'PRIVATE_CUBICLE';
  category?: 'HOURLY' | 'MONTHLY' | 'YEARLY';
  hourlyPrice: number;
  hasPowerSocket: boolean;
  hasLamp: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'MAINTENANCE';
  isBooked?: boolean;
  isLocked?: boolean;
  isLockedByMe?: boolean;
  lockRemainingSeconds?: number;
}

export interface SeatLockResponse {
  lockToken: string;
  lockId: string;
  expiresAt: string;
  lockDurationSeconds: number;
  bookingType?: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
  validUntil?: string;
  durationLabel?: string;
  seat: {
    id: string;
    seatNumber: string;
    seatType: string;
    category?: 'HOURLY' | 'MONTHLY' | 'YEARLY';
    zoneName: string;
    libraryName: string;
    libraryId: string;
  };
  pricing: {
    durationHours: number;
    hourlyRate: number;
    seatAmount: number;
    taxPercent?: number;
    taxAmount: number;
    platformFee: number;
    serviceFeeDesc?: string;
    totalAmount: number;
  };
}

export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  libraryId: string;
  seatId: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  durationHours: number;
  hourlyRate: number;
  seatAmount: number;
  taxAmount: number;
  platformFee: number;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED_NOSHOW';
  bookingType?: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
  validUntil?: string;
  qrCode?: string;
  checkInTime?: string;
  reminder30Sent?: boolean;
  reminder90Sent?: boolean;
  refundAmount?: number;
  refundStatus?: string;
  cancellationReason?: string;
  canRebook?: boolean;
  isExpiringSoon?: boolean;
  minutesToEnd?: number;
  createdAt: string;
  library?: {
    id: string;
    name: string;
    address: string;
    city: string;
    photo?: string;
  };
  seat?: {
    id: string;
    seatNumber: string;
    seatType: string;
    seatZone?: { name: string };
  };
  payment?: {
    amount: number;
    paymentMethod: string;
    transactionId: string;
    paymentStatus: string;
  };
  attendances?: Attendance[];
  isActive?: boolean;
}

export interface Attendance {
  id: string;
  bookingId: string;
  userId: string;
  libraryId: string;
  date: string;
  checkInTime: string;
  passType: 'MONTHLY' | 'YEARLY' | 'HOURLY' | 'DAILY';
  seatNumber?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  library?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
  };
  booking?: {
    id: string;
    bookingCode: string;
    bookingType?: string;
    date?: string;
    validUntil?: string;
    seat?: { seatNumber: string };
  };
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    avatar?: string;
  };
}
