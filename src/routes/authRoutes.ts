import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  forgotPassword, forgotSchema, getMe, login, loginSchema, logout, refresh,
  register, registerSchema, resetPassword, resetSchema,
} from '../controller/authController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

const router = Router();
router.post('/register', limiter, validate(registerSchema), register);
router.post('/login', limiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', limiter, validate(forgotSchema), forgotPassword);
router.put('/reset-password/:token', limiter, validate(resetSchema), resetPassword);
export default router;
