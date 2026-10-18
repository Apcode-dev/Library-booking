import { Router } from 'express';
import { SeatController } from '../controllers/seat.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Get real-time seat availability map for a specific library, date, and time slot
router.get('/availability/:libraryId', optionalAuth, SeatController.getSeatAvailability);

export default router;
