import { runBackup } from '../scripts/backup.js';

class BackupScheduler {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
  }

  /**
   * Initializes automated daily backup timer
   */
  start(intervalMs = 24 * 60 * 60 * 1000) {
    if (this.intervalHandle) return;

    console.log(`[BackupScheduler] Initializing automated background backup daemon (Interval: ${intervalMs / 3600000}h).`);

    // Check every hour if it is backup time (02:00 UTC)
    this.intervalHandle = setInterval(async () => {
      const now = new Date();
      // Run daily at 02:00 UTC or if intervalMs is custom
      if (now.getUTCHours() === 2 || intervalMs < 24 * 3600000) {
        await this.triggerBackup();
      }
    }, Math.min(intervalMs, 3600000));
  }

  async triggerBackup() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[BackupScheduler] Starting scheduled automated MongoDB snapshot at ${new Date().toISOString()}...`);

    try {
      const result = await runBackup();
      console.log(`[BackupScheduler] Scheduled backup completed successfully: ${result.backupFolder} (SHA-256: ${result.checksum})`);
    } catch (err) {
      console.error(`[BackupScheduler] ⚠️ Scheduled backup failed:`, err.message);
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[BackupScheduler] Stopped automated backup daemon.');
    }
  }
}

export const backupScheduler = new BackupScheduler();
export default backupScheduler;
