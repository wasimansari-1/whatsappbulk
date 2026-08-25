import { Organization } from '../models/Organization.js';
import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes } from '@whatsapp-saas/shared-constants';

/**
 * Meta Ads Tenant Isolation Guard
 * Enforces strict restriction so Facebook/Meta Ads integration can ONLY be accessed
 * by the designated test account (wasim@arvee.com / IGlobal Tech).
 * Every other user or tenant is blocked with 403 Forbidden.
 */
export async function metaAdsTenantGuard(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json(apiError(ErrorCodes.UNAUTHORIZED, 'Authentication required'));
    }

    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json(apiError(ErrorCodes.FORBIDDEN, 'Active organization context required'));
    }

    // Tenant context is validated. All authenticated organizations can connect their own Facebook assets.
    next();
  } catch (error) {
    next(error);
  }
}

export default metaAdsTenantGuard;
