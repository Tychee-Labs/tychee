/**
 * Tychee SDK Configuration
 */
export interface TycheeConfig {
    // Stellar Network Configuration
    stellarNetwork: 'testnet' | 'mainnet';
    horizonUrl: string;
    sorobanRpcUrl: string;

    // Contract Addresses
    tokenVaultAddress: string;
    accountAbstractionAddress?: string;

    // Account Abstraction
    useAccountAbstraction: boolean;
    aaMode?: 'standard' | 'sponsored' | 'sessionKey' | 'multisig';
    gasSponsor?: string;

    // Encryption
    masterEncryptionKey?: string;  // For server-side encryption

    // ZK Configuration
    zkProvingKeyPath?: string;
    zkVerificationKeyPath?: string;
    enableZKProofs?: boolean;
}

/**
 * Card Token Data
 */
export interface CardData {
    pan: string;          // Primary Account Number
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    network: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'discover' | 'diners' | 'jcb';
}

/**
 * Encrypted Token Metadata
 */
export interface TokenMetadata {
    userId: string;
    tokenId: string;          // Unique identifier (token hash hex) for multi-card support
    tokenHash: string;
    encryptedPayload: Uint8Array;
    last4Digits: string;
    cardNetwork: string;
    status: 'active' | 'revoked' | 'expired';
    createdAt: number;
    expiresAt: number;
    sorobanTxId?: string;
}

/**
 * Transaction Result
 */
export interface TransactionResult {
    success: boolean;
    txHash: string;
    data?: any;
    error?: string;
}

/**
 * ZK Proof Data
 */
export interface ZKProof {
    proof: Uint8Array;
    publicInputs: any[];
    proofType: string;
}
