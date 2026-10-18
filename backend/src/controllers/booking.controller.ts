import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { SeatLockService } from '../services/seat-lock.service';
import { generateQRCodeDataURL } from '../utils/qr.utils';
import { EmailService } from '../services/email.service';
import { ENV } from '../config/env';

export class BookingController {
  /**
   * Step 1: Temporarily lock a seat for 5 minutes
   * Checks database collisions and creates an active temporary lock.
   */
  static async lockSeat(req: Request, res: Response): Promise<void> {
    try {
      const { seatId, date, startTime, endTime, bookingType } = req.body;
      const userId = req.user!.id;

      if (!seatId || !date || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'seatId, date (YYYY-MM-DD), startTime (HH:MM), and endTime (HH:MM) are required.',
        });
        return;
      }

      const lockResult = await SeatLockService.lockSeat({
        userId,
        seatId,
        date,
        startTime,
        endTime,
        bookingType: bookingType || 'HOURLY',
      });

      res.status(200).json({
        success: true,
        message: 'Seat held successfully for 5 minutes. Complete payment to confirm.',
        data: lockResult,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to lock seat',
      });
    }
  }

  /**
   * Step 1.5: Explicitly release hold if user closes modal / cancels
   */
  static async releaseSeat(req: Request, res: Response): Promise<void> {
    try {
      const { lockToken } = req.body;
      const userId = req.user!.id;

      if (!lockToken) {
        res.status(400).json({ success: false, message: 'lockToken is required.' });
        return;
      }

      await SeatLockService.releaseLock(lockToken, userId);

      res.json({
        success: true,
        message: 'Seat lock released successfully.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Step 2: Confirm Booking & Process Payment (Simulated)
   * Verifies valid 5-min lock, creates booking, records payment, and generates QR code pass.
   */
  static async confirmBooking(req: Request, res: Response): Promise<void> {
    try {
      const { lockToken, paymentMethod, razorpayPaymentId, razorpayOrderId, bookingType: reqBookingType } = req.body;
      const userId = req.user!.id;

      if (!lockToken) {
        res.status(400).json({ success: false, message: 'lockToken is required.' });
        return;
      }

      // 1. Verify lock validity and expiration
      const lock = await SeatLockService.verifyActiveLock(lockToken, userId);

      const seat = lock.seat;
      const library = seat.library;

      // 2. Perform Booking & Payment in atomic transaction
      const booking = await prisma.$transaction(async (tx) => {
        // Detect pass / booking type
        const diffMs = lock.endDateTime.getTime() - lock.startDateTime.getTime();
        const isMonthPass = reqBookingType === 'MONTHLY' || diffMs > 25 * 24 * 60 * 60 * 1000;
        const isYearPass = reqBookingType === 'YEARLY' || diffMs > 300 * 24 * 60 * 60 * 1000;
        const bookingType = isYearPass ? 'YEARLY' : isMonthPass ? 'MONTHLY' : (reqBookingType || 'HOURLY');
        const validUntil = isMonthPass || isYearPass ? lock.endDateTime : null;

        // Calculate pricing
        let durationHours = Math.max(
          0.5,
          diffMs / (1000 * 60 * 60)
        );
        const hourlyRate = seat.hourlyPrice || library.hourlyRate;
        let seatAmount = 0;

        if (bookingType === 'MONTHLY') {
          durationHours = 30 * 12;
          seatAmount = library.monthlyRate || Math.round(hourlyRate * 80);
        } else if (bookingType === 'YEARLY') {
          durationHours = 365 * 12;
          seatAmount =
            library.yearlyRate ||
            (library.monthlyRate ? library.monthlyRate * 10 : Math.round(hourlyRate * 750));
        } else {
          seatAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
        }

        const taxPercent = library.taxPercent ?? 0;
        const taxAmount = parseFloat(((seatAmount * taxPercent) / 100).toFixed(2));
        const platformFee = parseFloat((library.serviceFee ?? 0).toFixed(2));
        const totalAmount = parseFloat((seatAmount + taxAmount + platformFee).toFixed(2));

        const platformCommission = parseFloat(
          ((seatAmount * ENV.PLATFORM_COMMISSION_PERCENT) / 100).toFixed(2)
        );
        const ownerEarnings = parseFloat((seatAmount - platformCommission).toFixed(2));

        const bookingCode = `LIB-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
        const transactionId = razorpayPaymentId || `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Generate QR code content for check-in & daily attendance
        const qrPayload = JSON.stringify({
          code: bookingCode,
          type: bookingType,
          seat: seat.seatNumber,
          library: library.name,
          date: lock.date,
          validUntil: validUntil ? validUntil.toISOString().split('T')[0] : lock.date,
        });
        const qrDataUrl = await generateQRCodeDataURL(qrPayload);

        // Create Booking
        const newBooking = await tx.booking.create({
          data: {
            bookingCode,
            userId,
            libraryId: library.id,
            seatId: seat.id,
            date: lock.date,
            startTime: lock.startTime,
            endTime: lock.endTime,
            startDateTime: lock.startDateTime,
            endDateTime: lock.endDateTime,
            durationHours,
            hourlyRate,
            seatAmount,
            taxAmount,
            platformFee,
            totalAmount,
            status: 'CONFIRMED',
            bookingType,
            validUntil,
            qrCode: qrDataUrl,
          },
        });

        // Create Payment record
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount: totalAmount,
            currency: 'INR',
            paymentMethod: razorpayPaymentId ? 'RAZORPAY' : (paymentMethod || 'RAZORPAY'),
            transactionId,
            platformCommission,
            ownerEarnings,
            paymentStatus: 'PAID',
          },
        });

        // Mark SeatLock as CONVERTED so it can never be reused
        await tx.seatLock.update({
          where: { id: lock.id },
          data: { status: 'CONVERTED' },
        });

        return newBooking;
      });

      // Fetch full booking with library, seat, and payment details
      const fullBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          library: true,
          seat: { include: { seatZone: true } },
          payment: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Seat booked and payment confirmed successfully! Your digital pass is ready.',
        booking: fullBooking,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to confirm booking',
      });
    }
  }

  /**
   * Get all bookings for the logged-in user (Active & Past)
   */
  static async getUserBookings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          library: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              photos: true,
            },
          },
          seat: {
            include: { seatZone: true },
          },
          payment: true,
          attendances: {
            orderBy: { checkInTime: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();
      const formatted = bookings.map((b) => {
        const photos = JSON.parse(b.library.photos || '[]');
        const isActive =
          (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
          (b.validUntil ? new Date(b.validUntil) >= now : new Date(b.endDateTime) >= now);

        const diffMsToEnd = new Date(b.endDateTime).getTime() - now.getTime();
        const minutesToEnd = Math.floor(diffMsToEnd / (1000 * 60));
        // Can rebook/extend if it's HOURLY and active
        const canRebook =
          b.bookingType === 'HOURLY' &&
          (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
          diffMsToEnd > 0;
        // Urgent 15-minute countdown trigger
        const isExpiringSoon = canRebook && minutesToEnd <= 15;

        return {
          ...b,
          library: {
            ...b.library,
            photo: photos[0] || '',
          },
          isActive,
          canRebook,
          isExpiringSoon,
          minutesToEnd: Math.max(0, minutesToEnd),
        };
      });

      res.json({
        success: true,
        bookings: formatted,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
    }
  }

  /**
   * Get single booking pass with QR code
   */
  static async getBookingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          library: true,
          seat: { include: { seatZone: true } },
          user: { select: { name: true, email: true, phone: true } },
          payment: true,
        },
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      // Check permission: User can view their own, Owner can view for their library, Admin can view all
      if (
        userRole === 'USER' &&
        booking.userId !== userId
      ) {
        res.status(403).json({ success: false, message: 'Unauthorized to view this booking' });
        return;
      }

      const now = new Date();
      const diffMsToEnd = new Date(booking.endDateTime).getTime() - now.getTime();
      const minutesToEnd = Math.floor(diffMsToEnd / (1000 * 60));
      const canRebook =
        booking.bookingType === 'HOURLY' &&
        (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN') &&
        diffMsToEnd > 0;
      const isExpiringSoon = canRebook && minutesToEnd <= 15;

      res.json({
        success: true,
        booking: {
          ...booking,
          canRebook,
          isExpiringSoon,
          minutesToEnd: Math.max(0, minutesToEnd),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch booking', error: error.message });
    }
  }

  /**
   * Cancel booking: 50% cancellation fee deducted, 50% refund processed.
   * Immediately releases seat so other users can book.
   */
  static async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          payment: true,
          library: true,
          seat: true,
          user: { select: { name: true, email: true } },
        },
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      if (booking.userId !== userId && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking' });
        return;
      }

      if (booking.status === 'CANCELLED') {
        res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
        return;
      }

      if (booking.status === 'COMPLETED' || booking.status === 'EXPIRED_NOSHOW') {
        res.status(400).json({ success: false, message: 'Cannot cancel an expired or completed booking.' });
        return;
      }

      // Rule 2: 50% cancellation fee deducted, 50% refund processed
      const cancellationFee = parseFloat((booking.totalAmount * 0.50).toFixed(2));
      const refundAmount = parseFloat((booking.totalAmount * 0.50).toFixed(2));

      const updated = await prisma.$transaction(async (tx) => {
        const cancelledBooking = await tx.booking.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            refundAmount,
            refundStatus: 'PROCESSED_50_CANCEL',
            cancellationReason: 'Voluntary student cancellation (50% refund applied)',
          },
        });

        if (booking.payment) {
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: { paymentStatus: 'REFUNDED_50_PERCENT' },
          });
        }

        // Immediately free the seat so other users can book
        await tx.seat.update({
          where: { id: booking.seatId },
          data: { isAvailable: true },
        });

        return cancelledBooking;
      });

      // Send 50% refund confirmation email
      if (booking.user?.email) {
        EmailService.sendCancellationRefundEmail({
          toEmail: booking.user.email,
          toName: booking.user.name,
          libraryName: booking.library.name,
          seatNumber: booking.seat.seatNumber,
          bookingCode: booking.bookingCode,
          totalPaid: booking.totalAmount,
          refundAmount,
          cancellationFee,
        });
      }

      res.json({
        success: true,
        message: `Booking cancelled successfully! A 50% refund of ₹${refundAmount.toFixed(2)} has been initiated (50% cancellation fee: ₹${cancellationFee.toFixed(2)}).`,
        refund: {
          totalPaid: booking.totalAmount,
          cancellationFee,
          refundAmount,
          status: 'REFUNDED_50_PERCENT',
        },
        booking: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to cancel booking', error: error.message });
    }
  }

  /**
   * Rebook / Seat Time Extension
   * Available starting 15 minutes before booking ends (or during active session).
   * Verifies collision, calculates pricing, extends session, and keeps seat reserved.
   */
  static async extendBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { additionalHours = 1, razorpayPaymentId, paymentMethod } = req.body;
      const userId = req.user!.id;

      const hoursToAdd = Number(additionalHours);
      if (!hoursToAdd || hoursToAdd <= 0) {
        res.status(400).json({ success: false, message: 'additionalHours must be greater than 0.' });
        return;
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          seat: true,
          library: true,
          payment: true,
        },
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found.' });
        return;
      }

      if (booking.userId !== userId && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Unauthorized to extend this booking.' });
        return;
      }

      if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
        res.status(400).json({
          success: false,
          message: `Cannot extend booking with status ${booking.status}.`,
        });
        return;
      }

      const now = new Date();
      if (new Date(booking.endDateTime) < now) {
        res.status(400).json({
          success: false,
          message: 'Booking session has already ended. Please make a fresh booking.',
        });
        return;
      }

      const newEndDateTime = new Date(
        new Date(booking.endDateTime).getTime() + hoursToAdd * 60 * 60 * 1000
      );

      // 1. Conflict Check: Other confirmed bookings on this desk
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          seatId: booking.seatId,
          id: { not: booking.id },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startDateTime: { lt: newEndDateTime },
          endDateTime: { gt: booking.endDateTime },
        },
      });

      if (conflictingBooking) {
        res.status(409).json({
          success: false,
          message: `Cannot extend: Desk ${booking.seat.seatNumber} has another booking scheduled for the upcoming slot.`,
        });
        return;
      }

      // 2. Conflict Check: Active temporary locks by other users
      const conflictingLock = await prisma.seatLock.findFirst({
        where: {
          seatId: booking.seatId,
          userId: { not: userId },
          status: 'ACTIVE',
          expiresAt: { gt: now },
          startDateTime: { lt: newEndDateTime },
          endDateTime: { gt: booking.endDateTime },
        },
      });

      if (conflictingLock) {
        res.status(409).json({
          success: false,
          message: `Cannot extend: Another user is currently locking Desk ${booking.seat.seatNumber} for the upcoming slot.`,
        });
        return;
      }

      // Pricing calculation for extension
      const hourlyRate = booking.hourlyRate;
      const additionalSeatAmount = parseFloat((hoursToAdd * hourlyRate).toFixed(2));
      const taxPercent = booking.library.taxPercent ?? 0;
      const additionalTax = parseFloat(((additionalSeatAmount * taxPercent) / 100).toFixed(2));
      const additionalTotal = parseFloat((additionalSeatAmount + additionalTax).toFixed(2));

      // Calculate new end time string
      const endH = String(newEndDateTime.getHours()).padStart(2, '0');
      const endM = String(newEndDateTime.getMinutes()).padStart(2, '0');
      const newEndTimeStr = `${endH}:${endM}`;

      // Update QR Code pass payload with new end time
      const qrPayload = JSON.stringify({
        code: booking.bookingCode,
        type: booking.bookingType,
        seat: booking.seat.seatNumber,
        library: booking.library.name,
        date: booking.date,
        endTime: newEndTimeStr,
      });
      const newQrCode = await generateQRCodeDataURL(qrPayload);

      // Execute update atomically
      const updatedBooking = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
          where: { id: booking.id },
          data: {
            endTime: newEndTimeStr,
            endDateTime: newEndDateTime,
            durationHours: booking.durationHours + hoursToAdd,
            seatAmount: parseFloat((booking.seatAmount + additionalSeatAmount).toFixed(2)),
            taxAmount: parseFloat((booking.taxAmount + additionalTax).toFixed(2)),
            totalAmount: parseFloat((booking.totalAmount + additionalTotal).toFixed(2)),
            qrCode: newQrCode,
          },
          include: {
            library: true,
            seat: { include: { seatZone: true } },
            payment: true,
          },
        });

        if (booking.payment) {
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: {
              amount: parseFloat((booking.payment.amount + additionalTotal).toFixed(2)),
            },
          });
        }

        return b;
      });

      res.json({
        success: true,
        message: `Desk ${booking.seat.seatNumber} time successfully extended by ${hoursToAdd} hour(s) until ${newEndTimeStr}!`,
        booking: updatedBooking,
        extension: {
          additionalHours: hoursToAdd,
          additionalAmount: additionalTotal,
          newEndTime: newEndTimeStr,
          newEndDateTime,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to extend seat time', error: error.message });
    }
  }

  /**
   * Get all attendance logs for the logged-in student across all passes
   */
  static async getMyAttendance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const attendances = await prisma.attendance.findMany({
        where: { userId },
        include: {
          library: { select: { id: true, name: true, address: true, city: true } },
          booking: {
            select: {
              id: true,
              bookingCode: true,
              bookingType: true,
              date: true,
              validUntil: true,
              seat: { select: { seatNumber: true } },
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
      });

      res.json({
        success: true,
        attendances,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch attendance history', error: error.message });
    }
  }

  /**
   * Get attendance logs for a specific pass/booking
   */
  static async getBookingAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const attendances = await prisma.attendance.findMany({
        where: { bookingId: id, userId },
        include: {
          library: { select: { name: true } },
        },
        orderBy: { checkInTime: 'desc' },
      });

      res.json({
        success: true,
        attendances,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch pass attendance', error: error.message });
    }
  }
}
