import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WhatsAppProvider } from './WhatsAppProvider.js';
import { getMetaGraphApiVersion } from '../../config/metaConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Official Meta WhatsApp Cloud API Provider with Embedded Signup & Coexistence support
 */
export class MetaWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || getMetaGraphApiVersion() || 'v25.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.appId = config.appId || process.env.META_APP_ID;
    this.appSecret = config.appSecret || process.env.META_APP_SECRET;
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  }

  isConfigured() {
    return Boolean(
      this.accessToken ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      (this.appId && this.appSecret)
    );
  }

  async _request(endpoint, options = {}, customToken = null) {
    const token = customToken || this.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    if (!token && !endpoint.includes('oauth/access_token')) {
      throw new Error('[MetaProvider] Meta Cloud API Access Token not provided or configured. Please set WHATSAPP_ACCESS_TOKEN in .env');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || response.statusText;
      const errorCode = data?.error?.code || response.status;
      const errorDetails = data?.error?.error_data?.details || data?.error?.error_user_msg || '';
      throw new Error(`[Meta Cloud API Error ${errorCode}]: ${errorMsg} ${errorDetails}`.trim());
    }

    return data;
  }

  /**
   * Exchanges OAuth code from Embedded Signup for long-lived access token
   */
  async exchangeOAuthCode(code) {
    const appId = this.appId || process.env.META_APP_ID;
    const appSecret = this.appSecret || process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('[MetaProvider] META_APP_ID and META_APP_SECRET are required to exchange Embedded Signup code.');
    }

    const url = `${this.baseUrl}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    const result = await this._request(url, { method: 'GET' });

    return {
      accessToken: result.access_token,
      tokenType: result.token_type,
      expiresIn: result.expires_in
    };
  }

  /**
   * Inspects and validates token permissions and granular scopes
   */
  async debugToken(inputToken) {
    const appId = this.appId || process.env.META_APP_ID;
    const appSecret = this.appSecret || process.env.META_APP_SECRET;
    const appToken = `${appId}|${appSecret}`;

    const url = `${this.baseUrl}/debug_token?input_token=${inputToken}&access_token=${appToken}`;
    const result = await this._request(url, { method: 'GET' });
    return result.data;
  }

  /**
   * Subscribes WABA to our webhook app for real-time message and status ingestion
   */
  async subscribeWABA(wabaId, token = null) {
    return this._request(`/${wabaId}/subscribed_apps`, { method: 'POST' }, token);
  }

  async unsubscribeWABA(wabaId, token = null) {
    return this._request(`/${wabaId}/subscribed_apps`, { method: 'DELETE' }, token);
  }

  async getWABADetails(wabaId, token = null) {
    return this._request(`/${wabaId}?fields=id,name,currency,timezone_id,account_review_status,message_template_namespace,business_verification_status`, {}, token);
  }

  async getMetaBillingBalance(adAccountId = null, customToken = null) {
    const targetAdAccount = adAccountId || process.env.META_AD_ACCOUNT_ID || 'act_681426903930095';
    try {
      const data = await this._request(`/${targetAdAccount}?fields=id,name,balance,amount_spent,currency,funding_source_details,account_status`, {}, customToken);
      const rawBalance = data?.balance ? parseFloat(data.balance) / 100 : 0;
      return {
        success: true,
        adAccountId: targetAdAccount,
        balance: rawBalance,
        currency: data?.currency || 'INR',
        displayBalance: `₹ ${rawBalance.toFixed(2)}`,
        displayString: data?.funding_source_details?.display_string || `Available balance (₹${rawBalance.toFixed(2)})`,
        accountStatus: data?.account_status === 1 ? 'ACTIVE' : 'NEEDS_ATTENTION'
      };
    } catch (err) {
      console.warn('[MetaProvider] getMetaBillingBalance warning:', err.message);
      return {
        success: false,
        balance: 0,
        currency: 'INR',
        displayBalance: '₹ 0.00',
        error: err.message
      };
    }
  }

  async getPhoneNumberDetails(phoneId, token = null) {
    return this._request(`/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,platform_type,throughput,status,certificate,name_status`, {}, token);
  }

  async registerPhoneNumber(phoneNumberId, pin = '123456', token = null) {
    return this._request(`/${phoneNumberId}/register`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin
      })
    }, token);
  }

  async getProfile(phoneNumberId, customToken = null) {
    return this._request(`/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {}, customToken);
  }

  async getPhoneNumbers(wabaId, customToken = null) {
    return this._request(`/${wabaId}/phone_numbers?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,platform_type,throughput,status,name_status`, {}, customToken);
  }

  async createTemplate(wabaId, templateData, customToken = null) {
    return this._request(`/${wabaId}/message_templates`, {
      method: 'POST',
      body: JSON.stringify(templateData)
    }, customToken);
  }

  async getTemplates(wabaId, customToken = null) {
    return this._request(`/${wabaId}/message_templates?limit=250`, {}, customToken);
  }

  async deleteTemplate(wabaId, templateName, customToken = null) {
    return this._request(`/${wabaId}/message_templates?name=${templateName}`, {
      method: 'DELETE'
    }, customToken);
  }

  async sendTemplateMessage({ phoneNumberId, to, templateName, language = 'en_US', components = [] }, customToken = null) {
    let cleanTo = to.toString().replace(/\D/g, '');
    if (cleanTo.length === 10) {
      cleanTo = `91${cleanTo}`;
    }

    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(components && components.length > 0 ? { components } : {})
      }
    };

    const result = await this._request(`/${targetPhoneId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, customToken);

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      contacts: result.contacts,
      messages: result.messages
    };
  }

  async sendTextMessage({ phoneNumberId, to, text, previewUrl = false }, customToken = null) {
    let cleanTo = to.toString().replace(/\D/g, '');
    if (cleanTo.length === 10) {
      cleanTo = `91${cleanTo}`;
    }

    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: previewUrl,
        body: text
      }
    };

    const result = await this._request(`/${targetPhoneId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, customToken);

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      contacts: result.contacts,
      messages: result.messages
    };
  }

  async sendInteractiveButtonsMessage({ phoneNumberId, to, headerText, bodyText, footerText, buttons = [] }, customToken = null) {
    const cleanTo = to.toString().replace(/\D/g, '');
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(headerText ? { header: { type: 'text', text: headerText } } : {}),
        body: { text: bodyText },
        ...(footerText ? { footer: { text: footerText } } : {}),
        action: {
          buttons: buttons.map((b, idx) => ({
            type: 'reply',
            reply: {
              id: b.id || `btn_${idx}_${Date.now()}`,
              title: (b.text || b.title).substring(0, 20)
            }
          }))
        }
      }
    };

    const result = await this._request(`/${targetPhoneId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, customToken);

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      contacts: result.contacts,
      messages: result.messages
    };
  }

  async sendInteractiveListMessage({ phoneNumberId, to, headerText, bodyText, footerText, buttonText = 'Select Option', sections = [] }, customToken = null) {
    let cleanTo = to.toString().replace(/\D/g, '');
    if (cleanTo.length === 10) {
      cleanTo = `91${cleanTo}`;
    }
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';
    
    // Ensure standard Meta sections format
    const formattedSections = (sections.length > 0 ? sections : [{ title: 'Options', rows: [] }]).map((sec, sIdx) => ({
      title: (sec.title || 'Options').substring(0, 24),
      rows: (sec.rows || sec.items || []).map((r, rIdx) => ({
        id: (r.id || `row_${sIdx}_${rIdx}_${Date.now()}`).substring(0, 200),
        title: (r.title || r.text || `Option ${rIdx + 1}`).substring(0, 24),
        ...(r.description ? { description: r.description.substring(0, 72) } : {})
      }))
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(headerText ? { header: { type: 'text', text: headerText.substring(0, 60) } } : {}),
        body: { text: bodyText },
        ...(footerText ? { footer: { text: footerText.substring(0, 60) } } : {}),
        action: {
          button: (buttonText || 'Select Option').substring(0, 20),
          sections: formattedSections
        }
      }
    };

    const result = await this._request(`/${targetPhoneId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, customToken);

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      contacts: result.contacts,
      messages: result.messages
    };
  }

  async uploadMediaToMeta({ phoneNumberId, filePath, mimeType }, customToken = null) {
    const token = customToken || this.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';

    if (!fs.existsSync(filePath)) {
      throw new Error(`[MetaProvider] File not found at path: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' });

    const form = new FormData();
    form.append('file', blob, filename);
    form.append('type', mimeType || 'image/jpeg');
    form.append('messaging_product', 'whatsapp');

    const res = await fetch(`${this.baseUrl}/${targetPhoneId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.error?.message || res.statusText;
      throw new Error(`[Meta Media Upload Error]: ${errorMsg}`);
    }

    return data.id;
  }

  async sendMediaMessage({ phoneNumberId, to, type, mediaUrl, caption = '', filename = '' }, customToken = null) {
    let cleanTo = to.toString().replace(/\D/g, '');
    if (cleanTo.length === 10) {
      cleanTo = `91${cleanTo}`;
    }

    const mediaTypeKey = (type || 'image').toLowerCase();
    const targetPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '1252085087993302';
    
    let mediaObj = {};

    // Check if media is stored locally in uploads directory
    let localFilename = '';
    if (mediaUrl) {
      const parsed = mediaUrl.split('/uploads/')[1] || path.basename(mediaUrl);
      if (parsed) localFilename = parsed.split('?')[0];
    }

    const uploadDir = path.resolve(__dirname, '../../../uploads');
    const localFilePath = localFilename ? path.join(uploadDir, localFilename) : null;

    if (localFilePath && fs.existsSync(localFilePath)) {
      let mime = 'image/jpeg';
      if (localFilename.endsWith('.png')) mime = 'image/png';
      else if (localFilename.endsWith('.webp')) mime = 'image/webp';
      else if (localFilename.endsWith('.pdf')) mime = 'application/pdf';
      else if (localFilename.endsWith('.mp4')) mime = 'video/mp4';
      else if (localFilename.endsWith('.ogg') || localFilename.endsWith('.opus')) mime = 'audio/ogg';
      else if (localFilename.endsWith('.mp3')) mime = 'audio/mpeg';

      // 1. Direct binary upload to Meta's CDN
      const metaMediaId = await this.uploadMediaToMeta({
        phoneNumberId: targetPhoneId,
        filePath: localFilePath,
        mimeType: mime
      }, customToken);

      mediaObj = { id: metaMediaId };
    } else if (mediaUrl && (mediaUrl.startsWith('https://') || mediaUrl.startsWith('http://'))) {
      // 2. Public URL
      mediaObj = { link: mediaUrl };
    } else {
      throw new Error('[MetaProvider] Invalid mediaUrl or file not found on server.');
    }

    if (caption && mediaTypeKey !== 'audio') {
      mediaObj.caption = caption;
    }
    if (filename && mediaTypeKey === 'document') {
      mediaObj.filename = filename;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: mediaTypeKey,
      [mediaTypeKey]: mediaObj
    };

    const result = await this._request(`/${targetPhoneId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, customToken);

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      contacts: result.contacts,
      messages: result.messages
    };
  }

  async downloadMedia(mediaId, customToken = null) {
    const token = customToken || this.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    if (!mediaId || !token) return null;

    try {
      // 1. Query Meta Graph API for media download URL
      const mediaInfo = await this._request(`/${mediaId}`, { method: 'GET' }, token);
      const downloadUrl = mediaInfo?.url;
      if (!downloadUrl) return null;

      const mimeType = mediaInfo.mime_type || 'application/octet-stream';
      let ext = '.bin';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
      else if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('ogg') || mimeType.includes('opus')) ext = '.ogg';
      else if (mimeType.includes('mp4')) ext = '.mp4';
      else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = '.mp3';
      else if (mimeType.includes('pdf')) ext = '.pdf';
      else if (mimeType.includes('word') || mimeType.includes('docx')) ext = '.docx';
      else if (mimeType.includes('sheet') || mimeType.includes('xlsx')) ext = '.xlsx';

      const filename = `inbound_${mediaId}_${Date.now()}${ext}`;
      const uploadDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, filename);

      // 2. Fetch media binary using Authorization header
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error(`[MetaProvider] Failed to download media ${mediaId}: status ${res.status}`);
        return null;
      }

      const buffer = await res.arrayBuffer();
      fs.writeFileSync(localFilePath, Buffer.from(buffer));

      return {
        localUrl: `/uploads/${filename}`,
        mimeType,
        filename,
        fileSize: buffer.byteLength
      };
    } catch (err) {
      console.error(`[MetaProvider] Error downloading media ${mediaId}:`, err.message);
      return null;
    }
  }

  verifyWebhookSignature(rawBody, signatureHeader, secret = this.appSecret) {
    if (!signatureHeader || !secret) return true;
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedSignature));
  }

  parseWebhookPayload(body) {
    if (!body?.entry || !Array.isArray(body.entry)) return [];

    const events = [];

    for (const entry of body.entry) {
      const changesList = entry.changes || [];
      for (const change of changesList) {
        const changes = change.value;
        if (!changes) continue;

        const metadata = changes.metadata || {};

        // 1. Message Status Updates (SENT, DELIVERED, READ, FAILED)
        if (changes.statuses && changes.statuses.length > 0) {
          changes.statuses.forEach((st) => {
            events.push({
              type: 'MESSAGE_STATUS',
              providerMessageId: st.id,
              recipientId: st.recipient_id,
              status: (st.status || '').toUpperCase(),
              timestamp: new Date(parseInt(st.timestamp, 10) * 1000 || Date.now()),
              phoneNumberId: metadata.phone_number_id,
              displayPhoneNumber: metadata.display_phone_number,
              errors: st.errors || null
            });
          });
        }

        // 2. Incoming & Coexistence Echo Messages
        if (changes.messages && changes.messages.length > 0) {
          changes.messages.forEach((msg) => {
            let textContent = '';
            let buttonPayload = null;
            const mediaType = (msg.type || 'TEXT').toUpperCase();
            const mediaObj = msg[msg.type] || {};

            if (msg.type === 'text') {
              textContent = msg.text?.body || '';
            } else if (msg.type === 'interactive') {
              textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
              buttonPayload = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
            } else if (msg.type === 'button') {
              textContent = msg.button?.text || '';
              buttonPayload = msg.button?.payload;
            } else if (msg.type === 'image') {
              textContent = msg.image?.caption || '📷 Photo';
            } else if (msg.type === 'video') {
              textContent = msg.video?.caption || '🎥 Video';
            } else if (msg.type === 'audio' || msg.type === 'voice') {
              textContent = '🎵 Audio/Voice Message';
            } else if (msg.type === 'document') {
              textContent = msg.document?.filename || msg.document?.caption || '📄 Document';
            } else if (msg.type === 'location') {
              textContent = `📍 Location (${msg.location?.latitude || ''}, ${msg.location?.longitude || ''})`;
            } else if (msg.type === 'reaction') {
              textContent = msg.reaction?.emoji || '👍';
            } else {
              textContent = msg[msg.type]?.caption || msg[msg.type]?.text || `[${msg.type || 'WhatsApp Message'}]`;
            }

            // Detect if this is an echo message sent from the physical WhatsApp Business App
            const isEcho = msg.from === metadata.display_phone_number?.replace(/\D/g, '') || msg.is_echo;

            events.push({
              type: isEcho ? 'COEXISTENCE_ECHO_MESSAGE' : 'INCOMING_MESSAGE',
              providerMessageId: msg.id,
              from: msg.from,
              name: changes.contacts?.[0]?.profile?.name || '',
              messageType: mediaType,
              text: textContent,
              caption: mediaObj.caption || (msg.type === 'text' ? msg.text?.body : ''),
              mediaId: mediaObj.id || null,
              mediaMimeType: mediaObj.mime_type || null,
              filename: mediaObj.filename || (mediaType === 'IMAGE' ? 'image.jpg' : (mediaType === 'DOCUMENT' ? 'document.pdf' : null)),
              location: msg.location || null,
              buttonPayload,
              phoneNumberId: metadata.phone_number_id,
              displayPhoneNumber: metadata.display_phone_number,
              wabaId: entry.id,
              timestamp: new Date(parseInt(msg.timestamp, 10) * 1000 || Date.now())
            });
          });
        }

        // 3. Template status updates
        if (changes.event === 'APPROVED' || changes.event === 'REJECTED' || changes.event === 'PAUSED') {
          events.push({
            type: 'TEMPLATE_STATUS',
            templateId: changes.message_template_id,
            templateName: changes.message_template_name,
            templateLanguage: changes.message_template_language,
            status: changes.event,
            phoneNumberId: metadata.phone_number_id
          });
        }

        // 4. Phone Number Quality / Coexistence Updates
        if (change.field === 'phone_number_quality_update' || change.field === 'phone_number_name_update') {
          events.push({
            type: 'PHONE_NUMBER_UPDATE',
            field: change.field,
            phoneNumberId: metadata.phone_number_id,
            value: changes
          });
        }
      }
    }

    return events;
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
export default metaWhatsAppProvider;
