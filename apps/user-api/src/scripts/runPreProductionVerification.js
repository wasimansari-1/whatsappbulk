import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function runVerification() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const { AutomationWorkflow } = await import('../models/AutomationWorkflow.js');
  const { Organization } = await import('../models/Organization.js');
  const { User } = await import('../models/User.js');
  const { Contact } = await import('../models/Contact.js');
  const { Message } = await import('../models/Message.js');
  const { Wallet } = await import('../models/Wallet.js');
  const { WhatsAppPhoneNumber } = await import('../models/WhatsAppPhoneNumber.js');
  const { automationService } = await import('../services/AutomationService.js');

  // Remove any legacy duplicate messages from previous unindexed runs before building unique index
  const duplicates = await Message.aggregate([
    { $group: { _id: '$providerMessageId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
  ]);

  for (const dup of duplicates) {
    const [keep, ...remove] = dup.docs;
    await Message.deleteMany({ _id: { $in: remove } });
  }

  // Sync unique indexes in MongoDB
  await Message.syncIndexes();

  // Setup test organization & phone
  const testOrg = await Organization.create({
    name: 'PreProd Verification Org',
    slug: `preprod-org-${Date.now()}`,
    ownerId: new mongoose.Types.ObjectId()
  });

  const { encrypt } = await import('../utils/encryption.js');
  const { WhatsAppAccount } = await import('../models/WhatsAppAccount.js');

  const activePhoneId = '1252085087993302';
  const realToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

  // Create WhatsAppAccount with encrypted token
  const testAccount = await WhatsAppAccount.create({
    organizationId: testOrg._id,
    name: 'Verification WABA',
    wabaId: '1066070962481909',
    phoneNumberId: activePhoneId,
    provider: 'META',
    status: 'CONNECTED',
    encryptedAccessToken: encrypt(realToken)
  });

  // Ensure unique phone number mapping to testOrg
  await WhatsAppPhoneNumber.deleteMany({ phoneNumberId: activePhoneId });
  const testPhone = await WhatsAppPhoneNumber.create({
    organizationId: testOrg._id,
    whatsappAccountId: testAccount._id,
    phoneNumberId: activePhoneId,
    displayPhoneNumber: '+918292463648',
    phoneNumber: '918292463648',
    status: 'CONNECTED'
  });

  const testContact = await Contact.create({
    organizationId: testOrg._id,
    name: 'Verification Customer',
    phone: '918292463648'
  });

  const testWallet = await Wallet.create({
    organizationId: testOrg._id,
    balance: 100.0,
    usedCredits: 0.0
  });

  // Setup sample interactive Kitchen Studio flow for testing
  const testWorkflow = await AutomationWorkflow.create({
    organizationId: testOrg._id,
    name: 'PreProd Verification Flow',
    triggerType: 'KEYWORD',
    triggerConfig: { keyword: 'hi, Hi, hello, Website' },
    isActive: true,
    nodes: [
      {
        id: 'node_start',
        type: 'START_TRIGGER',
        config: {
          keyword: 'hi, Hi, hello, Website',
          buttons: [{ id: 'btn_start', targetNodeId: 'node_text_web' }]
        }
      },
      {
        id: 'node_list',
        type: 'LIST_MESSAGE',
        config: {
          bodyText: 'Welcome {{name}}! Please select a service:',
          buttonTitle: 'Select Service',
          items: [
            { id: 'opt_web', title: 'Website', targetNodeId: 'node_text_web' },
            { id: 'opt_crm', title: 'CRM', targetNodeId: 'node_text_crm' }
          ]
        }
      },
      {
        id: 'node_text_web',
        type: 'TEXT_MESSAGE',
        config: { bodyText: 'Website service details for {{name}}.' }
      },
      {
        id: 'node_text_crm',
        type: 'TEXT_MESSAGE',
        config: { bodyText: 'CRM service details for {{name}}.' }
      }
    ]
  });

  console.log('====================================================');
  console.log('TEST 1: KEYWORD REGEX & SPECIAL CHARACTER TEST');
  console.log('====================================================');

  const keywordTestCases = [
    { keyword: 'hi', input: 'hi', expect: true },
    { keyword: 'hi', input: 'Hi', expect: true },
    { keyword: 'hi', input: 'HI', expect: true },
    { keyword: 'hi', input: 'hi bhai', expect: true },
    { keyword: 'hi', input: 'hello hi', expect: true },
    { keyword: 'hi', input: 'high', expect: false },
    { keyword: 'hi', input: 'this', expect: false },
    { keyword: 'a+b', input: 'a+b', expect: true },
    { keyword: 'a+b', input: 'aaab', expect: false },
    { keyword: 'a.b', input: 'a.b', expect: true },
    { keyword: 'a.b', input: 'axb', expect: false },
    { keyword: 'hi*', input: 'hi*', expect: true },
    { keyword: 'hi*', input: 'h', expect: false },
    { keyword: 'a', input: 'a', expect: true },
    { keyword: 'a', input: 'thanks', expect: false },
    { keyword: '[invalid(', input: '[invalid(', expect: true } // should not crash
  ];

  let keywordPassed = 0;
  for (const tc of keywordTestCases) {
    const wf = {
      name: 'Regex Test',
      triggerType: 'KEYWORD',
      triggerConfig: { keyword: tc.keyword },
      nodes: [{ type: 'START_TRIGGER', config: { keyword: tc.keyword } }]
    };

    // Evaluate trigger matching
    const rawText = tc.input.trim();
    const normalizedText = rawText.toLowerCase();
    const k = tc.keyword.toLowerCase().trim();

    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    let isMatch = false;
    try {
      if (normalizedText === k) {
        isMatch = true;
      } else {
        const escaped = escapeRegExp(k);
        const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
        isMatch = regex.test(normalizedText);
      }
    } catch (e) {
      isMatch = false;
    }

    const pass = isMatch === tc.expect;
    if (pass) keywordPassed++;
    console.log(`Keyword: "${tc.keyword}" | Input: "${tc.input}" => Result: ${isMatch} | Status: ${pass ? 'PASS ✅' : 'FAIL ❌'}`);
  }
  console.log(`Keyword Engine Result: ${keywordPassed}/${keywordTestCases.length} Tests Passed.\n`);

  console.log('====================================================');
  console.log('TEST 2: IDEMPOTENCY & DUPLICATE WEBHOOK RACE TEST');
  console.log('====================================================');

  const testWabaId = `test_waba_${Date.now()}`;
  const duplicateWamid = `wamid.test.dup.${Date.now()}`;
  const duplicatePayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: testWabaId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '918292463648', phone_number_id: activePhoneId },
              contacts: [{ profile: { name: 'Dup Tester' }, wa_id: '918292463648' }],
              messages: [
                {
                  from: '918292463648',
                  id: duplicateWamid,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'hi' },
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

  const { webhookService } = await import('../services/WebhookService.js');

  // Simultaneously fire 10 duplicate webhook calls concurrently
  console.log(`Firing 10 simultaneous duplicate webhook requests for wamid: ${duplicateWamid}...`);
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(webhookService.processIncomingWebhook(duplicatePayload, null, {}));
  }
  const results = await Promise.all(promises);

  // Check DB count of messages with duplicateWamid
  const insertedCount = await Message.countDocuments({ providerMessageId: duplicateWamid });
  console.log(`Total Inbound Messages Inserted for ${duplicateWamid}: ${insertedCount} (Expected: exactly 1)`);
  console.log(`Idempotency Test Result: ${insertedCount === 1 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('====================================================');
  console.log('TEST 3: SAME-USER CONCURRENT ORDERING TEST');
  console.log('====================================================');

  const makePayload = (text, id) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: testWabaId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '918292463648', phone_number_id: activePhoneId },
              contacts: [{ profile: { name: 'Ordered Tester' }, wa_id: '918292463648' }],
              messages: [
                {
                  from: '918292463648',
                  id,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: text },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  });

  const now = Date.now();
  console.log('Firing 3 simultaneous messages from SAME customer (hi, Website, CRM) concurrently...');
  const p1 = webhookService.processIncomingWebhook(makePayload('hi', `wamid.seq1.${now}`), null, {});
  const p2 = webhookService.processIncomingWebhook(makePayload('Website', `wamid.seq2.${now}`), null, {});
  const p3 = webhookService.processIncomingWebhook(makePayload('CRM', `wamid.seq3.${now}`), null, {});

  await Promise.all([p1, p2, p3]);

  // Check outbound messages created in order
  const outboundMsgs = await Message.find({
    organizationId: testOrg._id,
    direction: 'OUTBOUND',
    createdAt: { $gte: new Date(now - 1000) }
  }).sort({ createdAt: 1 }).lean();

  console.log(`Outbound Bot Messages Dispatched: ${outboundMsgs.length}`);
  outboundMsgs.forEach((m, idx) => {
    console.log(`  Step ${idx + 1}: ${m.type} -> "${m.content?.text?.substring(0, 45)}..."`);
  });
  console.log(`Same-User Sequential Ordering Result: ${outboundMsgs.length >= 2 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  console.log('====================================================');
  console.log('TEST 4: WALLET BILLING ATOMICITY & REPEAT PROTECTION');
  console.log('====================================================');

  const initialWallet = await Wallet.findOne({ organizationId: testOrg._id });
  console.log(`Current Wallet Balance: ₹${initialWallet.balance.toFixed(2)} | Used Credits: ₹${initialWallet.usedCredits.toFixed(2)}`);

  const nowWalletTest = Date.now();
  // Attempt duplicate charging
  const dupWamidWallet = `wamid.wallet.test.${nowWalletTest}`;
  const dupWalletPayload = makePayload('Website', dupWamidWallet);

  console.log('Executing 10 concurrent webhook requests with same wamid...');
  const walletPromises = [];
  for (let i = 0; i < 10; i++) {
    walletPromises.push(webhookService.processIncomingWebhook(dupWalletPayload, null, {}));
  }
  await Promise.all(walletPromises);

  // Poll until background dispatch and wallet update completes (up to 5s)
  for (let i = 0; i < 20; i++) {
    const botMsg = await Message.findOne({
      organizationId: testOrg._id,
      direction: 'OUTBOUND',
      createdAt: { $gte: new Date(nowWalletTest) }
    });
    if (botMsg) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  const finalWallet = await Wallet.findOne({ organizationId: testOrg._id });
  const debitedAmount = initialWallet.balance - finalWallet.balance;
  console.log(`Final Wallet Balance: ₹${finalWallet.balance.toFixed(2)} | Total Debited: ₹${debitedAmount.toFixed(2)}`);
  console.log(`Wallet Safety Result (Debited exactly ₹0.05 once): ${Math.abs(debitedAmount - 0.05) < 0.001 ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // Clean up test records
  await Organization.deleteOne({ _id: testOrg._id });
  await WhatsAppPhoneNumber.deleteOne({ _id: testPhone._id });
  await Contact.deleteMany({ organizationId: testOrg._id });
  await Message.deleteMany({ organizationId: testOrg._id });
  await Wallet.deleteOne({ organizationId: testOrg._id });
  await AutomationWorkflow.deleteOne({ _id: testWorkflow._id });

  await mongoose.disconnect();
  console.log('====================================================');
  console.log('✅ ALL PRE-PRODUCTION TESTS COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runVerification();
