/**
 * Canonical Meta Configuration Provider
 * Single source of truth for Meta Graph API versioning, App IDs, and Config IDs.
 */

export function getMetaGraphApiVersion() {
  const version = process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_API_VERSION;
  if (!version || !version.trim()) {
    return 'v25.0';
  }
  return version.trim();
}

export function getWhatsAppPhoneNumberId() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
  return (phoneId || '1252085087993302').trim();
}

export function getWhatsAppAccessToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  return token ? token.trim() : '';
}

export function getWhatsAppVerifyToken() {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN;
  return (verifyToken || 'whatsapp_bulk_saas_verify_token_2026').trim();
}

export function getMetaAppId() {
  const appId = process.env.META_APP_ID;
  if (!appId || !appId.trim()) {
    return process.env.META_APP_ID || '';
  }
  return appId.trim();
}

export function getMetaWhatsAppConfigId() {
  const configId = process.env.META_WHATSAPP_CONFIG_ID;
  if (!configId || !configId.trim()) {
    return process.env.META_WHATSAPP_CONFIG_ID || '';
  }
  return configId.trim();
}

export function getMetaFacebookLoginConfigId() {
  const fbConfigId = process.env.META_FACEBOOK_LOGIN_CONFIG_ID;
  if (!fbConfigId || !fbConfigId.trim()) {
    return null;
  }
  return fbConfigId.trim();
}

export function getMetaConfigId() {
  return getMetaWhatsAppConfigId();
}

export function getMetaAppSecret() {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !secret.trim()) {
    return process.env.META_APP_SECRET || '';
  }
  return secret.trim();
}

export function isMetaEmbeddedSignupEnabled() {
  return process.env.META_EMBEDDED_SIGNUP_ENABLED === 'true';
}

