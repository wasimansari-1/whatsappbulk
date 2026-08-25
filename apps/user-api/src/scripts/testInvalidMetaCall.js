import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function testInvalidMetaCall() {
  await mongoose.connect(MONGO_URI);
  const { Organization } = await import('../models/Organization.js');
  const { whatsAppService } = await import('../services/WhatsAppService.js');

  const org = await Organization.findOne({ name: /IGlobal Tech/i }).lean();
  const orgId = org._id;

  // Invalid payload with unsupported category or invalid structure to trigger Meta Graph API error
  const testPayload = {
    name: 'test_invalid_component',
    category: 'INVALID_CATEGORY',
    language: 'en_US',
    body: {
      text: 'Sample body text'
    }
  };

  console.log(`Submitting invalid template to test Meta error extraction...`);
  try {
    await whatsAppService.createTemplate(orgId, testPayload);
  } catch (err) {
    console.log('✅ Captured Exact Meta Error:');
    console.log('  Status Code:', err.statusCode);
    console.log('  Message:', err.message);
  }

  await mongoose.disconnect();
}

testInvalidMetaCall();
