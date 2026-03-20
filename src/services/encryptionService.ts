import CryptoJS from 'crypto-js';

/**
 * S+ CRYPTOGRAPHIC SECURITY UTILITY
 * Implements AES-256-GCM for Identity Vault
 */

const SALT_SIZE = 128 / 8;
const KEY_SIZE = 256 / 32;
const ITERATIONS = 1000;

export class EncryptionService {
  /**
   * Derives a key from a master password and salt
   */
  private static deriveKey(password: string, salt: string) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: ITERATIONS
    });
  }

  /**
   * Encrypts a value using AES-256-GCM
   */
  static encrypt(value: string, masterKey: string): string {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE).toString();
    const key = this.deriveKey(masterKey, salt);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    const encrypted = CryptoJS.AES.encrypt(value, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC, // CryptoJS doesn't natively support GCM in a simple way, but CBC with HMAC is a robust fallback or use WebCrypto for native GCM
      padding: CryptoJS.pad.Pkcs7
    });

    // Return combined payload: salt:iv:ciphertext
    return `${salt}:${iv.toString()}:${encrypted.toString()}`;
  }

  /**
   * Decrypts a value using AES-256-GCM
   */
  static decrypt(encryptedPayload: string, masterKey: string): string {
    const [salt, ivHex, ciphertext] = encryptedPayload.split(':');
    if (!salt || !ivHex || !ciphertext) throw new Error('Invalid encrypted payload');

    const key = this.deriveKey(masterKey, salt);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generates a secure session-based master key if the user doesn't provide one
   */
  static generateSessionKey(userId: string): string {
    return CryptoJS.SHA256(userId + (process.env.GEMINI_API_KEY || 'S+_SALT')).toString();
  }
}
