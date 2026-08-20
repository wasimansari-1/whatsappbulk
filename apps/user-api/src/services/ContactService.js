import { contactRepository } from '../repositories/ContactRepository.js';
import { Tag } from '../models/Tag.js';
import { Contact } from '../models/Contact.js';
import { Lead } from '../models/Lead.js';
import { entitlementService } from './EntitlementService.js';
import { normalizePhoneNumber } from '@whatsapp-saas/shared-utils';
import { contactImportQueue } from '../queues/index.js';
import * as xlsx from 'xlsx';

export class ContactService {
  async getContacts(organizationId, query) {
    return contactRepository.searchContacts(organizationId, query);
  }

  async getContactById(organizationId, id) {
    const contact = await contactRepository.findById(organizationId, id);
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }
    return contact;
  }

  async createContact(organizationId, data) {
    await entitlementService.canAddContacts(organizationId, 1);
    const normalized = normalizePhoneNumber(data.phone);
    const contact = await contactRepository.create(organizationId, {
      ...data,
      phone: normalized
    });

    if (data.tags && data.tags.length > 0) {
      await Promise.all(
        data.tags.map((tagName) =>
          Tag.findOneAndUpdate(
            { organizationId, name: tagName.trim() },
            { $setOnInsert: { organizationId, name: tagName.trim() } },
            { upsert: true }
          )
        )
      );
    }

    return contact;
  }

  async updateContact(organizationId, id, data) {
    if (data.phone) {
      data.phone = normalizePhoneNumber(data.phone);
    }
    return contactRepository.updateById(organizationId, id, data);
  }

  async deleteContact(organizationId, id) {
    return contactRepository.softDeleteById(organizationId, id);
  }

  async handleBulkActions(organizationId, { contactIds, action, tags = [], assignedTo, leadStage }) {
    if (action === 'DELETE') {
      await contactRepository.model.updateMany(
        { organizationId, _id: { $in: contactIds } },
        { $set: { deletedAt: new Date() } }
      );
      return { success: true, count: contactIds.length };
    }

    if (action === 'ADD_TAGS') {
      await contactRepository.model.updateMany(
        { organizationId, _id: { $in: contactIds } },
        { $addToSet: { tags: { $each: tags } } }
      );
      return { success: true, count: contactIds.length };
    }

    if (action === 'REMOVE_TAGS') {
      await contactRepository.model.updateMany(
        { organizationId, _id: { $in: contactIds } },
        { $pullAll: { tags } }
      );
      return { success: true, count: contactIds.length };
    }

    if (action === 'ASSIGN_USER') {
      await contactRepository.model.updateMany(
        { organizationId, _id: { $in: contactIds } },
        { $set: { assignedTo } }
      );
      return { success: true, count: contactIds.length };
    }

    if (action === 'CONVERT_TO_LEAD') {
      const contacts = await contactRepository.model
        .find({ organizationId, _id: { $in: contactIds } })
        .lean();

      const leadDocs = contacts.map((c) => ({
        organizationId,
        contactId: c._id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        stage: leadStage || 'NEW',
        source: 'Contact Conversion'
      }));

      await Lead.insertMany(leadDocs);
      return { success: true, convertedCount: leadDocs.length };
    }

    return { success: false, message: 'Unsupported bulk action' };
  }

  async importContactsAsync(organizationId, rawContacts) {
    await entitlementService.canAddContacts(organizationId, rawContacts.length);

    const sanitized = rawContacts
      .filter((c) => c.phone || c.Phone || c.Mobile || c.mobile || c.number)
      .map((c) => {
        const phone = c.phone || c.Phone || c.Mobile || c.mobile || c.number || '';
        const name = c.name || c.Name || c['Full Name'] || 'Customer';
        const email = c.email || c.Email || '';
        const rawTags = c.tags || c.Tags || c.tag || '';
        const tags = Array.isArray(rawTags)
          ? rawTags
          : rawTags.split(',').map((t) => t.trim()).filter(Boolean);

        return {
          name: name.toString().trim(),
          phone: normalizePhoneNumber(phone.toString()),
          email: email.toString().trim().toLowerCase(),
          tags,
          status: 'ACTIVE'
        };
      })
      .filter((c) => c.phone.length >= 10);

    const job = await contactImportQueue.add('import-contacts', {
      organizationId,
      contacts: sanitized
    });

    return {
      jobId: job.id,
      totalQueued: sanitized.length,
      status: 'QUEUED'
    };
  }

  async getTags(organizationId) {
    return Tag.find({ organizationId }).sort({ name: 1 }).lean();
  }
}

export const contactService = new ContactService();
export default contactService;
