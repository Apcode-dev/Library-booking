import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

// Registration with Brevo Email OTP Verification (Produces Green Tick)
router.post('/register-otp/send', AuthController.sendRegisterOtp);
router.post('/register-otp/verify', AuthController.verifyRegisterOtp);
router.post('/register', AuthController.register);

// Password Login
router.post('/login', AuthController.login);

// Forgot & Reset Password
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Profile
router.get('/me', authenticateUser, AuthController.getMe);
router.patch('/profile', authenticateUser, AuthController.updateProfile);

export default router;
