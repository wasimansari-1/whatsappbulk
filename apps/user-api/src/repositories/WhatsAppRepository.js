import { BaseRepository } from './BaseRepository.js';
import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';

export class WhatsAppRepository extends BaseRepository {
  constructor() {
    super(WhatsAppAccount);
  }

  async getActivePhoneNumber(organizationId) {
    return WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
  }

  async getPhoneNumbers(organizationId) {
    return WhatsAppPhoneNumber.find({ organizationId }).lean();
  }

  async getTemplates(organizationId, { status = null } = {}) {
    const filter = { organizationId };
    if (status) filter.status = status;
    return WhatsAppTemplate.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findTemplateByName(organizationId, name, language = 'en_US') {
    return WhatsAppTemplate.findOne({ organizationId, name, language }).lean();
  }
}

export const whatsAppRepository = new WhatsAppRepository();
export default whatsAppRepository;
