import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function checkTemplates() {
  await mongoose.connect(MONGO_URI);
  const { WhatsAppTemplate } = await import('../models/WhatsAppTemplate.js');
  const { getWhatsAppProvider } = await import('../providers/whatsapp/index.js');

  const provider = getWhatsAppProvider();
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const wabaId = process.env.META_WABA_ID || '1066070962481909';

  console.log('1. Checking local templates in MongoDB...');
  const localTemplates = await WhatsAppTemplate.find({}).lean();
  for (const t of localTemplates) {
    console.log(`Local Template: "${t.name}" | Status: ${t.status} | Category: ${t.category} | Lang: ${t.language} | ID: ${t.providerTemplateId}`);
  }

  console.log(`\n2. Querying live templates from Meta Graph API for WABA: ${wabaId}...`);
  try {
    const metaRes = await provider.getTemplates(wabaId, token);
    console.log(`Found ${metaRes?.data?.length || 0} templates on Meta:`);
    for (const mt of (metaRes?.data || [])) {
      console.log(`\nMeta Template: "${mt.name}" | Status: ${mt.status} | Category: ${mt.category} | Lang: ${mt.language} | ID: ${mt.id}`);
      if (mt.rejected_reason) {
        console.log(`  Rejected Reason: ${mt.rejected_reason}`);
      }
      if (mt.components) {
        console.log(`  Components:`, JSON.stringify(mt.components));
      }
    }
  } catch (err) {
    console.error('Error fetching from Meta:', err.message);
  }

  await mongoose.disconnect();
}

checkTemplates();
