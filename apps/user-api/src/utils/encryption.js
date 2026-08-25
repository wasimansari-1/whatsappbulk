import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES-GCM

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.trim().length < 16) {
    throw new Error('[Security] ENCRYPTION_KEY environment variable is required and must be set securely in production.');
  }
  // Ensure exactly 32 bytes key via sha256 hash
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive string (e.g. Meta Access Tokens)
 */
export function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt sensitive string
 */
export function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error.message);
    return null;
  }
}
