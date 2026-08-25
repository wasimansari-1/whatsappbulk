import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function testExactMetaError() {
  await mongoose.connect(MONGO_URI);
  const { Organization } = await import('../models/Organization.js');
  const { whatsAppService } = await import('../services/WhatsAppService.js');

  const org = await Organization.findOne({ name: /IGlobal Tech/i }).lean();
  const orgId = org._id;

  // Deliberately omit examples for variable {{1}} to verify exact Meta error is returned
  const testPayload = {
    name: 'test_missing_sample',
    category: 'MARKETING',
    language: 'en_US',
    body: {
      text: 'Hello {{1}}, Welcome to our store!'
    },
    examples: []
  };

  console.log(`Submitting template without samples to test Meta's exact error message...`);
  try {
    await whatsAppService.createTemplate(orgId, testPayload);
    console.log('Template succeeded unexpectedly.');
  } catch (err) {
    console.log('✅ Captured Exact Meta Error:');
    console.log('  Status Code:', err.statusCode);
    console.log('  Message:', err.message);
  }

  await mongoose.disconnect();
}

testExactMetaError();
