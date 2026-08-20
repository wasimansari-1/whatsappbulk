import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseRepository } from '../src/repositories/BaseRepository.js';

test('Tenant Isolation: BaseRepository must enforce organizationId on all queries', async () => {
  const mockModel = {
    findOne: (filter) => ({
      select: () => ({
        lean: async () => filter
      })
    })
  };

  const repo = new BaseRepository(mockModel);

  // 1. Valid orgId
  const filterResult = await repo.findOne('org_tenant_123', { phone: '919876543210' });
  assert.equal(filterResult.organizationId, 'org_tenant_123');
  assert.equal(filterResult.phone, '919876543210');
  assert.equal(filterResult.deletedAt, null);

  // 2. Missing orgId must throw security exception
  await assert.rejects(
    async () => {
      await repo.findOne(null, { phone: '919876543210' });
    },
    /organizationId is required for tenant isolation/
  );
});
