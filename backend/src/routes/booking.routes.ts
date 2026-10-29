import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

// Protect all booking endpoints
router.use(authenticateUser);

// Step 1: Temporarily lock seat for 5 mins (prevent race conditions)
router.post('/lock', BookingController.lockSeat);

// Step 1.5: Cancel hold
router.post('/release-lock', BookingController.releaseSeat);

// Step 2: Confirm booking and process payment
router.post('/confirm', BookingController.confirmBooking);

// User bookings history, passes & attendance
router.get('/my-bookings', BookingController.getUserBookings);
router.get('/my-attendance', BookingController.getMyAttendance);
router.get('/:id/attendance', BookingController.getBookingAttendance);
router.get('/:id', BookingController.getBookingById);
router.post('/:id/cancel', BookingController.cancelBooking);
router.post('/:id/extend', BookingController.extendBooking);
router.post('/:id/pay-extension', BookingController.payExtension);

export default router;
