import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { EmailService } from '../services/email.service';

export class OwnerController {
  /**
   * Submit new library for Admin approval (Max 5 libraries per Master Account)
   */
  static async createLibrary(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;

      // STRICT LIMIT: Max 5 libraries per Owner Master Account
      const existingCount = await prisma.library.count({ where: { ownerId } });
      if (existingCount >= 5) {
        res.status(400).json({
          success: false,
          message: 'Maximum limit reached: You can list a maximum of 5 libraries under your Master Account.',
        });
        return;
      }

      // Generate sequential LID (e.g. LID-102)
      const allCount = await prisma.library.count();
      const generatedLid = `LID-${100 + allCount + 1}`;

      const {
        name,
        tagline,
        description,
        address,
        city,
        district,
        state,
        pincode,
        latitude,
        longitude,
        photos,
        bannerImage,
        interiorImage,
        amenitiesImage,
        facilities,
        hourlyRate,
        dailyRate,
        openingTime,
        closingTime,
        totalSeats,
        enableMembership,
        enableMonthly,
        monthlyRate,
        monthlyDetails,
        enableYearly,
        yearlyRate,
        yearlyDetails,
        taxPercent,
        serviceFee,
        extraChargesDesc,
        hourlySeats,
        monthlySeats,
        yearlySeats,
      } = req.body;

      if (!name || !address || !city || !hourlyRate) {
        res.status(400).json({
          success: false,
          message: 'Name, address, city, and hourlyRate are required.',
        });
        return;
      }

      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

      // Calculate category seat counts
      const isMembershipEnabled = enableMembership !== false;
      const isMonthlyEnabled = isMembershipEnabled && enableMonthly !== false;
      const isYearlyEnabled = isMembershipEnabled && enableYearly !== false;

      const hSeats = Math.max(1, Number(hourlySeats) || (totalSeats ? Math.round(Number(totalSeats) * 0.6) : 10));
      const mSeats = isMonthlyEnabled ? Math.max(0, Number(monthlySeats) || (totalSeats ? Math.round(Number(totalSeats) * 0.25) : 5)) : 0;
      const ySeats = isYearlyEnabled ? Math.max(0, Number(yearlySeats) || (totalSeats ? Math.round(Number(totalSeats) * 0.15) : 5)) : 0;
      const calculatedTotalSeats = hSeats + mSeats + ySeats;

      const library = await prisma.library.create({
        data: {
          lid: generatedLid,
          name,
          slug,
          tagline: tagline || '',
          description: description || 'Quiet, focus-friendly study library.',
          address,
          city,
          district: district || '',
          state: state || 'Delhi',
          pincode: pincode || '110001',
          latitude: Number(latitude) || 28.6139,
          longitude: Number(longitude) || 77.209,
          bannerImage: bannerImage || (Array.isArray(photos) && photos[0]) || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80',
          interiorImage: interiorImage || (Array.isArray(photos) && photos[1]) || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&auto=format&fit=crop&q=80',
          amenitiesImage: amenitiesImage || (Array.isArray(photos) && photos[2]) || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&auto=format&fit=crop&q=80',
          photos: JSON.stringify([
            bannerImage || (Array.isArray(photos) && photos[0]) || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80',
            interiorImage || (Array.isArray(photos) && photos[1]) || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&auto=format&fit=crop&q=80',
            amenitiesImage || (Array.isArray(photos) && photos[2]) || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&auto=format&fit=crop&q=80',
          ]),
          facilities: JSON.stringify(
            Array.isArray(facilities) && facilities.length > 0
              ? facilities
              : ['Air Conditioned', 'High-speed WiFi', 'Power Sockets', 'Silent Study Zone']
          ),
          hourlyRate: Number(hourlyRate),
          dailyRate: dailyRate ? Number(dailyRate) : Number(hourlyRate) * 8,
          monthlyRate: isMonthlyEnabled && monthlyRate ? Number(monthlyRate) : null,
          yearlyRate: isYearlyEnabled && yearlyRate ? Number(yearlyRate) : null,
          enableMembership: isMembershipEnabled,
          enableMonthly: isMonthlyEnabled,
          monthlyDetails: monthlyDetails || '30 Days Unlimited Study, Dedicated Desk, High-Speed WiFi & Locker Access',
          enableYearly: isYearlyEnabled,
          yearlyDetails: yearlyDetails || '365 Days VIP Access, Fixed Reserved Seat, Free Tea/Coffee & Meeting Room Access',
          taxPercent: taxPercent !== undefined ? Number(taxPercent) : 0,
          serviceFee: serviceFee !== undefined ? Number(serviceFee) : 0,
          extraChargesDesc: extraChargesDesc || 'Service & Maintenance Fee',
          hourlySeats: hSeats,
          monthlySeats: mSeats,
          yearlySeats: ySeats,
          openingTime: openingTime || '07:00',
          closingTime: closingTime || '23:00',
          status: 'PENDING', // Awaits Admin Approval
          totalSeats: calculatedTotalSeats,
          ownerId,
        },
      });

      // 1. Create Zone 1: Hourly Study Desks
      const hourlyZone = await prisma.seatZone.create({
        data: {
          name: '⏱️ Hourly Study Desks',
          description: 'Flexible hourly slots for everyday study sessions',
          libraryId: library.id,
        },
      });

      for (let i = 1; i <= hSeats; i++) {
        await prisma.seat.create({
          data: {
            seatNumber: `H-${i < 10 ? '0' + i : i}`,
            seatType: 'STANDARD',
            category: 'HOURLY',
            hourlyPrice: Number(hourlyRate),
            hasPowerSocket: true,
            hasLamp: true,
            isAvailable: true,
            libraryId: library.id,
            seatZoneId: hourlyZone.id,
          },
        });
      }

      // 2. Create Zone 2: Monthly Pass Desks (if enabled)
      if (mSeats > 0) {
        const monthlyZone = await prisma.seatZone.create({
          data: {
            name: '👑 Monthly Pass Desks',
            description: 'Dedicated reserved desks for 30-day monthly members',
            libraryId: library.id,
          },
        });

        for (let i = 1; i <= mSeats; i++) {
          await prisma.seat.create({
            data: {
              seatNumber: `M-${i < 10 ? '0' + i : i}`,
              seatType: 'PREMIUM_ERGONOMIC',
              category: 'MONTHLY',
              hourlyPrice: Number(hourlyRate),
              hasPowerSocket: true,
              hasLamp: true,
              isAvailable: true,
              libraryId: library.id,
              seatZoneId: monthlyZone.id,
            },
          });
        }
      }

      // 3. Create Zone 3: Yearly VIP Desks (if enabled)
      if (ySeats > 0) {
        const yearlyZone = await prisma.seatZone.create({
          data: {
            name: '👑 Yearly VIP Desks',
            description: 'Executive reserved study desks for 365-day VIP members',
            libraryId: library.id,
          },
        });

        for (let i = 1; i <= ySeats; i++) {
          await prisma.seat.create({
            data: {
              seatNumber: `Y-${i < 10 ? '0' + i : i}`,
              seatType: 'PRIVATE_CUBICLE',
              category: 'YEARLY',
              hourlyPrice: Number(hourlyRate),
              hasPowerSocket: true,
              hasLamp: true,
              isAvailable: true,
              libraryId: library.id,
              seatZoneId: yearlyZone.id,
            },
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Library submitted successfully! It will be reviewed by the admin shortly.',
        library,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create library', error: error.message });
    }
  }

  /**
   * Get all libraries owned by the logged-in owner with real-time seat occupancy status
   */
  static async getMyLibraries(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const now = new Date();

      const libraries = await prisma.library.findMany({
        where: { ownerId },
        include: {
          seatZones: {
            include: {
              seats: {
                include: {
                  bookings: {
                    where: {
                      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
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
              },
            },
          },
          _count: {
            select: { bookings: true, seats: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = libraries.map((lib) => ({
        ...lib,
        photos: JSON.parse(lib.photos || '[]'),
        facilities: JSON.parse(lib.facilities || '[]'),
        seatZones: lib.seatZones.map((zone) => ({
          ...zone,
          seats: zone.seats.map((seat) => {
            const activeBooking = seat.bookings[0];
            const activeLock = seat.seatLocks[0];

            let computedStatus = 'AVAILABLE';
            if (!seat.isAvailable) {
              computedStatus = 'MAINTENANCE';
            } else if (activeBooking?.status === 'CHECKED_IN') {
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
          }),
        })),
        categoryStats: (() => {
          const allSeats = lib.seatZones.flatMap((z) =>
            z.seats.map((seat) => {
              const activeBooking = seat.bookings[0];
              const activeLock = seat.seatLocks[0];
              let computedStatus = 'AVAILABLE';
              if (!seat.isAvailable) computedStatus = 'MAINTENANCE';
              else if (activeBooking?.status === 'CHECKED_IN') computedStatus = 'CHECKED_IN';
              else if (activeBooking?.status === 'CONFIRMED') computedStatus = 'BOOKED';
              else if (activeLock) computedStatus = 'LOCKED';
              return { ...seat, status: computedStatus };
            })
          );

          const getStats = (list: any[]) => ({
            total: list.length,
            available: list.filter((s) => s.status === 'AVAILABLE').length,
            booked: list.filter((s) => s.status === 'BOOKED' || s.status === 'LOCKED').length,
            occupied: list.filter((s) => s.status === 'CHECKED_IN').length,
            maintenance: list.filter((s) => s.status === 'MAINTENANCE').length,
          });

          return {
            hourly: getStats(allSeats.filter((s) => s.category === 'HOURLY' || !s.category)),
            monthly: getStats(allSeats.filter((s) => s.category === 'MONTHLY')),
            yearly: getStats(allSeats.filter((s) => s.category === 'YEARLY')),
            all: getStats(allSeats),
          };
        })(),
      }));

      res.json({
        success: true,
        libraries: formatted,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch owner libraries', error: error.message });
    }
  }

  /**
   * Update library details (profile, facilities, hourly pricing, membership plans, extra charges)
   */
  static async updateLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ownerId = req.user!.id;

      const existing = await prisma.library.findFirst({
        where: { id, ownerId },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Library not found or unauthorized.' });
        return;
      }

      const {
        name,
        tagline,
        description,
        address,
        city,
        hourlyRate,
        dailyRate,
        monthlyRate,
        yearlyRate,
        enableMembership,
        enableMonthly,
        monthlyDetails,
        enableYearly,
        yearlyDetails,
        taxPercent,
        serviceFee,
        extraChargesDesc,
        openingTime,
        closingTime,
        facilities,
        photos,
        bannerImage,
        interiorImage,
        amenitiesImage,
      } = req.body;

      const updated = await prisma.library.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(tagline !== undefined && { tagline }),
          ...(description && { description }),
          ...(address && { address }),
          ...(city && { city }),
          ...(hourlyRate && { hourlyRate: Number(hourlyRate) }),
          ...(dailyRate !== undefined && { dailyRate: dailyRate ? Number(dailyRate) : null }),
          ...(monthlyRate !== undefined && { monthlyRate: monthlyRate ? Number(monthlyRate) : null }),
          ...(yearlyRate !== undefined && { yearlyRate: yearlyRate ? Number(yearlyRate) : null }),
          ...(enableMembership !== undefined && { enableMembership: Boolean(enableMembership) }),
          ...(enableMonthly !== undefined && { enableMonthly: Boolean(enableMonthly) }),
          ...(monthlyDetails !== undefined && { monthlyDetails }),
          ...(enableYearly !== undefined && { enableYearly: Boolean(enableYearly) }),
          ...(yearlyDetails !== undefined && { yearlyDetails }),
          ...(taxPercent !== undefined && { taxPercent: Number(taxPercent) }),
          ...(serviceFee !== undefined && { serviceFee: Number(serviceFee) }),
          ...(extraChargesDesc !== undefined && { extraChargesDesc }),
          ...(openingTime && { openingTime }),
          ...(closingTime && { closingTime }),
          ...(facilities && { facilities: JSON.stringify(facilities) }),
          ...(bannerImage !== undefined && { bannerImage }),
          ...(interiorImage !== undefined && { interiorImage }),
          ...(amenitiesImage !== undefined && { amenitiesImage }),
          ...(photos && { photos: JSON.stringify(photos) }),
        },
      });

      res.json({
        success: true,
        message: 'Library and membership details updated successfully!',
        library: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update library', error: error.message });
    }
  }

  /**
   * Add a new seat to a zone
   */
  static async addSeat(req: Request, res: Response): Promise<void> {
    try {
      const { libraryId } = req.params;
      const { seatZoneId, seatNumber, seatType, hourlyPrice, hasPowerSocket, hasLamp } = req.body;
      const ownerId = req.user!.id;

      const library = await prisma.library.findFirst({
        where: { id: libraryId, ownerId },
      });

      if (!library) {
        res.status(404).json({ success: false, message: 'Library not found or unauthorized' });
        return;
      }

      const existingSeat = await prisma.seat.findFirst({
        where: { libraryId, seatNumber },
      });

      if (existingSeat) {
        res.status(400).json({ success: false, message: `Seat ${seatNumber} already exists in this library.` });
        return;
      }

      const seat = await prisma.seat.create({
        data: {
          seatNumber,
          seatType: seatType || 'STANDARD',
          hourlyPrice: Number(hourlyPrice) || library.hourlyRate,
          hasPowerSocket: hasPowerSocket !== false,
          hasLamp: hasLamp !== false,
          isAvailable: true,
          libraryId,
          seatZoneId,
        },
      });

      // Increment totalSeats in library
      await prisma.library.update({
        where: { id: libraryId },
        data: { totalSeats: { increment: 1 } },
      });

      res.status(201).json({
        success: true,
        message: 'Seat created successfully!',
        seat,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to add seat', error: error.message });
    }
  }

  /**
   * Toggle seat maintenance availability
   */
  static async toggleSeatAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { seatId } = req.params;
      const ownerId = req.user!.id;

      const seat = await prisma.seat.findUnique({
        where: { id: seatId },
        include: { library: true },
      });

      if (!seat || seat.library.ownerId !== ownerId) {
        res.status(404).json({ success: false, message: 'Seat not found or unauthorized' });
        return;
      }

      const updatedSeat = await prisma.seat.update({
        where: { id: seatId },
        data: { isAvailable: !seat.isAvailable },
      });

      res.json({
        success: true,
        message: `Seat ${updatedSeat.seatNumber} is now ${updatedSeat.isAvailable ? 'Available' : 'Under Maintenance'}`,
        seat: updatedSeat,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to toggle seat', error: error.message });
    }
  }

  /**
   * Owner Revenue & Occupancy Dashboard Metrics
   */
  static async getRevenueDashboard(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { libraryId } = req.query;

      // Find all libraries owned by this owner (or specific library if requested)
      const libraries = await prisma.library.findMany({
        where: {
          ownerId,
          ...(libraryId && typeof libraryId === 'string' ? { id: libraryId } : {}),
        },
        select: { id: true, name: true, totalSeats: true, lid: true },
      });

      const libraryIds = libraries.map((l) => l.id);

      // Fetch all bookings for owner's libraries
      const bookings = await prisma.booking.findMany({
        where: {
          libraryId: { in: libraryIds },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        include: {
          payment: true,
          seat: true,
          user: { select: { name: true, email: true } },
          library: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalBookings = bookings.length;
      let totalGrossRevenue = 0;
      let totalOwnerEarnings = 0;
      let todayEarnings = 0;

      const todayStr = new Date().toISOString().split('T')[0];

      bookings.forEach((b) => {
        if (b.payment) {
          totalGrossRevenue += b.payment.amount;
          totalOwnerEarnings += b.payment.ownerEarnings;

          if (b.date === todayStr) {
            todayEarnings += b.payment.ownerEarnings;
          }
        }
      });

      // Total seats across all libraries
      const totalSeats = libraries.reduce((acc, l) => acc + l.totalSeats, 0);

      // Active bookings right now
      const now = new Date();
      const activeRightNow = bookings.filter(
        (b) => new Date(b.startDateTime) <= now && new Date(b.endDateTime) >= now
      ).length;

      const occupancyRate =
        totalSeats > 0 ? parseFloat(((activeRightNow / totalSeats) * 100).toFixed(1)) : 0;

      res.json({
        success: true,
        metrics: {
          totalLibraries: libraries.length,
          totalSeats,
          totalBookings,
          activeRightNow,
          occupancyRate,
          totalGrossRevenue: parseFloat(totalGrossRevenue.toFixed(2)),
          totalOwnerEarnings: parseFloat(totalOwnerEarnings.toFixed(2)),
          todayEarnings: parseFloat(todayEarnings.toFixed(2)),
        },
        recentBookings: bookings.slice(0, 10),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch owner revenue', error: error.message });
    }
  }

  /**
   * Verify Student QR Code / Booking Pass
   */
  static async verifyQrCode(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
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
          OR: [
            { bookingCode: cleanCode },
            { id: cleanCode },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          library: { select: { id: true, name: true, ownerId: true, city: true } },
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

      // Security check: Must belong to one of the owner's libraries (or admin)
      if (req.user!.role !== 'ADMIN' && booking.library.ownerId !== ownerId) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: This booking pass belongs to a library managed by another owner.',
        });
        return;
      }

      const now = new Date();
      const isExpired = booking.validUntil ? now > new Date(booking.validUntil) : false;
      const daysRemaining = booking.validUntil
        ? Math.max(0, Math.ceil((new Date(booking.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      // Check today's attendance for this pass (local date)
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
        daysRemaining,
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
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
          durationHours: booking.durationHours,
          totalAmount: booking.totalAmount,
          status: booking.status,
          checkInTime: booking.checkInTime,
          student: booking.user,
          libraryName: booking.library.name,
          seatNumber: booking.seat?.seatNumber,
          seatType: booking.seat?.seatType,
          paymentStatus: booking.payment?.paymentStatus || 'PAID',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to verify QR pass', error: error.message });
    }
  }

  /**
   * Check In Student & Record Daily Attendance using verified QR booking pass
   * Security: Exactly 1 attendance mark allowed per pass per calendar day
   */
  static async checkInBooking(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { bookingCode, bookingId } = req.body;

      const codeOrId = (bookingCode || bookingId || '').trim();
      if (!codeOrId) {
        res.status(400).json({ success: false, message: 'Booking identifier is required.' });
        return;
      }

      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ bookingCode: codeOrId }, { id: codeOrId }],
        },
        include: {
          library: true,
          seat: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking record not found.' });
        return;
      }

      if (req.user!.role !== 'ADMIN' && booking.library.ownerId !== ownerId) {
        res.status(403).json({ success: false, message: 'Unauthorized for this library.' });
        return;
      }

      if (booking.status === 'CANCELLED') {
        res.status(400).json({ success: false, message: 'Cannot check in: Booking has been cancelled.' });
        return;
      }

      const now = new Date();

      // Check pass expiry
      if (booking.validUntil && now > new Date(booking.validUntil)) {
        res.status(400).json({
          success: false,
          isExpired: true,
          message: `❌ Cannot mark attendance: Premium Pass has expired on ${new Date(booking.validUntil).toLocaleDateString()}. Please ask student to renew.`,
        });
        return;
      }

      // Check duplicate attendance for today (strictly 1 attendance per day)
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
        res.status(409).json({
          success: false,
          alreadyMarkedToday: true,
          message: `⚠️ Attendance already recorded for today at ${new Date(existingAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Pass is valid. (Max 1 mark per day)`,
          attendance: existingAttendance,
        });
        return;
      }

      // Atomically create attendance log
      const attendance = await prisma.attendance.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          libraryId: booking.libraryId,
          date: todayDateStr,
          checkInTime: now,
          passType: booking.bookingType || 'HOURLY',
          seatNumber: booking.seat?.seatNumber || 'Standard',
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          library: { select: { name: true } },
        },
      });

      // Update booking checkInTime and status
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          checkInTime: now,
        },
      });

      res.json({
        success: true,
        message: `✅ Attendance recorded for ${attendance.user.name} on ${todayDateStr} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Desk: ${attendance.seatNumber}`,
        attendance,
        booking: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Check-in failed', error: error.message });
    }
  }

  /**
   * Get Students & Attendance Data for Owner Dashboard
   * Divides cleanly into:
   * 1. Daily / Hourly Bookings
   * 2. Premium Monthly & Yearly Passes
   * 3. Complete Chronological Attendance Logs
   */
  static async getStudentsAndAttendance(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { libraryId } = req.query;

      // Find all libraries owned by this owner (or specific library)
      const libraries = await prisma.library.findMany({
        where: {
          ownerId,
          ...(libraryId && typeof libraryId === 'string' ? { id: libraryId } : {}),
        },
        select: { id: true, name: true },
      });
      const libraryIds = libraries.map((l) => l.id);

      // Fetch all bookings for these libraries
      const bookings = await prisma.booking.findMany({
        where: { libraryId: { in: libraryIds } },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          library: { select: { id: true, name: true } },
          seat: { select: { id: true, seatNumber: true, seatType: true } },
          payment: { select: { paymentStatus: true, transactionId: true, amount: true } },
          attendances: { orderBy: { checkInTime: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();

      // Divide into daily bookings vs premium passes
      const dailyBookings = bookings.filter(
        (b) => b.bookingType === 'HOURLY' || b.bookingType === 'DAILY'
      );

      const premiumPasses = bookings
        .filter((b) => b.bookingType === 'MONTHLY' || b.bookingType === 'YEARLY')
        .map((b) => {
          const isExpired = b.validUntil ? now > new Date(b.validUntil) : false;
          const daysRemaining = b.validUntil
            ? Math.max(0, Math.ceil((new Date(b.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          return {
            ...b,
            isExpired,
            daysRemaining,
            totalAttendances: b.attendances.length,
            lastAttendance: b.attendances[0]?.checkInTime || null,
          };
        });

      // Fetch chronological attendance logs
      const attendanceLogs = await prisma.attendance.findMany({
        where: { libraryId: { in: libraryIds } },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          library: { select: { id: true, name: true } },
          booking: { select: { bookingCode: true, bookingType: true, validUntil: true } },
        },
        orderBy: { checkInTime: 'desc' },
        take: 200,
      });

      res.json({
        success: true,
        dailyBookings,
        premiumPasses,
        attendanceLogs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student and attendance records',
        error: error.message,
      });
    }
  }

  /**
   * Check if the Library Owner has set up their 6-digit security PIN
   */
  static async getPinStatus(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { securityPin: true },
      });

      res.json({
        success: true,
        hasPin: !!user?.securityPin,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to check PIN status', error: error.message });
    }
  }

  /**
   * Set up or update the 6-digit security PIN for the Library Owner
   */
  static async setupSecurityPin(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { pin } = req.body;

      if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) {
        res.status(400).json({ success: false, message: 'PIN must be exactly 6 numeric digits.' });
        return;
      }

      const hashedPin = await bcrypt.hash(pin.trim(), 10);
      await prisma.user.update({
        where: { id: ownerId },
        data: { securityPin: hashedPin },
      });

      res.json({
        success: true,
        message: '6-digit Security PIN created successfully! You can now unlock your libraries.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to set security PIN', error: error.message });
    }
  }

  /**
   * Verify 6-digit security PIN to unlock a library card
   */
  static async verifySecurityPin(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { pin } = req.body;

      if (!pin || typeof pin !== 'string') {
        res.status(400).json({ success: false, verified: false, message: 'Please enter your 6-digit PIN.' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { securityPin: true },
      });

      if (!user?.securityPin) {
        res.status(400).json({
          success: false,
          verified: false,
          requiresSetup: true,
          message: 'Security PIN has not been set yet. Please create your 6-digit PIN.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(pin.trim(), user.securityPin);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          verified: false,
          message: 'Incorrect PIN. Please enter the correct 6-digit security PIN.',
        });
        return;
      }

      res.json({
        success: true,
        verified: true,
        message: 'Security PIN verified successfully!',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, verified: false, message: 'Verification failed', error: error.message });
    }
  }

  /**
   * Forgot Security PIN - Dispatches 6-digit OTP to owner's registered email via Brevo
   */
  static async forgotSecurityPin(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Owner account not found.' });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: ownerId },
        data: {
          pinResetOtp: otp,
          pinResetExpiresAt: expiresAt,
        },
      });

      await EmailService.sendSecurityPinResetEmail({
        toEmail: user.email,
        toName: user.name,
        otp,
      });

      res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${user.email}. Please check your inbox.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to dispatch PIN reset OTP', error: error.message });
    }
  }

  /**
   * Reset Security PIN with Email OTP
   */
  static async resetSecurityPin(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const { otp, newPin } = req.body;

      if (!otp || !newPin) {
        res.status(400).json({ success: false, message: 'OTP and new 6-digit PIN are required.' });
        return;
      }

      if (!/^\d{6}$/.test(newPin.trim())) {
        res.status(400).json({ success: false, message: 'New PIN must be exactly 6 numeric digits.' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { pinResetOtp: true, pinResetExpiresAt: true },
      });

      if (!user || !user.pinResetOtp || user.pinResetOtp !== otp.trim()) {
        res.status(400).json({ success: false, message: 'Invalid verification code. Please check your email.' });
        return;
      }

      if (user.pinResetExpiresAt && user.pinResetExpiresAt < new Date()) {
        res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        return;
      }

      const hashedPin = await bcrypt.hash(newPin.trim(), 10);
      await prisma.user.update({
        where: { id: ownerId },
        data: {
          securityPin: hashedPin,
          pinResetOtp: null,
          pinResetExpiresAt: null,
        },
      });

      res.json({
        success: true,
        message: 'Security PIN reset successfully! You can now unlock your libraries with your new PIN.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reset PIN', error: error.message });
    }
  }
}
