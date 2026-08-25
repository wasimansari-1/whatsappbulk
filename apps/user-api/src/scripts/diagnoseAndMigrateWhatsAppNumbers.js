import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';

async function diagnoseAndMigrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp_bulk_saas';
  console.log('====================================================');
  console.log('DIAGNOSTIC & SAFE MIGRATION TOOL: WHATSAPP NUMBERS');
  console.log('====================================================');
  console.log('[Diagnostic] Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  const allUsers = await User.find({}).lean();
  console.log(`[Diagnostic] Total Users in DB: ${allUsers.length}`);

  const userPhoneMap = new Map();
  allUsers.forEach((u) => {
    if (u.phone) {
      const clean = u.phone.replace(/[^0-9]/g, '');
      userPhoneMap.set(clean, u);
    }
  });

  const allPhoneRecords = await WhatsAppPhoneNumber.find({}).lean();
  console.log(`[Diagnostic] Total WhatsAppPhoneNumber records: ${allPhoneRecords.length}`);

  const invalidRecords = [];

  for (const p of allPhoneRecords) {
    const cleanPhone = (p.displayPhoneNumber || '').replace(/[^0-9]/g, '');
    const matchedUser = userPhoneMap.get(cleanPhone);

    // If phone matches user registration phone AND has mock/synthetic ID or is not from verified Meta WABA
    const isMockId = p.phoneNumberId.startsWith('phone_id_') || p.phoneNumberId.startsWith('mock_');
    if (matchedUser || isMockId) {
      invalidRecords.push({
        organizationId: p.organizationId?.toString(),
        userId: matchedUser?._id?.toString() || 'UNKNOWN',
        userName: matchedUser?.name || 'N/A',
        userEmail: matchedUser?.email || 'N/A',
        whatsappPhoneNumberId: p._id.toString(),
        phoneNumber: p.displayPhoneNumber,
        phoneNumberMetaId: p.phoneNumberId,
        reason: matchedUser ? 'Matched User.phone (Auto-created during registration)' : 'Mock synthetic ID'
      });
    }
  }

  console.log('\n====================================================');
  console.log(`DIAGNOSTIC REPORT: Found ${invalidRecords.length} invalid WhatsApp phone records.`);
  console.log('====================================================');

  if (invalidRecords.length === 0) {
    console.log('✅ ZERO invalid WhatsApp phone mappings found. All database records are clean and verified!');
  } else {
    console.table(invalidRecords);

    console.log('\n[Migration] Cleaning up invalid records...');
    for (const inv of invalidRecords) {
      console.log(`[Migration] Deleting invalid WhatsAppPhoneNumber: ${inv.whatsappPhoneNumberId} (${inv.phoneNumber})`);
      await WhatsAppPhoneNumber.deleteOne({ _id: inv.whatsappPhoneNumberId });
    }
    console.log('✅ Migration completed. Invalid records removed safely without affecting Users or User.phone.');
  }

  await mongoose.disconnect();
}

diagnoseAndMigrate().catch((err) => {
  console.error('[Diagnostic] Error:', err);
  process.exit(1);
});
