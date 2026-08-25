/**
 * Centralized Meta Graph API & Cloud API Error Normalizer
 * Extracts exact error codes, subcodes, messages, types, fbtrace_ids, and maps them to actionable user-facing messages.
 */

export function parseMetaError(err, context = {}) {
  const metaError = err.response?.data?.error || err.metaError || null;

  const rawCode = metaError?.code || err.code || null;
  const subcode = metaError?.error_subcode || null;
  const type = metaError?.type || 'MetaApiError';
  const rawMessage = metaError?.message || err.message || 'Unknown Meta API error';
  const fbtraceId = metaError?.fbtrace_id || null;
  const errorUserTitle = metaError?.error_user_title || null;
  const errorUserMsg = metaError?.error_user_msg || null;

  let category = 'GENERAL_ERROR';
  let userMessage = errorUserMsg || errorUserTitle || rawMessage;
  let retryable = false;

  // 1. Token & Authentication Errors
  if (rawCode === 190 || rawMessage.includes('OAuthException') || rawMessage.includes('access token') || subcode === 463 || subcode === 467) {
    category = 'TOKEN_EXPIRED';
    userMessage = 'Meta Access Token has expired or been revoked. Please reconnect your WhatsApp / Facebook account.';
    retryable = false;
  }
  // 2. 24-Hour Customer Service Window Expired
  else if (rawCode === 131047 || rawMessage.includes('24 hours') || rawMessage.includes('Re-engagement message')) {
    category = 'WINDOW_EXPIRED';
    userMessage = 'Customer service window expired (more than 24 hours since last customer reply). Please send an approved WhatsApp Template message to re-engage.';
    retryable = false;
  }
  // 3. Recipient Not in Allowed List (Dev Mode / Test Number Limitation)
  else if (rawCode === 131030 || rawMessage.includes('Recipient phone number not in allowed list')) {
    category = 'RECIPIENT_NOT_ALLOWED';
    userMessage = 'Recipient phone number is not registered in the Meta Developer test phone number list. Please add the recipient number in Meta App Dashboard > WhatsApp > API Setup.';
    retryable = false;
  }
  // 4. Rate Limits & Throttling
  else if (rawCode === 429 || rawCode === 80007 || rawCode === 130429 || rawMessage.includes('rate limit') || rawMessage.includes('throughput')) {
    category = 'RATE_LIMIT_EXCEEDED';
    userMessage = 'WhatsApp sending rate limit reached. Message queued for automatic retry with backoff.';
    retryable = true;
  }
  // 5. Account Registration / Cloud API Missing
  else if (rawCode === 133010 || rawMessage.includes('Account not registered')) {
    category = 'ACCOUNT_NOT_REGISTERED';
    userMessage = 'WhatsApp phone number is not registered with Cloud API. Please complete PIN verification in WhatsApp Manager.';
    retryable = false;
  }
  // 6. Template Parameter Mismatch / Not Found
  else if (rawCode === 132000 || rawCode === 132001 || rawMessage.includes('template does not exist') || rawMessage.includes('Template param count mismatch')) {
    category = 'TEMPLATE_ERROR';
    userMessage = `WhatsApp Template Error: ${rawMessage}. Ensure the template name, language, and variable count match Meta's approved template.`;
    retryable = false;
  }
  // 7. Transient Meta Server Errors (5xx)
  else if (err.response?.status >= 500 || rawCode === 2 || rawCode === 1 || rawMessage.includes('temporarily unavailable')) {
    category = 'META_SERVER_ERROR';
    userMessage = 'Meta WhatsApp service is temporarily unavailable. The request will be automatically retried.';
    retryable = true;
  }

  const structuredError = {
    provider: 'META',
    category,
    code: rawCode,
    subcode,
    type,
    message: rawMessage,
    userMessage,
    errorUserTitle,
    errorUserMsg,
    fbtraceId,
    retryable,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      httpStatus: err.response?.status
    }
  };

  return structuredError;
}

export default parseMetaError;
