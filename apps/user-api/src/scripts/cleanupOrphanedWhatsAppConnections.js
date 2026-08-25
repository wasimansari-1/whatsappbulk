import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';

async function runCleanup() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp_bulk_saas';
  console.log('[Cleanup] Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  console.log('[Cleanup] Scanning for mock / auto-created WhatsApp connections...');

  // 1. Find mock or auto-created accounts
  const mockAccounts = await WhatsAppAccount.find({
    $or: [
      { provider: 'MOCK' },
      { wabaId: /^waba_/ },
      { onboardingMethod: { $ne: 'EMBEDDED_SIGNUP' }, encryptedAccessToken: { $exists: false } }
    ]
  });

  console.log(`[Cleanup] Found ${mockAccounts.length} mock/auto-created WhatsApp accounts.`);

  for (const acc of mockAccounts) {
    console.log(`[Cleanup] Removing mock WABA: ${acc.name} (${acc._id}) for Org: ${acc.organizationId}`);
    await WhatsAppPhoneNumber.deleteMany({ whatsappAccountId: acc._id });
    await WhatsAppAccount.deleteOne({ _id: acc._id });
  }

  // 2. Find orphaned phone numbers with fake IDs
  const fakePhones = await WhatsAppPhoneNumber.find({
    $or: [
      { phoneNumberId: /^phone_id_/ },
      { phoneNumberId: /^mock_/ }
    ]
  });

  console.log(`[Cleanup] Found ${fakePhones.length} fake WhatsApp phone records.`);
  for (const phone of fakePhones) {
    console.log(`[Cleanup] Removing fake phone: ${phone.displayPhoneNumber} (${phone._id})`);
    await WhatsAppPhoneNumber.deleteOne({ _id: phone._id });
  }

  console.log('[Cleanup] Database cleanup completed successfully!');
  await mongoose.disconnect();
}

runCleanup().catch((err) => {
  console.error('[Cleanup] Error running cleanup:', err);
  process.exit(1);
});
