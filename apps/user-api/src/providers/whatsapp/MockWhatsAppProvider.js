import { WhatsAppProvider } from './WhatsAppProvider.js';

/**
 * Enterprise Mock WhatsApp Provider for local development, offline demos and testing
 */
export class MockWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'MOCK_PROVIDER';
  }

  async getProfile(phoneNumberId) {
    return {
      success: true,
      data: {
        about: 'Premium WhatsApp Business Account',
        address: 'Bangalore, India',
        description: 'Commercial SaaS for WhatsApp Bulk Messaging and CRM',
        email: 'support@wappbiz.io',
        vertical: 'RETAIL',
        websites: ['https://wappbiz.io']
      }
    };
  }

  async getPhoneNumbers(wabaId) {
    return {
      success: true,
      data: [
        {
          id: '1223600624165995',
          verified_name: 'IGlobal Tech',
          display_phone_number: '+91 91998 00309',
          quality_rating: 'GREEN',
          status: 'CONNECTED',
          messaging_limit_tier: 'TIER_10K'
        }
      ]
    };
  }

  async createTemplate(wabaId, templateData) {
    const providerTemplateId = `meta_tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      success: true,
      id: providerTemplateId,
      status: 'PENDING',
      category: templateData.category
    };
  }

  async getTemplates(wabaId) {
    return {
      success: true,
      data: []
    };
  }

  async deleteTemplate(wabaId, templateName) {
    return { success: true };
  }

  async sendTemplateMessage({ phoneNumberId, to, templateName, language = 'en_US', components = [] }) {
    const mockMessageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    // Simulate minor network latency
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      success: true,
      messageId: mockMessageId,
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: mockMessageId, message_status: 'accepted' }]
    };
  }

  async sendTextMessage({ phoneNumberId, to, text, previewUrl = false }) {
    const mockMessageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      success: true,
      messageId: mockMessageId,
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: mockMessageId, message_status: 'accepted' }]
    };
  }

  async sendInteractiveButtonsMessage({ phoneNumberId, to, headerText, bodyText, footerText, buttons = [] }) {
    const mockMessageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      success: true,
      messageId: mockMessageId,
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: mockMessageId, message_status: 'accepted' }]
    };
  }

  async sendInteractiveListMessage({ phoneNumberId, to, headerText, bodyText, footerText, buttonText = 'Select Option', sections = [] }) {
    const mockMessageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      success: true,
      messageId: mockMessageId,
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: mockMessageId, message_status: 'accepted' }]
    };
  }

  async sendMediaMessage({ phoneNumberId, to, type, mediaUrl, caption = '' }) {
    const mockMessageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return {
      success: true,
      messageId: mockMessageId,
      contacts: [{ input: to, wa_id: to.replace(/\D/g, '') }],
      messages: [{ id: mockMessageId, message_status: 'accepted' }]
    };
  }

  verifyWebhookSignature(rawBody, signature, secret) {
    return true; // Always valid in mock mode
  }

  parseWebhookPayload(body) {
    // Normalizes Meta or Mock webhook payloads into unified events
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    if (!changes) return [];

    const events = [];

    // Message Status Update
    if (changes.statuses && changes.statuses.length > 0) {
      changes.statuses.forEach((st) => {
        events.push({
          type: 'MESSAGE_STATUS',
          providerMessageId: st.id,
          recipientId: st.recipient_id,
          status: st.status.toUpperCase(), // SENT, DELIVERED, READ, FAILED
          timestamp: new Date(parseInt(st.timestamp, 10) * 1000 || Date.now()),
          errors: st.errors || null
        });
      });
    }

    // Incoming Message
    if (changes.messages && changes.messages.length > 0) {
      changes.messages.forEach((msg) => {
        events.push({
          type: 'INCOMING_MESSAGE',
          providerMessageId: msg.id,
          from: msg.from,
          messageType: msg.type?.toUpperCase() || 'TEXT',
          text: msg.text?.body || msg.button?.text || '',
          timestamp: new Date(parseInt(msg.timestamp, 10) * 1000 || Date.now())
        });
      });
    }

    return events;
  }
}

export const mockWhatsAppProvider = new MockWhatsAppProvider();
export default mockWhatsAppProvider;
