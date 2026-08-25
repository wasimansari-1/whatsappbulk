import test from 'node:test';
import assert from 'node:assert/strict';
import { MetaWhatsAppProvider } from '../src/providers/whatsapp/MetaWhatsAppProvider.js';

test('Coexistence & Webhook Parser: should identify mobile WhatsApp Business App echo messages', () => {
  const provider = new MetaWhatsAppProvider();

  const mockCoexistenceEchoWebhook = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: {
                display_phone_number: '919199800309',
                phone_number_id: '1223600624165995'
              },
              contacts: [{ profile: { name: 'Customer' }, wa_id: '919876543210' }],
              messages: [
                {
                  from: '919199800309', // Sent from the business phone itself on WhatsApp Business App
                  id: 'wamid.HBgLMTE5OTgwMDMwOQ==',
                  timestamp: '1724151200',
                  text: { body: 'Hello from mobile phone app' },
                  type: 'text'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const parsed = provider.parseWebhookPayload(mockCoexistenceEchoWebhook);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].type, 'COEXISTENCE_ECHO_MESSAGE');
  assert.equal(parsed[0].text, 'Hello from mobile phone app');
  assert.equal(parsed[0].phoneNumberId, '1223600624165995');
});
