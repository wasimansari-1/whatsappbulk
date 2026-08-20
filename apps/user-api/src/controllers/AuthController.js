import { authService } from '../services/AuthService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(apiSuccess(result, 'Registration successful'));
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(apiSuccess(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      res.status(200).json(apiSuccess(tokens, 'Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      res.status(200).json(
        apiSuccess({
          user: req.user,
          organizationId: req.organizationId,
          membership: req.membership,
          permissions: req.permissions
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
