import { Router } from 'express';
import { OwnerController } from '../controllers/owner.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Protect all owner routes: Must be authenticated and have role OWNER or ADMIN
router.use(authenticateUser, authorizeRoles('OWNER', 'ADMIN'));

// Library creation & management
router.post('/libraries', OwnerController.createLibrary);
router.get('/my-libraries', OwnerController.getMyLibraries);
router.put('/libraries/:id', OwnerController.updateLibrary);

// Seat management
router.post('/libraries/:libraryId/seats', OwnerController.addSeat);
router.patch('/seats/:seatId/toggle', OwnerController.toggleSeatAvailability);

// Revenue & Occupancy Analytics
router.get('/dashboard', OwnerController.getRevenueDashboard);

// QR Code Pass Verification & Student Check-In & Attendance
router.post('/verify-qr', OwnerController.verifyQrCode);
router.post('/check-in', OwnerController.checkInBooking);
router.get('/students-and-attendance', OwnerController.getStudentsAndAttendance);

export default router;
