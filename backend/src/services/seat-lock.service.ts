import crypto from 'crypto';
import prisma from '../config/prisma';
import { ENV } from '../config/env';
import { createDateTime, calculateDurationHours } from '../utils/time.utils';

export class SeatLockService {
  /**
   * Attempts to temporarily lock a seat for 5 minutes during the checkout/payment flow.
   * Enforces strict database-level double-booking prevention.
   */
  static async lockSeat(params: {
    userId: string;
    seatId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    bookingType?: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
  }) {
    const { userId, seatId, date, startTime, endTime, bookingType = 'HOURLY' } = params;

    const now = new Date();
    const todayDateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

    let startDateTime = createDateTime(date, startTime);

    if (bookingType === 'MONTHLY' || bookingType === 'YEARLY') {
      // If user is booking a pass starting today or earlier, anchor startDateTime to now
      if (startDateTime < now || date <= todayDateStr) {
        startDateTime = now;
      }
    } else {
      // For HOURLY bookings:
      if (date < todayDateStr) {
        throw new Error('Cannot book dates in the past.');
      }
      if (date === todayDateStr && startDateTime < now) {
        // If current time is within 30 minutes of start time, smoothly adapt to now
        const diffMinutes = (now.getTime() - startDateTime.getTime()) / (1000 * 60);
        if (diffMinutes > 30) {
          throw new Error('Cannot book time slots in the past. Please select an upcoming hour.');
        } else {
          startDateTime = now;
        }
      }
    }

    let endDateTime =
      bookingType === 'MONTHLY'
        ? new Date(startDateTime.getTime() + 30 * 24 * 60 * 60 * 1000)
        : bookingType === 'YEARLY'
        ? new Date(startDateTime.getTime() + 365 * 24 * 60 * 60 * 1000)
        : createDateTime(date, endTime);

    if (bookingType === 'HOURLY' && endDateTime <= startDateTime) {
      endDateTime = createDateTime(date, endTime, true); // rollover to next day for late night bookings
    }

    if (endDateTime <= startDateTime) {
      throw new Error('End time must be strictly after start time.');
    }

    // Run within a Prisma transaction to guarantee atomicity and race-condition safety
    return await prisma.$transaction(async (tx) => {
      // 1. Verify seat existence and maintenance status
      const seat = await tx.seat.findUnique({
        where: { id: seatId },
        include: { library: true, seatZone: true },
      });

      if (!seat) {
        throw new Error('Requested seat does not exist.');
      }

      if (!seat.isAvailable) {
        throw new Error('Seat is currently under maintenance and not available for booking.');
      }

      if (seat.library.status !== 'APPROVED') {
        throw new Error('This library is not currently approved for bookings.');
      }

      // Check membership availability on the library
      if (bookingType === 'MONTHLY' && (!seat.library.enableMembership || !seat.library.enableMonthly)) {
        throw new Error('Monthly membership pass is currently not offered for this library.');
      }
      if (bookingType === 'YEARLY' && (!seat.library.enableMembership || !seat.library.enableYearly)) {
        throw new Error('Yearly VIP pass is currently not offered for this library.');
      }

      // Check seat category allocation
      if (seat.category) {
        if (bookingType === 'HOURLY' && seat.category !== 'HOURLY') {
          throw new Error(`Desk ${seat.seatNumber} is reserved for ${seat.category} members. Please choose an Hourly desk.`);
        }
        if (bookingType === 'MONTHLY' && seat.category !== 'MONTHLY') {
          throw new Error(`Desk ${seat.seatNumber} is reserved for ${seat.category} bookings. Please select a Monthly Pass desk.`);
        }
        if (bookingType === 'YEARLY' && seat.category !== 'YEARLY') {
          throw new Error(`Desk ${seat.seatNumber} is reserved for ${seat.category} bookings. Please select a Yearly VIP desk.`);
        }
      }

      // 2. Overlap Check: Existing Confirmed / Checked-in Bookings
      // Overlap math: booking.startDateTime < endDateTime && booking.endDateTime > startDateTime
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          seatId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startDateTime: { lt: endDateTime },
          endDateTime: { gt: startDateTime },
        },
      });

      if (conflictingBooking) {
        throw new Error(
          `Double-booking prevented: Seat ${seat.seatNumber} is already confirmed for this time window.`
        );
      }

      // 3. Overlap Check: Active Temporary Seat Locks from other users (expiresAt > NOW())
      const conflictingLock = await tx.seatLock.findFirst({
        where: {
          seatId,
          status: 'ACTIVE',
          expiresAt: { gt: now },
          userId: { not: userId }, // allow current user to refresh/re-lock their own selection
          startDateTime: { lt: endDateTime },
          endDateTime: { gt: startDateTime },
        },
      });

      if (conflictingLock) {
        const remainingSeconds = Math.ceil(
          (conflictingLock.expiresAt.getTime() - now.getTime()) / 1000
        );
        throw new Error(
          `Seat ${seat.seatNumber} is currently locked by another user completing payment. Try again in ${remainingSeconds} seconds.`
        );
      }

      // 4. Release any older active lock held by this user for the same seat
      await tx.seatLock.updateMany({
        where: {
          userId,
          seatId,
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
        },
      });

      // 5. Create new 5-minute temporary lock
      const lockExpiresAt = new Date(
        now.getTime() + ENV.SEAT_LOCK_DURATION_MINUTES * 60 * 1000
      );
      const lockToken = `LOCK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newLock = await tx.seatLock.create({
        data: {
          lockToken,
          seatId,
          userId,
          date,
          startTime,
          endTime,
          startDateTime,
          endDateTime,
          expiresAt: lockExpiresAt,
          status: 'ACTIVE',
        },
      });

      // Calculate cost breakdown
      let seatAmount = 0;
      let durationHours = calculateDurationHours(startTime, endTime);
      const hourlyRate = seat.hourlyPrice || seat.library.hourlyRate;
      let durationLabel = `${durationHours} hours`;

      if (bookingType === 'MONTHLY') {
        durationHours = 30 * 12;
        seatAmount = seat.library.monthlyRate || Math.round(hourlyRate * 80);
        durationLabel = '30 Days (Monthly Pass)';
      } else if (bookingType === 'YEARLY') {
        durationHours = 365 * 12;
        seatAmount =
          seat.library.yearlyRate ||
          (seat.library.monthlyRate ? seat.library.monthlyRate * 10 : Math.round(hourlyRate * 750));
        durationLabel = '365 Days (Yearly VIP Pass)';
      } else {
        seatAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
      }

      // Owner-controlled extra charges & taxes (0 by default unless set by owner)
      const taxPercent = seat.library.taxPercent ?? 0;
      const taxAmount = parseFloat(((seatAmount * taxPercent) / 100).toFixed(2));
      const platformFee = parseFloat((seat.library.serviceFee ?? 0).toFixed(2));
      const totalAmount = parseFloat((seatAmount + taxAmount + platformFee).toFixed(2));

      return {
        lockToken: newLock.lockToken,
        lockId: newLock.id,
        bookingType,
        validUntil: endDateTime,
        durationLabel,
        expiresAt: newLock.expiresAt,
        lockDurationSeconds: ENV.SEAT_LOCK_DURATION_MINUTES * 60,
        seat: {
          id: seat.id,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
          category: seat.category,
          zoneName: seat.seatZone.name,
          libraryName: seat.library.name,
          libraryId: seat.library.id,
        },
        pricing: {
          durationHours,
          hourlyRate,
          seatAmount,
          taxPercent,
          taxAmount,
          platformFee,
          serviceFeeDesc: seat.library.extraChargesDesc || 'Service & Maintenance Fee',
          totalAmount,
        },
      };
    });
  }

  /**
   * Releases a temporary seat lock if user cancels or navigates back
   */
  static async releaseLock(lockToken: string, userId: string) {
    return await prisma.seatLock.updateMany({
      where: {
        lockToken,
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'RELEASED',
      },
    });
  }

  /**
   * Verifies that a lock is valid, unexpired, and owned by user before confirming payment.
   */
  static async verifyActiveLock(lockToken: string, userId: string) {
    const now = new Date();
    const lock = await prisma.seatLock.findUnique({
      where: { lockToken },
      include: { seat: { include: { library: true, seatZone: true } } },
    });

    if (!lock) {
      throw new Error('Invalid seat lock token.');
    }

    if (lock.userId !== userId) {
      throw new Error('Lock does not belong to the current authenticated user.');
    }

    if (lock.status !== 'ACTIVE' || lock.expiresAt <= now) {
      throw new Error('Seat hold has expired (5-minute limit exceeded). Please select your seat again.');
    }

    return lock;
  }
}
