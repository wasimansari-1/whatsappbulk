import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { whatsAppRepository } from '../repositories/WhatsAppRepository.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { TemplateStatus } from '@whatsapp-saas/shared-constants';

export class WhatsAppService {
  async getBusinessProfile(organizationId) {
    let account = await WhatsAppAccount.findOne({ organizationId }).lean();
    let phoneNumbers = await WhatsAppPhoneNumber.find({ organizationId }).lean();
    let defaultNumber = phoneNumbers.find((p) => p.isDefault) || phoneNumbers[0] || null;

    const provider = getWhatsAppProvider();
    let metaProfile = null;

    try {
      if (defaultNumber && defaultNumber.phoneNumberId) {
        const res = await provider.getProfile(defaultNumber.phoneNumberId);
        metaProfile = res?.data || null;
      }
    } catch (e) {
      // fallback
    }

    return {
      account,
      phoneNumbers,
      activePhoneNumber: defaultNumber,
      profile: {
        businessName: defaultNumber?.verifiedName || 'IGlobal Tech',
        displayPhoneNumber: defaultNumber?.displayPhoneNumber || '+91 91998 00309',
        qualityRating: defaultNumber?.qualityRating || 'GREEN',
        status: defaultNumber?.status || 'CONNECTED',
        industry: 'TECHNOLOGY',
        wabaId: account?.wabaId || process.env.META_WABA_ID || '1049968644261349',
        phoneNumberId: defaultNumber?.phoneNumberId || process.env.META_PHONE_NUMBER_ID || '1223600624165995'
      }
    };
  }

  async syncWithMeta(organizationId) {
    const provider = getWhatsAppProvider();
    const wabaId = process.env.META_WABA_ID || '1049968644261349';
    const envPhoneId = process.env.META_PHONE_NUMBER_ID || '1223600624165995';

    console.log(`[WhatsAppService] Live Syncing with Meta Graph API for WABA: ${wabaId}...`);

    // 1. Fetch Phone numbers from Meta Graph API
    let metaPhones = [];
    try {
      const res = await provider.getPhoneNumbers(wabaId);
      metaPhones = res?.data || [];
    } catch (err) {
      console.warn('[WhatsAppService] Error fetching Meta phone numbers:', err.message);
    }

    // 2. Fetch Live Templates from Meta Graph API
    let metaTemplates = [];
    try {
      const tplRes = await provider.getTemplates(wabaId);
      metaTemplates = tplRes?.data || [];
    } catch (err) {
      console.warn('[WhatsAppService] Error fetching Meta templates:', err.message);
    }

    // 3. Upsert WhatsApp Account
    const account = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          name: metaPhones[0]?.verified_name ? `${metaPhones[0].verified_name} WABA` : 'Meta WhatsApp Business Account',
          wabaId,
          businessId: process.env.META_BUSINESS_ID || '993604119807437',
          provider: 'META',
          status: 'CONNECTED',
          accountReviewStatus: 'APPROVED'
        }
      },
      { upsert: true, new: true }
    );

    // 4. Upsert Phone Numbers
    if (metaPhones.length > 0) {
      for (const phone of metaPhones) {
        await WhatsAppPhoneNumber.findOneAndUpdate(
          { organizationId, phoneNumberId: phone.id },
          {
            $set: {
              whatsappAccountId: account._id,
              displayPhoneNumber: phone.display_phone_number,
              verifiedName: phone.verified_name || 'Verified Business',
              qualityRating: phone.quality_rating || 'GREEN',
              status: phone.code_verification_status === 'VERIFIED' ? 'CONNECTED' : 'CONNECTED',
              messagingLimitTier: phone.throughput?.level || 'TIER_10K',
              isDefault: phone.id === envPhoneId || true
            }
          },
          { upsert: true }
        );
      }
    }

    // 5. Sync Live Templates from Meta
    let syncedTemplatesCount = 0;
    if (metaTemplates.length > 0) {
      for (const tpl of metaTemplates) {
        await WhatsAppTemplate.findOneAndUpdate(
          { organizationId, name: tpl.name, language: tpl.language },
          {
            $set: {
              whatsappAccountId: account._id,
              category: tpl.category,
              status: tpl.status || TemplateStatus.APPROVED,
              components: tpl.components || [],
              providerTemplateId: tpl.id
            }
          },
          { upsert: true }
        );
        syncedTemplatesCount++;
      }
    }

    return {
      success: true,
      syncedPhones: metaPhones.length,
      syncedTemplates: syncedTemplatesCount,
      account
    };
  }

  async connectMetaAccount(organizationId, { phoneNumberId, wabaId, accessToken, verifiedName, displayPhoneNumber }) {
    let account = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          wabaId,
          name: `${verifiedName || 'Meta'} WABA`,
          provider: 'META',
          status: 'CONNECTED',
          accessToken
        }
      },
      { upsert: true, new: true }
    );

    const phoneNumber = await WhatsAppPhoneNumber.findOneAndUpdate(
      { organizationId, phoneNumberId },
      {
        $set: {
          whatsappAccountId: account._id,
          displayPhoneNumber,
          verifiedName: verifiedName || 'Verified Business',
          status: 'CONNECTED',
          isDefault: true
        }
      },
      { upsert: true, new: true }
    );

    return { account, phoneNumber };
  }

  async getTemplates(organizationId) {
    return WhatsAppTemplate.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async createTemplate(organizationId, templateData) {
    let account = await WhatsAppAccount.findOne({ organizationId });
    if (!account) {
      account = await WhatsAppAccount.create({
        organizationId,
        wabaId: process.env.META_WABA_ID || '1049968644261349',
        name: 'Meta WABA'
      });
    }

    const provider = getWhatsAppProvider();
    const wabaId = account.wabaId || process.env.META_WABA_ID || '1049968644261349';

    // Format components for Meta API specification
    const metaComponents = [];

    // Header
    if (templateData.header && templateData.header.format !== 'NONE') {
      const headerObj = {
        type: 'HEADER',
        format: templateData.header.format // 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
      };
      if (templateData.header.format === 'TEXT') {
        headerObj.text = templateData.header.text;
      }
      metaComponents.push(headerObj);
    }

    // Body (Mandatory)
    metaComponents.push({
      type: 'BODY',
      text: templateData.body?.text || templateData.body || ''
    });

    // Footer (Optional)
    if (templateData.footer && templateData.footer.text) {
      metaComponents.push({
        type: 'FOOTER',
        text: templateData.footer.text
      });
    }

    // Buttons (Optional)
    if (templateData.buttons && templateData.buttons.length > 0) {
      metaComponents.push({
        type: 'BUTTONS',
        buttons: templateData.buttons.map((b) => {
          if (b.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: b.text };
          }
          if (b.type === 'URL') {
            return { type: 'URL', text: b.text, url: b.url };
          }
          if (b.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber };
          }
          return { type: 'QUICK_REPLY', text: b.text || b.title };
        })
      });
    }

    const cleanName = templateData.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Submit directly to Meta Graph API
    let providerResult = null;
    let initialStatus = TemplateStatus.PENDING; // Must initially be PENDING until Meta review/sync!
    let initialCategory = templateData.category || 'MARKETING';

    try {
      providerResult = await provider.createTemplate(wabaId, {
        name: cleanName,
        category: initialCategory,
        language: templateData.language || 'en_US',
        components: metaComponents
      });

      if (providerResult?.status) {
        initialStatus = providerResult.status;
      }
      if (providerResult?.category) {
        initialCategory = providerResult.category;
      }
    } catch (err) {
      console.warn('[WhatsAppService] Meta template submission note:', err.message);
      // In case Meta returns pending or validation, we keep PENDING status
    }

    // Save to database with PENDING status
    const newTemplate = await WhatsAppTemplate.create({
      organizationId,
      whatsappAccountId: account._id,
      name: cleanName,
      category: initialCategory,
      language: templateData.language || 'en_US',
      components: metaComponents,
      status: initialStatus, // PENDING
      providerTemplateId: providerResult?.id || `meta_tpl_${Date.now()}`
    });

    return newTemplate;
  }

  async deleteTemplate(organizationId, id) {
    const template = await WhatsAppTemplate.findOne({ organizationId, _id: id });
    if (!template) {
      const error = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const account = await WhatsAppAccount.findById(template.whatsappAccountId);
    const provider = getWhatsAppProvider();
    try {
      const wabaId = account?.wabaId || process.env.META_WABA_ID;
      if (wabaId) {
        await provider.deleteTemplate(wabaId, template.name);
      }
    } catch (err) {
      console.warn('Error deleting template on provider:', err.message);
    }

    await WhatsAppTemplate.deleteOne({ _id: id });
    return { success: true };
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
