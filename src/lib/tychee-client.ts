/**
 * Browser-compatible wrapper for @tychee/sdk crypto utilities
 * Uses Web Crypto API instead of Node.js crypto
 * 
 * This mirrors the SDK's CardTokenizer API for client-side use
 */

/**
 * Card data structure (mirrors SDK type)
 */
export interface CardData {
    pan: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    network: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'discover' | 'diners' | 'jcb';
}

/**
 * Helper to create a clean ArrayBuffer from Uint8Array
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(data.length);
    new Uint8Array(buffer).set(data);
    return buffer;
}

/**
 * Card tokenization utilities (browser-compatible)
 * Ports the SDK's CardTokenizer for client-side use
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
     * Validate card number using Luhn algorithm AND per-network length rules
     */
    static validateCardNumber(pan: string): boolean {
        const cleaned = pan.replace(/[\s-]/g, '');
        if (!/^\d+$/.test(cleaned)) return false;
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

        // Mastercard: 51-55 or 2221-2720
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

    /**
     * Encrypt card data using Web Crypto API (AES-256-GCM)
     */
    static async encryptCard(
        cardData: CardData,
        encryptionKey: Uint8Array
    ): Promise<{
        encryptedPayload: Uint8Array;
        tokenHash: string;
        last4Digits: string;
    }> {
        const plaintext = JSON.stringify({
            pan: cardData.pan,
            cvv: cardData.cvv,
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            cardholderName: cardData.cardholderName,
            network: cardData.network,
        });

        const plaintextBytes = new TextEncoder().encode(plaintext);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            toArrayBuffer(encryptionKey),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: toArrayBuffer(iv) },
            cryptoKey,
            toArrayBuffer(plaintextBytes)
        );

        const encryptedPayload = new Uint8Array(iv.length + ciphertext.byteLength);
        encryptedPayload.set(iv, 0);
        encryptedPayload.set(new Uint8Array(ciphertext), iv.length);

        const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(plaintextBytes));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return {
            encryptedPayload,
            tokenHash,
            last4Digits: cardData.pan.slice(-4),
        };
    }

    /**
     * Decrypt card data using Web Crypto API
     */
    static async decryptCard(
        encryptedPayload: Uint8Array,
        encryptionKey: Uint8Array
    ): Promise<CardData> {
        const iv = encryptedPayload.slice(0, 12);
        const ciphertext = encryptedPayload.slice(12);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            toArrayBuffer(encryptionKey),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: toArrayBuffer(iv) },
            cryptoKey,
            toArrayBuffer(ciphertext)
        );

        return JSON.parse(new TextDecoder().decode(decrypted)) as CardData;
    }
}

/**
 * Client-side crypto utilities using Web Crypto API
 */
export class ClientCrypto {
    /**
     * Derive encryption key from wallet public key
     */
    static async deriveKeyFromWallet(publicKey: string): Promise<Uint8Array> {
        const keyMaterial = new TextEncoder().encode(`${publicKey}:tychee:coft:v1`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(keyMaterial));
        return new Uint8Array(hashBuffer);
    }

    /**
     * Create SHA-256 hash
     */
    static async hash(data: string): Promise<string> {
        const dataBuffer = new TextEncoder().encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(dataBuffer));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
