import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { apiError } from '@whatsapp-saas/shared-utils';
import { ErrorCodes, RolePermissions } from '@whatsapp-saas/shared-constants';

export async function authGuard(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(apiError(ErrorCodes.UNAUTHORIZED, 'Authentication token is required'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json(apiError(ErrorCodes.INTERNAL_ERROR, 'Server authentication configuration error'));
    }
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json(apiError(ErrorCodes.UNAUTHORIZED, 'Session expired or invalid token'));
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user || user.status === 'SUSPENDED') {
      return res.status(401).json(apiError(ErrorCodes.UNAUTHORIZED, 'User account is inactive or suspended'));
    }

    // Determine target organization (from header if multi-org user, else default)
    let organizationId = req.headers['x-organization-id'] || user.currentOrganizationId;

    if (!organizationId) {
      // Find first active membership
      const membership = await OrganizationMember.findOne({
        userId: { $in: [user._id, user._id.toString()] },
        status: 'ACTIVE'
      }).lean();
      if (membership) {
        organizationId = membership.organizationId;
      }
    }

    if (!organizationId) {
      return res.status(403).json(apiError(ErrorCodes.FORBIDDEN, 'No active organization associated with user'));
    }

    // Validate membership
    const member = await OrganizationMember.findOne({
      userId: { $in: [user._id, user._id.toString()] },
      organizationId: { $in: [organizationId, organizationId.toString()] },
      status: 'ACTIVE'
    }).lean();

    if (!member) {
      return res.status(403).json(apiError(ErrorCodes.FORBIDDEN, 'Access denied for this organization'));
    }

    // Build permissions list for current user
    const rolePerms = RolePermissions[member.role] || [];
    const customPerms = member.customPermissions || [];
    const allPerms = Array.from(new Set([...rolePerms, ...customPerms]));

    req.user = user;
    req.organizationId = organizationId.toString();
    req.membership = member;
    req.permissions = allPerms;

    next();
  } catch (error) {
    next(error);
  }
}

export default authGuard;
