import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { createDateTime } from '../utils/time.utils';

export class SeatController {
  /**
   * Get Real-time Seat Layout & Availability
   * for a specific library on a specific date and time slot.
   */
  static async getSeatAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { libraryId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'Date (YYYY-MM-DD), startTime (HH:MM), and endTime (HH:MM) are required.',
        });
        return;
      }

      const currentUserId = req.user?.id || null;
      let startDateTime = createDateTime(date as string, startTime as string);
      let endDateTime = createDateTime(date as string, endTime as string);
      if (endDateTime <= startDateTime) {
        endDateTime = createDateTime(date as string, endTime as string, true);
      }
      const now = new Date();

      // Fetch all zones and seats for this library
      const zones = await prisma.seatZone.findMany({
        where: { libraryId },
        include: {
          seats: {
            orderBy: { seatNumber: 'asc' },
          },
        },
      });

      if (!zones || zones.length === 0) {
        res.json({
          success: true,
          zones: [],
          stats: { total: 0, available: 0, booked: 0, locked: 0 },
        });
        return;
      }

      // Collect all seat IDs
      const allSeatIds = zones.flatMap((z) => z.seats.map((s) => s.id));

      // 1. Find overlapping confirmed bookings for this time window
      // Must not be expired (endDateTime must be > now if startDateTime is in past/present)
      const effectiveMinEnd = startDateTime > now ? startDateTime : now;
      const activeBookings = await prisma.booking.findMany({
        where: {
          seatId: { in: allSeatIds },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startDateTime: { lt: endDateTime },
          endDateTime: { gt: effectiveMinEnd },
        },
        select: {
          seatId: true,
          userId: true,
          startTime: true,
          endTime: true,
          bookingCode: true,
        },
      });

      const bookedSeatMap = new Map<string, any>();
      activeBookings.forEach((b) => bookedSeatMap.set(b.seatId, b));

      // 2. Find overlapping active temporary locks (expiresAt > NOW())
      const activeLocks = await prisma.seatLock.findMany({
        where: {
          seatId: { in: allSeatIds },
          status: 'ACTIVE',
          expiresAt: { gt: now },
          startDateTime: { lt: endDateTime },
          endDateTime: { gt: startDateTime },
        },
        select: {
          seatId: true,
          userId: true,
          expiresAt: true,
          lockToken: true,
        },
      });

      const lockedSeatMap = new Map<string, any>();
      activeLocks.forEach((l) => lockedSeatMap.set(l.seatId, l));

      let totalSeats = 0;
      let availableCount = 0;
      let bookedCount = 0;
      let lockedCount = 0;

      // Annotate each seat with dynamic status
      const mappedZones = zones.map((zone) => {
        const mappedSeats = zone.seats.map((seat) => {
          totalSeats++;
          const booking = bookedSeatMap.get(seat.id);
          const lock = lockedSeatMap.get(seat.id);

          let status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'MAINTENANCE' = 'AVAILABLE';
          let lockRemainingSeconds = 0;
          let isLockedByMe = false;

          if (!seat.isAvailable) {
            status = 'MAINTENANCE';
          } else if (booking) {
            status = 'BOOKED';
            bookedCount++;
          } else if (lock) {
            status = 'LOCKED';
            lockedCount++;
            lockRemainingSeconds = Math.max(
              0,
              Math.ceil((new Date(lock.expiresAt).getTime() - now.getTime()) / 1000)
            );
            if (currentUserId && lock.userId === currentUserId) {
              isLockedByMe = true;
            }
          } else {
            status = 'AVAILABLE';
            availableCount++;
          }

          return {
            id: seat.id,
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
            category: seat.category || 'HOURLY',
            hourlyPrice: seat.hourlyPrice,
            hasPowerSocket: seat.hasPowerSocket,
            hasLamp: seat.hasLamp,
            status,
            isBooked: !!booking,
            isLocked: !!lock,
            isLockedByMe,
            lockRemainingSeconds,
          };
        });

        return {
          id: zone.id,
          name: zone.name,
          description: zone.description,
          seats: mappedSeats,
        };
      });

      res.json({
        success: true,
        date,
        startTime,
        endTime,
        stats: {
          total: totalSeats,
          available: availableCount,
          booked: bookedCount,
          locked: lockedCount,
        },
        zones: mappedZones,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to calculate seat availability',
        error: error.message,
      });
    }
  }
}
