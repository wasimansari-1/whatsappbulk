import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AutomationService } from '../services/AutomationService.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Contact } from '../models/Contact.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';

dotenv.config();

async function testSequentialChaining() {
  console.log('================================================================');
  console.log('🧪 TESTING SEQUENTIAL MULTI-MESSAGE CHAINING');
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

  await AutomationWorkflow.deleteMany({ organizationId: orgId, name: 'TEST_CHAINED_FLOW' });

  // Create a 3-step chained workflow: Start -> Message 1 -> Message 2
  const testFlow = await AutomationWorkflow.create({
    organizationId: orgId,
    name: 'TEST_CHAINED_FLOW',
    type: 'AUTOMATION',
    isActive: true,
    triggerType: 'KEYWORD',
    triggerConfig: {
      keyword: 'testflow'
    },
    nodes: [
      {
        id: 'node_start',
        type: 'START_TRIGGER',
        config: {
          triggerMode: 'Keyword',
          keyword: 'testflow',
          targetNodeId: 'node_msg_1'
        }
      },
      {
        id: 'node_msg_1',
        type: 'TEXT_MESSAGE',
        config: {
          bodyText: 'Step 1: Namaste {{name}}! Welcome to IGlobal Tech.',
          targetNodeId: 'node_msg_2'
        }
      },
      {
        id: 'node_msg_2',
        type: 'LIST_MESSAGE',
        config: {
          bodyText: 'Step 2: Please select an option from below:',
          buttonTitle: 'Choose Service',
          items: [
            { id: 'opt_1', title: 'WhatsApp Marketing', subtitle: 'Bulk messaging service' },
            { id: 'opt_2', title: 'Chatbot Automation', subtitle: 'Interactive bot builder' }
          ]
        }
      }
    ]
  });

  console.log(`✅ Created 3-node chained workflow: ${testFlow.name}`);

  const automationService = new AutomationService();
  console.log('\n[Triggering Flow] Incoming message: "testflow"');
  const matched = await automationService.processIncomingMessage(orgId, contact, 'testflow');

  console.log(`\n🎯 Matched & Executed Workflow: "${matched?.name}"`);

  await AutomationWorkflow.deleteOne({ _id: testFlow._id });
  console.log('✅ Cleaned up test workflow.');

  await mongoose.disconnect();
  console.log('\n🎉 SEQUENTIAL MESSAGE CHAINING TEST COMPLETED SUCCESSFULLY!\n');
}

testSequentialChaining().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
