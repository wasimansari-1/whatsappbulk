import { Router } from 'express';
import { authController } from '../controllers/AuthController.js';
import { validateBody } from '../middleware/requestValidator.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authGuard } from '../middleware/authGuard.js';
import { registerSchema, loginSchema } from '@whatsapp-saas/shared-validation';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authGuard, authController.me);

export default router;
