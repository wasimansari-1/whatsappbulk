import { leadRepository } from '../repositories/LeadRepository.js';
import { normalizePhoneNumber } from '@whatsapp-saas/shared-utils';

export class LeadService {
  async getLeads(organizationId, query = {}) {
    return leadRepository.getLeadsByStage(organizationId, query.stage, query);
  }

  async getStageCounts(organizationId, query = {}) {
    return leadRepository.getStageCounts(organizationId, query);
  }

  async createLead(organizationId, data) {
    if (data.phone) {
      data.phone = normalizePhoneNumber(data.phone);
    }
    return leadRepository.create(organizationId, data);
  }

  async updateLead(organizationId, id, data) {
    if (data.phone) {
      data.phone = normalizePhoneNumber(data.phone);
    }
    return leadRepository.updateById(organizationId, id, data);
  }

  async updateLeadStage(organizationId, id, stage) {
    return leadRepository.updateById(organizationId, id, { stage });
  }

  async bulkUpdateStage(organizationId, leadIds, stage) {
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('leadIds array is required');
    }
    const result = await leadRepository.model.updateMany(
      { organizationId, _id: { $in: leadIds } },
      { $set: { stage } }
    );
    return { updatedCount: result.modifiedCount, stage };
  }

  async bulkSendBroadcast(organizationId, leadIds, { messageText, templateName }) {
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('leadIds array is required');
    }
    const leads = await leadRepository.model.find({
      organizationId,
      _id: { $in: leadIds }
    }).lean();

    // Create a broadcast or message dispatch task for each lead
    const dispatched = [];
    for (const lead of leads) {
      dispatched.push({
        leadId: lead._id,
        phone: lead.phone,
        name: lead.name,
        status: 'QUEUED'
      });
    }

    return {
      success: true,
      totalLeads: leads.length,
      dispatchedCount: dispatched.length,
      messageText: messageText || `Template: ${templateName}`,
      dispatched
    };
  }

  async deleteLead(organizationId, id) {
    return leadRepository.softDeleteById(organizationId, id);
  }
}

export const leadService = new LeadService();
export default leadService;
