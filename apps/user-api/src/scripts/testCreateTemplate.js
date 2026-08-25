import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function testCreateTemplate() {
  await mongoose.connect(MONGO_URI);
  const { Organization } = await import('../models/Organization.js');
  const { whatsAppService } = await import('../services/WhatsAppService.js');

  const org = await Organization.findOne({ name: /IGlobal Tech/i }).lean();
  const orgId = org._id;

  const testPayload = {
    name: 'iglobal_welcome_sample',
    category: 'MARKETING',
    language: 'en_US',
    body: {
      text: 'Hello {{1}}, Welcome to IGlobal Tech! Thank you for reaching out to us. How can we help you today?'
    },
    examples: ['Wasim']
  };

  console.log(`Submitting template "${testPayload.name}" for Org: ${orgId}...`);
  try {
    const result = await whatsAppService.createTemplate(orgId, testPayload);
    console.log('✅ Template Successfully Created on Meta:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Template Creation Failed:', err.message);
  }

  await mongoose.disconnect();
}

testCreateTemplate();
