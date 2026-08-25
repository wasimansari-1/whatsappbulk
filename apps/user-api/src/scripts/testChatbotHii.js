import mongoose from 'mongoose';
import { automationService } from '../services/AutomationService.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Contact } from '../models/Contact.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/whasappbulk');

  const orgId = '6a8b1d85d8761c6ddf09a79a';

  // 1. Create / Update the "Instant Greetings Chatbot"
  const wf = await AutomationWorkflow.findOneAndUpdate(
    { organizationId: orgId, name: 'Instant Greetings Chatbot' },
    {
      $set: {
        organizationId: orgId,
        name: 'Instant Greetings Chatbot',
        channel: 'WHATSAPP',
        type: 'AUTOMATION',
        triggerType: 'KEYWORD',
        triggerConfig: { keyword: 'hi, hii, hello, hey, start' },
        isActive: true,
        nodes: [
          {
            id: 'trigger_1',
            type: 'START_TRIGGER',
            config: { keyword: 'hi, hii, hello, hey' }
          },
          {
            id: 'msg_1',
            type: 'SEND_MESSAGE',
            config: {
              text: 'Namaste {{name}}! 🙏 Welcome to IGlobal Tech. How can we help you today?'
            }
          }
        ]
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Greetings Chatbot Workflow configured:', wf.name, '(ID:', wf._id.toString(), ')');

  // 2. Find or create test contact
  let contact = await Contact.findOne({ organizationId: orgId, phone: '919876543210' });
  if (!contact) {
    contact = await Contact.create({
      organizationId: orgId,
      name: 'Rahul Sharma',
      phone: '919876543210',
      status: 'ACTIVE'
    });
  }
  console.log('👤 Contact:', contact.name, contact.phone);

  // 3. Test triggering with incoming "hii"
  console.log('📩 Customer sends: "hii"');
  const matched = await automationService.processIncomingMessage(orgId, contact, 'hii');
  console.log('🤖 Matched Workflow:', matched?.name);

  // 4. Verify in DB
  const lastMsg = await Message.findOne({ organizationId: orgId, contactId: contact._id }).sort({ createdAt: -1 });
  console.log('💬 Saved Bot Message in DB:', lastMsg?.content?.text, '| status:', lastMsg?.status);

  const conv = await Conversation.findOne({ organizationId: orgId, contactId: contact._id });
  console.log('📬 Conversation lastMessage:', conv?.lastMessage?.text);

  await mongoose.disconnect();
  console.log('🎉 Verification Complete!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
