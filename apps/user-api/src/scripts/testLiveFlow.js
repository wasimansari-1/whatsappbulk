import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function testLiveFlow() {
  await mongoose.connect(MONGO_URI);
  const { Message } = await import('../models/Message.js');
  const { Contact } = await import('../models/Contact.js');
  const { Conversation } = await import('../models/Conversation.js');
  const { conversationService } = await import('../services/ConversationService.js');
  const { webhookService } = await import('../services/WebhookService.js');

  const contact = await Contact.findOne({ phone: '918292463648', organizationId: '6a8b1d85d8761c6ddf09a79a' });
  console.log('Target Contact:', contact.name, contact.phone, contact._id);

  // 1. Agent sends a message from Inbox
  console.log('\n--- 1. Agent sending message from Inbox: "Hello from Live Dashboard Test" ---');
  const sentMsg = await conversationService.sendMessage(
    '6a8b1d85d8761c6ddf09a79a',
    new mongoose.Types.ObjectId(),
    {
      contactId: contact._id,
      text: 'Hello from Live Dashboard Test ' + new Date().toLocaleTimeString()
    }
  );
  console.log('Sent Message ID:', sentMsg._id, 'Text:', sentMsg.content?.text, 'Status:', sentMsg.status);

  // 2. Customer sends a message on WhatsApp ("Live Customer Reply")
  console.log('\n--- 2. Customer replying from WhatsApp: "Live Customer Reply" ---');
  const inWamid = `wamid.live.${Date.now()}`;
  const inPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1066070962481909',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '918292463648', phone_number_id: '1252085087993302' },
              contacts: [{ profile: { name: 'Wasim Ansari' }, wa_id: '918292463648' }],
              messages: [
                {
                  from: '918292463648',
                  id: inWamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Live Customer Reply ' + new Date().toLocaleTimeString() },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  await webhookService.processIncomingWebhook(inPayload, null, {});

  // 3. Inspect latest messages in DB for this contact
  const recent = await Message.find({ contactId: contact._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\n--- 3. Latest 5 messages for this contact in DB ---');
  recent.reverse().forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.direction} ${m.type}]: "${m.content?.text || ''}" | Status: ${m.status} | CreatedAt: ${m.createdAt}`);
  });

  await mongoose.disconnect();
}

testLiveFlow();
