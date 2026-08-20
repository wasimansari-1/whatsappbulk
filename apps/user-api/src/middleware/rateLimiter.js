import rateLimit from 'express-rate-limit';
import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes } from '@whatsapp-saas/shared-constants';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      apiError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many requests from this IP, please try again later.')
    );
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 attempts per 15 minutes for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      apiError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many login attempts. Please try again after 15 minutes.')
    );
  }
});

export default { apiLimiter, authLimiter };
