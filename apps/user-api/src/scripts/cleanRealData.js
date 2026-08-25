import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import {
  User,
  Organization,
  Contact,
  Conversation,
  Message,
  AutomationWorkflow,
  WhatsAppPhoneNumber,
  WhatsAppAccount
} from '../models/index.js';

dotenv.config();

async function run() {
  await db.connect();
  const orgId = '6a8b1d85d8761c6ddf09a79a';
  const org = await Organization.findById(orgId);
  const user = await User.findOne({ email: 'wasim@arvee.com' });

  if (!org || !user) {
    console.error('Organization or user not found');
    process.exit(1);
  }

  console.log('1. Clearing dummy chatbots from IGlobal Tech...');
  await AutomationWorkflow.deleteMany({ organizationId: orgId });
  console.log('   ✓ Dummy chatbots deleted.');

  console.log('2. Setting up canonical real contacts...');
  // 1. Wasim Ansari: 918292463648
  let wasimContact = await Contact.findOne({ organizationId: orgId, phone: '918292463648' });
  if (!wasimContact) {
    wasimContact = await Contact.create({
      organizationId: orgId,
      name: 'Wasim Ansari',
      phone: '918292463648',
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastRepliedAt: new Date()
    });
  } else {
    wasimContact.name = 'Wasim Ansari';
    wasimContact.lastRepliedAt = new Date();
    await wasimContact.save();
  }

  // 2. itsme (Pawan): 919113313764
  let itsmeContact = await Contact.findOne({ organizationId: orgId, phone: '919113313764' });
  if (!itsmeContact) {
    itsmeContact = await Contact.create({
      organizationId: orgId,
      name: 'itsme (Pawan)',
      phone: '919113313764',
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastRepliedAt: new Date()
    });
  } else {
    itsmeContact.name = 'itsme (Pawan)';
    itsmeContact.lastRepliedAt = new Date();
    await itsmeContact.save();
  }

  // 3. Seven: 917903590451
  let sevenContact = await Contact.findOne({ organizationId: orgId, phone: '917903590451' });
  if (!sevenContact) {
    sevenContact = await Contact.create({
      organizationId: orgId,
      name: 'Seven </>',
      phone: '917903590451',
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      lastRepliedAt: new Date()
    });
  } else {
    sevenContact.lastRepliedAt = new Date();
    await sevenContact.save();
  }

  const realContactIds = [wasimContact._id, itsmeContact._id, sevenContact._id];
  const realPhones = ['918292463648', '919113313764', '917903590451'];

  console.log('3. Deleting dummy chimney contacts...');
  const deletedContacts = await Contact.deleteMany({
    organizationId: orgId,
    _id: { $nin: realContactIds },
    phone: { $nin: realPhones }
  });
  console.log(`   ✓ Deleted ${deletedContacts.deletedCount} dummy contacts.`);

  console.log('4. Re-linking real messages to canonical contacts...');
  const reWasim = await Message.updateMany(
    { contactId: { $in: ['6a8b2f9f1fcf9c6321c53ee3', '6a8b2dfab3b163bfdef67c6f', '6a8b1e0c762c93db0a447e5f'] } },
    { $set: { contactId: wasimContact._id, organizationId: orgId } }
  );
  console.log(`   ✓ Re-linked ${reWasim.modifiedCount} messages to Wasim Ansari.`);

  const reItsme = await Message.updateMany(
    { contactId: { $in: ['6a8b332e9e629f12a23074c9', '6a8b2df3b3b163bfdef67c53', '6a8b33179e629f12a23072fe'] } },
    { $set: { contactId: itsmeContact._id, organizationId: orgId } }
  );
  console.log(`   ✓ Re-linked ${reItsme.modifiedCount} messages to itsme (Pawan).`);

  const reSeven = await Message.updateMany(
    { contactId: '6a8b2800d2f73e0459b6cf13' },
    { $set: { contactId: sevenContact._id, organizationId: orgId } }
  );
  console.log(`   ✓ Re-linked ${reSeven.modifiedCount} messages to Seven.`);

  console.log('5. Deleting dummy chimney messages...');
  const deletedMsgs = await Message.deleteMany({
    organizationId: orgId,
    contactId: { $nin: realContactIds }
  });
  console.log(`   ✓ Deleted ${deletedMsgs.deletedCount} dummy messages.`);

  console.log('6. Rebuilding clean conversations for real chats...');
  await Conversation.deleteMany({ organizationId: orgId });

  for (const c of [wasimContact, itsmeContact, sevenContact]) {
    const lastMsg = await Message.findOne({ contactId: c._id }).sort({ createdAt: -1 });
    let preview = 'Conversation active';
    if (lastMsg) {
      if (lastMsg.content?.text) preview = lastMsg.content.text;
      else if (lastMsg.type === 'IMAGE') preview = '📷 Photo';
      else if (lastMsg.content?.templateName) preview = `[Template: ${lastMsg.content.templateName}]`;
    }

    const conv = await Conversation.create({
      organizationId: orgId,
      contactId: c._id,
      channel: 'WHATSAPP',
      status: 'ACTIVE',
      isPinned: true,
      unreadCount: 0,
      assignedTo: user._id,
      lastMessage: {
        text: preview,
        sender: lastMsg?.direction === 'INBOUND' ? 'CONTACT' : 'AGENT',
        sentAt: lastMsg?.createdAt || new Date(),
        status: lastMsg?.status || 'DELIVERED'
      }
    });
    console.log(`   ✓ Created conversation for ${c.name} (${c.phone}): "${preview}"`);
  }

  // Ensure verified WhatsApp Number is active
  const phone = await WhatsAppPhoneNumber.findOne({ organizationId: orgId });
  if (phone) {
    phone.phoneNumberId = '1252085087993302';
    phone.displayPhoneNumber = '+91 91555 34309';
    phone.verifiedName = 'IGlobal Tech';
    phone.status = 'CONNECTED';
    phone.isDefault = true;
    await phone.save();
    console.log(`7. Verified WhatsApp phone number: ${phone.displayPhoneNumber} (ID: ${phone.phoneNumberId})`);
  }

  console.log('\n========================================');
  console.log('✅ ALL DUMMY DATA PURGED & REAL INBOX RESTORED!');
  console.log('========================================\n');

  process.exit(0);
}

run().catch((e) => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});
