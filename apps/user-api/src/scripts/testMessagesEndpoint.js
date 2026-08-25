import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function testMessages() {
  await mongoose.connect(MONGO_URI);
  await import('../models/User.js');
  const { conversationRepository } = await import('../repositories/ConversationRepository.js');

  const contactId = '6a8b2f9f1fcf9c6321c53ee3';
  const orgId = '6a8b1d85d8761c6ddf09a79a';

  const messages = await conversationRepository.getMessages(orgId, contactId, { limit: 100 });
  console.log(`Fetched ${messages.length} messages for contact ${contactId}:`);
  console.log('--- OLDEST 3 MESSAGES ---');
  messages.slice(0, 3).forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.direction} ${m.type}]: "${m.content?.text || ''}" at ${m.createdAt}`);
  });

  console.log('\n--- LATEST 5 MESSAGES ---');
  messages.slice(-5).forEach((m, idx) => {
    console.log(`  ${messages.length - 5 + idx + 1}. [${m.direction} ${m.type}]: "${m.content?.text || ''}" at ${m.createdAt}`);
  });

  await mongoose.disconnect();
}

testMessages();
