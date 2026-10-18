import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Protect all admin routes: Must be authenticated and have role ADMIN
router.use(authenticateUser, authorizeRoles('ADMIN'));

// Platform Financial & KPI Overview
router.get('/stats', AdminController.getPlatformStats);

// Library Verification & Moderation
router.get('/libraries', AdminController.getAllLibraries);
router.patch('/libraries/:id/approve', AdminController.approveLibrary);
router.patch('/libraries/:id/reject', AdminController.rejectLibrary);

// Library Owner Verification & Approvals (Gate check)
router.get('/owners/pending', AdminController.getPendingOwners);
router.patch('/owners/:id/approve', AdminController.approveOwner);
router.patch('/owners/:id/reject', AdminController.rejectOwner);

// User Moderation
router.get('/users', AdminController.getAllUsers);

export default router;
