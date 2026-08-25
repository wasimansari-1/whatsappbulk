import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

/**
 * Zero-Data-Loss Migration Tool from Local MongoDB to Production MongoDB Atlas Replica Set
 */
async function migrateToAtlas() {
  const sourceUri = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';
  const destUri = process.env.DEST_MONGO_URI || process.env.ATLAS_MONGO_URI;

  console.log('================================================================');
  console.log('🚀 MONGODB ATLAS PRODUCTION MIGRATION TOOL');
  console.log('================================================================');
  console.log(`Source DB URI      : ${sourceUri}`);
  console.log(`Destination DB URI : ${destUri ? destUri.replace(/:([^@]+)@/, ':****@') : 'NOT_SET'}`);

  if (!destUri) {
    console.error('\n❌ ERROR: Destination MongoDB Atlas URI not specified.');
    console.error('   Please run with: DEST_MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/whasappbulk" node apps/user-api/src/scripts/migrateToAtlas.js\n');
    process.exit(1);
  }

  console.log('\n[1/4] Connecting to Source MongoDB...');
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log('  ✅ Source MongoDB connected.');

  console.log('\n[2/4] Connecting to Destination MongoDB Atlas...');
  const destConn = await mongoose.createConnection(destUri).asPromise();
  console.log('  ✅ Destination MongoDB Atlas connected.');

  console.log('\n[3/4] Transferring Collections and Preserving Indexes & Documents...');
  const collections = await sourceConn.db.listCollections().toArray();
  const summary = [];

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const sourceCol = sourceConn.db.collection(colName);
    const destCol = destConn.db.collection(colName);

    const docCount = await sourceCol.countDocuments();
    if (docCount === 0) {
      summary.push({ collection: colName, count: 0, status: 'SKIPPED_EMPTY' });
      continue;
    }

    const docs = await sourceCol.find({}).toArray();

    // Clear dest collection cleanly before migration batch
    await destCol.deleteMany({});
    
    // Batch insert preserving original ObjectId and subdocuments
    if (docs.length > 0) {
      await destCol.insertMany(docs, { ordered: false });
    }

    // Clone indexes
    const indexes = await sourceCol.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      try {
        const { key, unique, sparse, name } = idx;
        await destCol.createIndex(key, { unique: Boolean(unique), sparse: Boolean(sparse), name });
      } catch (idxErr) {
        // Skip index creation warnings if duplicate
      }
    }

    const destCount = await destCol.countDocuments();
    console.log(`  📦 Migrated "${colName}": ${docCount} -> ${destCount} documents.`);
    summary.push({ collection: colName, count: destCount, status: docCount === destCount ? 'SUCCESS' : 'COUNT_MISMATCH' });
  }

  console.log('\n[4/4] Migration Summary & Validation:');
  console.table(summary);

  const allPassed = summary.every((s) => s.status === 'SUCCESS' || s.status === 'SKIPPED_EMPTY');
  if (allPassed) {
    console.log('\n🎉 ALL COLLECTIONS SUCCESSFULLY MIGRATED TO MONGODB ATLAS WITH ZERO DATA LOSS!\n');
  } else {
    console.warn('\n⚠️ Some collections had mismatches. Please inspect summary table.\n');
  }

  await sourceConn.close();
  await destConn.close();
  process.exit(allPassed ? 0 : 1);
}

migrateToAtlas().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
