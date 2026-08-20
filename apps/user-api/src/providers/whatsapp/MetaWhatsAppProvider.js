import crypto from 'crypto';
import { WhatsAppProvider } from './WhatsAppProvider.js';

/**
 * Official Meta WhatsApp Cloud API Provider
 */
export class MetaWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.apiVersion = config.apiVersion || process.env.META_API_VERSION || 'v20.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.accessToken = config.accessToken || process.env.META_ACCESS_TOKEN;
    this.appSecret = config.appSecret || process.env.META_APP_SECRET;
  }

  isConfigured() {
    return Boolean(this.accessToken);
  }

  async _request(endpoint, options = {}, customToken = null) {
    const token = customToken || this.accessToken || process.env.META_ACCESS_TOKEN;
    if (!token) {
      throw new Error('[MetaProvider] Meta Cloud API Access Token not configured. Please add META_ACCESS_TOKEN in .env or Settings.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || response.statusText;
      const errorCode = data?.error?.code || response.status;
      const errorDetails = data?.error?.error_data?.details || '';
      throw new Error(`[Meta Cloud API Error ${errorCode}]: ${errorMsg} ${errorDetails}`);
    }

    return data;
  }

  async getProfile(phoneNumberId, customToken = null) {
    return this._request(`/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {}, customToken);
  }

  async getPhoneNumbers(wabaId, customToken = null) {
    return this._request(`/${wabaId}/phone_numbers`, {}, customToken);
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
    const cleanTo = to.toString().replace(/\D/g, '');
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

    const result = await this._request(`/${phoneNumberId}/messages`, {
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
    const cleanTo = to.toString().replace(/\D/g, '');
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

    const result = await this._request(`/${phoneNumberId}/messages`, {
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
              title: (b.text || b.title).substring(0, 20) // Meta max 20 chars for button title
            }
          }))
        }
      }
    };

    const result = await this._request(`/${phoneNumberId}/messages`, {
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

  async sendMediaMessage({ phoneNumberId, to, type, mediaUrl, caption = '' }, customToken = null) {
    const cleanTo = to.toString().replace(/\D/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: type.toLowerCase(),
      [type.toLowerCase()]: {
        link: mediaUrl,
        caption
      }
    };

    const result = await this._request(`/${phoneNumberId}/messages`, {
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

  verifyWebhookSignature(rawBody, signatureHeader, secret = this.appSecret) {
    if (!signatureHeader || !secret) return true; // allow in dev if secret omitted
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedSignature));
  }

  parseWebhookPayload(body) {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    if (!changes) return [];

    const events = [];

    // 1. Message Status Updates (SENT, DELIVERED, READ, FAILED)
    if (changes.statuses && changes.statuses.length > 0) {
      changes.statuses.forEach((st) => {
        events.push({
          type: 'MESSAGE_STATUS',
          providerMessageId: st.id,
          recipientId: st.recipient_id,
          status: st.status.toUpperCase(),
          timestamp: new Date(parseInt(st.timestamp, 10) * 1000 || Date.now()),
          errors: st.errors || null
        });
      });
    }

    // 2. Incoming Messages (Text, Interactive button clicks, Media)
    if (changes.messages && changes.messages.length > 0) {
      changes.messages.forEach((msg) => {
        let textContent = '';
        let buttonPayload = null;

        if (msg.type === 'text') {
          textContent = msg.text?.body || '';
        } else if (msg.type === 'interactive') {
          textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
          buttonPayload = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
        } else if (msg.type === 'button') {
          textContent = msg.button?.text || '';
          buttonPayload = msg.button?.payload;
        }

        events.push({
          type: 'INCOMING_MESSAGE',
          providerMessageId: msg.id,
          from: msg.from,
          name: changes.contacts?.[0]?.profile?.name || '',
          messageType: msg.type?.toUpperCase() || 'TEXT',
          text: textContent,
          buttonPayload,
          timestamp: new Date(parseInt(msg.timestamp, 10) * 1000 || Date.now())
        });
      });
    }

    // 3. Template status updates from Meta
    if (changes.event === 'APPROVED' || changes.event === 'REJECTED' || changes.event === 'PAUSED') {
      events.push({
        type: 'TEMPLATE_STATUS',
        templateId: changes.message_template_id,
        templateName: changes.message_template_name,
        templateLanguage: changes.message_template_language,
        status: changes.event
      });
    }

    return events;
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
export default metaWhatsAppProvider;
