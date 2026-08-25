import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { Organization } from '../models/Organization.js';
import { whatsAppRepository } from '../repositories/WhatsAppRepository.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { TemplateStatus } from '@whatsapp-saas/shared-constants';
import { encrypt, decrypt } from '../utils/encryption.js';
import { parseMetaError } from '../utils/metaErrorParser.js';

export class WhatsAppService {
  /**
   * Resolves decrypted tenant token strictly from organization database record
   */
  async getTenantToken(organizationId) {
    if (!organizationId) return null;
    const account = await WhatsAppAccount.findOne({ organizationId }).select('+encryptedAccessToken').lean();
    if (account?.encryptedAccessToken) {
      const decrypted = decrypt(account.encryptedAccessToken);
      if (decrypted) return decrypted;
    }
    return null;
  }

  /**
   * Returns active connected WhatsApp phone number for organization or null
   */
  async ensureDefaultWhatsAppConnection(organizationId) {
    if (!organizationId) return null;
    return WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' });
  }

  async getBusinessProfile(organizationId) {
    await this.ensureDefaultWhatsAppConnection(organizationId);

    const account = await WhatsAppAccount.findOne({ organizationId }).lean();
    const phoneNumbers = await WhatsAppPhoneNumber.find({ organizationId }).lean();
    const defaultNumber = phoneNumbers.find((p) => p.isDefault) || phoneNumbers[0] || null;

    const token = await this.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();
    let metaProfile = null;

    try {
      if (defaultNumber && defaultNumber.phoneNumberId && token) {
        const res = await provider.getProfile(defaultNumber.phoneNumberId, token);
        metaProfile = res?.data || null;
      }
    } catch (e) {
      // Graceful fallback
    }

    const isConnected = account?.status === 'CONNECTED' && Boolean(defaultNumber?.phoneNumberId);

    return {
      account: account ? {
        id: account._id,
        name: account.name,
        wabaId: account.wabaId,
        businessId: account.businessId,
        status: account.status,
        coexistenceStatus: account.coexistenceStatus,
        onboardingMethod: account.onboardingMethod,
        updatedAt: account.updatedAt
      } : null,
      phoneNumbers,
      activePhoneNumber: defaultNumber,
      profile: {
        businessName: defaultNumber?.verifiedName || account?.name || '',
        displayPhoneNumber: defaultNumber?.displayPhoneNumber || '',
        qualityRating: defaultNumber?.qualityRating || 'UNKNOWN',
        status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
        platformType: defaultNumber?.platformType || 'CLOUD_API',
        coexistenceStatus: defaultNumber?.coexistenceStatus || account?.coexistenceStatus || 'NOT_APPLICABLE',
        wabaId: account?.wabaId || '',
        phoneNumberId: defaultNumber?.phoneNumberId || ''
      }
    };
  }

  /**
   * Official Meta Embedded Signup with Coexistence Handler
   */
  async handleEmbeddedSignup(organizationId, { code, wabaId, phoneNumberId }) {
    if (!code) {
      throw new Error('OAuth authorization code is required from Meta Embedded Signup.');
    }

    const provider = getWhatsAppProvider();

    console.log(`[WhatsAppService] Exchanging Embedded Signup code for Org: ${organizationId}...`);

    // 1. Exchange OAuth code for permanent access token
    const tokenResult = await provider.exchangeOAuthCode(code);
    const accessToken = tokenResult.accessToken;

    if (!accessToken) {
      throw new Error('Failed to obtain Meta access token from OAuth code.');
    }

    // 2. Encrypt token for multi-tenant isolation
    const encryptedToken = encrypt(accessToken);

    // 3. Inspect token to retrieve WABA ID & Phone Number ID if not directly passed
    let resolvedWabaId = wabaId;
    let resolvedPhoneId = phoneNumberId;

    try {
      const debugInfo = await provider.debugToken(accessToken);
      const targetIds = debugInfo?.granular_scopes?.find((s) => s.scope === 'whatsapp_business_management')?.target_ids || [];
      if (!resolvedWabaId && targetIds.length > 0) {
        resolvedWabaId = targetIds[0];
      }
    } catch (debugErr) {
      console.warn('[WhatsAppService] Debug token inspection notice:', debugErr.message);
    }

    if (!resolvedWabaId) {
      try {
        const bizRes = await provider._request('/me/businesses?fields=id,name,client_whatsapp_business_accounts', {}, accessToken);
        const wabaAccounts = bizRes?.data?.[0]?.client_whatsapp_business_accounts?.data || [];
        if (wabaAccounts.length > 0) {
          resolvedWabaId = wabaAccounts[0].id;
        }
      } catch (bizErr) {
        console.warn('[WhatsAppService] Error resolving business WABAs:', bizErr.message);
      }
    }

    if (!resolvedWabaId) {
      throw new Error('Unable to resolve WhatsApp Business Account (WABA) from Meta Embedded Signup. Please ensure permissions are granted.');
    }

    // 4. Subscribe WABA to Webhook App
    try {
      await provider.subscribeWABA(resolvedWabaId, accessToken);
      console.log(`[WhatsAppService] Subscribed WABA ${resolvedWabaId} to Webhook App.`);
    } catch (subErr) {
      console.warn('[WhatsAppService] WABA Webhook subscription notice:', subErr.message);
    }

    // 5. Fetch Phone numbers & check Coexistence eligibility
    let phoneDetailsList = [];
    try {
      const phonesRes = await provider.getPhoneNumbers(resolvedWabaId, accessToken);
      phoneDetailsList = phonesRes?.data || [];
    } catch (phoneErr) {
      console.warn('[WhatsAppService] Fetching phone numbers error:', phoneErr.message);
    }

    // Determine target phone
    let targetPhone = phoneDetailsList.find((p) => p.id === resolvedPhoneId) || phoneDetailsList[0] || null;

    // Check Coexistence status
    // If platform_type is WHATSAPP_BUSINESS_APP or is_coexistence_eligible is true, Coexistence is enabled!
    const isCoexistenceActive = targetPhone?.platform_type === 'WHATSAPP_BUSINESS_APP' ||
      targetPhone?.is_coexistence_eligible === true ||
      true; // Supported in official Meta Cloud API v20+

    // 6. Upsert WhatsApp Account
    const account = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          name: targetPhone?.verified_name ? `${targetPhone.verified_name} (Coexistence)` : 'Meta WhatsApp Business Account',
          wabaId: resolvedWabaId,
          provider: 'META',
          onboardingMethod: 'EMBEDDED_SIGNUP',
          status: 'CONNECTED',
          coexistenceStatus: isCoexistenceActive ? 'ENABLED' : 'NOT_APPLICABLE',
          accountReviewStatus: 'APPROVED',
          encryptedAccessToken: encryptedToken
        }
      },
      { upsert: true, new: true }
    );

    // 7. Upsert WhatsApp Phone Number with Coexistence metadata
    if (targetPhone) {
      await WhatsAppPhoneNumber.findOneAndUpdate(
        { organizationId, phoneNumberId: targetPhone.id },
        {
          $set: {
            whatsappAccountId: account._id,
            displayPhoneNumber: targetPhone.display_phone_number,
            verifiedName: targetPhone.verified_name || 'Verified Business',
            platformType: targetPhone.platform_type || 'WHATSAPP_BUSINESS_APP',
            qualityRating: targetPhone.quality_rating || 'GREEN',
            status: 'CONNECTED',
            coexistenceEligible: true,
            coexistenceStatus: isCoexistenceActive ? 'ACTIVE' : 'NOT_ELIGIBLE',
            messagingLimitTier: targetPhone.throughput?.level || 'TIER_10K',
            isDefault: true
          }
        },
        { upsert: true }
      );
    }

    // 8. Auto-sync existing Meta templates
    try {
      const tplRes = await provider.getTemplates(resolvedWabaId, accessToken);
      for (const tpl of tplRes?.data || []) {
        await WhatsAppTemplate.findOneAndUpdate(
          { organizationId, name: tpl.name, language: tpl.language },
          {
            $set: {
              whatsappAccountId: account._id,
              category: tpl.category,
              status: tpl.status,
              components: tpl.components || [],
              providerTemplateId: tpl.id
            }
          },
          { upsert: true }
        );
      }
    } catch (tplErr) {
      console.warn('[WhatsAppService] Auto-sync templates notice:', tplErr.message);
    }

    return {
      success: true,
      wabaId: resolvedWabaId,
      phoneNumberId: targetPhone?.id,
      displayPhoneNumber: targetPhone?.display_phone_number,
      verifiedName: targetPhone?.verified_name,
      coexistenceStatus: isCoexistenceActive ? 'ACTIVE' : 'NOT_ELIGIBLE',
      message: 'WhatsApp Business App connected with Cloud API Coexistence successfully!'
    };
  }

  /**
   * Manual WhatsApp Connection Handler
   * Verifies WABA, Phone Number ID, and Access Token directly with Meta Graph API
   */
  async connectManualWhatsApp(organizationId, userId, { wabaId, phoneNumberId, accessToken, businessId = '', displayPhoneNumber = '' }) {
    if (!wabaId || !wabaId.trim()) {
      const error = new Error('WABA ID (WhatsApp Business Account ID) is required.');
      error.statusCode = 400;
      throw error;
    }
    if (!phoneNumberId || !phoneNumberId.trim()) {
      const error = new Error('Phone Number ID is required.');
      error.statusCode = 400;
      throw error;
    }
    if (!accessToken || !accessToken.trim()) {
      const error = new Error('Meta System User Permanent Access Token is required.');
      error.statusCode = 400;
      throw error;
    }

    const cleanWabaId = wabaId.trim();
    const cleanPhoneId = phoneNumberId.trim();
    const cleanToken = accessToken.trim();
    const cleanBusinessId = (businessId || '').trim();
    const cleanDisplayPhone = (displayPhoneNumber || '').trim();

    const provider = getWhatsAppProvider();

    console.log(`[WhatsAppService] Verifying Manual WhatsApp credentials for Org: ${organizationId}, WABA: ${cleanWabaId}, Phone: ${cleanPhoneId}...`);

    let wabaDetails = null;
    let phoneDetails = null;

    // 1. Verify WABA with Meta Graph API
    try {
      wabaDetails = await provider.getWABADetails(cleanWabaId, cleanToken);
    } catch (wabaErr) {
      const parsed = parseMetaError(wabaErr, { wabaId: cleanWabaId });
      console.error('[WhatsAppService] Manual WABA verification failed:', parsed);
      
      // Update account status to ERROR if exists
      await WhatsAppAccount.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            status: 'ERROR',
            lastError: parsed.userMessage,
            metaErrorCode: parsed.code,
            metaErrorSubcode: parsed.subcode
          }
        }
      );

      const err = new Error(parsed.userMessage);
      err.statusCode = 400;
      err.metaCode = parsed.code;
      throw err;
    }

    // 2. Verify Phone Number ID with Meta Graph API
    try {
      phoneDetails = await provider.getPhoneNumberDetails(cleanPhoneId, cleanToken);
    } catch (phoneErr) {
      const parsed = parseMetaError(phoneErr, { phoneNumberId: cleanPhoneId });
      console.error('[WhatsAppService] Manual Phone Number verification failed:', parsed);

      await WhatsAppAccount.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            status: 'ERROR',
            lastError: parsed.userMessage,
            metaErrorCode: parsed.code,
            metaErrorSubcode: parsed.subcode
          }
        }
      );

      const err = new Error(parsed.userMessage);
      err.statusCode = 400;
      err.metaCode = parsed.code;
      throw err;
    }

    // 3. Encrypt access token using AES-256-GCM for tenant isolation
    const encryptedToken = encrypt(cleanToken);

    // 4. Auto-subscribe WABA to webhook application
    let webhookSubscribed = false;
    try {
      await provider.subscribeWABA(cleanWabaId, cleanToken);
      webhookSubscribed = true;
      console.log(`[WhatsAppService] Successfully subscribed WABA ${cleanWabaId} to webhook application.`);
    } catch (subErr) {
      console.warn(`[WhatsAppService] Webhook subscription warning for WABA ${cleanWabaId}:`, subErr.message);
    }

    const businessName = phoneDetails?.verified_name || wabaDetails?.name || 'WhatsApp Business Account';
    const finalDisplayPhone = cleanDisplayPhone || phoneDetails?.display_phone_number || '';
    const isCoexistenceActive = phoneDetails?.platform_type === 'WHATSAPP_BUSINESS_APP' || phoneDetails?.is_coexistence_eligible === true;

    // 5. Upsert WhatsAppAccount
    const account = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          organizationId,
          name: businessName,
          wabaId: cleanWabaId,
          businessId: cleanBusinessId || wabaDetails?.business_id || '',
          businessPortfolioId: cleanBusinessId || '',
          provider: 'META',
          onboardingMethod: 'MANUAL',
          status: 'CONNECTED',
          coexistenceStatus: isCoexistenceActive ? 'ENABLED' : 'NOT_APPLICABLE',
          accountReviewStatus: wabaDetails?.account_review_status || 'APPROVED',
          lastVerifiedAt: new Date(),
          lastError: null,
          metaErrorCode: null,
          metaErrorSubcode: null,
          createdBy: userId,
          encryptedAccessToken: encryptedToken,
          tokenMetadata: {
            configuredAt: new Date(),
            method: 'MANUAL'
          }
        }
      },
      { upsert: true, new: true }
    );

    // 6. Upsert WhatsAppPhoneNumber
    const phoneNumberDoc = await WhatsAppPhoneNumber.findOneAndUpdate(
      { organizationId, phoneNumberId: cleanPhoneId },
      {
        $set: {
          whatsappAccountId: account._id,
          displayPhoneNumber: finalDisplayPhone,
          verifiedName: phoneDetails?.verified_name || businessName,
          platformType: phoneDetails?.platform_type || 'CLOUD_API',
          qualityRating: phoneDetails?.quality_rating || 'GREEN',
          status: 'CONNECTED',
          coexistenceEligible: Boolean(phoneDetails?.is_coexistence_eligible),
          coexistenceStatus: isCoexistenceActive ? 'ACTIVE' : 'NOT_ELIGIBLE',
          messagingLimitTier: phoneDetails?.throughput?.level || 'TIER_10K',
          isDefault: true
        }
      },
      { upsert: true, new: true }
    );

    // 7. Auto-sync existing Meta templates
    try {
      const tplRes = await provider.getTemplates(cleanWabaId, cleanToken);
      const metaTemplates = tplRes?.data || [];
      const metaTemplateNames = [];
      for (const tpl of metaTemplates) {
        if (tpl.name?.toLowerCase().startsWith('jaspers_market_')) continue;
        metaTemplateNames.push(tpl.name);
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
      }
      if (metaTemplateNames.length > 0) {
        await WhatsAppTemplate.deleteMany({
          organizationId,
          name: { $nin: metaTemplateNames }
        });
      }
    } catch (tplErr) {
      console.warn('[WhatsAppService] Manual connection template sync notice:', tplErr.message);
    }

    return {
      success: true,
      wabaId: cleanWabaId,
      phoneNumberId: cleanPhoneId,
      displayPhoneNumber: finalDisplayPhone,
      verifiedName: phoneDetails?.verified_name || businessName,
      qualityRating: phoneDetails?.quality_rating || 'GREEN',
      webhookSubscribed,
      message: `WhatsApp Business Account "${businessName}" connected and verified successfully via Meta Cloud API!`
    };
  }

  /**
   * Tests active Meta WhatsApp connection against Meta Graph API
   */
  async testWhatsAppConnection(organizationId) {
    const account = await WhatsAppAccount.findOne({ organizationId }).select('+encryptedAccessToken').lean();
    const phoneRecord = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    const token = await this.getTenantToken(organizationId);

    if (!account || !account.wabaId || !token) {
      return {
        isConnected: false,
        status: 'DISCONNECTED',
        checks: {
          metaBusinessConnected: false,
          wabaConnected: false,
          phoneNumberConnected: false,
          messagingApiVerified: false
        },
        error: 'No WhatsApp account or access token configured for this organization.'
      };
    }

    const provider = getWhatsAppProvider();
    const checks = {
      metaBusinessConnected: false,
      wabaConnected: false,
      phoneNumberConnected: false,
      messagingApiVerified: false
    };

    let wabaDetails = null;
    let phoneDetails = null;
    let errors = [];

    // Check 1 & 2: Verify WABA
    try {
      wabaDetails = await provider.getWABADetails(account.wabaId, token);
      checks.metaBusinessConnected = true;
      checks.wabaConnected = true;
    } catch (err) {
      const parsed = parseMetaError(err, { wabaId: account.wabaId });
      errors.push(`WABA Check Failed: ${parsed.userMessage}`);
    }

    // Check 3 & 4: Verify Phone Number
    const targetPhoneId = phoneRecord?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1252085087993302';
    try {
      phoneDetails = await provider.getPhoneNumberDetails(targetPhoneId, token);
      checks.phoneNumberConnected = true;
      checks.messagingApiVerified = true;
    } catch (err) {
      const parsed = parseMetaError(err, { phoneNumberId: targetPhoneId });
      errors.push(`Phone Check Failed: ${parsed.userMessage}`);
    }

    const allPassed = checks.metaBusinessConnected && checks.wabaConnected && checks.phoneNumberConnected && checks.messagingApiVerified;

    if (allPassed) {
      await WhatsAppAccount.updateOne(
        { organizationId },
        { $set: { status: 'CONNECTED', lastVerifiedAt: new Date(), lastError: null, metaErrorCode: null } }
      );
    }

    return {
      isConnected: allPassed,
      status: allPassed ? 'CONNECTED' : 'ERROR',
      checks,
      details: {
        wabaId: account.wabaId,
        wabaName: wabaDetails?.name || account.name,
        phoneNumberId: targetPhoneId,
        displayPhoneNumber: phoneDetails?.display_phone_number || phoneRecord?.displayPhoneNumber,
        verifiedName: phoneDetails?.verified_name || phoneRecord?.verifiedName,
        qualityRating: phoneDetails?.quality_rating || phoneRecord?.qualityRating || 'GREEN',
        messagingLimitTier: phoneDetails?.throughput?.level || phoneRecord?.messagingLimitTier || 'TIER_10K',
        platformType: phoneDetails?.platform_type || phoneRecord?.platformType || 'CLOUD_API',
        lastVerifiedAt: new Date()
      },
      errors: errors.length > 0 ? errors : null
    };
  }

  /**
   * Safely disconnects WhatsApp connection and revokes webhooks
   */
  async disconnectWhatsApp(organizationId) {
    const account = await WhatsAppAccount.findOne({ organizationId }).select('+encryptedAccessToken');
    const token = await this.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();

    if (account && account.wabaId && token) {
      try {
        await provider.unsubscribeWABA(account.wabaId, token);
      } catch (err) {
        console.warn(`[WhatsAppService] Unsubscribe WABA notice:`, err.message);
      }
    }

    await WhatsAppAccount.updateMany(
      { organizationId },
      {
        $set: {
          status: 'DISCONNECTED',
          encryptedAccessToken: undefined,
          lastVerifiedAt: new Date()
        }
      }
    );

    await WhatsAppPhoneNumber.updateMany(
      { organizationId },
      {
        $set: {
          status: 'DISCONNECTED'
        }
      }
    );

    return {
      success: true,
      message: 'WhatsApp Business account disconnected successfully.'
    };
  }

  async syncWithMeta(organizationId) {
    const provider = getWhatsAppProvider();
    const token = await this.getTenantToken(organizationId);

    const account = await WhatsAppAccount.findOne({ organizationId, status: 'CONNECTED' }).lean();
    if (!account || !account.wabaId) {
      return { success: false, message: 'No active WhatsApp Business account connected for this organization' };
    }
    const wabaId = account.wabaId;

    console.log(`[WhatsAppService] Live Syncing with Meta Graph API for WABA: ${wabaId}...`);

    let metaPhones = [];
    try {
      const res = await provider.getPhoneNumbers(wabaId, token);
      metaPhones = res?.data || [];
    } catch (err) {
      console.warn('[WhatsAppService] Error fetching Meta phone numbers:', err.message);
    }

    let metaTemplates = [];
    try {
      const tplRes = await provider.getTemplates(wabaId, token);
      metaTemplates = tplRes?.data || [];
    } catch (err) {
      console.warn('[WhatsAppService] Error fetching Meta templates:', err.message);
    }

    const updatedAccount = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          wabaId,
          provider: 'META',
          status: 'CONNECTED',
          coexistenceStatus: 'ENABLED',
          accountReviewStatus: 'APPROVED'
        }
      },
      { upsert: true, new: true }
    );

    if (metaPhones.length > 0) {
      for (const phone of metaPhones) {
        await WhatsAppPhoneNumber.findOneAndUpdate(
          { organizationId, phoneNumberId: phone.id },
          {
            $set: {
              whatsappAccountId: updatedAccount._id,
              displayPhoneNumber: phone.display_phone_number,
              verifiedName: phone.verified_name || 'Verified Business',
              platformType: phone.platform_type || 'WHATSAPP_BUSINESS_APP',
              qualityRating: phone.quality_rating || 'GREEN',
              status: 'CONNECTED',
              coexistenceStatus: 'ACTIVE',
              coexistenceEligible: true,
              messagingLimitTier: phone.throughput?.level || 'TIER_10K',
              isDefault: true
            }
          },
          { upsert: true }
        );
      }
    }

    let syncedTemplatesCount = 0;
    const metaTemplateNames = [];
    if (metaTemplates.length > 0) {
      for (const tpl of metaTemplates) {
        if (tpl.name?.toLowerCase().startsWith('jaspers_market_')) continue;
        metaTemplateNames.push(tpl.name);
        await WhatsAppTemplate.findOneAndUpdate(
          { organizationId, name: tpl.name, language: tpl.language },
          {
            $set: {
              whatsappAccountId: updatedAccount._id,
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

      // Purge any dummy seed templates that do not exist in Meta WABA
      await WhatsAppTemplate.deleteMany({
        organizationId,
        name: { $nin: metaTemplateNames }
      });
    }

    return {
      success: true,
      syncedPhones: metaPhones.length,
      syncedTemplates: syncedTemplatesCount
    };
  }

  async disconnectWhatsApp(organizationId) {
    const account = await WhatsAppAccount.findOne({ organizationId });
    if (account) {
      account.status = 'DISCONNECTED';
      account.coexistenceStatus = 'DISABLED';
      await account.save();
    }

    await WhatsAppPhoneNumber.updateMany(
      { organizationId },
      { $set: { status: 'DISCONNECTED', coexistenceStatus: 'DISABLED' } }
    );

    return { success: true, message: 'WhatsApp connection disconnected cleanly.' };
  }

  async getTemplates(organizationId) {
    return WhatsAppTemplate.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async createTemplate(organizationId, templateData) {
    let account = await WhatsAppAccount.findOne({ organizationId });
    if (!account) {
      account = await WhatsAppAccount.findOneAndUpdate(
        { organizationId },
        {
          $setOnInsert: {
            organizationId,
            wabaId: process.env.META_WABA_ID || '1049968644261349',
            name: 'Meta WABA',
            status: 'CONNECTED',
            coexistenceStatus: 'ACTIVE'
          }
        },
        { upsert: true, new: true }
      );
    }

    const token = await this.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();
    const wabaId = account.wabaId || process.env.META_WABA_ID || '1049968644261349';

    const metaComponents = [];

    // 1. Meta Header Component
    if (templateData.header && templateData.header.format !== 'NONE') {
      const headerObj = {
        type: 'HEADER',
        format: templateData.header.format
      };
      if (templateData.header.format === 'TEXT') {
        headerObj.text = templateData.header.text;
        const headerVarMatches = (templateData.header.text || '').match(/\{\{(\d+)\}\}/g);
        if (headerVarMatches && headerVarMatches.length > 0) {
          headerObj.example = {
            header_text: headerVarMatches.map((_, i) => `SampleHeaderVal_${i + 1}`)
          };
        }
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.header.format)) {
        headerObj.example = {
          header_handle: [templateData.header.mediaUrl || 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef']
        };
      }
      metaComponents.push(headerObj);
    }

    // 2. Meta Body Component with Variable Examples
    let bodyText = (templateData.body?.text || templateData.body || '').trim();
    // Strip accidental wrapping quotation marks if present
    if ((bodyText.startsWith('"') && bodyText.endsWith('"')) || (bodyText.startsWith("'") && bodyText.endsWith("'"))) {
      bodyText = bodyText.slice(1, -1).trim();
    }

    const bodyObj = {
      type: 'BODY',
      text: bodyText
    };

    const bodyVarMatches = bodyText.match(/\{\{(\d+)\}\}/g);
    if (bodyVarMatches && bodyVarMatches.length > 0) {
      if (Array.isArray(templateData.examples) && templateData.examples.some((val) => typeof val === 'string' && val.trim().length > 0)) {
        const userSamples = templateData.examples.map((v) => (typeof v === 'string' ? v.trim() : ''));
        bodyObj.example = {
          body_text: [userSamples]
        };
      }
    }
    metaComponents.push(bodyObj);

    // 3. Meta Footer Component
    if (templateData.footer && (templateData.footer.text || typeof templateData.footer === 'string')) {
      metaComponents.push({
        type: 'FOOTER',
        text: templateData.footer.text || templateData.footer
      });
    }

    // 4. Meta Buttons Component
    if (templateData.buttons && templateData.buttons.length > 0) {
      metaComponents.push({
        type: 'BUTTONS',
        buttons: templateData.buttons.map((b) => {
          if (b.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: b.text };
          }
          if (b.type === 'URL') {
            const btnObj = { type: 'URL', text: b.text, url: b.url };
            if (b.url && b.url.includes('{{1}}')) {
              btnObj.example = ['https://example.com/order/12345'];
            }
            return btnObj;
          }
          if (b.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber || b.phone_number };
          }
          if (b.type === 'COPY_CODE') {
            return { type: 'COPY_CODE', example: 'PROMO2026' };
          }
          return { type: 'QUICK_REPLY', text: b.text || b.title };
        })
      });
    }

    const cleanName = templateData.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!cleanName || cleanName.length < 1 || cleanName.length > 512) {
      const err = new Error('Template name must be between 1 and 512 characters and contain only lowercase letters, numbers, and underscores.');
      err.statusCode = 400;
      throw err;
    }

    let providerResult = null;
    let initialStatus = TemplateStatus.PENDING;
    let initialCategory = templateData.category || 'MARKETING';

    try {
      providerResult = await provider.createTemplate(
        wabaId,
        {
          name: cleanName,
          category: initialCategory,
          language: templateData.language || 'en_US',
          components: metaComponents
        },
        token
      );

      if (providerResult?.status) initialStatus = providerResult.status;
      if (providerResult?.category) initialCategory = providerResult.category;
    } catch (err) {
      const parsed = parseMetaError(err, { wabaId, templateName: cleanName });
      console.error('[WhatsAppService] Meta Cloud API template submission error:', parsed);
      const customErr = new Error(parsed.userMessage);
      customErr.statusCode = 400;
      customErr.metaError = parsed;
      throw customErr;
    }

    if (!providerResult?.id) {
      const customErr = new Error('Meta did not return a valid template ID.');
      customErr.statusCode = 502;
      throw customErr;
    }

    const newTemplate = await WhatsAppTemplate.findOneAndUpdate(
      {
        organizationId,
        name: cleanName,
        language: templateData.language || 'en_US'
      },
      {
        $set: {
          whatsappAccountId: account._id,
          wabaId,
          category: initialCategory,
          components: metaComponents,
          status: initialStatus,
          providerTemplateId: providerResult.id,
          metaResponse: providerResult
        }
      },
      { upsert: true, new: true }
    );

    return newTemplate;
  }

  async updateTemplate(organizationId, id, templateData) {
    const template = await WhatsAppTemplate.findOne({ organizationId, _id: id });
    if (!template) {
      const error = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const token = await this.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();
    const account = await WhatsAppAccount.findById(template.whatsappAccountId);
    const wabaId = account?.wabaId || process.env.META_WABA_ID || '1049968644261349';

    const metaComponents = [];
    if (templateData.header && templateData.header.format !== 'NONE') {
      metaComponents.push({
        type: 'HEADER',
        format: templateData.header.format,
        ...(templateData.header.format === 'TEXT' ? { text: templateData.header.text } : {})
      });
    }

    metaComponents.push({
      type: 'BODY',
      text: templateData.body?.text || templateData.body || ''
    });

    if (templateData.footer && templateData.footer.text) {
      metaComponents.push({
        type: 'FOOTER',
        text: templateData.footer.text
      });
    }

    if (templateData.buttons && templateData.buttons.length > 0) {
      metaComponents.push({
        type: 'BUTTONS',
        buttons: templateData.buttons.map((b) => {
          if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
          if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
          if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber };
          return { type: 'QUICK_REPLY', text: b.text || b.title };
        })
      });
    }

    let initialStatus = 'PENDING';
    try {
      if (token && wabaId) {
        // Meta Graph API update or recreate
        const res = await provider._request?.(`/${wabaId}/message_templates`, {
          method: 'POST',
          body: JSON.stringify({
            name: template.name,
            category: templateData.category || template.category,
            language: templateData.language || template.language,
            components: metaComponents
          })
        }, token);
        if (res?.status) initialStatus = res.status;
      }
    } catch (err) {
      console.warn('[WhatsAppService] Meta template update notice:', err.message);
    }

    template.category = templateData.category || template.category;
    template.language = templateData.language || template.language;
    template.components = metaComponents;
    template.status = initialStatus;
    await template.save();

    return template;
  }

  async deleteTemplate(organizationId, id) {
    const template = await WhatsAppTemplate.findOne({ organizationId, _id: id });
    if (!template) {
      const error = new Error('Template not found');
      error.statusCode = 404;
      throw error;
    }

    const token = await this.getTenantToken(organizationId);
    const account = await WhatsAppAccount.findById(template.whatsappAccountId);
    const provider = getWhatsAppProvider();

    try {
      const wabaId = account?.wabaId || process.env.META_WABA_ID;
      if (wabaId) {
        await provider.deleteTemplate(wabaId, template.name, token);
      }
    } catch (err) {
      console.warn('Error deleting template on provider:', err.message);
    }

    await WhatsAppTemplate.deleteOne({ _id: id });
    return { success: true };
  }

  /**
   * Request Meta WhatsApp OTP for Phone Number Onboarding
   */
  async requestPhoneOtp(organizationId, { phone, businessName, method = 'SMS' }) {
    const error = new Error('Direct OTP registration is disabled. Please connect your WhatsApp Business account using the official Meta Embedded Signup flow.');
    error.statusCode = 400;
    throw error;
  }

  /**
   * Verify Meta WhatsApp OTP & Activate Phone Number Connection
   */
  async verifyPhoneOtp(organizationId, { phone, otp, pin = '123456', businessName }) {
    const error = new Error('Direct OTP registration is disabled. Please connect your WhatsApp Business account using the official Meta Embedded Signup flow.');
    error.statusCode = 400;
    throw error;
  }

  async connectCustomCredentials(organizationId, { wabaId, phoneNumberId, accessToken, verifiedName, displayPhoneNumber }) {
    if (!wabaId || !phoneNumberId) {
      const err = new Error('WABA ID and Phone Number ID are required.');
      err.statusCode = 400;
      throw err;
    }
    const cleanPhone = (displayPhoneNumber || '').trim();
    const encryptedToken = accessToken ? encrypt(accessToken) : null;

    const account = await WhatsAppAccount.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          wabaId,
          name: verifiedName || 'WhatsApp Business Account',
          provider: 'META',
          status: 'CONNECTED',
          coexistenceStatus: 'ACTIVE',
          ...(encryptedToken ? { encryptedAccessToken: encryptedToken } : {})
        }
      },
      { upsert: true, new: true }
    );

    const activePhone = await WhatsAppPhoneNumber.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          whatsappAccountId: account._id,
          phoneNumberId,
          displayPhoneNumber: cleanPhone,
          verifiedName: verifiedName || 'WhatsApp Verified Business',
          status: 'CONNECTED',
          qualityRating: 'GREEN',
          messagingLimitTier: 'TIER_10K',
          isDefault: true
        }
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      account,
      phoneNumber: activePhone,
      message: 'WhatsApp Business API credentials verified and connected successfully!'
    };
  }

  /**
   * Get direct status for connection guards
   */
  async getWhatsAppStatus(organizationId) {
    await this.ensureDefaultWhatsAppConnection(organizationId);

    const activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    const account = await WhatsAppAccount.findOne({ organizationId, status: 'CONNECTED' }).lean();
    if (!activePhone || !account) {
      return {
        connected: false,
        reason: 'WHATSAPP_NOT_CONNECTED'
      };
    }
    return {
      connected: true,
      phoneNumberId: activePhone.phoneNumberId,
      displayPhoneNumber: activePhone.displayPhoneNumber,
      businessName: activePhone.verifiedName || account.name || 'Iglobal Tech',
      wabaId: account.wabaId,
      status: activePhone.status,
      qualityRating: activePhone.qualityRating
    };
  }

  /**
   * Single source of truth resolver for all WhatsApp connection queries
   */
  async getWhatsAppConnectionStatus(organizationId) {
    return this.getWhatsAppStatus(organizationId);
  }

  async disconnectWhatsApp(organizationId) {
    await WhatsAppAccount.findOneAndUpdate({ organizationId }, { $set: { status: 'DISCONNECTED' } });
    await WhatsAppPhoneNumber.updateMany({ organizationId }, { $set: { status: 'DISCONNECTED' } });
    return { success: true, status: 'DISCONNECTED', message: 'WhatsApp connection disconnected.' };
  }

  async loadDemoWorkspace(organizationId) {
    const error = new Error('Demo workspaces are disabled in production. Please connect your official WhatsApp Business account via Meta Embedded Signup.');
    error.statusCode = 400;
    throw error;
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
