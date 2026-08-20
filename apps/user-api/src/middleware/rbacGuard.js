import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes } from '@whatsapp-saas/shared-constants';

export function rbacGuard(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.permissions) {
      return res.status(403).json(apiError(ErrorCodes.FORBIDDEN, 'Permissions not loaded'));
    }

    const hasPermission = requiredPermissions.every((perm) => req.permissions.includes(perm));
    if (!hasPermission) {
      return res.status(403).json(
        apiError(
          ErrorCodes.FORBIDDEN,
          `Forbidden: Missing required permission(s): ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
}

export default rbacGuard;
