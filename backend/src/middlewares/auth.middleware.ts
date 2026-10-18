import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token.utils';
import prisma from '../config/prisma';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'USER' | 'OWNER' | 'ADMIN';
        name: string;
      };
    }
  }
}

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header and attaches user to request.
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or invalid Bearer token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, activeToken: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
      return;
    }

    // SINGLE DEVICE / ACTIVE SESSION CHECK:
    if (user.activeToken && user.activeToken !== token) {
      res.status(401).json({
        success: false,
        sessionExpired: true,
        message: 'Session Expired: You have logged in on another device or browser.',
      });
      return;
    }

    req.user = user as {
      id: string;
      email: string;
      role: 'USER' | 'OWNER' | 'ADMIN';
      name: string;
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      error: error.message,
    });
  }
};

/**
 * Optional Authentication:
 * Extracts user if token is present, but proceeds anyway if not.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true, name: true, activeToken: true },
      });
      if (user && (!user.activeToken || user.activeToken === token)) {
        req.user = user as any;
      }
    }
  } catch (_) {
    // Ignore invalid optional tokens
  }
  next();
};

/**
 * RBAC Role Authorization Guard:
 * Restricts route access to specific roles ('USER', 'OWNER', 'ADMIN').
 */
export const authorizeRoles = (...allowedRoles: ('USER' | 'OWNER' | 'ADMIN')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before checking role authorization.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' does not have permission to access this resource.`,
      });
      return;
    }

    next();
  };
};
