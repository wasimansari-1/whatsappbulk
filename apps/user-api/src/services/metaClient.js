import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

import { getMetaGraphApiVersion } from '../config/metaConfig.js';
import { parseMetaError } from '../utils/metaErrorParser.js';

/**
 * Centralized Meta Graph API Client
 * Enforces unified canonical API versioning, security, rate limit logging, and transparent error handling.
 */
export class MetaClient {
  constructor() {
    this.version = getMetaGraphApiVersion();
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
    this.activeToken = process.env.META_ACCESS_TOKEN || '';
  }

  setAccessToken(token) {
    if (token) {
      this.activeToken = token.trim();
      process.env.META_ACCESS_TOKEN = token.trim();
    }
  }

  getAccessToken() {
    if (this.activeToken) {
      return this.activeToken;
    }
    return process.env.META_ACCESS_TOKEN || '';
  }

  getWabaId() {
    return process.env.META_WABA_ID || null;
  }

  getPhoneNumberId() {
    return process.env.META_PHONE_NUMBER_ID || null;
  }

  getAdAccountId() {
    const id = process.env.META_AD_ACCOUNT_ID;
    if (!id) return null;
    return id.startsWith('act_') ? id : `act_${id}`;
  }

  /**
   * Get single Lead details from Meta Graph API using Page / System Token
   */
  async getLead(leadId, token = null) {
    return this.request(
      `${leadId}`,
      'GET',
      null,
      { fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id,form_id' },
      token
    );
  }

  /**
   * Generic Request with Meta Error Normalization & Custom Token Support
   */
  async request(endpoint, method = 'GET', data = null, params = {}, customToken = null) {
    const accessToken = customToken || params?.access_token || this.getAccessToken();
    const cleanParams = { ...params };
    delete cleanParams.access_token;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;

    try {
      const response = await axios({
        url,
        method,
        data,
        params: {
          access_token: accessToken,
          ...params
        }
      });
      return { success: true, data: response.data };
    } catch (err) {
      const parsed = parseMetaError(err, { method, endpoint });
      console.warn(`[MetaClient] Error on ${method} ${endpoint}:`, {
        code: parsed.code,
        subcode: parsed.subcode,
        type: parsed.type,
        message: parsed.message
      });

      return {
        success: false,
        error: parsed
      };
    }
  }

  async get(endpoint, params = {}) {
    return this.request(endpoint, 'GET', null, params);
  }

  async post(endpoint, data = {}, params = {}) {
    return this.request(endpoint, 'POST', data, params);
  }

  async patch(endpoint, data = {}, params = {}) {
    return this.request(endpoint, 'POST', data, params); // Meta allows POST with field updates or PATCH
  }

  async delete(endpoint, params = {}) {
    return this.request(endpoint, 'DELETE', null, params);
  }

  /**
   * Debug Token & Verify Granular Scopes
   */
  async debugToken() {
    const accessToken = this.getAccessToken();
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!accessToken) {
      return { success: false, error: 'No Meta Access Token configured in environment' };
    }

    const appToken = `${appId}|${appSecret}`;
    return this.get('debug_token', {
      input_token: accessToken,
      access_token: appToken
    });
  }
}

export const metaClient = new MetaClient();
export default metaClient;
