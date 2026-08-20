import { BaseRepository } from './BaseRepository.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';

export class CampaignRepository extends BaseRepository {
  constructor() {
    super(Campaign);
  }

  async getCampaignWithDetails(organizationId, id) {
    return this.model
      .findOne(this._scopedFilter(organizationId, { _id: id }))
      .populate('whatsappPhoneNumberId')
      .populate('templateId')
      .populate('createdBy', 'name email')
      .lean();
  }

  async updateCampaignStats(organizationId, campaignId, statField, incrementBy = 1) {
    return this.model.findOneAndUpdate(
      this._scopedFilter(organizationId, { _id: campaignId }),
      { $inc: { [`stats.${statField}`]: incrementBy } },
      { new: true }
    );
  }

  async createRecipientsBatch(recipients) {
    return CampaignRecipient.insertMany(recipients, { ordered: false });
  }

  async updateRecipientStatus(organizationId, { recipientId, providerMessageId, status, error = null }) {
    const update = { status };
    if (providerMessageId) update.providerMessageId = providerMessageId;
    if (status === 'SENT') update.sentAt = new Date();
    if (status === 'DELIVERED') update.deliveredAt = new Date();
    if (status === 'READ') update.readAt = new Date();
    if (status === 'FAILED') {
      update.failedAt = new Date();
      update.errorMessage = error;
    }

    const filter = recipientId ? { _id: recipientId } : { providerMessageId };
    return CampaignRecipient.findOneAndUpdate(
      { organizationId, ...filter },
      { $set: update },
      { new: true }
    );
  }
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;
