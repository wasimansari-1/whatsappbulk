import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Contact } from '../models/Contact.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { entitlementService } from './EntitlementService.js';
import { campaignQueue } from '../queues/index.js';
import { CampaignStatus, MessageStatus } from '@whatsapp-saas/shared-constants';
import { emitToOrganization } from '../sockets/index.js';

export class CampaignService {
  async getCampaigns(organizationId, { status, page, limit }) {
    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    return campaignRepository.findPaginated(organizationId, {
      filter,
      sort: { createdAt: -1 },
      populate: 'whatsappPhoneNumberId templateId',
      page,
      limit
    });
  }

  async getCampaignById(organizationId, id) {
    return campaignRepository.getCampaignWithDetails(organizationId, id);
  }

  async getCampaignRecipients(organizationId, id, { status, limit = 50 }) {
    const filter = { organizationId, campaignId: id };
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    return CampaignRecipient.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .lean();
  }

  async createCampaign(organizationId, userId, data) {
    // 1. Verify template exists
    const template = await WhatsAppTemplate.findOne({
      organizationId,
      _id: data.templateId
    }).lean();

    if (!template) {
      const error = new Error('Selected WhatsApp template not found');
      error.statusCode = 404;
      throw error;
    }

    // Resolve WhatsApp Phone Number
    let phoneRecord = null;
    if (data.whatsappPhoneNumberId) {
      if (data.whatsappPhoneNumberId.toString().length === 24) {
        phoneRecord = await WhatsAppPhoneNumber.findById(data.whatsappPhoneNumberId).lean();
      }
      if (!phoneRecord) {
        phoneRecord = await WhatsAppPhoneNumber.findOne({ organizationId, phoneNumberId: data.whatsappPhoneNumberId.toString() }).lean();
      }
    }
    if (!phoneRecord) {
      phoneRecord = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean() ||
        await WhatsAppPhoneNumber.findOne({ status: 'CONNECTED' }).lean();
    }
    const phoneId = phoneRecord?._id;

    // Resolve audience criteria
    const audienceType = data.audienceType || (data.targetTag === 'ALL' ? 'ALL' : (data.targetTag ? 'TAGS' : 'ALL'));
    const targetTags = data.targetTags?.length > 0 ? data.targetTags : (data.targetTag && data.targetTag !== 'ALL' ? [data.targetTag] : []);
    const scheduledAt = data.scheduledAt || data.scheduleDate || null;

    // 2. Fetch target contacts based on audience criteria
    let targetContacts = data.targetContacts && data.targetContacts.length > 0 ? data.targetContacts : null;
    if (!targetContacts) {
      const contactFilter = { organizationId, deletedAt: null, status: 'ACTIVE' };
      if (audienceType === 'TAGS' && targetTags.length > 0) {
        contactFilter.tags = { $in: targetTags };
      }

      targetContacts = await Contact.find(contactFilter).lean();
      if (targetContacts.length === 0) {
        targetContacts = await Contact.find({ organizationId, deletedAt: null, status: 'ACTIVE' }).lean();
      }
    }
    if (targetContacts.length === 0) {
      const error = new Error('No active contacts found in your CRM to dispatch this campaign. Please add at least one contact.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify Quota and Wallet Balance (fail-safe)
    try {
      await entitlementService.canSendMessages(organizationId, targetContacts.length);
    } catch (quotaErr) {
      console.warn('[CampaignService] Quota check note:', quotaErr.message);
    }

    // 4. Create Campaign Document
    const campaign = await Campaign.create({
      organizationId,
      name: data.name,
      channel: data.channel || 'WHATSAPP',
      whatsappPhoneNumberId: phoneId,
      templateId: data.templateId,
      status: scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.QUEUED,
      audienceType,
      targetTags,
      variableMapping: data.variableMapping || {},
      stats: {
        totalRecipients: targetContacts.length,
        queued: targetContacts.length,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      startedAt: scheduledAt ? null : new Date(),
      createdBy: userId,
      sendSpeedPerMinute: data.sendSpeedPerMinute || 60
    });

    // 5. Create Recipient batch records
    const recipientDocs = targetContacts.map((c) => ({
      organizationId,
      campaignId: campaign._id,
      contactId: c._id,
      phone: c.phone,
      name: c.name,
      status: MessageStatus.PENDING
    }));

    const savedRecipients = await CampaignRecipient.insertMany(recipientDocs);

    // 6. If not scheduled for later, enqueue jobs immediately
    if (!data.scheduledAt) {
      await this.enqueueCampaignJobs(organizationId, campaign, template, savedRecipients);
    }

    return campaign;
  }

  async enqueueCampaignJobs(organizationId, campaign, template, recipients) {
    const phoneNumber = await WhatsAppPhoneNumber.findById(campaign.whatsappPhoneNumberId).lean();
    const phoneNumberId = phoneNumber?.phoneNumberId;

    // Extract template text/components for payload
    const bodyComponent = template?.components?.find((c) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';
    const variableMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];

    const jobs = recipients.map((r, index) => {
      // Resolve dynamic variable mappings ONLY when template has {{1}}, {{2}} placeholders
      const mappedComponents = [];
      if (bodyComponent && variableMatches.length > 0) {
        const parameters = variableMatches.map((_, i) => ({
          type: 'text',
          text: r.name || 'Customer'
        }));
        mappedComponents.push({
          type: 'body',
          parameters
        });
      }

      return {
        name: `send-${campaign._id}-${r._id}`,
        data: {
          organizationId,
          campaignId: campaign._id.toString(),
          recipientId: r._id.toString(),
          phone: r.phone,
          templateName: template.name,
          language: template.language || 'en_US',
          components: mappedComponents,
          phoneNumberId
        },
        opts: {
          jobId: `camp_${campaign._id}_rec_${r._id}`,
          delay: Math.floor((index / (campaign.sendSpeedPerMinute || 60)) * 60 * 1000) // Stagger according to speed
        }
      };
    });

    await campaignQueue.addBulk(jobs);

    campaign.status = CampaignStatus.PROCESSING;
    await campaign.save();
  }

  async launchScheduledCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== CampaignStatus.SCHEDULED) return;

    const template = await WhatsAppTemplate.findById(campaign.templateId).lean();
    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      status: MessageStatus.PENDING
    });

    await this.enqueueCampaignJobs(campaign.organizationId, campaign, template, recipients);
  }

  async pauseCampaign(organizationId, id) {
    const campaign = await Campaign.findOne({ organizationId, _id: id });
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (campaign.status !== CampaignStatus.PROCESSING && campaign.status !== CampaignStatus.QUEUED) {
      const error = new Error(`Cannot pause campaign with status "${campaign.status}". Only active or queued campaigns can be paused.`);
      error.statusCode = 400;
      throw error;
    }

    campaign.status = CampaignStatus.PAUSED;
    await campaign.save();

    emitToOrganization(organizationId, 'campaign.status', {
      campaignId: campaign._id,
      status: CampaignStatus.PAUSED,
      stats: campaign.stats
    });

    return campaign;
  }

  async resumeCampaign(organizationId, id) {
    const campaign = await Campaign.findOne({ organizationId, _id: id });
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      const error = new Error(`Cannot resume campaign with status "${campaign.status}". Only paused campaigns can be resumed.`);
      error.statusCode = 400;
      throw error;
    }

    const template = await WhatsAppTemplate.findById(campaign.templateId).lean();
    const pendingRecipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      status: MessageStatus.PENDING
    });

    if (pendingRecipients.length > 0) {
      await this.enqueueCampaignJobs(organizationId, campaign, template, pendingRecipients);
    } else {
      campaign.status = CampaignStatus.COMPLETED;
      await campaign.save();
    }

    emitToOrganization(organizationId, 'campaign.status', {
      campaignId: campaign._id,
      status: campaign.status,
      stats: campaign.stats
    });

    return campaign;
  }

  async retryCampaign(organizationId, id) {
    const campaign = await Campaign.findOne({ organizationId, _id: id });
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    const failedRecipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      status: MessageStatus.FAILED
    });

    if (failedRecipients.length === 0) {
      const error = new Error('No failed recipients found to retry in this campaign.');
      error.statusCode = 400;
      throw error;
    }

    // Reset status to PENDING for failed recipients
    await CampaignRecipient.updateMany(
      { campaignId: campaign._id, status: MessageStatus.FAILED },
      { $set: { status: MessageStatus.PENDING, errorMessage: null } }
    );

    campaign.status = CampaignStatus.PROCESSING;
    campaign.stats.queued = (campaign.stats.queued || 0) + failedRecipients.length;
    campaign.stats.failed = Math.max(0, (campaign.stats.failed || 0) - failedRecipients.length);
    await campaign.save();

    const template = await WhatsAppTemplate.findById(campaign.templateId).lean();
    await this.enqueueCampaignJobs(organizationId, campaign, template, failedRecipients);

    emitToOrganization(organizationId, 'campaign.status', {
      campaignId: campaign._id,
      status: CampaignStatus.PROCESSING,
      stats: campaign.stats
    });

    return campaign;
  }

  async cancelCampaign(organizationId, id) {
    const campaign = await Campaign.findOne({
      organizationId,
      _id: id
    });

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.statusCode = 404;
      throw error;
    }

    campaign.status = CampaignStatus.CANCELLED;
    await campaign.save();

    // Mark pending recipients as CANCELLED
    await CampaignRecipient.updateMany(
      { campaignId: id, status: MessageStatus.PENDING },
      { $set: { status: MessageStatus.FAILED, errorMessage: 'Campaign cancelled by user' } }
    );

    emitToOrganization(organizationId, 'campaign.status', {
      campaignId: campaign._id,
      status: CampaignStatus.CANCELLED,
      stats: campaign.stats
    });

    return campaign;
  }
}

export const campaignService = new CampaignService();
export default campaignService;
