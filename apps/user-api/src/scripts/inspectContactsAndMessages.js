import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function inspectContactsAndMessages() {
  await mongoose.connect(MONGO_URI);
  const { Message } = await import('../models/Message.js');
  const { Contact } = await import('../models/Contact.js');
  const { Conversation } = await import('../models/Conversation.js');

  const contacts = await Contact.find({ phone: /8292463648/ }).lean();
  console.log(`Found ${contacts.length} contacts for phone 8292463648:`);
  for (const c of contacts) {
    const msgCount = await Message.countDocuments({ contactId: c._id });
    const conv = await Conversation.findOne({ contactId: c._id }).lean();
    console.log(`\nContact: ID ${c._id} | Org: ${c.organizationId} | Name: ${c.name} | Total Msgs: ${msgCount} | Conv ID: ${conv?._id} | LastMsg: "${conv?.lastMessage?.text || ''}"`);
    const msgs = await Message.find({ contactId: c._id }).sort({ createdAt: 1 }).lean();
    msgs.forEach((m, idx) => {
      console.log(`  ${idx + 1}. [${m.direction} ${m.type}]: "${m.content?.text || ''}" (at ${m.createdAt})`);
    });
  }

  await mongoose.disconnect();
}

inspectContactsAndMessages();
