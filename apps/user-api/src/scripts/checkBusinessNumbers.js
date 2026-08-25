import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function checkPhoneNumbers() {
  await mongoose.connect(MONGO_URI);
  const { WhatsAppPhoneNumber } = await import('../models/WhatsAppPhoneNumber.js');
  const { WhatsAppAccount } = await import('../models/WhatsAppAccount.js');
  const { Message } = await import('../models/Message.js');
  const { Contact } = await import('../models/Contact.js');

  const phones = await WhatsAppPhoneNumber.find({}).lean();
  console.log('--- ALL WHATSAPP PHONE NUMBERS IN DB ---');
  for (const p of phones) {
    console.log(`Phone: ${p.phoneNumber} | Display: ${p.displayPhoneNumber} | PhoneId: ${p.phoneNumberId} | Org: ${p.organizationId} | Status: ${p.status}`);
  }

  const contacts = await Contact.find({}).lean();
  console.log('\n--- ALL CONTACTS IN DB ---');
  for (const c of contacts) {
    console.log(`Contact: ${c.name} | Phone: ${c.phone} | Org: ${c.organizationId} | ID: ${c._id}`);
  }

  const recentMsgs = await Message.find({}).sort({ createdAt: -1 }).limit(10).lean();
  console.log('\n--- RECENT 10 MESSAGES IN DB ---');
  for (const m of recentMsgs) {
    console.log(`Msg [${m.direction} ${m.type}]: "${m.content?.text || ''}" | Status: ${m.status} | CreatedAt: ${m.createdAt} | ContactId: ${m.contactId} | IsBot: ${m.isChatbotResponse}`);
  }

  await mongoose.disconnect();
}

checkPhoneNumbers();
