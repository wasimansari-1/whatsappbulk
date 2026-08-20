import test from 'node:test';
import assert from 'node:assert/strict';
import { MockWhatsAppProvider } from '../src/providers/whatsapp/MockWhatsAppProvider.js';

test('MockWhatsAppProvider: should simulate template message dispatch and webhook payload normalization', async () => {
  const provider = new MockWhatsAppProvider();

  // 1. Send template
  const sendResult = await provider.sendTemplateMessage({
    phoneNumberId: 'mock_phone_1',
    to: '+919953107052',
    templateName: 'welcome_greeting'
  });

  assert.equal(sendResult.success, true);
  assert.ok(sendResult.messageId.startsWith('wamid.HBgL'));

  // 2. Webhook payload parsing
  const mockWebhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: sendResult.messageId,
                  status: 'delivered',
                  recipient_id: '919953107052',
                  timestamp: '1724151200'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const parsedEvents = provider.parseWebhookPayload(mockWebhookPayload);
  assert.equal(parsedEvents.length, 1);
  assert.equal(parsedEvents[0].type, 'MESSAGE_STATUS');
  assert.equal(parsedEvents[0].status, 'DELIVERED');
  assert.equal(parsedEvents[0].providerMessageId, sendResult.messageId);
});
