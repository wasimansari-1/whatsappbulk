import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../src/utils/encryption.js';

test('Security & Encryption: should encrypt and decrypt Meta access tokens accurately with AES-256-GCM', () => {
  const sampleToken = 'EAAZAC7YJW0uUBScK9v28ZAf7tyBdeLhPvD01krq1aylCbCkiOZANGSnYCxDIersJMcxNVG5rQhkZBqZBnwfUOLHT';

  const encryptedData = encrypt(sampleToken);
  assert.ok(encryptedData.encrypted);
  assert.ok(encryptedData.iv);
  assert.ok(encryptedData.authTag);
  assert.notEqual(encryptedData.encrypted, sampleToken);

  const decryptedToken = decrypt(encryptedData);
  assert.equal(decryptedToken, sampleToken);
});

test('Security & Encryption: should return null gracefully on corrupted auth tag or invalid input', () => {
  const corrupted = {
    encrypted: 'abcdef123456',
    iv: '0123456789abcdef0123456789abcdef',
    authTag: 'badtag123456'
  };

  const result = decrypt(corrupted);
  assert.equal(result, null);
});
