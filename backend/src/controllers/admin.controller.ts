import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class AdminController {
  /**
   * Admin Platform Overview Metrics & Financial Dashboard
   */
  static async getPlatformStats(_req: Request, res: Response): Promise<void> {
    try {
      const [
        totalUsers,
        totalLibraries,
        pendingLibraries,
        totalBookings,
        payments,
        recentBookings,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.library.count({ where: { status: 'APPROVED' } }),
        prisma.library.count({ where: { status: 'PENDING' } }),
        prisma.booking.count(),
        prisma.payment.findMany({ where: { paymentStatus: 'PAID' } }),
        prisma.booking.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            library: { select: { name: true } },
            payment: true,
          },
        }),
      ]);

      const totalGMV = payments.reduce((acc, p) => acc + p.amount, 0);
      const totalCommission = payments.reduce((acc, p) => acc + p.platformCommission, 0);

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalApprovedLibraries: totalLibraries,
          pendingApprovals: pendingLibraries,
          totalBookings,
          totalGMV: parseFloat(totalGMV.toFixed(2)),
          platformCommissionEarned: parseFloat(totalCommission.toFixed(2)),
        },
        recentBookings,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
    }
  }

  /**
   * Get all libraries for admin moderation (with status filter)
   */
  static async getAllLibraries(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;

      const whereClause: any = {};
      if (status && typeof status === 'string' && status !== 'ALL') {
        whereClause.status = status;
      }

      const libraries = await prisma.library.findMany({
        where: whereClause,
        include: {
          owner: { select: { name: true, email: true, phone: true } },
          _count: { select: { seats: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = libraries.map((lib) => ({
        ...lib,
        photos: JSON.parse(lib.photos || '[]'),
        facilities: JSON.parse(lib.facilities || '[]'),
      }));

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
   * Approve a pending library
   */
  static async approveLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const library = await prisma.library.update({
        where: { id },
        data: {
          status: 'APPROVED',
          rejectionReason: null,
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
   */
  static async rejectLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const library = await prisma.library.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Incomplete verification documents or photos.',
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
   * Manage users (list all users, count bookings)
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.query;

      const whereClause: any = {};
      if (role && typeof role === 'string' && role !== 'ALL') {
        whereClause.role = role;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: { bookings: true, ownedLibraries: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
  }

  /**
   * Get all Library Owners awaiting Admin Approval
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
