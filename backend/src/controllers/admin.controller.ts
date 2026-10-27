import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

export class AdminController {
  /**
   * Admin Platform Overview Metrics & Financial Dashboard
   * Scoped to State if logged in as SUB_ADMIN; Pan-India if MASTER_ADMIN.
   */
  static async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      const isSubAdmin = req.user?.adminType === 'SUB_ADMIN';
      const assignedState = req.user?.assignedState || null;

      // ==========================================
      // 1. SUB-ADMIN VIEW (State Scoped)
      // ==========================================
      if (isSubAdmin && assignedState) {
        const [
          totalLibrariesInState,
          approvedLibrariesInState,
          pendingLibrariesInState,
          forwardedLibrariesInState,
          rejectedLibrariesInState,
          stateLibraries,
          stateBookingsCount,
          statePayments,
          recentStateBookings,
          totalRegisteredUsers,
          usersWithBookings,
          totalLibraryOwners,
          pendingOwnersCount,
          approvedOwnersCount,
        ] = await Promise.all([
          prisma.library.count({ where: { state: assignedState } }),
          prisma.library.count({ where: { state: assignedState, status: 'APPROVED' } }),
          prisma.library.count({ where: { state: assignedState, status: 'PENDING' } }),
          prisma.library.count({ where: { state: assignedState, status: 'FORWARDED_TO_MASTER' } }),
          prisma.library.count({ where: { state: assignedState, status: 'REJECTED' } }),
          prisma.library.findMany({
            where: { state: assignedState },
            select: {
              id: true,
              lid: true,
              name: true,
              city: true,
              state: true,
              address: true,
              status: true,
              hourlyRate: true,
              _count: { select: { seats: true, bookings: true } },
              bookings: {
                where: { payment: { paymentStatus: 'PAID' } },
                select: {
                  payment: {
                    select: { amount: true, platformCommission: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.booking.count({
            where: { library: { state: assignedState } },
          }),
          prisma.payment.findMany({
            where: {
              paymentStatus: 'PAID',
              booking: { library: { state: assignedState } },
            },
          }),
          prisma.booking.findMany({
            where: { library: { state: assignedState } },
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { name: true, email: true } },
              library: { select: { name: true, city: true } },
              payment: true,
            },
          }),
          prisma.user.count({ where: { role: 'USER' } }),
          prisma.user.count({ where: { role: 'USER', bookings: { some: {} } } }),
          prisma.user.count({ where: { role: 'OWNER' } }),
          prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'PENDING' } }),
          prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'APPROVED' } }),
        ]);

        const stateGMV = statePayments.reduce((acc, p) => acc + p.amount, 0);
        const stateCommission = statePayments.reduce((acc, p) => acc + p.platformCommission, 0);
        const totalStateDesks = stateLibraries.reduce((acc, l) => acc + (l._count?.seats || 0), 0);

        // Calculate Per-Library Revenue & Performance Breakdown
        const perLibraryStats = stateLibraries.map((lib) => {
          const libraryRevenue = lib.bookings.reduce(
            (acc, b) => acc + (b.payment?.amount || 0),
            0
          );
          const libraryCommission = lib.bookings.reduce(
            (acc, b) => acc + (b.payment?.platformCommission || 0),
            0
          );
          return {
            id: lib.id,
            lid: lib.lid,
            name: lib.name,
            city: lib.city,
            state: lib.state,
            address: lib.address,
            status: lib.status,
            hourlyRate: lib.hourlyRate,
            totalDesks: lib._count.seats,
            totalBookings: lib._count.bookings,
            totalRevenue: parseFloat(libraryRevenue.toFixed(2)),
            platformCommission: parseFloat(libraryCommission.toFixed(2)),
          };
        });

        res.json({
          success: true,
          isSubAdmin: true,
          assignedState,
          stats: {
            assignedState,
            totalLibraries: totalLibrariesInState,
            totalApprovedLibraries: approvedLibrariesInState,
            pendingApprovals: pendingLibrariesInState,
            forwardedApprovals: forwardedLibrariesInState,
            rejectedLibraries: rejectedLibrariesInState,
            totalBookings: stateBookingsCount,
            totalDesks: totalStateDesks,
            totalGMV: parseFloat(stateGMV.toFixed(2)),
            platformCommissionEarned: parseFloat(stateCommission.toFixed(2)),
            totalRegisteredUsers,
            usersWithBookings,
            usersWithoutBookings: totalRegisteredUsers - usersWithBookings,
            totalLibraryOwners,
            approvedOwners: approvedOwnersCount,
            pendingOwners: pendingOwnersCount,
          },
          perLibraryStats,
          recentBookings: recentStateBookings,
        });
        return;
      }

      // ==========================================
      // 2. MASTER ADMIN VIEW (Pan-India)
      // ==========================================
      const [
        totalUsers,
        totalRegisteredUsers,
        usersWithBookings,
        totalLibraryOwners,
        pendingOwnersCount,
        approvedOwnersCount,
        ownersWithLibraries,
        totalLibraries,
        pendingLibraries,
        forwardedToMasterCount,
        totalBookings,
        payments,
        subAdminsCount,
        allSubAdmins,
        recentBookings,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.user.count({ where: { role: 'USER', bookings: { some: {} } } }),
        prisma.user.count({ where: { role: 'OWNER' } }),
        prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'PENDING' } }),
        prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'APPROVED' } }),
        prisma.user.count({ where: { role: 'OWNER', ownedLibraries: { some: {} } } }),
        prisma.library.count({ where: { status: 'APPROVED' } }),
        prisma.library.count({ where: { status: 'PENDING' } }),
        prisma.library.count({ where: { status: 'FORWARDED_TO_MASTER' } }),
        prisma.booking.count(),
        prisma.payment.findMany({ where: { paymentStatus: 'PAID' } }),
        prisma.user.count({ where: { role: 'ADMIN', adminType: 'SUB_ADMIN' } }),
        prisma.user.findMany({
          where: { role: 'ADMIN', adminType: 'SUB_ADMIN' },
          select: { id: true, name: true, email: true, assignedState: true },
        }),
        prisma.booking.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            library: { select: { name: true, city: true, state: true } },
            payment: true,
          },
        }),
      ]);

      const totalGMV = payments.reduce((acc, p) => acc + p.amount, 0);
      const totalCommission = payments.reduce((acc, p) => acc + p.platformCommission, 0);

      // State Distribution Breakdown
      const supportedStates = [
        'Uttar Pradesh',
        'Rajasthan',
        'Delhi',
        'Bihar',
        'Maharashtra',
        'Haryana',
      ];

      const stateDistribution = await Promise.all(
        supportedStates.map(async (state) => {
          const [libCount, pendingCount, forwardedCount] = await Promise.all([
            prisma.library.count({ where: { state, status: 'APPROVED' } }),
            prisma.library.count({ where: { state, status: 'PENDING' } }),
            prisma.library.count({ where: { state, status: 'FORWARDED_TO_MASTER' } }),
          ]);
          const assignedAdmin = allSubAdmins.find((a) => a.assignedState === state);
          return {
            state,
            approvedLibraries: libCount,
            pendingApprovals: pendingCount,
            forwardedApprovals: forwardedCount,
            assignedAdmin: assignedAdmin
              ? { id: assignedAdmin.id, name: assignedAdmin.name, email: assignedAdmin.email }
              : null,
          };
        })
      );

      res.json({
        success: true,
        isSubAdmin: false,
        stats: {
          totalUsers,
          totalRegisteredUsers,
          usersWithBookings,
          usersWithoutBookings: totalRegisteredUsers - usersWithBookings,
          totalLibraryOwners,
          approvedOwners: approvedOwnersCount,
          pendingOwners: pendingOwnersCount,
          ownersWithLibraries,
          ownersWithoutLibraries: totalLibraryOwners - ownersWithLibraries,
          totalApprovedLibraries: totalLibraries,
          pendingApprovals: pendingLibraries,
          forwardedToMasterCount,
          subAdminsCount,
          totalBookings,
          totalGMV: parseFloat(totalGMV.toFixed(2)),
          platformCommissionEarned: parseFloat(totalCommission.toFixed(2)),
        },
        stateDistribution,
        recentBookings,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
    }
  }

  /**
   * Get all libraries for admin moderation.
   * If SUB_ADMIN: strictly filtered to their assignedState.
   * Computes per-library revenue and total bookings.
   */
  static async getAllLibraries(req: Request, res: Response): Promise<void> {
    try {
      const { status, state: requestedState } = req.query;
      const isSubAdmin = req.user?.adminType === 'SUB_ADMIN';
      const assignedState = req.user?.assignedState;

      const whereClause: any = {};

      // If Sub-Admin, enforce state filter strictly
      if (isSubAdmin && assignedState) {
        whereClause.state = assignedState;
      } else if (requestedState && typeof requestedState === 'string' && requestedState !== 'ALL') {
        whereClause.state = requestedState;
      }

      if (status && typeof status === 'string' && status !== 'ALL') {
        whereClause.status = status;
      }

      const libraries = await prisma.library.findMany({
        where: whereClause,
        include: {
          owner: { select: { name: true, email: true, phone: true } },
          _count: { select: { seats: true, bookings: true } },
          bookings: {
            where: { payment: { paymentStatus: 'PAID' } },
            select: {
              payment: {
                select: { amount: true, platformCommission: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = libraries.map((lib) => {
        const totalRevenue = lib.bookings.reduce(
          (acc, b) => acc + (b.payment?.amount || 0),
          0
        );
        const totalCommission = lib.bookings.reduce(
          (acc, b) => acc + (b.payment?.platformCommission || 0),
          0
        );

        return {
          ...lib,
          bookings: undefined, // remove raw bookings array to keep payload compact
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          platformCommission: parseFloat(totalCommission.toFixed(2)),
          totalBookingsCount: lib._count.bookings,
          photos: JSON.parse(lib.photos || '[]'),
          facilities: JSON.parse(lib.facilities || '[]'),
        };
      });

      res.json({
        success: true,
        count: formatted.length,
        libraries: formatted,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch libraries', error: error.message });
    }
  }

  /**
   * Approve a pending or forwarded library
   * State Sub-Admin can only approve within their assigned state;
   * Master Admin can approve any library (including forwarded ones).
   */
  static async approveLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isSubAdmin = req.user?.adminType === 'SUB_ADMIN';
      const assignedState = req.user?.assignedState;

      const targetLib = await prisma.library.findUnique({ where: { id } });
      if (!targetLib) {
        res.status(404).json({ success: false, message: 'Library not found' });
        return;
      }

      if (isSubAdmin && assignedState && targetLib.state !== assignedState) {
        res.status(403).json({
          success: false,
          message: `Access Denied: You are only authorized to moderate libraries in ${assignedState}.`,
        });
        return;
      }

      const library = await prisma.library.update({
        where: { id },
        data: {
          status: 'APPROVED',
          rejectionReason: null,
          forwardedToMaster: false,
        },
      });

      res.json({
        success: true,
        message: `Library "${library.name}" has been approved and is now live on the platform!`,
        library,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to approve library', error: error.message });
    }
  }

  /**
   * Reject a library submission
   * State Sub-Admin can only reject within their assigned state; Master Admin can reject any.
   */
  static async rejectLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const isSubAdmin = req.user?.adminType === 'SUB_ADMIN';
      const assignedState = req.user?.assignedState;

      const targetLib = await prisma.library.findUnique({ where: { id } });
      if (!targetLib) {
        res.status(404).json({ success: false, message: 'Library not found' });
        return;
      }

      if (isSubAdmin && assignedState && targetLib.state !== assignedState) {
        res.status(403).json({
          success: false,
          message: `Access Denied: You are only authorized to moderate libraries in ${assignedState}.`,
        });
        return;
      }

      const library = await prisma.library.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Incomplete verification documents or photos.',
          forwardedToMaster: false,
        },
      });

      res.json({
        success: true,
        message: `Library "${library.name}" has been rejected.`,
        library,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reject library', error: error.message });
    }
  }

  /**
   * Forward a library approval request to Master Admin
   * Sub-Admin uses this if they identify any problem, anomaly, or need master review.
   */
  static async forwardLibraryToMaster(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const isSubAdmin = req.user?.adminType === 'SUB_ADMIN';
      const assignedState = req.user?.assignedState;

      const targetLib = await prisma.library.findUnique({ where: { id } });
      if (!targetLib) {
        res.status(404).json({ success: false, message: 'Library not found' });
        return;
      }

      if (isSubAdmin && assignedState && targetLib.state !== assignedState) {
        res.status(403).json({
          success: false,
          message: `Access Denied: You can only forward libraries in your assigned state (${assignedState}).`,
        });
        return;
      }

      const library = await prisma.library.update({
        where: { id },
        data: {
          status: 'FORWARDED_TO_MASTER',
          forwardedToMaster: true,
          forwardReason: reason || 'Forwarded to Master Administrator for secondary review.',
          forwardedAt: new Date(),
          forwardedByAdminId: req.user?.id || null,
        },
      });

      res.json({
        success: true,
        message: `Library "${library.name}" has been escalated and forwarded to Master Admin for review.`,
        library,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to forward library to master', error: error.message });
    }
  }

  // =========================================================================
  // STATE SUB-ADMIN MANAGEMENT (Master Admin Only)
  // Strict rule: Exactly ONE Sub-Admin per State
  // =========================================================================

  /**
   * List all State Sub-Admins
   */
  static async getSubAdmins(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.adminType === 'SUB_ADMIN') {
        res.status(403).json({ success: false, message: 'Access Denied: Only Master Admin can manage Sub-Admins.' });
        return;
      }

      const subAdmins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          adminType: 'SUB_ADMIN',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          adminType: true,
          assignedState: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with state metrics
      const enriched = await Promise.all(
        subAdmins.map(async (sa) => {
          const state = sa.assignedState;
          if (!state) {
            return { ...sa, librariesCount: 0, pendingCount: 0, totalRevenue: 0 };
          }
          const [librariesCount, pendingCount, payments] = await Promise.all([
            prisma.library.count({ where: { state, status: 'APPROVED' } }),
            prisma.library.count({ where: { state, status: 'PENDING' } }),
            prisma.payment.findMany({
              where: {
                paymentStatus: 'PAID',
                booking: { library: { state } },
              },
              select: { amount: true },
            }),
          ]);
          const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
          return {
            ...sa,
            librariesCount,
            pendingCount,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          };
        })
      );

      res.json({
        success: true,
        count: enriched.length,
        subAdmins: enriched,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch sub-admins', error: error.message });
    }
  }

  /**
   * Create a new State Sub-Admin
   * Strictly enforces: Only ONE Sub-Admin per State
   */
  static async createSubAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.adminType === 'SUB_ADMIN') {
        res.status(403).json({ success: false, message: 'Access Denied: Only Master Admin can create Sub-Admins.' });
        return;
      }

      const { name, email, password, phone, assignedState } = req.body;

      if (!name || !email || !password || !assignedState) {
        res.status(400).json({
          success: false,
          message: 'Name, email, password, and assigned state are required.',
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const state = assignedState.trim();

      // Check email uniqueness
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        res.status(400).json({
          success: false,
          message: `An account with email ${normalizedEmail} already exists.`,
        });
        return;
      }

      // STRICT RULE: Exactly ONE Sub-Admin per State
      const existingStateAdmin = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          adminType: 'SUB_ADMIN',
          assignedState: state,
        },
      });

      if (existingStateAdmin) {
        res.status(400).json({
          success: false,
          message: `State "${state}" already has an assigned Administrator: ${existingStateAdmin.name} (${existingStateAdmin.email}). Only ONE Sub-Admin is allowed per state.`,
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const subAdmin = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: passwordHash,
          phone: phone ? phone.trim() : null,
          role: 'ADMIN',
          adminType: 'SUB_ADMIN',
          assignedState: state,
          isApproved: true,
          approvalStatus: 'APPROVED',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          adminType: true,
          assignedState: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: `State Administrator for "${state}" created successfully! Credentials: Email: ${normalizedEmail}`,
        subAdmin,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create sub-admin', error: error.message });
    }
  }

  /**
   * Update an existing State Sub-Admin
   * Master Admin can update name, phone, password, and assigned state (with 1-per-state validation).
   */
  static async updateSubAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.adminType === 'SUB_ADMIN') {
        res.status(403).json({ success: false, message: 'Access Denied: Only Master Admin can modify Sub-Admins.' });
        return;
      }

      const { id } = req.params;
      const { name, phone, password, assignedState } = req.body;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.role !== 'ADMIN') {
        res.status(404).json({ success: false, message: 'Sub-Admin not found.' });
        return;
      }

      // If state is being changed, enforce 1-per-state constraint
      if (assignedState && assignedState.trim() !== target.assignedState) {
        const state = assignedState.trim();
        const existingStateAdmin = await prisma.user.findFirst({
          where: {
            role: 'ADMIN',
            adminType: 'SUB_ADMIN',
            assignedState: state,
            NOT: { id },
          },
        });
        if (existingStateAdmin) {
          res.status(400).json({
            success: false,
            message: `State "${state}" is already assigned to ${existingStateAdmin.name} (${existingStateAdmin.email}). Only one Sub-Admin is allowed per state.`,
          });
          return;
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (assignedState) updateData.assignedState = assignedState.trim();
      if (password && password.trim().length >= 6) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          adminType: true,
          assignedState: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        message: `Sub-Admin "${updated.name}" updated successfully!`,
        subAdmin: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update sub-admin', error: error.message });
    }
  }

  /**
   * Delete a State Sub-Admin
   */
  static async deleteSubAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.adminType === 'SUB_ADMIN') {
        res.status(403).json({ success: false, message: 'Access Denied: Only Master Admin can delete Sub-Admins.' });
        return;
      }

      const { id } = req.params;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.role !== 'ADMIN') {
        res.status(404).json({ success: false, message: 'Sub-Admin not found.' });
        return;
      }

      if (target.adminType === 'MASTER_ADMIN' || target.email === 'admin@libspace.com') {
        res.status(403).json({ success: false, message: 'Cannot delete the Master Admin account.' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      res.json({
        success: true,
        message: `Sub-Admin for ${target.assignedState || target.name} has been removed.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete sub-admin', error: error.message });
    }
  }

  /**
   * USER MANAGEMENT:
   * List all registered users (including those with 0 bookings).
   * Supports search (name, email, phone), activity filter (all / with bookings / no bookings),
   * status filter, and server-side pagination.
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const role = typeof req.query.role === 'string' ? req.query.role : 'USER';
      const activity = typeof req.query.activity === 'string' ? req.query.activity : 'ALL';
      const status = typeof req.query.status === 'string' ? req.query.status : 'ALL';

      const whereClause: any = {};

      if (role && role !== 'ALL') {
        whereClause.role = role;
      }

      if (status && status !== 'ALL') {
        whereClause.approvalStatus = status;
      }

      if (activity === 'WITH_BOOKINGS') {
        whereClause.bookings = { some: {} };
      } else if (activity === 'NO_BOOKINGS') {
        whereClause.bookings = { none: {} };
      }

      if (search) {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isApproved: true,
            approvalStatus: true,
            avatar: true,
            createdAt: true,
            _count: {
              select: { bookings: true, ownedLibraries: true },
            },
            bookings: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                bookingCode: true,
                date: true,
                startTime: true,
                endTime: true,
                status: true,
                totalAmount: true,
                library: {
                  select: { id: true, lid: true, name: true, city: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      res.json({
        success: true,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit) || 1,
          totalCount,
          limit,
        },
        users: users.map((u) => ({
          ...u,
          totalBookings: u._count.bookings,
          librariesCount: u._count.ownedLibraries,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
  }

  /**
   * USER MANAGEMENT - BOOKING HISTORY:
   * Fetch complete historical reservations made by a specific user.
   */
  static async getUserBookings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          createdAt: true,
          isApproved: true,
          approvalStatus: true,
        },
      });

      if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const bookings = await prisma.booking.findMany({
        where: { userId: id },
        include: {
          library: {
            select: {
              id: true,
              lid: true,
              name: true,
              city: true,
              state: true,
              address: true,
            },
          },
          seat: {
            select: {
              id: true,
              seatNumber: true,
              seatType: true,
              category: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
              transactionId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        user: targetUser,
        totalBookings: bookings.length,
        bookings,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch user bookings', error: error.message });
    }
  }

  /**
   * OWNER MANAGEMENT:
   * List all registered library owners (including those with 0 libraries listed).
   * Supports search (name, email, phone), approvalStatus filter, hasLibraries filter,
   * and server-side pagination.
   */
  static async getAllOwners(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status : 'ALL';
      const hasLibraries = typeof req.query.hasLibraries === 'string' ? req.query.hasLibraries : 'ALL';

      const whereClause: any = {
        role: 'OWNER',
      };

      if (status && status !== 'ALL') {
        whereClause.approvalStatus = status;
      }

      if (hasLibraries === 'YES') {
        whereClause.ownedLibraries = { some: {} };
      } else if (hasLibraries === 'NO') {
        whereClause.ownedLibraries = { none: {} };
      }

      if (search) {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [totalCount, owners] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isApproved: true,
            approvalStatus: true,
            avatar: true,
            createdAt: true,
            _count: {
              select: { ownedLibraries: true },
            },
            ownedLibraries: {
              select: {
                id: true,
                lid: true,
                name: true,
                city: true,
                state: true,
                address: true,
                status: true,
                totalSeats: true,
                hourlyRate: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      res.json({
        success: true,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit) || 1,
          totalCount,
          limit,
        },
        owners: owners.map((o) => ({
          ...o,
          librariesCount: o._count.ownedLibraries,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch owners', error: error.message });
    }
  }

  /**
   * Get all Library Owners awaiting Admin Approval (legacy pending endpoint)
   */
  static async getPendingOwners(_req: Request, res: Response): Promise<void> {
    try {
      const pendingOwners = await prisma.user.findMany({
        where: {
          role: 'OWNER',
          approvalStatus: 'PENDING',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isApproved: true,
          approvalStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        count: pendingOwners.length,
        owners: pendingOwners,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch pending owners', error: error.message });
    }
  }

  /**
   * Approve a Library Owner account
   */
  static async approveOwner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.update({
        where: { id },
        data: {
          isApproved: true,
          approvalStatus: 'APPROVED',
        },
      });

      // Send congratulatory notification email via Brevo
      import('../services/email.service').then(({ EmailService }) => {
        EmailService.sendOwnerApprovalEmail(user.email, user.name);
      });

      res.json({
        success: true,
        message: `Owner account "${user.name}" (${user.email}) has been approved! They can now log in.`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isApproved: user.isApproved,
          approvalStatus: user.approvalStatus,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to approve owner', error: error.message });
    }
  }

  /**
   * Reject a Library Owner account
   */
  static async rejectOwner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.update({
        where: { id },
        data: {
          isApproved: false,
          approvalStatus: 'REJECTED',
        },
      });

      res.json({
        success: true,
        message: `Owner account "${user.name}" has been rejected.`,
        user: {
          id: user.id,
          name: user.name,
          approvalStatus: user.approvalStatus,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reject owner', error: error.message });
    }
  }
}
