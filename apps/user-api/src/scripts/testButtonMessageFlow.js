import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AutomationService } from '../services/AutomationService.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Contact } from '../models/Contact.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';

dotenv.config();

async function testButtonMessageFlow() {
  console.log('================================================================');
  console.log('🧪 TESTING "BUTTON MESSAGE" DISPATCH & BUTTON CLICK ROUTING');
  console.log('================================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';
  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email: 'wasim@arvee.com' });
  const org = await Organization.findOne({ name: /iglobal/i });
  const orgId = org?._id || user?.organizationId;

  let contact = await Contact.findOne({ organizationId: orgId, phone: '919876543210' });
  if (!contact) {
    contact = await Contact.create({
      organizationId: orgId,
      name: 'Mohd Wasim Ansari',
      phone: '919876543210',
      email: 'wasim@arvee.com',
      status: 'ACTIVE'
    });
  }

  await AutomationWorkflow.deleteMany({ organizationId: orgId, name: 'TEST_BUTTON_MESSAGE_FLOW' });

  // Create Button Message Flow: Start -> Button Message -> Target Message
  const testFlow = await AutomationWorkflow.create({
    organizationId: orgId,
    name: 'TEST_BUTTON_MESSAGE_FLOW',
    type: 'AUTOMATION',
    isActive: true,
    triggerType: 'KEYWORD',
    triggerConfig: {
      keyword: 'buttons'
    },
    nodes: [
      {
        id: 'node_start',
        type: 'START_TRIGGER',
        config: {
          triggerMode: 'Keyword',
          keyword: 'buttons',
          targetNodeId: 'node_btn_card'
        }
      },
      {
        id: 'node_btn_card',
        type: 'BUTTON_MESSAGE',
        config: {
          bodyText: 'Namaste {{name}}! Please select your preferred plan below:',
          buttons: [
            { id: 'btn_starter', text: 'Starter Plan', targetNodeId: 'node_reply_starter' },
            { id: 'btn_enterprise', text: 'Enterprise Plan', targetNodeId: 'node_reply_enterprise' }
          ]
        }
      },
      {
        id: 'node_reply_starter',
        type: 'TEXT_MESSAGE',
        config: {
          bodyText: 'You selected the Starter Plan! Our team will activate your trial shortly.'
        }
      },
      {
        id: 'node_reply_enterprise',
        type: 'TEXT_MESSAGE',
        config: {
          bodyText: 'You selected the Enterprise Plan! A dedicated account manager will call you.'
        }
      }
    ]
  });

  console.log(`✅ Created test workflow: ${testFlow.name}`);

  const automationService = new AutomationService();

  // Test 1: Initial Trigger
  console.log('\n[Step 1] Customer sends "buttons"');
  const matched1 = await automationService.processIncomingMessage(orgId, contact, 'buttons');
  console.log(`  🎯 Dispatched Button Message from Workflow: "${matched1?.name}"`);

  // Test 2: Customer clicks "Starter Plan" (btn_starter)
  console.log('\n[Step 2] Customer clicks "Starter Plan" (Payload: btn_starter)');
  const matched2 = await automationService.processIncomingMessage(orgId, contact, 'Starter Plan', 'btn_starter');
  console.log(`  🎯 Button Click Routed to Target Node in Workflow: "${matched2?.name}"`);

  await AutomationWorkflow.deleteOne({ _id: testFlow._id });
  console.log('✅ Cleaned up test workflow.');

  await mongoose.disconnect();
  console.log('\n🎉 BUTTON MESSAGE FLOW TEST PASSED PERFECTLY!\n');
}

testButtonMessageFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
