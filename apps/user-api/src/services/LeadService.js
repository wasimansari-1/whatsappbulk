import { leadRepository } from '../repositories/LeadRepository.js';
import { normalizePhoneNumber } from '@whatsapp-saas/shared-utils';

export class LeadService {
  async getLeads(organizationId, { stage, search, page, limit }) {
    return leadRepository.getLeadsByStage(organizationId, stage, { search, page, limit });
  }

  async getStageCounts(organizationId) {
    return leadRepository.getStageCounts(organizationId);
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

  async deleteLead(organizationId, id) {
    return leadRepository.softDeleteById(organizationId, id);
  }
}

export const leadService = new LeadService();
export default leadService;
