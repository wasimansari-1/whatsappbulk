import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Contact } from '../models/Contact.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { entitlementService } from './EntitlementService.js';
import { campaignQueue } from '../queues/index.js';
import { CampaignStatus, MessageStatus } from '@whatsapp-saas/shared-constants';

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

    // 2. Fetch target contacts based on audience criteria
    const contactFilter = { organizationId, deletedAt: null, status: 'ACTIVE' };
    if (data.audienceType === 'TAGS' && data.targetTags?.length > 0) {
      contactFilter.tags = { $in: data.targetTags };
    }

    const targetContacts = await Contact.find(contactFilter).lean();
    if (targetContacts.length === 0) {
      const error = new Error('No active contacts found for the selected audience criteria');
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify Quota and Wallet Balance
    await entitlementService.canSendMessages(organizationId, targetContacts.length);

    // 4. Create Campaign Document
    const campaign = await Campaign.create({
      organizationId,
      name: data.name,
      channel: data.channel || 'WHATSAPP',
      whatsappPhoneNumberId: data.whatsappPhoneNumberId,
      templateId: data.templateId,
      status: data.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.QUEUED,
      audienceType: data.audienceType,
      targetTags: data.targetTags || [],
      variableMapping: data.variableMapping || {},
      stats: {
        totalRecipients: targetContacts.length,
        queued: targetContacts.length,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      },
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      startedAt: data.scheduledAt ? null : new Date(),
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
    const phoneNumberId = phoneNumber?.phoneNumberId || 'mock_phone_num_id_1';

    // Extract template text/components for payload
    const bodyComponent = template.components?.find((c) => c.type === 'BODY');

    const jobs = recipients.map((r, index) => {
      // Resolve dynamic variable mappings (e.g. {{1}} -> Name)
      const mappedComponents = [];
      if (bodyComponent) {
        mappedComponents.push({
          type: 'body',
          parameters: [
            { type: 'text', text: r.name || 'Customer' }
          ]
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

    return campaign;
  }
}

export const campaignService = new CampaignService();
export default campaignService;
