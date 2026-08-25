import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function repairEmptyMessages() {
  await mongoose.connect(MONGO_URI);
  const { Message } = await import('../models/Message.js');

  const emptyMsgs = await Message.find({
    $or: [
      { 'content.text': '' },
      { 'content.text': { $exists: false } },
      { 'content.text': null }
    ],
    'content.mediaUrl': { $in: [null, ''] }
  });

  console.log(`Found ${emptyMsgs.length} messages with empty text content.`);
  for (const m of emptyMsgs) {
    const fallbackText = m.type === 'INTERACTIVE' ? 'Selected an option' : (m.type === 'BUTTON' ? 'Clicked button' : (m.type || 'WhatsApp Message'));
    m.content = { ...(m.content || {}), text: fallbackText };
    await m.save();
    console.log(`Repaired message ${m._id} (Type: ${m.type}, Direction: ${m.direction}) -> Text: "${fallbackText}"`);
  }

  await mongoose.disconnect();
}

repairEmptyMessages();
