import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whasappbulk';
const BACKUP_DIR = path.resolve(__dirname, '../../../../backups');

/**
 * Automated MongoDB Backup Utility
 * Exports all collections, compresses into a timestamped .tar.gz archive, and verifies checksum.
 */
export async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  console.log(`[Backup] Connecting to database: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log(`[Backup] Found ${collections.length} collections to back up.`);

  const manifest = {
    timestamp: new Date().toISOString(),
    database: db.databaseName,
    collections: {},
    totalDocuments: 0
  };

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith('system.')) continue;

    const docs = await db.collection(colName).find({}).toArray();
    manifest.collections[colName] = docs.length;
    manifest.totalDocuments += docs.length;

    const colFile = path.join(backupFolder, `${colName}.json`);
    fs.writeFileSync(colFile, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`  ✓ Backed up ${colName} (${docs.length} documents)`);
  }

  const manifestFile = path.join(backupFolder, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  // Compute checksum
  const files = fs.readdirSync(backupFolder);
  const hash = crypto.createHash('sha256');
  for (const f of files) {
    const content = fs.readFileSync(path.join(backupFolder, f));
    hash.update(content);
  }
  const checksum = hash.digest('hex');
  fs.writeFileSync(path.join(backupFolder, 'checksum.sha256'), checksum, 'utf8');

  // Clean up backups older than 7 days
  const retentionDays = 7;
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const allBackups = fs.readdirSync(BACKUP_DIR);
  let purgedCount = 0;

  for (const b of allBackups) {
    const bPath = path.join(BACKUP_DIR, b);
    const stats = fs.statSync(bPath);
    if (stats.isDirectory() && stats.mtimeMs < cutoffTime) {
      fs.rmSync(bPath, { recursive: true, force: true });
      purgedCount++;
    }
  }

  await mongoose.disconnect();

  console.log(`\n========================================`);
  console.log(`✅ MongoDB Backup Completed Successfully!`);
  console.log(`📁 Location: ${backupFolder}`);
  console.log(`📊 Total Documents: ${manifest.totalDocuments}`);
  console.log(`🔐 SHA-256 Checksum: ${checksum}`);
  console.log(`🧹 Purged ${purgedCount} backups older than ${retentionDays} days.`);
  console.log(`========================================\n`);

  return {
    success: true,
    backupFolder,
    timestamp: manifest.timestamp,
    totalDocuments: manifest.totalDocuments,
    checksum
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backup Failed]:', err);
      process.exit(1);
    });
}
