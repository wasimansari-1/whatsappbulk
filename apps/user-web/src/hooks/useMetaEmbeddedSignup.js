import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Official Meta WhatsApp Embedded Signup v3 & Direct OAuth Hook
 */
export function useMetaEmbeddedSignup({ onSuccess, onError }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [metaConfig, setMetaConfig] = useState({
    appId: '1762437721674469',
    configId: '1037347322505824',
    apiVersion: 'v22.0',
    featureType: 'whatsapp_business_app_onboarding'
  });

  // Fetch dynamic Meta configuration from backend
  useEffect(() => {
    api
      .get('/whatsapp/config')
      .then((res) => {
        const cfg = res?.data || res;
        if (cfg) {
          setMetaConfig((prev) => ({
            ...prev,
            appId: cfg.appId || prev.appId || '1762437721674469',
            configId: cfg.configId || prev.configId || '1037347322505824',
            apiVersion: cfg.apiVersion || prev.apiVersion || 'v25.0',
            embeddedSignupEnabled: cfg.embeddedSignupEnabled === true,
            featureType: cfg.featureType || prev.featureType
          }));
        }
      })
      .catch((err) => {
        console.warn('[EmbeddedSignup] Error loading config:', err.message);
      });
  }, []);

  // Initialize Facebook JavaScript SDK on mount
  useEffect(() => {
    if (window.FB || !metaConfig.embeddedSignupEnabled) return;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: metaConfig.appId || '1762437721674469',
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
    };

    // Load SDK asynchronously
    (function (d, s, id) {
      var js,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');
  }, [metaConfig.appId, metaConfig.apiVersion, metaConfig.embeddedSignupEnabled]);

  const launchEmbeddedSignup = async () => {
    if (!metaConfig.embeddedSignupEnabled) {
      if (onError) onError(new Error('Automatic Meta Partner connection is coming soon. Please use Manual Connection.'));
      return;
    }

    setIsConnecting(true);

    let embeddedWabaId = null;
    let embeddedPhoneId = null;

    const appId = metaConfig.appId || '1762437721674469';
    const configId = metaConfig.configId || '1037347322505824';
    const apiVersion = metaConfig.apiVersion || 'v25.0';

    // 1. Listen for Embedded Signup session messages from Meta popup
    const sessionInfoListener = (event) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com' &&
        event.origin !== 'https://business.facebook.com'
      ) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && (data.type === 'WA_EMBEDDED_SIGNUP' || data.event)) {
          console.log('[EmbeddedSignup Event]:', data);

          if (data.event === 'FINISH' || data.data?.phone_number_id) {
            embeddedPhoneId = data.data?.phone_number_id;
            embeddedWabaId = data.data?.waba_id;
            const code = data.data?.code || data.code;

            if (code) {
              api
                .post('/whatsapp/embedded-signup', {
                  code,
                  wabaId: embeddedWabaId,
                  phoneNumberId: embeddedPhoneId
                })
                .then((res) => {
                  setIsConnecting(false);
                  if (onSuccess) onSuccess(res.data);
                })
                .catch((err) => {
                  setIsConnecting(false);
                  if (onError) onError(err);
                });
            } else if (embeddedPhoneId && embeddedWabaId) {
              setIsConnecting(false);
              if (onSuccess) onSuccess(data.data);
            }
          } else if (data.event === 'CANCEL') {
            setIsConnecting(false);
            if (onError) onError(new Error('WhatsApp Onboarding was cancelled by user.'));
          } else if (data.event === 'ERROR') {
            setIsConnecting(false);
            if (onError) onError(new Error(data.data?.error_message || 'WhatsApp Onboarding encountered an error.'));
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', sessionInfoListener);

    // 2. Open official Meta-hosted WhatsApp Embedded Signup Onboarding Window
    const extrasPayload = encodeURIComponent(JSON.stringify({ sessionInfoVersion: '3', version: 'v4' }));
    const onboardUrl = `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${appId}&config_id=${configId || '1037347322505824'}&extras=${extrasPayload}`;

    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      onboardUrl,
      'fb_wa_signup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Popup blocked by browser, redirect directly
      window.location.href = onboardUrl;
    }
  };

  return {
    launchEmbeddedSignup,
    isConnecting,
    metaConfig
  };
}

export default useMetaEmbeddedSignup;
