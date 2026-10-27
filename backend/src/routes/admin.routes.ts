import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Protect all admin routes: Must be authenticated and have role ADMIN
router.use(authenticateUser, authorizeRoles('ADMIN'));

// Platform Financial & KPI Overview (Pan-India for Master Admin, State-scoped for Sub-Admin)
router.get('/stats', AdminController.getPlatformStats);

// Library Verification & Moderation
router.get('/libraries', AdminController.getAllLibraries);
router.patch('/libraries/:id/approve', AdminController.approveLibrary);
router.patch('/libraries/:id/reject', AdminController.rejectLibrary);
router.patch('/libraries/:id/forward', AdminController.forwardLibraryToMaster);

// State Sub-Admins Management (Master Admin Only)
router.get('/sub-admins', AdminController.getSubAdmins);
router.post('/sub-admins', AdminController.createSubAdmin);
router.put('/sub-admins/:id', AdminController.updateSubAdmin);
router.delete('/sub-admins/:id', AdminController.deleteSubAdmin);

// Library Owner Management & Verification
router.get('/owners', AdminController.getAllOwners);
router.get('/owners/pending', AdminController.getPendingOwners);
router.patch('/owners/:id/approve', AdminController.approveOwner);
router.patch('/owners/:id/reject', AdminController.rejectOwner);

// User Management & Reservation History
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id/bookings', AdminController.getUserBookings);

export default router;
