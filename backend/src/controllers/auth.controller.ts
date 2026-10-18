import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../utils/token.utils';
import { EmailService } from '../services/email.service';

export class AuthController {
  /**
   * Step 1: Send Registration OTP via Brevo
   * Dispatches a 6-digit verification code before an account can be created.
   */
  static async sendRegisterOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, name } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if email already registered
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please sign in instead.',
        });
        return;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save/update verification record
      await prisma.emailVerification.upsert({
        where: { email: normalizedEmail },
        update: {
          otp,
          verified: false,
          expiresAt,
        },
        create: {
          email: normalizedEmail,
          otp,
          verified: false,
          expiresAt,
        },
      });

      // Dispatch OTP email via Brevo
      const emailResult = await EmailService.sendOtpEmail({
        toEmail: normalizedEmail,
        toName: name || 'Valued User',
        otp,
        purpose: 'REGISTRATION',
      });

      if (!emailResult.success) {
        const errorText = emailResult.error || '';
        if (errorText.includes('unrecognised IP address') || errorText.includes('authorised_ips')) {
          const ipMatch = errorText.match(/(?:IP address\s+)([0-9a-fA-F:.]+)/);
          const detectedIp = ipMatch ? ipMatch[1] : 'your IP';
          res.status(403).json({
            success: false,
            brevoIpError: true,
            detectedIp,
            message: `Brevo Security Alert: IP address (${detectedIp}) is not authorised in your Brevo account. Please add it in https://app.brevo.com/security/authorised_ips or disable Authorised IPs in Brevo security settings.`,
            error: errorText,
          });
          return;
        }

        res.status(500).json({
          success: false,
          message: errorText || 'Failed to dispatch verification email via Brevo.',
        });
        return;
      }

      res.json({
        success: true,
        otp,
        message: `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your inbox.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to send registration OTP', error: error.message });
    }
  }

  /**
   * Step 2: Verify Registration OTP (Produces Green Tick)
   */
  static async verifyRegisterOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const record = await prisma.emailVerification.findUnique({
        where: { email: normalizedEmail },
      });

      if (!record) {
        res.status(400).json({ success: false, message: 'No OTP request found for this email. Please click Send OTP.' });
        return;
      }

      if (record.otp !== otp.trim() || record.expiresAt < new Date()) {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please request a new one.' });
        return;
      }

      // Mark verified
      await prisma.emailVerification.update({
        where: { email: normalizedEmail },
        data: { verified: true },
      });

      res.json({
        success: true,
        verified: true,
        message: 'Email verified successfully! (Green Tick)',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
    }
  }

  /**
   * Step 3: Complete Registration
   * Requires that the email has been verified via OTP.
   * - Students: Logged in immediately.
   * - Owners: Saved as PENDING Admin Approval (cannot log in until approved).
   * - Admins: Created with Admin role.
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, phone, role, adminSecret } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Ensure email is verified via Brevo OTP first
      const verification = await prisma.emailVerification.findUnique({
        where: { email: normalizedEmail },
      });

      if (!verification || !verification.verified) {
        res.status(400).json({
          success: false,
          message: 'Email address has not been verified yet. Please enter the OTP and verify first.',
        });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      if (role === 'ADMIN') {
        res.status(400).json({
          success: false,
          message: 'Public Admin registration is disabled. Please sign in with default admin credentials.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const isOwner = role === 'OWNER';

      let userRole: 'USER' | 'OWNER' = 'USER';
      let isApproved = true;
      let approvalStatus = 'APPROVED';

      if (isOwner) {
        userRole = 'OWNER';
        isApproved = false; // Strictly requires Admin Approval
        approvalStatus = 'PENDING';
      }

      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: passwordHash,
          phone: phone || null,
          role: userRole,
          isApproved,
          approvalStatus,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        },
      });

      // Consume verification record
      await prisma.emailVerification.delete({
        where: { email: normalizedEmail },
      });

      // If Owner: Return pending notice without token
      if (isOwner) {
        res.status(201).json({
          success: true,
          requiresApproval: true,
          message:
            'Library Owner account submitted successfully! Your account is pending Admin approval. You will be able to log in once approved by the administrator.',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isApproved: false,
            approvalStatus: 'PENDING',
          },
        });
        return;
      }

      // Student or Admin: Issue JWT token immediately and store activeToken
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as any,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { activeToken: token },
      });

      res.status(201).json({
        success: true,
        requiresApproval: false,
        message: `${user.role} account registered successfully!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          isApproved: true,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
  }

  /**
   * Password Login for Student, Library Owner, and Admin
   * Enforces Admin Approval check for Owners.
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, expectedRole } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // STRICT ROLE GATE: Prevents student from logging in as owner, etc.
      if (expectedRole && user.role !== expectedRole) {
        const roleNames: Record<string, string> = {
          USER: 'Student',
          OWNER: 'Library Owner',
          ADMIN: 'Platform Admin',
        };
        const currentRole = roleNames[user.role] || user.role;
        const attemptedRole = roleNames[expectedRole] || expectedRole;

        res.status(403).json({
          success: false,
          roleMismatch: true,
          message: `Role Mismatch: This account is registered as a ${currentRole}. You cannot log in under the ${attemptedRole} portal. Please select the ${currentRole} tab.`,
        });
        return;
      }

      // CRITICAL OWNER APPROVAL GATE:
      if (user.role === 'OWNER' && (!user.isApproved || user.approvalStatus !== 'APPROVED')) {
        res.status(403).json({
          success: false,
          isPendingApproval: true,
          message:
            'Access Denied: Your Library Owner account is awaiting Admin approval. Please wait until verified by the platform administrator.',
        });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as any,
      });

      // Save activeToken in DB to invalidate any previous session on another device/browser
      await prisma.user.update({
        where: { id: user.id },
        data: { activeToken: token },
      });

      res.json({
        success: true,
        message: 'Logged in successfully!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          isApproved: user.isApproved,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
  }

  /**
   * Forgot Password - Send Reset Code via Brevo
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        res.json({
          success: true,
          message: 'If an account exists with this email, a 6-digit password reset code has been sent.',
        });
        return;
      }

      const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: resetOtp, resetTokenExpiresAt },
      });

      const emailResult = await EmailService.sendOtpEmail({
        toEmail: user.email,
        toName: user.name,
        otp: resetOtp,
        purpose: 'FORGOT_PASSWORD',
      });

      if (!emailResult.success) {
        res.status(500).json({
          success: false,
          message: emailResult.error || 'Failed to send password reset code via Brevo.',
        });
        return;
      }

      res.json({
        success: true,
        otp: resetOtp,
        message: `A password reset code has been sent to ${user.email}. Please check your inbox.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
    }
  }

  /**
   * Reset Password with OTP Code
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, OTP code, and new password are required.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const now = new Date();
      if (
        !user.resetToken ||
        user.resetToken !== otp.trim() ||
        !user.resetTokenExpiresAt ||
        user.resetTokenExpiresAt < now
      ) {
        res.status(400).json({ success: false, message: 'Invalid or expired password reset code.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });

      res.json({
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
    }
  }

  /**
   * Get Current Authenticated User Profile
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          isApproved: true,
          approvalStatus: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
              ownedLibraries: true,
            },
          },
        },
      });

      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
    }
  }

  /**
   * Update Authenticated User Profile (Name, Phone, Avatar)
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const { name, phone, avatar } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
          ...(avatar !== undefined && { avatar: avatar ? avatar.trim() : null }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          isApproved: true,
          approvalStatus: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        message: 'Profile updated successfully!',
        user: updatedUser,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
  }
}
