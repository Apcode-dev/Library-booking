import { Router } from 'express';
import authRoutes from './auth.routes';
import libraryRoutes from './library.routes';
import seatRoutes from './seat.routes';
import bookingRoutes from './booking.routes';
import ownerRoutes from './owner.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/libraries', libraryRoutes);
router.use('/seats', seatRoutes);
router.use('/bookings', bookingRoutes);
router.use('/owner', ownerRoutes);
router.use('/admin', adminRoutes);

export default router;
