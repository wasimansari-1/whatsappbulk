/**
 * Abstract WhatsApp Provider Interface
 * All WhatsApp providers (Meta, Mock, Twilio, Dialog360) must implement these methods.
 */
export class WhatsAppProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async getProfile(phoneNumberId) {
    throw new Error('Method getProfile() must be implemented');
  }

  async getPhoneNumbers(wabaId) {
    throw new Error('Method getPhoneNumbers() must be implemented');
  }

  async createTemplate(wabaId, templateData) {
    throw new Error('Method createTemplate() must be implemented');
  }

  async getTemplates(wabaId) {
    throw new Error('Method getTemplates() must be implemented');
  }

  async deleteTemplate(wabaId, templateName) {
    throw new Error('Method deleteTemplate() must be implemented');
  }

  async sendTemplateMessage({ phoneNumberId, to, templateName, language, components }) {
    throw new Error('Method sendTemplateMessage() must be implemented');
  }

  async sendTextMessage({ phoneNumberId, to, text, previewUrl = false }) {
    throw new Error('Method sendTextMessage() must be implemented');
  }

  async sendMediaMessage({ phoneNumberId, to, type, mediaUrl, caption = '' }) {
    throw new Error('Method sendMediaMessage() must be implemented');
  }

  verifyWebhookSignature(rawBody, signature, secret) {
    throw new Error('Method verifyWebhookSignature() must be implemented');
  }

  parseWebhookPayload(body) {
    throw new Error('Method parseWebhookPayload() must be implemented');
  }
}

export default WhatsAppProvider;
