import { contactService } from '../services/ContactService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class ContactController {
  async getContacts(req, res, next) {
    try {
      const result = await contactService.getContacts(req.organizationId, req.query);
      res.status(200).json(apiSuccess(result.items, 'Contacts fetched successfully', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getContact(req, res, next) {
    try {
      const contact = await contactService.getContactById(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(contact));
    } catch (error) {
      next(error);
    }
  }

  async createContact(req, res, next) {
    try {
      const contact = await contactService.createContact(req.organizationId, req.body);
      res.status(201).json(apiSuccess(contact, 'Contact created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async updateContact(req, res, next) {
    try {
      const contact = await contactService.updateContact(req.organizationId, req.params.id, req.body);
      res.status(200).json(apiSuccess(contact, 'Contact updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req, res, next) {
    try {
      await contactService.deleteContact(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(null, 'Contact deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  async bulkActions(req, res, next) {
    try {
      const result = await contactService.handleBulkActions(req.organizationId, req.body);
      res.status(200).json(apiSuccess(result, 'Bulk action applied successfully'));
    } catch (error) {
      next(error);
    }
  }

  async importContacts(req, res, next) {
    try {
      const { contacts } = req.body;
      const result = await contactService.importContactsAsync(req.organizationId, contacts || []);
      res.status(202).json(apiSuccess(result, 'Contact import queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getTags(req, res, next) {
    try {
      const tags = await contactService.getTags(req.organizationId);
      res.status(200).json(apiSuccess(tags));
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
export default contactController;
