import { mockWhatsAppProvider } from './MockWhatsAppProvider.js';
import { metaWhatsAppProvider } from './MetaWhatsAppProvider.js';

/**
 * Returns the active WhatsApp provider instance based on environment settings.
 * Strict Production Rule: Production mode MUST use Meta Cloud API. Mock provider is forbidden in production.
 */
export function getWhatsAppProvider() {
  const isProduction = process.env.NODE_ENV === 'production';
  const providerType = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase().trim();

  if (isProduction && providerType !== 'meta' && providerType !== 'cloud_api') {
    const error = new Error(
      `[Security / Configuration Violation] Fatal: In production mode (NODE_ENV=production), ` +
      `WHATSAPP_PROVIDER must be configured as 'meta'. Silent fallback to MockWhatsAppProvider is strictly prohibited.`
    );
    error.code = 'ERR_PRODUCTION_PROVIDER_FORBIDDEN';
    throw error;
  }

  if (providerType === 'meta' || providerType === 'cloud_api') {
    return metaWhatsAppProvider;
  }

  if (process.env.NODE_ENV === 'test' || providerType === 'mock') {
    return mockWhatsAppProvider;
  }

  // Default to Meta WhatsApp provider
  return metaWhatsAppProvider;
}

export { MockWhatsAppProvider } from './MockWhatsAppProvider.js';
export { MetaWhatsAppProvider } from './MetaWhatsAppProvider.js';
export default getWhatsAppProvider;
