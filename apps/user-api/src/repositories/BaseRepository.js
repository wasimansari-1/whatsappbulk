import { decodeCursor, encodeCursor } from '@whatsapp-saas/shared-utils';

/**
 * Enterprise Base Repository with strict multi-tenancy scoping, lean queries & cursor pagination
 */
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Safe organization-scoped filter builder
   */
  _scopedFilter(organizationId, filter = {}) {
    if (!organizationId) {
      throw new Error('[Repository] Critical Security Violation: organizationId is required for tenant isolation');
    }
    return {
      ...filter,
      organizationId,
      deletedAt: null // Soft-delete filter
    };
  }

  async findById(organizationId, id, projection = null) {
    return this.model
      .findOne(this._scopedFilter(organizationId, { _id: id }))
      .select(projection)
      .lean();
  }

  async findOne(organizationId, filter = {}, projection = null) {
    return this.model
      .findOne(this._scopedFilter(organizationId, filter))
      .select(projection)
      .lean();
  }

  async create(organizationId, data) {
    const docData = { ...data, organizationId };
    const doc = new this.model(docData);
    await doc.save();
    return doc.toObject();
  }

  async updateById(organizationId, id, updateData) {
    return this.model
      .findOneAndUpdate(
        this._scopedFilter(organizationId, { _id: id }),
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .lean();
  }

  async softDeleteById(organizationId, id) {
    return this.model
      .findOneAndUpdate(
        this._scopedFilter(organizationId, { _id: id }),
        { $set: { deletedAt: new Date() } },
        { new: true }
      )
      .lean();
  }

  async count(organizationId, filter = {}) {
    return this.model.countDocuments(this._scopedFilter(organizationId, filter));
  }

  /**
   * Paginated list with search, sorting, and cursor/offset support
   */
  async findPaginated(organizationId, {
    filter = {},
    projection = null,
    sort = { createdAt: -1 },
    page = 1,
    limit = 20,
    cursor = null,
    populate = null
  } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    let queryFilter = this._scopedFilter(organizationId, filter);

    if (cursor) {
      const cursorFilter = decodeCursor(cursor, Object.keys(sort)[0] || '_id');
      if (cursorFilter) {
        queryFilter = { ...queryFilter, ...cursorFilter };
      }
    }

    let query = this.model
      .find(queryFilter)
      .select(projection)
      .sort(sort)
      .limit(safeLimit + 1)
      .lean();

    if (!cursor && page > 1) {
      query = query.skip((page - 1) * safeLimit);
    }

    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }

    const items = await query.exec();
    const hasNextPage = items.length > safeLimit;
    const results = hasNextPage ? items.slice(0, safeLimit) : items;

    const nextCursor =
      hasNextPage && results.length > 0
        ? encodeCursor(results[results.length - 1], Object.keys(sort)[0] || '_id')
        : null;

    const totalCount = await this.count(organizationId, filter);

    return {
      items: results,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasNextPage,
        nextCursor
      }
    };
  }

  async bulkWrite(operations) {
    return this.model.bulkWrite(operations);
  }
}

export default BaseRepository;
