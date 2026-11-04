import { Router } from 'express';
import { ManagerController } from '../controllers/manager.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Protect all manager routes: Must be authenticated and have role MANAGER or ADMIN
router.use(authenticateUser, authorizeRoles('MANAGER', 'ADMIN'));

// Manager Dashboard & PIN Unlock
router.get('/dashboard', ManagerController.getDashboard);
router.post('/verify-pin', ManagerController.verifyPin);
router.patch('/seats/:seatId/toggle', ManagerController.toggleSeat);

// Bookings strictly for assigned library
router.get('/bookings', ManagerController.getBookings);

// Attendance & Gate Pass Scanner strictly for assigned library
router.post('/verify-qr', ManagerController.verifyQrCode);
router.post('/check-in', ManagerController.checkInBooking);

// Students / Users who booked this library
router.get('/users', ManagerController.getUsers);

export default router;
