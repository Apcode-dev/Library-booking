import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

export class ManagerController {
  /**
   * Get Manager Assigned Library Dashboard
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const managerId = req.user!.id;
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          securityPin: true,
          assignedLibraryId: true,
        },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: No library has been assigned to this manager account.',
        });
        return;
      }

      const now = new Date();
      const library = await prisma.library.findUnique({
        where: { id: manager.assignedLibraryId },
        include: {
          seatZones: {
            include: {
              seats: {
                include: {
                  bookings: {
                    where: {
                      status: { in: ['CONFIRMED', 'CHECKED_IN', 'ACTIVE'] },
                    },
                    include: {
                      user: { select: { name: true, email: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                  },
                  seatLocks: {
                    where: {
                      status: 'ACTIVE',
                      expiresAt: { gt: now },
                    },
                  },
                },
                orderBy: { seatNumber: 'asc' },
              },
            },
          },
          seats: {
            include: {
              bookings: {
                where: {
                  status: { in: ['CONFIRMED', 'CHECKED_IN', 'ACTIVE'] },
                },
                include: {
                  user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
              seatLocks: {
                where: {
                  status: 'ACTIVE',
                  expiresAt: { gt: now },
                },
              },
            },
            orderBy: { seatNumber: 'asc' },
          },
        },
      });

      if (!library) {
        res.status(404).json({
          success: false,
          message: 'Assigned library not found or has been removed.',
        });
        return;
      }

      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const [currentYearStr, currentMonthStr] = todayDateStr.split('-');
      const currentYear = parseInt(currentYearStr, 10);
      const currentMonth = parseInt(currentMonthStr, 10) - 1; // 0-indexed
      const currentMonthKey = `${currentYearStr}-${currentMonthStr}`;

      const todayCheckIns = await prisma.attendance.count({
        where: {
          libraryId: library.id,
          date: todayDateStr,
        },
      });

      const recentAttendanceLogs = await prisma.attendance.findMany({
        where: {
          libraryId: library.id,
        },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          booking: { select: { bookingCode: true, bookingType: true, seat: { select: { seatNumber: true } } } },
        },
        orderBy: { checkInTime: 'desc' },
        take: 50,
      });

      const activeBookings = await prisma.booking.count({
        where: {
          libraryId: library.id,
          status: { in: ['CONFIRMED', 'ACTIVE', 'CHECKED_IN'] },
        },
      });

      // Fetch confirmed/completed bookings for revenue & occupancy calculation
      const allBookings = await prisma.booking.findMany({
        where: {
          libraryId: library.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'ACTIVE'] },
        },
        include: {
          payment: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          seat: { select: { id: true, seatNumber: true, seatType: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      let todayRevenue = 0;
      let currentMonthRevenue = 0;
      const oldRecordsMap = new Map<string, { totalRevenue: number; bookingsCount: number }>();

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      allBookings.forEach((b) => {
        const amount = b.payment?.amount || b.totalAmount || 0;
        const bDateStr = b.date || (b.createdAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(b.createdAt)) : '');
        const bMonthKey = bDateStr ? bDateStr.slice(0, 7) : currentMonthKey;

        if (bDateStr === todayDateStr) {
          todayRevenue += amount;
        }

        if (bMonthKey === currentMonthKey) {
          currentMonthRevenue += amount;
        } else if (bMonthKey < currentMonthKey) {
          const current = oldRecordsMap.get(bMonthKey) || { totalRevenue: 0, bookingsCount: 0 };
          current.totalRevenue += amount;
          current.bookingsCount += 1;
          oldRecordsMap.set(bMonthKey, current);
        }
      });

      // Format oldRecords as sorted array (most recent past month first)
      const oldRecords = Array.from(oldRecordsMap.entries())
        .map(([mKey, data]) => {
          const [y, m] = mKey.split('-');
          const monthIndex = parseInt(m, 10) - 1;
          const label = `${monthNames[monthIndex] || mKey} ${y}`;
          return {
            monthKey: mKey,
            label,
            totalRevenue: Math.round(data.totalRevenue * 100) / 100,
            bookingsCount: data.bookingsCount,
          };
        })
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      const totalSeats = library.seats.length || library.totalSeats || 0;
      const activeRightNow = allBookings.filter((b) => {
        if (b.status === 'CHECKED_IN') return true;
        if (b.status === 'ACTIVE' || b.status === 'CONFIRMED') {
          if (b.date === todayDateStr) return true;
          if (b.validUntil && new Date(b.validUntil) >= now) return true;
          if (b.startDateTime && b.endDateTime) {
            const start = new Date(b.startDateTime);
            const end = new Date(b.endDateTime);
            return start <= now && end >= now;
          }
        }
        return false;
      }).length;

      const liveOccupiedSeats = activeRightNow > 0 ? activeRightNow : (activeBookings > 0 ? activeBookings : 0);
      const occupancyRate = totalSeats > 0 ? Math.min(100, Math.round((liveOccupiedSeats / totalSeats) * 100)) : 0;

      const formatSeat = (seat: any) => {
        const activeBooking = seat.bookings?.[0];
        const activeLock = seat.seatLocks?.[0];
        let computedStatus = 'AVAILABLE';
        if (!seat.isAvailable) {
          computedStatus = 'MAINTENANCE';
        } else if (activeBooking?.status === 'CHECKED_IN' || activeBooking?.status === 'ACTIVE') {
          computedStatus = 'CHECKED_IN';
        } else if (activeBooking?.status === 'CONFIRMED') {
          computedStatus = 'BOOKED';
        } else if (activeLock) {
          computedStatus = 'LOCKED';
        }

        return {
          id: seat.id,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
          category: seat.category || 'HOURLY',
          hourlyPrice: seat.hourlyPrice,
          hasPowerSocket: seat.hasPowerSocket,
          hasLamp: seat.hasLamp,
          isAvailable: seat.isAvailable,
          libraryId: seat.libraryId,
          seatZoneId: seat.seatZoneId,
          status: computedStatus,
          activeStudentName: activeBooking?.user?.name || null,
          activeBookingCode: activeBooking?.bookingCode || null,
        };
      };

      const formattedSeatZones = (library.seatZones || []).map((zone) => ({
        ...zone,
        seats: (zone.seats || []).map(formatSeat),
      }));

      const formattedDirectSeats = (library.seats || []).map(formatSeat);

      res.json({
        success: true,
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          hasPin: Boolean(manager.securityPin),
        },
        library: {
          ...library,
          photos: JSON.parse(library.photos || '[]'),
          facilities: JSON.parse(library.facilities || '[]'),
          seatZones: formattedSeatZones,
          seats: formattedDirectSeats,
        },
        todayCheckIns,
        recentAttendance: recentAttendanceLogs,
        activeBookings,
        allBookings,
        metrics: {
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          currentMonthRevenue: Math.round(currentMonthRevenue * 100) / 100,
          currentMonthName: `${monthNames[currentMonth]} ${currentYear}`,
          totalSeats: totalSeats || library.totalSeats || 0,
          occupiedSeats: liveOccupiedSeats || 0,
          occupancyRate: occupancyRate || 0,
          oldRecords: oldRecords || [],
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch manager dashboard', error: error.message });
    }
  }

  /**
   * Verify Manager's Security PIN to Unlock Branch Card
   */
  static async verifyPin(req: Request, res: Response): Promise<void> {
    try {
      const managerId = req.user!.id;
      const { pin } = req.body;

      if (!pin) {
        res.status(400).json({ success: false, message: 'Security PIN is required.' });
        return;
      }

      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { securityPin: true },
      });

      if (!manager || !manager.securityPin) {
        res.status(400).json({
          success: false,
          message: 'Security PIN has not been configured for your account. Please ask the library owner.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(pin.toString().trim(), manager.securityPin);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Incorrect 6-digit Security PIN.' });
        return;
      }

      res.json({ success: true, message: 'Branch card unlocked successfully!' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to verify PIN', error: error.message });
    }
  }

  /**
   * Get Daily Bookings strictly for the Manager's Assigned Library
   * (Returns today's daily active bookings only by default)
   */
  static async getBookings(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const scope = (req.query.scope as string) || 'daily';
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const startOfDay = new Date(todayDateStr + 'T00:00:00.000Z');

      const whereClause: any = { libraryId: manager.assignedLibraryId };
      if (scope !== 'all') {
        // Daily bookings only (today date, created today in IST, or active/checked-in)
        whereClause.OR = [
          { date: todayDateStr },
          { createdAt: { gte: startOfDay } },
          { status: { in: ['CHECKED_IN', 'ACTIVE'] } },
        ];
      }

      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, studentId: true } },
          seat: { select: { id: true, seatNumber: true, seatType: true } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, todayDate: todayDateStr, count: bookings.length, bookings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
    }
  }

  /**
   * Get Daily Bookings specifically
   */
  static async getDailyBookings(req: Request, res: Response): Promise<void> {
    req.query.scope = 'daily';
    return ManagerController.getBookings(req, res);
  }

  /**
   * Get Old Bookings (Day-by-Day Historical Archive with auto-archival into database)
   */
  static async getOldBookings(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const libraryId = manager.assignedLibraryId;
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

      // 1. Fetch past bookings prior to today for this library
      const pastBookings = await prisma.booking.findMany({
        where: {
          libraryId,
          date: { lt: todayDateStr },
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, studentId: true } },
          seat: { select: { id: true, seatNumber: true, seatType: true } },
          payment: true,
        },
        orderBy: { date: 'desc' },
      });

      // Group past bookings by date
      const dateMap = new Map<string, typeof pastBookings>();
      for (const b of pastBookings) {
        const bDate = b.date || (b.createdAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(b.createdAt)) : '');
        if (!bDate || bDate >= todayDateStr) continue;
        if (!dateMap.has(bDate)) {
          dateMap.set(bDate, []);
        }
        dateMap.get(bDate)!.push(b);
      }

      // 2. Auto-archive: Upsert each past day into ArchivedDailyBooking table safely
      try {
        for (const [dateStr, dayBookings] of dateMap.entries()) {
          const dayRevenue = dayBookings.reduce(
            (sum, b) => sum + (b.payment?.amount || b.totalAmount || 0),
            0
          );

          await prisma.archivedDailyBooking.upsert({
            where: {
              libraryId_date: {
                libraryId,
                date: dateStr,
              },
            },
            update: {
              totalBookings: dayBookings.length,
              totalRevenue: dayRevenue,
              bookingsData: JSON.stringify(dayBookings),
            },
            create: {
              libraryId,
              date: dateStr,
              totalBookings: dayBookings.length,
              totalRevenue: dayRevenue,
              bookingsData: JSON.stringify(dayBookings),
            },
          });
        }
      } catch (upsertErr) {
        console.warn('Auto-archival upsert warning:', upsertErr);
      }

      // 3. Query all archived daily records from database table
      let archivedRecords = await prisma.archivedDailyBooking.findMany({
        where: { libraryId },
        orderBy: { date: 'desc' },
      });

      let days: any[] = [];
      if (archivedRecords.length > 0) {
        days = archivedRecords.map((rec) => {
          let bookings: any[] = [];
          try {
            bookings = JSON.parse(rec.bookingsData);
          } catch (_) {}

          const parsedDate = new Date(rec.date);
          const formattedDate = !isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : rec.date;

          return {
            id: rec.id,
            date: rec.date,
            formattedDate,
            totalBookings: rec.totalBookings,
            totalRevenue: rec.totalRevenue,
            bookings,
          };
        });
      } else {
        // Fallback directly to dateMap if database records are empty
        days = Array.from(dateMap.entries()).map(([dateStr, dayBookings]) => {
          const dayRevenue = dayBookings.reduce(
            (sum, b) => sum + (b.payment?.amount || b.totalAmount || 0),
            0
          );
          const parsedDate = new Date(dateStr);
          const formattedDate = !isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : dateStr;

          return {
            id: `arch-${dateStr}`,
            date: dateStr,
            formattedDate,
            totalBookings: dayBookings.length,
            totalRevenue: dayRevenue,
            bookings: dayBookings,
          };
        }).sort((a, b) => b.date.localeCompare(a.date));
      }

      res.json({
        success: true,
        daysCount: days.length,
        days,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch old bookings archive',
        error: error.message,
      });
    }
  }

  /**
   * Verify QR Code Pass strictly for Manager's Assigned Library
   */
  static async verifyQrCode(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const { bookingCode } = req.body;
      if (!bookingCode) {
        res.status(400).json({ success: false, message: 'Booking code or QR payload is required.' });
        return;
      }

      let cleanCode = bookingCode.trim();
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = parsed.code.trim();
        else if (parsed.bookingCode) cleanCode = parsed.bookingCode.trim();
      } catch (_) {}

      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ bookingCode: cleanCode }, { id: cleanCode }],
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, studentId: true } },
          library: { select: { id: true, name: true, city: true } },
          seat: { select: { id: true, seatNumber: true, seatType: true } },
          payment: true,
        },
      });

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Invalid QR Pass: No matching booking record found.',
        });
        return;
      }

      // STRICT VALIDATION: Must match manager's assigned library!
      if (booking.libraryId !== manager.assignedLibraryId) {
        res.status(403).json({
          success: false,
          message: `Pass Not Valid: This booking pass is registered for "${booking.library.name}", not your branch!`,
        });
        return;
      }

      const now = new Date();
      const isExpired = booking.validUntil ? now > new Date(booking.validUntil) : false;

      // Check today's attendance for this pass
      const todayDateStr = new Date().toLocaleDateString('en-CA');
      const todayAttendance = await prisma.attendance.findUnique({
        where: {
          bookingId_date: {
            bookingId: booking.id,
            date: todayDateStr,
          },
        },
      });

      const totalAttendances = await prisma.attendance.count({
        where: { bookingId: booking.id },
      });

      res.json({
        success: true,
        valid: !isExpired,
        isExpired,
        alreadyMarkedToday: !!todayAttendance,
        todayAttendance,
        totalAttendances,
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          bookingType: booking.bookingType || 'HOURLY',
          validUntil: booking.validUntil,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalAmount: booking.totalAmount,
          status: booking.status,
          student: booking.user,
          libraryName: booking.library.name,
          seatNumber: booking.seat?.seatNumber,
          paymentStatus: booking.payment?.paymentStatus || 'PAID',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'QR verification failed', error: error.message });
    }
  }

  /**
   * Check in / Punch Attendance strictly for Manager's Assigned Library
   */
  static async checkInBooking(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const { bookingId, bookingCode } = req.body;
      let codeOrId = (bookingCode || bookingId || '').trim();
      try {
        const parsed = JSON.parse(codeOrId);
        if (parsed.code) codeOrId = parsed.code.trim();
        else if (parsed.bookingCode) codeOrId = parsed.bookingCode.trim();
        else if (parsed.id) codeOrId = parsed.id.trim();
      } catch (_) {}

      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ bookingCode: codeOrId }, { id: codeOrId }],
        },
        include: { user: true, seat: true, library: true },
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found.' });
        return;
      }

      if (booking.libraryId !== manager.assignedLibraryId) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: You cannot check in students for other libraries.',
        });
        return;
      }

      const todayDateStr = new Date().toLocaleDateString('en-CA');
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          bookingId_date: {
            bookingId: booking.id,
            date: todayDateStr,
          },
        },
      });

      if (existingAttendance) {
        res.json({
          success: true,
          alreadyMarked: true,
          message: `Attendance already recorded for today at ${new Date(existingAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
          attendance: existingAttendance,
        });
        return;
      }

      const now = new Date();
      const attendance = await prisma.attendance.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          libraryId: booking.libraryId,
          date: todayDateStr,
          checkInTime: now,
          passType: booking.bookingType || 'HOURLY',
          seatNumber: booking.seat?.seatNumber || null,
        },
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { checkInTime: now, status: 'CHECKED_IN', isCurrentlyInside: true },
      });

      res.json({
        success: true,
        message: `Attendance marked successfully for ${booking.user.name} at Desk ${booking.seat?.seatNumber || 'N/A'}!`,
        attendance,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Check-in failed', error: error.message });
    }
  }

  /**
   * Get All Students who have booked this Assigned Library
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const bookings = await prisma.booking.findMany({
        where: { libraryId: manager.assignedLibraryId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              studentId: true,
              avatar: true,
              city: true,
              state: true,
            },
          },
          seat: { select: { seatNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group students uniquely
      const studentMap = new Map<string, any>();
      for (const b of bookings) {
        if (!b.user) continue;
        if (!studentMap.has(b.user.id)) {
          studentMap.set(b.user.id, {
            ...b.user,
            totalBookings: 0,
            lastVisit: b.createdAt,
            lastSeatNumber: b.seat?.seatNumber || 'N/A',
            bookingStatus: b.status,
          });
        }
        const studentRecord = studentMap.get(b.user.id);
        studentRecord.totalBookings += 1;
      }

      const students = Array.from(studentMap.values());
      res.json({ success: true, students });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
  }

  /**
   * Toggle Desk status in Manager's Assigned Library
   */
  static async toggleSeat(req: Request, res: Response): Promise<void> {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { assignedLibraryId: true },
      });

      if (!manager || !manager.assignedLibraryId) {
        res.status(403).json({ success: false, message: 'No assigned library found.' });
        return;
      }

      const { seatId } = req.params;
      const seat = await prisma.seat.findFirst({
        where: { id: seatId, libraryId: manager.assignedLibraryId },
      });

      if (!seat) {
        res.status(404).json({ success: false, message: 'Seat not found in your assigned library.' });
        return;
      }

      const updated = await prisma.seat.update({
        where: { id: seatId },
        data: { isAvailable: !seat.isAvailable },
      });

      res.json({
        success: true,
        message: `Desk ${updated.seatNumber} is now ${updated.isAvailable ? 'AVAILABLE' : 'UNDER MAINTENANCE'}!`,
        seat: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to toggle seat', error: error.message });
    }
  }
}
