import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function inspectConversations() {
  await mongoose.connect(MONGO_URI);
  const { Conversation } = await import('../models/Conversation.js');
  const { Contact } = await import('../models/Contact.js');

  const convs = await Conversation.find({ organizationId: '6a8b1d85d8761c6ddf09a79a' }).populate('contactId').sort({ updatedAt: -1 }).lean();
  console.log(`Found ${convs.length} conversations in IGlobal Tech:`);
  for (const c of convs) {
    console.log(`\nConv ID: ${c._id} | Contact: ${c.contactId?.name} (${c.contactId?.phone}) [ID: ${c.contactId?._id}] | LastMsg: "${c.lastMessage?.text || ''}" | Unread: ${c.unreadCount} | UpdatedAt: ${c.updatedAt}`);
  }

  await mongoose.disconnect();
}

inspectConversations();
