import prisma from '../config/prisma';
import { EmailService } from './email.service';

export class BookingCleanupService {
  /**
   * Scans database for:
   * 1. Expired seat locks (5-min hold release)
   * 2. Completed/expired seat bookings (release seat & process 30% refund if no-show)
   * 3. Unchecked-in bookings requiring 30-min or 90-min check-in reminders
   */
  static async processExpiredBookingsAndLocks(): Promise<void> {
    try {
      const now = new Date();

      // 1. Process Expired Seat Locks (5-min hold release)
      await prisma.seatLock.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      // 2. Process Completed / Expired Bookings (endDateTime <= now)
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          endDateTime: { lte: now },
        },
        include: {
          user: { select: { name: true, email: true } },
          library: {
            select: {
              name: true,
              owner: { select: { name: true, email: true } },
            },
          },
          seat: { select: { id: true, seatNumber: true } },
          payment: true,
        },
      });

      for (const booking of expiredBookings) {
        const isNoShow = !booking.checkInTime && booking.status === 'CONFIRMED';

        if (isNoShow) {
          // Rule 2: If user did NOT check in before end time, refund 30% and release seat
          const refundAmount = parseFloat((booking.totalAmount * 0.30).toFixed(2));

          await prisma.$transaction(async (tx) => {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: 'EXPIRED_NOSHOW',
                refundAmount,
                refundStatus: 'PROCESSED_30_NOSHOW',
                cancellationReason: 'No check-in recorded before booking expiry (30% auto-refund)',
              },
            });

            if (booking.payment) {
              await tx.payment.update({
                where: { id: booking.payment.id },
                data: {
                  paymentStatus: 'REFUNDED_30_PERCENT',
                },
              });
            }

            // Immediately release seat to AVAILABLE
            await tx.seat.update({
              where: { id: booking.seat.id },
              data: { isAvailable: true },
            });
          });

          console.log(
            `⚠️ [No-Show Refund] Booking ${booking.bookingCode} for Desk ${booking.seat.seatNumber} expired without check-in. 30% refund (₹${refundAmount}) processed.`
          );

          // Dispatch 30% refund email to Student
          if (booking.user?.email) {
            EmailService.sendNoShowRefundEmail({
              toEmail: booking.user.email,
              toName: booking.user.name,
              libraryName: booking.library.name,
              seatNumber: booking.seat.seatNumber,
              bookingCode: booking.bookingCode,
              totalPaid: booking.totalAmount,
              refundAmount,
            });
          }
        } else {
          // Normal session completion
          await prisma.$transaction(async (tx) => {
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: 'COMPLETED' },
            });

            // Release seat to AVAILABLE
            await tx.seat.update({
              where: { id: booking.seat.id },
              data: { isAvailable: true },
            });
          });

          console.log(
            `⏰ [Auto Cleanup] Booking ${booking.bookingCode} completed for Desk ${booking.seat.seatNumber} at ${booking.library.name}`
          );

          // Send session complete emails
          if (booking.user?.email) {
            EmailService.sendBookingOverStudentEmail({
              toEmail: booking.user.email,
              toName: booking.user.name,
              libraryName: booking.library.name,
              seatNumber: booking.seat.seatNumber,
              bookingCode: booking.bookingCode,
            });
          }

          if (booking.library.owner?.email) {
            EmailService.sendBookingOverOwnerEmail({
              toEmail: booking.library.owner.email,
              toName: booking.library.owner.name,
              studentName: booking.user.name,
              libraryName: booking.library.name,
              seatNumber: booking.seat.seatNumber,
              bookingCode: booking.bookingCode,
            });
          }
        }
      }

      // 3. Process Check-in Reminders (at 30 mins and 1 hr 30 mins after booking start)
      const uncheckedBookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          checkInTime: null,
          endDateTime: { gt: now },
        },
        include: {
          user: { select: { name: true, email: true } },
          library: { select: { name: true } },
          seat: { select: { seatNumber: true } },
        },
      });

      for (const booking of uncheckedBookings) {
        const elapsedMinutes = (now.getTime() - new Date(booking.startDateTime).getTime()) / (1000 * 60);

        if (elapsedMinutes >= 90 && !booking.reminder90Sent) {
          // 90-minute reminder
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminder90Sent: true, reminder30Sent: true },
          });

          if (booking.user?.email) {
            EmailService.sendCheckInReminderEmail({
              toEmail: booking.user.email,
              toName: booking.user.name,
              libraryName: booking.library.name,
              seatNumber: booking.seat.seatNumber,
              bookingCode: booking.bookingCode,
              minutesElapsed: 90,
            });
          }
          console.log(`🔔 [Check-in Reminder 90m] Sent to ${booking.user.email} for ${booking.bookingCode}`);
        } else if (elapsedMinutes >= 30 && !booking.reminder30Sent) {
          // 30-minute reminder
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminder30Sent: true },
          });

          if (booking.user?.email) {
            EmailService.sendCheckInReminderEmail({
              toEmail: booking.user.email,
              toName: booking.user.name,
              libraryName: booking.library.name,
              seatNumber: booking.seat.seatNumber,
              bookingCode: booking.bookingCode,
              minutesElapsed: 30,
            });
          }
          console.log(`🔔 [Check-in Reminder 30m] Sent to ${booking.user.email} for ${booking.bookingCode}`);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in BookingCleanupService:', err.message);
    }
  }

  /**
   * Starts background interval running every 30 seconds
   */
  static startCronJob(): void {
    console.log('⏱️ [Booking Cleanup Service] Automatic seat release, no-show refund & reminder service started.');
    // Run immediately once on start
    BookingCleanupService.processExpiredBookingsAndLocks();
    // Run every 30 seconds for quick reactive status management
    setInterval(() => {
      BookingCleanupService.processExpiredBookingsAndLocks();
    }, 30000);
  }
}
