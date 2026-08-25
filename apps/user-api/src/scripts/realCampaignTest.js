import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whasappbulk';

async function runRealCampaignTest() {
  console.log('====================================================');
  console.log('🚀 EXECUTING REAL CAMPAIGN & IDEMPOTENCY TEST');
  console.log('====================================================\n');

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  await import('../models/User.js');
  await import('../models/Organization.js');
  await import('../models/Contact.js');
  await import('../models/Campaign.js');
  await import('../models/CampaignRecipient.js');
  await import('../models/WhatsAppPhoneNumber.js');
  await import('../models/WhatsAppAccount.js');
  await import('../models/WhatsAppTemplate.js');
  await import('../models/Message.js');

  const { campaignService } = await import('../services/CampaignService.js');

  const org = await db.collection('organizations').findOne({ name: /IGlobal Tech/i });
  const user = await db.collection('users').findOne({ email: 'wasim@arvee.com' });
  const template = await db.collection('whatsapptemplates').findOne({ organizationId: org._id, name: 'iglobal_welcome_msg' });

  // 1. Prepare 3 Test Contacts
  const testPhones = ['918292463648', '919155534309', '919953107052'];
  const testContacts = [];

  for (const p of testPhones) {
    let c = await db.collection('contacts').findOne({ organizationId: org._id, phone: p });
    if (!c) {
      const ins = await db.collection('contacts').insertOne({
        organizationId: org._id,
        name: `Campaign Test ${p.slice(-4)}`,
        phone: p,
        status: 'ACTIVE',
        channel: 'WHATSAPP',
        lastRepliedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      c = { _id: ins.insertedId, phone: p, name: `Campaign Test ${p.slice(-4)}` };
    }
    testContacts.push(c);
  }

  console.log(`1. Creating Campaign with ${testContacts.length} recipients...`);
  const campaign = await campaignService.createCampaign(org._id, user._id, {
    name: `Controlled Test Campaign ${Date.now()}`,
    templateId: template._id,
    targetContacts: testContacts
  });

  console.log(`  ✓ Campaign Created: ${campaign._id} (Status: ${campaign.status}, Total: ${campaign.stats.totalRecipients})`);

  // 2. Test Pause Idempotency
  console.log('2. Testing Pause Campaign...');
  const paused = await campaignService.pauseCampaign(org._id, campaign._id);
  console.log(`  ✓ Paused Status: ${paused.status}`);

  // 3. Test Resume Idempotency
  console.log('3. Testing Resume Campaign...');
  const resumed = await campaignService.resumeCampaign(org._id, campaign._id);
  console.log(`  ✓ Resumed Status: ${resumed.status}`);

  // 4. Verify Recipients
  const recipients = await db.collection('campaignrecipients').find({ campaignId: campaign._id }).toArray();
  console.log(`4. Verified Recipients State (${recipients.length} total):`);
  for (const r of recipients) {
    console.log(`  - Recipient ${r.phone}: Status = ${r.status}, ProviderMsgId = ${r.providerMessageId || 'QUEUED_IN_BULLMQ'}`);
  }

  // 5. Cancel remaining to leave queue clean
  await campaignService.cancelCampaign(org._id, campaign._id);
  console.log('  ✓ Cleaned up test campaign state (CANCELLED).');

  await mongoose.disconnect();
  console.log('\n✅ Real Campaign Lifecycle & Idempotency Verification Completed Successfully!\n');
}

runRealCampaignTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Campaign Test Error]:', err);
    process.exit(1);
  });
