import { contactRepository } from '../repositories/ContactRepository.js';
import { Tag } from '../models/Tag.js';
import { Contact } from '../models/Contact.js';
import { ContactList } from '../models/ContactList.js';
import { Lead } from '../models/Lead.js';
import { entitlementService } from './EntitlementService.js';
import { campaignService } from './CampaignService.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
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

    if (!data.phone) {
      const error = new Error('Phone number is required');
      error.statusCode = 400;
      throw error;
    }

    const cleanPhone = data.phone.toString().replace(/\D/g, '');

    // 1. Meta international E.164 phone length & structure validation
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      const error = new Error(
        `❌ Meta WhatsApp Validation Error: Invalid phone number "+${data.phone}". Meta requires a valid international number with country code (10-15 digits, e.g. 919876543210 for India).`
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Check for duplicate number within this organization
    const existing = await Contact.findOne({
      organizationId,
      phone: cleanPhone,
      deletedAt: null
    }).lean();

    if (existing) {
      const error = new Error(
        `❌ Duplicate Contact: A contact with phone number +${cleanPhone} already exists in your workspace (${existing.name}).`
      );
      error.statusCode = 409;
      throw error;
    }

    const contact = await contactRepository.create(organizationId, {
      ...data,
      phone: cleanPhone,
      whatsappStatus: 'VALID',
      metaComplianceNote: 'Verified E.164 format'
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
      const cleanPhone = data.phone.toString().replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        const error = new Error('Invalid phone number length. Meta requires 10-15 digits with country code.');
        error.statusCode = 400;
        throw error;
      }
      data.phone = cleanPhone;
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

  async getGroups(organizationId) {
    const groups = await Contact.aggregate([
      { $match: { organizationId: Contact.base.Types.ObjectId.createFromHexString(organizationId.toString()), deletedAt: null } },
      { $group: { _id: '$groupName', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const lists = await ContactList.find({ organizationId }).lean();
    const groupMap = new Map();

    lists.forEach((l) => groupMap.set(l.name, 0));
    groups.forEach((g) => {
      if (g._id) {
        groupMap.set(g._id, g.count);
      }
    });

    return Array.from(groupMap.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }

  async createGroup(organizationId, name, description = '') {
    if (!name || !name.trim()) throw new Error('Group name is required');
    const existing = await ContactList.findOne({ organizationId, name: name.trim() });
    if (existing) return existing;
    return ContactList.create({ organizationId, name: name.trim(), description });
  }

  async bulkAssignGroup(organizationId, contactIds, groupName) {
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      throw new Error('contactIds array is required');
    }
    const result = await Contact.updateMany(
      { organizationId, _id: { $in: contactIds } },
      { $set: { groupName: groupName.trim() } }
    );
    return { updatedCount: result.modifiedCount, groupName };
  }

  async bulkSendGroupBroadcast(organizationId, { groupName, contactIds, messageText, templateName, templateId }) {
    // 1. Resolve template
    let targetTemplate = null;
    if (templateId) {
      targetTemplate = await WhatsAppTemplate.findOne({ organizationId, _id: templateId }).lean();
    }
    if (!targetTemplate && templateName) {
      targetTemplate = await WhatsAppTemplate.findOne({ organizationId, name: templateName }).lean();
    }
    if (!targetTemplate && templateName) {
      const globalTemplate = await WhatsAppTemplate.findOne({ name: templateName }).lean();
      if (globalTemplate) {
        targetTemplate = await WhatsAppTemplate.findOneAndUpdate(
          { organizationId, name: templateName },
          {
            $set: {
              organizationId,
              name: globalTemplate.name,
              language: globalTemplate.language || 'en',
              category: globalTemplate.category || 'UTILITY',
              status: 'APPROVED',
              components: globalTemplate.components || []
            }
          },
          { upsert: true, new: true }
        ).lean();
      }
    }
    if (!targetTemplate) {
      // Fallback to first approved template for this organization
      targetTemplate = await WhatsAppTemplate.findOne({ organizationId, status: 'APPROVED' }).lean() ||
        await WhatsAppTemplate.findOne({ status: 'APPROVED' }).lean();
    }

    if (!targetTemplate) {
      const error = new Error('A valid approved WhatsApp Template is required to dispatch bulk broadcasts.');
      error.statusCode = 400;
      throw error;
    }

    if (targetTemplate.status && targetTemplate.status !== 'APPROVED') {
      const error = new Error(`Template "${targetTemplate.name}" is currently ${targetTemplate.status} by Meta. Meta only permits sending APPROVED templates. Please choose an approved template like "iglobal_welcome_msg".`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch target contacts excluding OPT_OUT and deleted records
    const filter = { organizationId, deletedAt: null, status: 'ACTIVE' };
    if (contactIds && contactIds.length > 0) {
      filter._id = { $in: contactIds };
    } else if (groupName && groupName !== 'ALL') {
      filter.groupName = groupName;
    }

    const contacts = await Contact.find(filter).lean();
    if (contacts.length === 0) {
      const error = new Error('No eligible active contacts found for broadcast (all contacts may be opted out or deleted).');
      error.statusCode = 400;
      throw error;
    }

    // 3. Create real Campaign through CampaignService to ensure BullMQ dispatch through Meta Cloud API
    const campaignName = `Broadcast - ${groupName || 'Custom'} - ${new Date().toLocaleDateString('en-IN')}`;
    const campaign = await campaignService.createCampaign(organizationId, null, {
      name: campaignName,
      templateId: targetTemplate._id,
      audienceType: groupName ? 'GROUP' : 'CUSTOM',
      targetTags: [],
      targetContacts: contacts
    });

    return {
      success: true,
      campaignId: campaign._id,
      totalRecipients: contacts.length,
      groupName: groupName || 'Custom Selection',
      templateName: targetTemplate.name,
      status: campaign.status
    };
  }

  async importContactsDirect(organizationId, rawContacts, { defaultGroup = 'General', defaultTags = [], assignedTo = null } = {}) {
    const sanitized = [];

    for (const c of rawContacts) {
      // Support both header formats (Row 1 or Row 2 from customers.xlsx)
      const rawPhone = (c.mobile || c.Mobile || c['required Field (Mobile Number with Country Code)'] || c.phone || c.Phone || c.number || '').toString().replace(/\D/g, '');
      const rawName = (c.name || c.Name || c['required Field'] || c['Full Name'] || 'Customer').toString().trim();
      
      // Skip guideline rows
      if (rawName === 'name' || rawPhone === 'mobile' || rawName === 'required Field') continue;
      if (!rawPhone || rawPhone.length < 10) continue;

      const city = (c.city || c.City || c.optional || '').toString().trim();
      const gender = (c.gender || c.Gender || c.optional_1 || '').toString().trim();
      const age = (c.age || c.Age || c.optional_2 || '').toString().trim();
      const designation = (c.designation || c.Designation || c.optional_3 || '').toString().trim();
      const rawTags = c.tags || c.Tags || c.optional_4 || '';
      const group = (c.groupName || c.group || defaultGroup || 'General').toString().trim();

      const parsedTags = Array.isArray(rawTags)
        ? rawTags
        : rawTags.split(',').map((t) => t.trim()).filter(Boolean);

      const mergedTags = Array.from(new Set([...parsedTags, ...defaultTags]));

      sanitized.push({
        name: rawName,
        phone: rawPhone,
        email: (c.email || c.Email || '').toString().trim().toLowerCase(),
        groupName: group,
        city,
        gender,
        age,
        designation,
        tags: mergedTags,
        status: 'ACTIVE',
        whatsappStatus: 'VALID',
        assignedTo: assignedTo || null
      });
    }

    if (sanitized.length === 0) {
      throw new Error('No valid contact rows found. Make sure mobile numbers have country code (e.g. 919818387397).');
    }

    await entitlementService.canAddContacts(organizationId, sanitized.length);
    const result = await contactRepository.batchInsertContacts(organizationId, sanitized);

    return {
      success: true,
      totalProcessed: sanitized.length,
      insertedOrUpdated: result.insertedCount || result.matchedCount || sanitized.length
    };
  }

  async getTags(organizationId) {
    return Tag.find({ organizationId }).sort({ name: 1 }).lean();
  }
}

export const contactService = new ContactService();
export default contactService;
