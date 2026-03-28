/**
 * Tychee SDK - Core Engine
 * Main entry point for card tokenization SDK
 */

import { Horizon, Keypair, Networks, Contract, TransactionBuilder, Address, nativeToScVal, BASE_FEE } from '@stellar/stellar-sdk';
import { TycheeConfig, CardData, TokenMetadata, TransactionResult } from '../types';
import { CardTokenizer, RingCompatibleCrypto } from '../crypto';

export class TycheeSDK {
    private config: TycheeConfig;
    private server: Horizon.Server;
    private contract: Contract;
    private aaContract?: Contract;
    private userKeypair?: Keypair;

    constructor(config: TycheeConfig) {
        this.config = config;

        // Initialize Stellar server
        this.server = new Horizon.Server(config.horizonUrl);

        // Initialize contracts
        this.contract = new Contract(config.tokenVaultAddress);

        if (config.useAccountAbstraction && config.accountAbstractionAddress) {
            this.aaContract = new Contract(config.accountAbstractionAddress);
        }
    }

    /**
     * Initialize SDK with user's keypair
     */
    async initialize(secretKey: string): Promise<void> {
        this.userKeypair = Keypair.fromSecret(secretKey);
        console.log('Tychee SDK initialized for:', this.userKeypair.publicKey());
    }

    /**
     * Initialize SDK with public key only (for read operations)
     */
    async initializeReadOnly(publicKey: string): Promise<void> {
        this.userKeypair = Keypair.fromPublicKey(publicKey);
        console.log('Tychee SDK initialized (read-only):', publicKey);
    }

    /**
     * Get user's public address
     */
    getUserAddress(): string {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized. Call initialize() first.');
        }
        return this.userKeypair.publicKey();
    }

    /**
     * Tokenize and store a card on-chain
     * Supports multiple cards per wallet — each card is identified by its unique tokenHash.
     */
    async storeCard(cardData: CardData): Promise<TokenMetadata> {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized');
        }

        // Validate card
        if (!CardTokenizer.validateCardNumber(cardData.pan)) {
            throw new Error('Invalid card number (failed Luhn check)');
        }

        // Auto-detect network if not specified
        if (!cardData.network || cardData.network === 'visa') {
            const detected = CardTokenizer.detectCardNetwork(cardData.pan);
            if (detected !== 'unknown') {
                cardData.network = detected as CardData['network'];
            }
        }

        // Derive user-specific encryption key from their secret key (web3-native)
        const encryptionKey = await RingCompatibleCrypto.deriveUserKey(
            this.userKeypair.secret()
        );

        // Encrypt card data
        const { encryptedPayload, tokenHash, last4Digits } = await CardTokenizer.encryptCard(
            cardData,
            encryptionKey
        );

        // Calculate expiration timestamp (from card expiry)
        const expiryDate = new Date(
            parseInt('20' + cardData.expiryYear),
            parseInt(cardData.expiryMonth) - 1,
            1
        );
        expiryDate.setMonth(expiryDate.getMonth() + 1); // End of expiry month
        const expiresAt = Math.floor(expiryDate.getTime() / 1000);

        // Prepare contract invocation
        const userAddress = new Address(this.userKeypair.publicKey());

        // Convert data to Soroban types
        const encryptedBytes = nativeToScVal(encryptedPayload, { type: 'bytes' });
        const hashBytes = nativeToScVal(tokenHash, { type: 'bytes' });
        const last4 = nativeToScVal(last4Digits, { type: 'string' });
        const network = nativeToScVal(cardData.network, { type: 'string' });
        const expiresAtVal = nativeToScVal(expiresAt, { type: 'u64' });

        try {
            // Build and submit transaction
            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.contract.call(
                        'store_token',
                        userAddress.toScVal(),
                        encryptedBytes,
                        hashBytes,
                        last4,
                        network,
                        expiresAtVal
                    )
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);

            const response = await this.server.submitTransaction(transaction);

            console.log('Card stored on-chain:', response.hash);

            // Return metadata
            const metadata: TokenMetadata = {
                userId: this.userKeypair.publicKey(),
                tokenId: tokenHash.toString('hex'),
                tokenHash: tokenHash.toString('hex'),
                encryptedPayload: new Uint8Array(encryptedPayload),
                last4Digits,
                cardNetwork: cardData.network,
                status: 'active',
                createdAt: Math.floor(Date.now() / 1000),
                expiresAt,
                sorobanTxId: response.hash,
            };

            return metadata;
        } catch (error) {
            console.error('Error storing card:', error);
            throw error;
        }
    }

    /**
     * Retrieve a specific encrypted card token from on-chain by its tokenHash
     */
    async retrieveCard(tokenHash: string): Promise<TokenMetadata | null> {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized');
        }

        try {
            const userAddress = new Address(this.userKeypair.publicKey());
            const hashBytes = nativeToScVal(Buffer.from(tokenHash, 'hex'), { type: 'bytes' });

            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.contract.call('retrieve_token', userAddress.toScVal(), hashBytes)
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);

            const response = await this.server.submitTransaction(transaction);

            console.log('Card retrieved:', response.hash);

            // In production, parse the actual Soroban response data
            return null; // Placeholder — actual parsing depends on Soroban response format
        } catch (error) {
            console.error('Error retrieving card:', error);
            return null;
        }
    }

    /**
     * Retrieve all encrypted card tokens for the current user from on-chain
     */
    async retrieveAllCards(): Promise<TokenMetadata[]> {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized');
        }

        try {
            const userAddress = new Address(this.userKeypair.publicKey());

            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.contract.call('retrieve_all_tokens', userAddress.toScVal())
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);

            const response = await this.server.submitTransaction(transaction);

            console.log('All cards retrieved:', response.hash);

            // In production, parse the actual Soroban response data
            return []; // Placeholder — actual parsing depends on Soroban response format
        } catch (error) {
            console.error('Error retrieving all cards:', error);
            return [];
        }
    }

    /**
     * Revoke a specific card token by its tokenHash
     */
    async revokeCard(tokenHash: string): Promise<TransactionResult> {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized');
        }

        try {
            const userAddress = new Address(this.userKeypair.publicKey());
            const hashBytes = nativeToScVal(Buffer.from(tokenHash, 'hex'), { type: 'bytes' });

            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.contract.call('revoke_token', userAddress.toScVal(), hashBytes)
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);

            const response = await this.server.submitTransaction(transaction);

            return {
                success: true,
                txHash: response.hash,
            };
        } catch (error: any) {
            return {
                success: false,
                txHash: '',
                error: error.message,
            };
        }
    }

    /**
     * Decrypt card data locally (doesn't hit blockchain)
     * Uses user's secret key for decryption - web3-native approach
     */
    async decryptCard(encryptedPayload: Buffer): Promise<CardData> {
        if (!this.userKeypair) {
            throw new Error('SDK not initialized. Call initialize() with your secret key first.');
        }

        const encryptionKey = await RingCompatibleCrypto.deriveUserKey(
            this.userKeypair.secret()
        );

        return await CardTokenizer.decryptCard(encryptedPayload, encryptionKey);
    }

    /**
     * Get account abstraction mode
     */
    async getAAMode(): Promise<string> {
        if (!this.config.useAccountAbstraction || !this.aaContract || !this.userKeypair) {
            return 'standard';
        }

        try {
            const userAddress = new Address(this.userKeypair.publicKey());
            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.aaContract.call('get_mode', userAddress.toScVal())
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);
            const response = await this.server.submitTransaction(transaction);

            // Parse mode from response
            return 'standard'; // Placeholder
        } catch (error) {
            console.error('Error getting AA mode:', error);
            return 'standard';
        }
    }

    /**
     * Set account abstraction mode
     */
    async setAAMode(mode: 'standard' | 'sponsored' | 'sessionKey' | 'multisig'): Promise<TransactionResult> {
        if (!this.config.useAccountAbstraction || !this.aaContract || !this.userKeypair) {
            throw new Error('Account abstraction not enabled');
        }

        try {
            const userAddress = new Address(this.userKeypair.publicKey());
            const modeVal = nativeToScVal(mode, { type: 'string' });

            const account = await this.server.loadAccount(this.userKeypair.publicKey());

            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.config.stellarNetwork === 'testnet'
                    ? Networks.TESTNET
                    : Networks.PUBLIC,
            })
                .addOperation(
                    this.aaContract.call('set_mode', userAddress.toScVal(), modeVal)
                )
                .setTimeout(30)
                .build();

            transaction.sign(this.userKeypair);
            const response = await this.server.submitTransaction(transaction);

            return {
                success: true,
                txHash: response.hash,
            };
        } catch (error: any) {
            return {
                success: false,
                txHash: '',
                error: error.message,
            };
        }
    }
}

export default TycheeSDK;
