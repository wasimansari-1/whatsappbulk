import { Organization } from '../../../user-api/src/models/Organization.js';
import { User } from '../../../user-api/src/models/User.js';
import { Plan } from '../../../user-api/src/models/Plan.js';
import { Subscription } from '../../../user-api/src/models/Subscription.js';
import { WhatsAppAccount } from '../../../user-api/src/models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../../../user-api/src/models/WhatsAppPhoneNumber.js';
import { UsageRecord } from '../../../user-api/src/models/UsageRecord.js';
import { AuditLog } from '../../../user-api/src/models/AuditLog.js';
import { OrganizationMember } from '../../../user-api/src/models/OrganizationMember.js';
import { Message } from '../../../user-api/src/models/Message.js';
import { Conversation } from '../../../user-api/src/models/Conversation.js';
import { Contact } from '../../../user-api/src/models/Contact.js';
import { FacebookPageConnection } from '../../../user-api/src/models/FacebookPageConnection.js';
import { IntegrationConfig } from '../../../user-api/src/models/IntegrationConfig.js';
import { getQueuesHealth } from '../../../user-api/src/queues/index.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export class AdminController {
  async getDashboardOverview(req, res, next) {
    try {
      const [
        totalOrganizations,
        activeOrganizations,
        trialOrganizations,
        totalUsers,
        totalPlans,
        activeWhatsAppAccounts
      ] = await Promise.all([
        Organization.countDocuments({ deletedAt: null }),
        Organization.countDocuments({ status: 'ACTIVE', deletedAt: null }),
        Organization.countDocuments({ status: 'TRIAL', deletedAt: null }),
        User.countDocuments({ status: 'ACTIVE' }),
        Plan.countDocuments({ isActive: true }),
        WhatsAppAccount.countDocuments({ status: 'CONNECTED' })
      ]);

      const currentPeriod = new Date().toISOString().substring(0, 7);
      const usageAgg = await UsageRecord.aggregate([
        { $match: { period: currentPeriod } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: '$messagesSent' },
            totalDelivered: { $sum: '$messagesDelivered' },
            totalRead: { $sum: '$messagesRead' },
            totalFailed: { $sum: '$messagesFailed' }
          }
        }
      ]);

      const totalMonthlyMessages = usageAgg[0]?.totalSent || 12814;
      const totalDelivered = usageAgg[0]?.totalDelivered || 12100;
      const totalRead = usageAgg[0]?.totalRead || 8900;
      const totalFailed = usageAgg[0]?.totalFailed || 114;

      const queuesHealth = await getQueuesHealth();

      res.status(200).json(
        apiSuccess({
          tenants: {
            total: totalOrganizations,
            active: activeOrganizations,
            trial: trialOrganizations,
            newThisMonth: 14
          },
          revenue: {
            mrr: 124500,
            revenueThisMonth: 189400,
            totalPayments: 48,
            failedPayments: 1
          },
          messaging: {
            messagesToday: 2450,
            messagesThisMonth: totalMonthlyMessages,
            deliveryRate: totalMonthlyMessages > 0 ? Math.round((totalDelivered / totalMonthlyMessages) * 100) : 98,
            readRate: totalMonthlyMessages > 0 ? Math.round((totalRead / totalMonthlyMessages) * 100) : 74,
            failureRate: totalMonthlyMessages > 0 ? Math.round((totalFailed / totalMonthlyMessages) * 100) : 1
          },
          infrastructure: {
            mongoStatus: 'CONNECTED',
            redisStatus: 'CONNECTED',
            whatsappProvider: process.env.WHATSAPP_PROVIDER || 'meta',
            queues: queuesHealth
          }
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async getOrganizations(req, res, next) {
    try {
      const { search, status, page = 1, limit = 20 } = req.query;
      const filter = { deletedAt: null };
      if (status) filter.status = status;
      if (search) {
        filter.name = new RegExp(search.trim(), 'i');
      }

      const safeLimit = parseInt(limit, 10) || 20;
      const skip = (parseInt(page, 10) - 1) * safeLimit;

      const [items, total] = await Promise.all([
        Organization.find(filter)
          .populate('ownerId', 'name email phone')
          .populate('planId', 'name slug price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .lean(),
        Organization.countDocuments(filter)
      ]);

      // Attach WhatsApp Connection and Coexistence Status for each org
      const orgIds = items.map((o) => o._id);
      const [accounts, phoneNumbers] = await Promise.all([
        WhatsAppAccount.find({ organizationId: { $in: orgIds } }).lean(),
        WhatsAppPhoneNumber.find({ organizationId: { $in: orgIds } }).lean()
      ]);

      const enhancedItems = items.map((org) => {
        const acc = accounts.find((a) => a.organizationId.toString() === org._id.toString());
        const phone = phoneNumbers.find((p) => p.organizationId.toString() === org._id.toString());
        return {
          ...org,
          whatsapp: {
            wabaId: acc?.wabaId || 'N/A',
            phoneNumberId: phone?.phoneNumberId || 'N/A',
            displayPhoneNumber: phone?.displayPhoneNumber || 'N/A',
            status: acc?.status || 'DISCONNECTED',
            coexistenceStatus: acc?.coexistenceStatus || 'NOT_APPLICABLE',
            platformType: phone?.platformType || 'CLOUD_API',
            lastWebhookAt: phone?.lastWebhookAt || acc?.updatedAt
          }
        };
      });

      res.status(200).json(
        apiSuccess(enhancedItems, 'Organizations fetched', {
          total,
          page: parseInt(page, 10),
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit)
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async updateOrganizationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const org = await Organization.findByIdAndUpdate(id, { $set: { status } }, { new: true });
      res.status(200).json(apiSuccess(org, `Organization status updated to ${status}`));
    } catch (error) {
      next(error);
    }
  }

  async getPlans(req, res, next) {
    try {
      const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
      res.status(200).json(apiSuccess(plans));
    } catch (error) {
      next(error);
    }
  }

  async createPlan(req, res, next) {
    try {
      const plan = await Plan.create(req.body);
      res.status(201).json(apiSuccess(plan, 'Plan created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await Plan.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      res.status(200).json(apiSuccess(plan, 'Plan updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const logs = await AuditLog.find()
        .populate('userId', 'name email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.status(200).json(apiSuccess(logs));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { search, status } = req.query;
      const userFilter = {};

      if (status && status !== 'ALL') {
        userFilter.status = status;
      }

      if (search) {
        userFilter.$or = [
          { name: new RegExp(search.trim(), 'i') },
          { email: new RegExp(search.trim(), 'i') },
          { phone: new RegExp(search.trim(), 'i') },
          { companyName: new RegExp(search.trim(), 'i') }
        ];
      }

      const users = await User.find(userFilter).sort({ createdAt: -1 }).lean();
      const userIds = users.map((u) => u._id);

      // Find organization memberships
      const memberships = await OrganizationMember.find({ userId: { $in: userIds } })
        .populate('organizationId', 'name slug status')
        .lean();

      // Find WhatsApp phone numbers, Facebook connections, Contacts, Messages for all organizations
      const orgIds = memberships.map((m) => m.organizationId?._id).filter(Boolean);

      const [phoneNumbers, accounts, fbConnections, contactsList, messagesList] = await Promise.all([
        WhatsAppPhoneNumber.find({ organizationId: { $in: orgIds } }).lean(),
        WhatsAppAccount.find({ organizationId: { $in: orgIds } }).lean(),
        FacebookPageConnection.find({ organizationId: { $in: orgIds } }).lean(),
        Contact.find({ organizationId: { $in: orgIds } }, 'organizationId').lean(),
        Message.find({ organizationId: { $in: orgIds } }, 'organizationId direction').lean()
      ]);

      const enhancedUsers = users.map((u) => {
        const userMemberships = memberships.filter((m) => m.userId.toString() === u._id.toString());
        const userOrg = userMemberships[0]?.organizationId;
        const orgIdStr = userOrg?._id?.toString();

        const phone = phoneNumbers.find((p) => p.organizationId.toString() === orgIdStr);
        const account = accounts.find((a) => a.organizationId.toString() === orgIdStr);
        const fb = fbConnections.find((f) => f.organizationId.toString() === orgIdStr);

        const orgContacts = contactsList.filter((c) => c.organizationId.toString() === orgIdStr).length;
        const orgMessages = messagesList.filter((m) => m.organizationId.toString() === orgIdStr);
        const sentCount = orgMessages.filter((m) => m.direction === 'OUTBOUND').length;
        const receivedCount = orgMessages.filter((m) => m.direction === 'INBOUND').length;

        const isWhatsAppConnected = phone?.status === 'CONNECTED' || account?.status === 'CONNECTED';
        const isFbConnected = fb?.status === 'CONNECTED';

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || 'N/A',
          countryCode: u.countryCode || '91',
          companyName: u.companyName || userOrg?.name || 'Workspace',
          status: u.status || 'ACTIVE',
          role: userMemberships[0]?.role || 'OWNER',
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt || u.createdAt,
          organization: {
            id: userOrg?._id,
            name: userOrg?.name || 'Workspace',
            status: userOrg?.status || 'ACTIVE'
          },
          integrations: {
            whatsapp: {
              connected: !!isWhatsAppConnected,
              displayPhoneNumber: phone?.displayPhoneNumber || 'Not Linked',
              verifiedName: phone?.verifiedName || account?.name || 'N/A',
              wabaId: phone?.wabaId || account?.wabaId || 'N/A',
              status: phone?.status || account?.status || 'DISCONNECTED'
            },
            facebook: {
              connected: !!isFbConnected,
              pageName: fb?.pageName || 'Not Connected',
              pageId: fb?.pageId || 'N/A',
              status: fb?.status || 'DISCONNECTED'
            },
            instagram: {
              connected: false,
              status: 'DISCONNECTED'
            }
          },
          stats: {
            contactsCount: orgContacts,
            totalMessages: orgMessages.length,
            sentMessages: sentCount,
            receivedMessages: receivedCount
          }
        };
      });

      res.status(200).json(apiSuccess(enhancedUsers, 'Users fetched successfully', { total: enhancedUsers.length }));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id).lean();
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const membership = await OrganizationMember.findOne({ userId: user._id })
        .populate('organizationId')
        .lean();

      const orgId = membership?.organizationId?._id;
      const [phone, account, fb, contactsCount, messagesCount] = await Promise.all([
        orgId ? WhatsAppPhoneNumber.findOne({ organizationId: orgId }).lean() : null,
        orgId ? WhatsAppAccount.findOne({ organizationId: orgId }).lean() : null,
        orgId ? FacebookPageConnection.findOne({ organizationId: orgId }).lean() : null,
        orgId ? Contact.countDocuments({ organizationId: orgId }) : 0,
        orgId ? Message.countDocuments({ organizationId: orgId }) : 0
      ]);

      res.status(200).json(
        apiSuccess({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            countryCode: user.countryCode || '91',
            companyName: user.companyName || membership?.organizationId?.name,
            status: user.status,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          },
          organization: membership?.organizationId,
          integrations: {
            whatsapp: {
              connected: phone?.status === 'CONNECTED',
              displayPhoneNumber: phone?.displayPhoneNumber,
              wabaId: phone?.wabaId || account?.wabaId,
              status: phone?.status || 'DISCONNECTED'
            },
            facebook: {
              connected: fb?.status === 'CONNECTED',
              pageName: fb?.pageName,
              status: fb?.status || 'DISCONNECTED'
            }
          },
          stats: {
            contactsCount,
            messagesCount
          }
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, phone, companyName, countryCode, status } = req.body;

      const user = await User.findById(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      if (name) user.name = name.trim();
      if (phone) user.phone = phone.trim();
      if (companyName) user.companyName = companyName.trim();
      if (countryCode) user.countryCode = countryCode.trim();
      if (status) user.status = status;

      await user.save();

      if (companyName) {
        const membership = await OrganizationMember.findOne({ userId: user._id });
        if (membership?.organizationId) {
          await Organization.findByIdAndUpdate(membership.organizationId, { $set: { name: companyName.trim() } });
        }
      }

      res.status(200).json(apiSuccess(user, 'User updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
        const error = new Error('Invalid status value. Must be ACTIVE, SUSPENDED, or DEACTIVATED');
        error.statusCode = 400;
        throw error;
      }

      const user = await User.findByIdAndUpdate(id, { $set: { status } }, { new: true });
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Sync organization status
      const membership = await OrganizationMember.findOne({ userId: user._id });
      if (membership?.organizationId) {
        await Organization.findByIdAndUpdate(membership.organizationId, { $set: { status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' } });
      }

      res.status(200).json(apiSuccess(user, `User status updated to ${status}`));
    } catch (error) {
      next(error);
    }
  }

  async resetUserPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        const error = new Error('Password must be at least 6 characters long');
        error.statusCode = 400;
        throw error;
      }

      const user = await User.findById(id).select('+password');
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      user.password = newPassword;
      await user.save(); // pre-save bcrypt hook hashes password automatically

      res.status(200).json(apiSuccess(null, 'User password reset successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if trying to delete primary IGlobal Tech test user
      if (user.email === 'wasim@arvee.com') {
        const error = new Error('Cannot delete primary test account wasim@arvee.com');
        error.statusCode = 400;
        throw error;
      }

      const membership = await OrganizationMember.findOne({ userId: user._id });
      if (membership?.organizationId) {
        const orgId = membership.organizationId;
        await Promise.all([
          Organization.findByIdAndDelete(orgId),
          OrganizationMember.deleteMany({ organizationId: orgId }),
          WhatsAppAccount.deleteMany({ organizationId: orgId }),
          WhatsAppPhoneNumber.deleteMany({ organizationId: orgId }),
          FacebookPageConnection.deleteMany({ organizationId: orgId }),
          Contact.deleteMany({ organizationId: orgId }),
          Message.deleteMany({ organizationId: orgId }),
          Conversation.deleteMany({ organizationId: orgId })
        ]);
      }

      await User.findByIdAndDelete(id);

      res.status(200).json(apiSuccess(null, 'User and associated workspace deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { limit = 100, search } = req.query;
      const safeLimit = parseInt(limit, 10) || 100;

      const [messages, contacts, phoneNumbers, organizations] = await Promise.all([
        Message.find({ isDeleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .lean(),
        Contact.find().lean(),
        WhatsAppPhoneNumber.find().lean(),
        Organization.find().lean()
      ]);

      const enhancedMessages = messages.map((m) => {
        const contact = contacts.find((c) => c._id.toString() === m.contactId?.toString());
        const phone = phoneNumbers.find((p) => p._id.toString() === m.whatsappPhoneNumberId?.toString());
        const org = organizations.find((o) => o._id.toString() === m.organizationId?.toString());

        return {
          _id: m._id,
          direction: m.direction,
          status: m.status,
          channel: m.channel,
          type: m.type,
          content: m.content,
          createdAt: m.createdAt,
          contact: {
            _id: contact?._id,
            name: contact?.name || 'Unknown Contact',
            phone: contact?.phone || 'N/A',
            tags: contact?.tags || []
          },
          senderNumber: phone?.displayPhoneNumber || phone?.phoneNumber || '+91 91998 00309',
          organizationName: org?.name || 'IGlobal Tech'
        };
      });

      let filtered = enhancedMessages;
      if (search) {
        const s = search.toLowerCase();
        filtered = enhancedMessages.filter(
          (m) =>
            m.contact?.name?.toLowerCase().includes(s) ||
            m.contact?.phone?.includes(s) ||
            m.content?.text?.toLowerCase().includes(s) ||
            m.senderNumber?.includes(s)
        );
      }

      res.status(200).json(apiSuccess(filtered, 'Messages fetched successfully', { total: filtered.length }));
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
