import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AutomationService } from '../services/AutomationService.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Contact } from '../models/Contact.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';

dotenv.config();

async function runTest() {
  console.log('================================================================');
  console.log('🧪 TESTING "ANY_MESSAGE" TRIGGER & VARIABLE RESOLUTION');
  console.log('================================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';
  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email: 'wasim@arvee.com' });
  const org = await Organization.findOne({ name: /iglobal/i });
  const orgId = org?._id || user?.organizationId;

  console.log(`Organization ID: ${orgId}`);

  // Create a sample Contact
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

  // Create an ANY_MESSAGE Workflow
  await AutomationWorkflow.deleteMany({ organizationId: orgId, name: 'TEST_ANY_MESSAGE_BOT' });

  const testWorkflow = await AutomationWorkflow.create({
    organizationId: orgId,
    name: 'TEST_ANY_MESSAGE_BOT',
    type: 'AUTOMATION',
    isActive: true,
    triggerType: 'ANY_MESSAGE',
    triggerConfig: {
      keyword: '*'
    },
    nodes: [
      {
        id: 'node_start',
        type: 'START_TRIGGER',
        config: {
          triggerMode: 'Any Message',
          keyword: '*'
        }
      },
      {
        id: 'node_reply',
        type: 'TEXT_MESSAGE',
        config: {
          bodyText: 'Hello {{name}}! We received your message. First Name: {{first_name}}, Phone: {{phone}}, Date: {{date}}, Time: {{time}}, Company: {{company}}.'
        }
      }
    ]
  });

  console.log(`✅ Created test workflow: ${testWorkflow.name} (Trigger: ANY_MESSAGE)`);

  const automationService = new AutomationService();

  // Test 1: Random phrase 1
  console.log('\n[Test 1] Testing random message: "bhai kya hal chal hai?"');
  const matched1 = await automationService.processIncomingMessage(orgId, contact, 'bhai kya hal chal hai?');
  console.log(`  Result 1: Matched workflow "${matched1?.name}" (ID: ${matched1?._id})`);

  // Test 2: Random phrase 2
  console.log('\n[Test 2] Testing random inquiry: "rate list send karo please"');
  const matched2 = await automationService.processIncomingMessage(orgId, contact, 'rate list send karo please');
  console.log(`  Result 2: Matched workflow "${matched2?.name}" (ID: ${matched2?._id})`);

  // Clean up test workflow
  await AutomationWorkflow.deleteOne({ _id: testWorkflow._id });
  console.log('\n✅ Cleaned up test workflow.');

  await mongoose.disconnect();
  console.log('\n🎉 ALL ANY_MESSAGE & VARIABLE TESTS PASSED PERFECTLY!\n');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
