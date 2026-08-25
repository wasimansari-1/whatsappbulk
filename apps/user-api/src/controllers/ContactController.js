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

  async importContactsDirect(req, res, next) {
    try {
      const { contacts, defaultGroup, defaultTags, assignedTo } = req.body;
      const result = await contactService.importContactsDirect(req.organizationId, contacts || [], {
        defaultGroup,
        defaultTags,
        assignedTo
      });
      res.status(200).json(apiSuccess(result, `Successfully imported ${result.totalProcessed} customers!`));
    } catch (error) {
      next(error);
    }
  }

  async getGroups(req, res, next) {
    try {
      const groups = await contactService.getGroups(req.organizationId);
      res.status(200).json(apiSuccess(groups));
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const { name, description } = req.body;
      const group = await contactService.createGroup(req.organizationId, name, description);
      res.status(201).json(apiSuccess(group, 'Customer group created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async bulkAssignGroup(req, res, next) {
    try {
      const { contactIds, groupName } = req.body;
      const result = await contactService.bulkAssignGroup(req.organizationId, contactIds, groupName);
      res.status(200).json(apiSuccess(result, `Assigned ${result.updatedCount} customers to ${groupName}`));
    } catch (error) {
      next(error);
    }
  }

  async bulkSendGroupBroadcast(req, res, next) {
    try {
      const { groupName, contactIds, messageText, templateName } = req.body;
      const result = await contactService.bulkSendGroupBroadcast(req.organizationId, {
        groupName,
        contactIds,
        messageText,
        templateName
      });
      res.status(200).json(apiSuccess(result, `Dispatched bulk WhatsApp broadcast to ${result.dispatchedCount} customers`));
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
