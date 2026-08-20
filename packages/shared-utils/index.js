/**
 * Shared Utilities for Enterprise WhatsApp SaaS
 */

/**
 * Normalize phone number to standard international format (digits only with country code)
 * @param {string} phone
 * @param {string} defaultCountryCode e.g., '91'
 * @returns {string}
 */
export function normalizePhoneNumber(phone, defaultCountryCode = '91') {
  if (!phone) return '';
  // Remove all non-digits
  let clean = phone.toString().replace(/\D/g, '');
  
  // If starts with 00, replace with nothing
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }
  
  // If 10 digits (e.g. Indian mobile), prepend default country code
  if (clean.length === 10) {
    clean = `${defaultCountryCode}${clean}`;
  }
  
  return clean;
}

/**
 * Standard API Success Response
 */
export function apiSuccess(data = null, message = 'Operation successful', meta = null) {
  const response = {
    success: true,
    data,
    message
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

/**
 * Standard API Error Response
 */
export function apiError(code, message, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
}

/**
 * Encode MongoDB _id / timestamp into base64 cursor
 */
export function encodeCursor(doc, sortField = '_id') {
  if (!doc) return null;
  const value = doc[sortField];
  const payload = {
    [sortField]: value,
    _id: doc._id
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decode base64 cursor into query filter
 */
export function decodeCursor(cursorString, sortField = '_id', sortOrder = -1) {
  if (!cursorString) return null;
  try {
    const json = Buffer.from(cursorString, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    const value = parsed[sortField];
    return sortOrder === -1
      ? { [sortField]: { $lt: value } }
      : { [sortField]: { $gt: value } };
  } catch (err) {
    return null;
  }
}

/**
 * Format Currency (INR / USD)
 */
export function formatCurrency(amount, currency = 'INR') {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
