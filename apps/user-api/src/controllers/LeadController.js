import { leadService } from '../services/LeadService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class LeadController {
  async getLeads(req, res, next) {
    try {
      const result = await leadService.getLeads(req.organizationId, req.query);
      res.status(200).json(apiSuccess(result.items, 'Leads fetched', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getStageCounts(req, res, next) {
    try {
      const counts = await leadService.getStageCounts(req.organizationId);
      res.status(200).json(apiSuccess(counts));
    } catch (error) {
      next(error);
    }
  }

  async createLead(req, res, next) {
    try {
      const lead = await leadService.createLead(req.organizationId, req.body);
      res.status(201).json(apiSuccess(lead, 'Lead created'));
    } catch (error) {
      next(error);
    }
  }

  async updateLead(req, res, next) {
    try {
      const lead = await leadService.updateLead(req.organizationId, req.params.id, req.body);
      res.status(200).json(apiSuccess(lead, 'Lead updated'));
    } catch (error) {
      next(error);
    }
  }

  async updateLeadStage(req, res, next) {
    try {
      const { stage } = req.body;
      const lead = await leadService.updateLeadStage(req.organizationId, req.params.id, stage);
      res.status(200).json(apiSuccess(lead, 'Lead stage updated'));
    } catch (error) {
      next(error);
    }
  }

  async deleteLead(req, res, next) {
    try {
      await leadService.deleteLead(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(null, 'Lead deleted'));
    } catch (error) {
      next(error);
    }
  }
}

export const leadController = new LeadController();
export default leadController;
