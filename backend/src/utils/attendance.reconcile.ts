import prisma from '../config/prisma';
import { createDateTime } from './time.utils';

/**
 * Automatically reconciles unclosed attendances:
 * When a student's booked slot or shift time has elapsed, automatically updates
 * checkOutTime to the scheduled slot/shift end time, checkOutType to 'AUTO_EXPIRED',
 * and clears isCurrentlyInside on the booking.
 */
export async function autoReconcileExpiredAttendance(libraryIds?: string[] | string): Promise<number> {
  try {
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    const libFilter = libraryIds
      ? Array.isArray(libraryIds)
        ? { in: libraryIds }
        : libraryIds
      : undefined;

    // Fetch unclosed attendances (where checkOutTime is null)
    const unclosed = await prisma.attendance.findMany({
      where: {
        checkOutTime: null,
        ...(libFilter ? { libraryId: libFilter } : {}),
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingType: true,
            date: true,
            startTime: true,
            endTime: true,
            startDateTime: true,
            endDateTime: true,
            isCurrentlyInside: true,
          },
        },
      },
      take: 100,
    });

    if (unclosed.length === 0) return 0;

    let reconciledCount = 0;

    for (const att of unclosed) {
      const b = att.booking;
      if (!b) {
        // Attendance with no booking: close at check-in + 4 hours or now
        const fallbackExit = new Date(att.checkInTime.getTime() + 4 * 60 * 60 * 1000);
        if (now > fallbackExit) {
          await prisma.attendance.update({
            where: { id: att.id },
            data: {
              checkOutTime: fallbackExit,
              checkOutType: 'AUTO_EXPIRED',
              durationMinutes: 240,
              manualExitNotes: 'Auto-exited: Session elapsed',
            },
          });
          reconciledCount++;
        }
        continue;
      }

      let shouldAutoExit = false;
      let calculatedExitTime: Date = now;

      if (b.bookingType === 'HOURLY' || b.bookingType === 'DAILY') {
        // Hourly or Daily booking
        if (b.endDateTime && now > new Date(b.endDateTime)) {
          shouldAutoExit = true;
          calculatedExitTime = new Date(b.endDateTime);
        } else if (att.date < todayStr) {
          // Date is in the past
          shouldAutoExit = true;
          calculatedExitTime = b.endTime
            ? createDateTime(att.date, b.endTime)
            : new Date(att.checkInTime.getTime() + 2 * 60 * 60 * 1000);
        } else if (b.endTime) {
          const shiftEnd = createDateTime(att.date, b.endTime);
          if (now > shiftEnd) {
            shouldAutoExit = true;
            calculatedExitTime = shiftEnd;
          }
        }
      } else {
        // MONTHLY or YEARLY pass with daily recurring shift
        if (att.date < todayStr) {
          // Attended on a past calendar day
          shouldAutoExit = true;
          calculatedExitTime = b.endTime
            ? createDateTime(att.date, b.endTime)
            : new Date(att.checkInTime.getTime() + 8 * 60 * 60 * 1000);
        } else if (b.endTime) {
          // Attended today, check if shift end time has passed
          const todayShiftEnd = createDateTime(todayStr, b.endTime);
          if (now > todayShiftEnd) {
            shouldAutoExit = true;
            calculatedExitTime = todayShiftEnd;
          }
        }
      }

      if (shouldAutoExit) {
        const diffMs = calculatedExitTime.getTime() - att.checkInTime.getTime();
        const durationMinutes = Math.max(15, Math.round(diffMs / (1000 * 60)));

        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            checkOutTime: calculatedExitTime,
            checkOutType: 'AUTO_EXPIRED',
            durationMinutes,
            manualExitNotes: 'Auto-exited: Shift schedule completed',
          },
        });

        if (b.isCurrentlyInside) {
          await prisma.booking.update({
            where: { id: b.id },
            data: {
              isCurrentlyInside: false,
              checkOutTime: calculatedExitTime,
              checkOutType: 'AUTO_EXPIRED',
              ...(b.bookingType === 'HOURLY' ? { status: 'COMPLETED' } : {}),
            },
          });
        }

        reconciledCount++;
      }
    }

    return reconciledCount;
  } catch (err) {
    console.error('Error during autoReconcileExpiredAttendance:', err);
    return 0;
  }
}
