import { Router } from 'express';
import { LibraryController } from '../controllers/library.controller';
import { authenticateUser, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public explore & search
router.get('/', optionalAuth, LibraryController.getLibraries);
router.get('/:idOrSlug', optionalAuth, LibraryController.getLibraryByIdOrSlug);

// Reviews (authenticated users)
router.post('/:id/reviews', authenticateUser, LibraryController.addReview);

export default router;
