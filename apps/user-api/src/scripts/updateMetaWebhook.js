import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkMetaWebhook() {
  const appId = process.env.META_APP_ID || '1762437721674469';
  const appSecret = process.env.META_APP_SECRET || 'a1ae4f3a7fba7e4eebeec23ee4e04ea0';
  const appToken = `${appId}|${appSecret}`;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsapp_saas_webhook_secret_2026';
  const newUrl = 'https://inspection-sizes-launched-winston.trycloudflare.com/api/whatsapp/webhook';

  console.log(`Checking Meta App Webhook Subscription for App ID: ${appId}...`);

  // 1. Get current subscriptions
  const getRes = await fetch(`https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appToken}`);
  const getData = await getRes.json();
  console.log('Current Subscriptions:', JSON.stringify(getData, null, 2));

  // 2. Update to the new active tunnel URL
  console.log(`\nUpdating Webhook Callback URL to: ${newUrl}...`);
  const postRes = await fetch(`https://graph.facebook.com/v21.0/${appId}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      callback_url: newUrl,
      verify_token: verifyToken,
      fields: ['messages', 'message_template_status_update', 'phone_number_name_update', 'phone_number_quality_update', 'account_update', 'account_alerts'],
      access_token: appToken
    })
  });
  const postData = await postRes.json();
  console.log('Update Result:', JSON.stringify(postData, null, 2));

  // 3. Ensure WABA is subscribed
  const wabaId = '1066070962481909';
  const userToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  console.log(`\nSubscribing WABA ${wabaId}...`);
  const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const subData = await subRes.json();
  console.log('WABA Subscription Result:', JSON.stringify(subData, null, 2));
}

checkMetaWebhook();
