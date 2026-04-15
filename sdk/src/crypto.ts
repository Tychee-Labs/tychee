/**
 * Cryptographic utilities using ring (server) and libsodium.js (client)
 * 
 * Architecture:
 * - Server-side: Uses crypto (Node's built-in) for AES-GCM encryption
 * - Client-side: Uses libsodium.js for key derivation and encryption
 * - Soroban: Expects ring-compatible AES-GCM encrypted payloads
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import type { CardData } from './types';

/**
 * AES-GCM encryption using Node's crypto (compatible with ring)
 * This mimics ring's AES-256-GCM encryption for Soroban compatibility
 */
export class RingCompatibleCrypto {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly IV_LENGTH = 12;  // GCM standard
    private static readonly AUTH_TAG_LENGTH = 16;
    private static readonly KEY_LENGTH = 32;   // 256 bits

    /**
     * Generate a random 256-bit encryption key
     */
    static generateKey(): Buffer {
        return randomBytes(this.KEY_LENGTH);
    }

    /**
     * Encrypt data using AES-256-GCM (ring-compatible)
     * Returns: IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)
     */
    static encrypt(data: Buffer, key: Buffer): Buffer {
        if (key.length !== this.KEY_LENGTH) {
            throw new Error('Key must be 256 bits (32 bytes)');
        }

        // Generate random IV
        const iv = randomBytes(this.IV_LENGTH);

        // Create cipher
        const cipher = createCipheriv(this.ALGORITHM, key, iv);

        // Encrypt
        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);

        // Get auth tag
        const authTag = cipher.getAuthTag();

        // Return: IV + Encrypted Data + Auth Tag
        return Buffer.concat([iv, encrypted, authTag]);
    }

    /**
     * Decrypt AES-256-GCM encrypted data (ring-compatible)
     */
    static decrypt(encryptedData: Buffer, key: Buffer): Buffer {
        if (key.length !== this.KEY_LENGTH) {
            throw new Error('Key must be 256 bits (32 bytes)');
        }

        // Extract IV, ciphertext, and auth tag
        const iv = encryptedData.slice(0, this.IV_LENGTH);
        const authTag = encryptedData.slice(-this.AUTH_TAG_LENGTH);
        const ciphertext = encryptedData.slice(this.IV_LENGTH, -this.AUTH_TAG_LENGTH);

        // Create decipher
        const decipher = createDecipheriv(this.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt
        return Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);
    }

    /**
     * Create SHA-256 hash (for token indexing)
     */
    static hash(data: Buffer): Buffer {
        return createHash('sha256').update(data).digest();
    }

    /**
   * Derive encryption key from user's Stellar secret key
   * Pure web3 approach - user owns their encryption key
   * @param secretKey - User's Stellar secret key (e.g., "SXXX...")
   * @returns 256-bit encryption key derived from the secret key
   */
    static async deriveUserKey(secretKey: string): Promise<Buffer> {
        // Use the secret key bytes directly for key derivation
        // Stellar secret keys are 32 bytes of entropy - perfect for AES-256
        const crypto = await import('crypto');

        // Decode Stellar secret key (it's base32 encoded)
        // For production, use stellar-sdk's Keypair to decode properly
        // Here we hash the secret key to get 32 bytes
        const hash = crypto.createHash('sha256').update(secretKey).digest();

        return hash;
    }

    /**
     * Derive key from public key only (for read-only operations)
     * Note: This should only be used for verification, not encryption of new data
     */
    static async derivePublicKeyHash(publicKey: string): Promise<Buffer> {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(publicKey).digest();
    }
}

/**
 * Client-side encryption utilities (libsodium.js)
 * Used in browser for key derivation
 */
export class ClientCrypto {
    /**
     * Initialize libsodium (must be called before use)
     */
    static async init(): Promise<void> {
        if (typeof window !== 'undefined') {
            const sodium = await import('libsodium-wrappers');
            await sodium.ready;
        }
    }

    /**
     * Derive key from wallet seed using Argon2
     * (libsodium's crypto_pwhash for key stretching)
     */
    static async deriveKeyFromSeed(
        seed: string,
        salt?: Uint8Array
    ): Promise<Uint8Array> {
        const sodium = await import('libsodium-wrappers');
        await sodium.ready;

        const saltBytes = salt || sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

        const key = sodium.crypto_pwhash(
            32, // key length (256 bits)
            new TextEncoder().encode(seed),
            saltBytes,
            sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_ALG_ARGON2ID13
        );

        return key;
    }

    /**
     * Encrypt using XSalsa20-Poly1305 sealed box
     * (for client-side encryption before sending to server)
     */
    static async sealedBoxEncrypt(
        message: Uint8Array,
        publicKey: Uint8Array
    ): Promise<Uint8Array> {
        const sodium = await import('libsodium-wrappers');
        await sodium.ready;

        return sodium.crypto_box_seal(message, publicKey);
    }
}

/**
 * Card tokenization utilities
 */
export class CardTokenizer {
    /**
     * Valid card lengths per network.
     * Sources: ISO/IEC 7812, EMVCo, and individual network specifications.
     */
    private static readonly VALID_LENGTHS: Record<string, number[]> = {
        visa:       [13, 16, 19],   // 13 (legacy), 16 (standard), 19 (extended)
        mastercard: [16],            // Always 16
        amex:       [15],            // Always 15
        discover:   [16, 19],        // 16 (standard), 19 (extended)
        diners:     [14, 16, 19],    // 14 (Carte Blanche/International), 16-19 (US/Canada)
        jcb:        [16, 17, 18, 19],// 16-19
        rupay:      [16],            // Always 16
    };

    /**
     * Convert CardData to encrypted format
     */
    static async encryptCard(
        cardData: CardData,
        encryptionKey: Buffer
    ): Promise<{
        encryptedPayload: Buffer;
        tokenHash: Buffer;
        last4Digits: string;
    }> {
        // Serialize card data
        const plaintext = JSON.stringify({
            pan: cardData.pan,
            cvv: cardData.cvv,
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            cardholderName: cardData.cardholderName,
            network: cardData.network,
        });

        const plaintextBuffer = Buffer.from(plaintext, 'utf-8');

        // Encrypt using ring-compatible AES-GCM
        const encryptedPayload = RingCompatibleCrypto.encrypt(plaintextBuffer, encryptionKey);

        // Create hash for indexing (hash of plaintext, not encrypted)
        const tokenHash = RingCompatibleCrypto.hash(plaintextBuffer);

        // Extract last 4 digits
        const last4Digits = cardData.pan.slice(-4);

        return {
            encryptedPayload,
            tokenHash,
            last4Digits,
        };
    }

    /**
     * Decrypt card data
     */
    static async decryptCard(
        encryptedPayload: Buffer,
        encryptionKey: Buffer
    ): Promise<CardData> {
        const decrypted = RingCompatibleCrypto.decrypt(encryptedPayload, encryptionKey);
        const plaintext = decrypted.toString('utf-8');
        return JSON.parse(plaintext) as CardData;
    }

    /**
     * Validate card number using Luhn algorithm AND per-network length rules
     */
    static validateCardNumber(pan: string): boolean {
        // Remove spaces and dashes
        const cleaned = pan.replace(/[\s-]/g, '');

        // Must be digits only
        if (!/^\d+$/.test(cleaned)) return false;

        // Must be 13-19 digits
        if (cleaned.length < 13 || cleaned.length > 19) return false;

        // Detect network and enforce correct length
        const network = this.detectCardNetwork(cleaned);
        if (network !== 'unknown') {
            const allowed = this.VALID_LENGTHS[network];
            if (allowed && !allowed.includes(cleaned.length)) return false;
        }

        // Luhn algorithm
        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned[i], 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    /**
     * Detect card network from PAN (IIN/BIN prefix matching)
     * Order matters: more specific prefixes are checked before broader ones.
     */
    static detectCardNetwork(pan: string): string {
        const cleaned = pan.replace(/[\s-]/g, '');

        // Amex: starts with 34 or 37 (must check before Diners/JCB)
        if (/^3[47]/.test(cleaned)) return 'amex';

        // Diners Club: 300-305, 3095, 36, 38-39
        if (/^(30[0-5]|3095|36|3[89])/.test(cleaned)) return 'diners';

        // JCB: 3528-3589
        if (/^35(2[89]|[3-8]\d)/.test(cleaned)) return 'jcb';

        // Visa: starts with 4
        if (/^4/.test(cleaned)) return 'visa';

        // Mastercard: starts with 51-55 or 2221-2720
        if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(cleaned)) {
            return 'mastercard';
        }

        // Discover: 6011, 622126-622925, 644-649, 65
        if (/^(6011|64[4-9]|65|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5])))/.test(cleaned)) {
            return 'discover';
        }

        // RuPay: 60, 65, 81, 82, 508 (checked after Discover to avoid overlap)
        if (/^(60|65|81|82|508)/.test(cleaned)) return 'rupay';

        return 'unknown';
    }

    /**
     * Mask card number for display
     */
    static maskCardNumber(pan: string): string {
        const cleaned = pan.replace(/[\s-]/g, '');
        if (cleaned.length < 4) return '*'.repeat(cleaned.length);

        const last4 = cleaned.slice(-4);
        const masked = '*'.repeat(cleaned.length - 4);
        return masked + last4;
    }
}
