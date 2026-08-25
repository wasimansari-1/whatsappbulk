import { BaseRepository } from './BaseRepository.js';
import { Lead } from '../models/Lead.js';
import '../models/User.js';

export class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  _buildDateFilter({ preset, startDate, endDate, month, year }) {
    const dateFilter = {};
    const now = new Date();

    if (preset === 'TODAY') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else if (preset === 'YESTERDAY') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else if (preset === 'LAST_7_DAYS') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
      dateFilter.$lte = now;
    } else if (preset === 'LAST_30_DAYS') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
      dateFilter.$lte = now;
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    } else if (year) {
      const yr = parseInt(year, 10);
      if (month && month !== 'ALL') {
        const m = parseInt(month, 10) - 1;
        const start = new Date(Date.UTC(yr, m, 1, 0, 0, 0));
        const end = new Date(Date.UTC(yr, m + 1, 0, 23, 59, 59, 999));
        dateFilter.$gte = start;
        dateFilter.$lte = end;
      } else {
        const start = new Date(Date.UTC(yr, 0, 1, 0, 0, 0));
        const end = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));
        dateFilter.$gte = start;
        dateFilter.$lte = end;
      }
    }

    return Object.keys(dateFilter).length > 0 ? dateFilter : null;
  }

  async getLeadsByStage(organizationId, stage, { search, priority, metaCampaignId, metaFormId, preset, startDate, endDate, month, year, page, limit }) {
    const filter = {};
    if (stage && stage !== 'ALL') {
      filter.stage = stage;
    }
    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }
    if (metaCampaignId && metaCampaignId !== 'ALL') {
      filter.metaCampaignId = metaCampaignId;
    }
    if (metaFormId && metaFormId !== 'ALL') {
      filter.metaFormId = metaFormId;
    }

    const dateFilter = this._buildDateFilter({ preset, startDate, endDate, month, year });
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { metaCampaignName: searchRegex },
        { metaFormName: searchRegex },
        { metaLeadId: searchRegex }
      ];
    }

    return this.findPaginated(organizationId, {
      filter,
      sort: { createdAt: -1 },
      populate: 'assignedTo',
      page,
      limit
    });
  }

  async getStageCounts(organizationId, query = {}) {
    const { metaCampaignId, metaFormId, preset, startDate, endDate, month, year } = query;
    const matchFilter = {
      organizationId: this.model.base.Types.ObjectId.createFromHexString(organizationId.toString())
    };

    if (metaCampaignId && metaCampaignId !== 'ALL') {
      matchFilter.metaCampaignId = metaCampaignId;
    }
    if (metaFormId && metaFormId !== 'ALL') {
      matchFilter.metaFormId = metaFormId;
    }

    const dateFilter = this._buildDateFilter({ preset, startDate, endDate, month, year });
    if (dateFilter) {
      matchFilter.createdAt = dateFilter;
    }

    const counts = await this.model.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$dealValue' } } }
    ]);

    const result = {
      TOTAL: 0,
      NEW: 0,
      CONTACTED: 0,
      INTERESTED: 0,
      NOT_INTERESTED: 0,
      QUALIFIED: 0,
      FOLLOW_UP: 0,
      CONVERTED: 0,
      LOST: 0,
      TOTAL_VALUE: 0
    };

    counts.forEach((c) => {
      if (result[c._id] !== undefined) {
        result[c._id] = c.count;
      }
      result.TOTAL += c.count;
      result.TOTAL_VALUE += (c.totalValue || 0);
    });

    return result;
  }
}

export const leadRepository = new LeadRepository();
export default leadRepository;
