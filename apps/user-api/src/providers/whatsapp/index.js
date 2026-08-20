import { mockWhatsAppProvider } from './MockWhatsAppProvider.js';
import { metaWhatsAppProvider } from './MetaWhatsAppProvider.js';

/**
 * Returns the active WhatsApp provider instance based on environment settings
 */
export function getWhatsAppProvider() {
  const providerType = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'meta') {
    if (metaWhatsAppProvider.isConfigured()) {
      return metaWhatsAppProvider;
    }
    console.warn('[WhatsAppProvider] Meta credentials not provided in .env, falling back to MockWhatsAppProvider');
    return mockWhatsAppProvider;
  }

  return mockWhatsAppProvider;
}

export { MockWhatsAppProvider } from './MockWhatsAppProvider.js';
export { MetaWhatsAppProvider } from './MetaWhatsAppProvider.js';
export default getWhatsAppProvider;
