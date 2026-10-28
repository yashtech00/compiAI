import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

// Rate limiting on sensitive auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/signup', authLimiter, AuthController.signup);
router.post('/signin', authLimiter, AuthController.signin);
router.post('/signout', AuthController.signout);
router.get('/me', requireAuth, AuthController.me);
router.patch('/profile', requireAuth, AuthController.updateProfile);

export default router;
