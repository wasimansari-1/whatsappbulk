import { BaseRepository } from './BaseRepository.js';
import { Contact } from '../models/Contact.js';

export class ContactRepository extends BaseRepository {
  constructor() {
    super(Contact);
  }

  async searchContacts(organizationId, { search, tag, groupName, status, page, limit, cursor }) {
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (tag) {
      filter.tags = tag;
    }
    if (groupName && groupName !== 'ALL') {
      filter.groupName = groupName;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { groupName: searchRegex },
        { city: searchRegex },
        { designation: searchRegex }
      ];
    }

    return this.findPaginated(organizationId, {
      filter,
      sort: { createdAt: -1 },
      populate: 'assignedTo',
      page,
      limit,
      cursor
    });
  }

  async batchInsertContacts(organizationId, contacts) {
    if (!contacts || contacts.length === 0) return { insertedCount: 0 };
    const bulkOps = contacts.map((c) => ({
      updateOne: {
        filter: { organizationId, phone: c.phone },
        update: {
          $set: {
            name: c.name,
            email: c.email || '',
            groupName: c.groupName || 'General',
            city: c.city || '',
            gender: c.gender || '',
            age: c.age || '',
            designation: c.designation || '',
            tags: c.tags || [],
            attributes: c.attributes || {},
            status: c.status || 'ACTIVE',
            whatsappStatus: 'VALID',
            deletedAt: null
          },
          $setOnInsert: { organizationId, createdAt: new Date() }
        },
        upsert: true
      }
    }));
    return this.bulkWrite(bulkOps);
  }
}

export const contactRepository = new ContactRepository();
export default contactRepository;
