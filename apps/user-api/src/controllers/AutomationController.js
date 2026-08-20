import { automationService } from '../services/AutomationService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class AutomationController {
  async getWorkflows(req, res, next) {
    try {
      const workflows = await automationService.getWorkflows(req.organizationId);
      res.status(200).json(apiSuccess(workflows));
    } catch (error) {
      next(error);
    }
  }

  async createWorkflow(req, res, next) {
    try {
      const workflow = await automationService.createWorkflow(req.organizationId, req.body);
      res.status(201).json(apiSuccess(workflow, 'Chatbot automation created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async updateWorkflow(req, res, next) {
    try {
      const workflow = await automationService.updateWorkflow(req.organizationId, req.params.id, req.body);
      res.status(200).json(apiSuccess(workflow, 'Workflow updated'));
    } catch (error) {
      next(error);
    }
  }

  async toggleWorkflow(req, res, next) {
    try {
      const workflow = await automationService.toggleWorkflow(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(workflow, `Workflow ${workflow.isActive ? 'activated' : 'paused'}`));
    } catch (error) {
      next(error);
    }
  }

  async deleteWorkflow(req, res, next) {
    try {
      await automationService.deleteWorkflow(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(null, 'Workflow deleted'));
    } catch (error) {
      next(error);
    }
  }
}

export const automationController = new AutomationController();
export default automationController;
