import { BaseRepository } from './BaseRepository.js';
import { Lead } from '../models/Lead.js';

export class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  async getLeadsByStage(organizationId, stage, { search, page, limit }) {
    const filter = {};
    if (stage && stage !== 'ALL') {
      filter.stage = stage;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }];
    }

    return this.findPaginated(organizationId, {
      filter,
      sort: { createdAt: -1 },
      populate: 'assignedTo contactId',
      page,
      limit
    });
  }

  async getStageCounts(organizationId) {
    const counts = await this.model.aggregate([
      { $match: { organizationId: this.model.base.Types.ObjectId.createFromHexString(organizationId.toString()) } },
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]);

    const result = {
      TOTAL: 0,
      NEW: 0,
      FOLLOW_UPS: 0,
      HOT: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      DISQUALIFIED: 0
    };

    counts.forEach((c) => {
      if (result[c._id] !== undefined) {
        result[c._id] = c.count;
      }
      result.TOTAL += c.count;
    });

    return result;
  }
}

export const leadRepository = new LeadRepository();
export default leadRepository;
