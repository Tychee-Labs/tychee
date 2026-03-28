# Tychee Encryption Architecture

## Philosophy: User-Owned Web3 Encryption

Tychee follows **pure web3 principles** - users own their encryption keys, derived from their Stellar wallet. There are **no server-side master keys** or centralized key management.

## Encryption Flow

```
User's Stellar Wallet (Freighter, Albedo, etc.)
         ↓
    Sign Deterministic Challenge
    ("tychee:card-encryption-key-derivation:<pubkey>:v2")
         ↓
    SHA-256(signature)
         ↓
   256-bit AES Key (client-side, derived from wallet signature)
         ↓
  AES-256-GCM Encryption
         ↓
  Encrypted Payload → Soroban Smart Contract (keyed by user + token_hash)
```

## Key Derivation

### Client-Side (Browser — Wallet Signature)
```typescript
// Derive encryption key from wallet signature (requires wallet approval)
// The wallet's private key signs a deterministic challenge message.
// Only the wallet owner can produce this signature.
const challenge = `tychee:card-encryption-key-derivation:${publicKey}:v2`;
const { signedTxXdr } = await kit.signTransaction(challenge, {
    address: publicKey,
    networkPassphrase: "Test SDF Network ; September 2015",
});
const encryptionKey = SHA256(signedTxXdr);  // 256-bit AES key

// Encrypt card data
const { encryptedPayload, tokenHash } = await CardTokenizer.encryptCard(
  cardData,
  encryptionKey
);
```

### Server-Side SDK (Secret Key)
```typescript
// When using the SDK server-side (e.g. in a backend),
// the user's secret key is available directly.
const encryptionKey = await RingCompatibleCrypto.deriveUserKey(secretKey);
```

### Why No Master Key?

❌ **Centralized Master Key** (Not Used)
- Single point of failure
- Requires trusting the server
- Violates web3 self-custody principles
- Users don't own their data

✅ **Web3 User-Owned Keys** (Our Approach)
- Derived from user's Stellar secret key
- Only user can decrypt their data
- True self-custody
- No trust required in server
- Fully decentralized

## Encryption Layers

### 1. Client-Side Key Derivation (libsodium.js)

For browser-based key stretching:

```typescript
import sodium from 'libsodium-wrappers';

// Argon2 key derivation from wallet seed
const key = sodium.crypto_pwhash(
  32, // 256 bits
  seed,
  salt,
  sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
  sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  sodium.crypto_pwhash_ALG_ARGON2ID13
);
```

### 2. Server-Side Encryption (ring-compatible)

For Node.js/Vercel functions:

```typescript
import { RingCompatibleCrypto } from '@tychee/sdk';

// AES-256-GCM encryption (compatible with Rust ring)
const encrypted = RingCompatibleCrypto.encrypt(plaintext, userKey);
// Format: IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)
```

### 3. On-Chain Storage (Soroban — Multi-Card)

```rust
// Soroban contract stores multiple cards per user,
// each identified by a unique token_hash.
pub fn store_token(
    env: Env,
    user: Address,
    encrypted_payload: Bytes,  // Already encrypted client-side
    token_hash: BytesN<32>,    // Unique per card
    // ...
) -> TokenMetadata {
    // Store encrypted payload keyed by (user, token_hash)
    env.storage().persistent().set(
        &DataKey::TokenData(user.clone(), token_hash.clone()),
        &metadata
    );
    // Append hash to user's token list for enumeration
    // ...
}
```

## Security Properties

### User Data Flow

1. **Card Entry** (Browser)
   - User enters card details
   - Never leaves browser unencrypted

2. **Encryption** (Client-Side)
   ```
   Card Data → AES-256-GCM → Encrypted Payload
   (using key derived from user's wallet)
   ```

3. **Transmission** (HTTPS)
   - Encrypted payload sent to blockchain
   - Already encrypted before transmission
   - Double-encrypted during transit (HTTPS + AES)

4. **Storage** (On-Chain)
   - Encrypted payload stored in Soroban contract
   - Only accessible by user's wallet address
   - Immutable audit trail

5. **Retrieval** (Client-Side)
   ```
   Encrypted Payload → User's Key → Decryption → Card Data
   (only user has the key)
   ```

### Access Control

```rust
// Soroban contract enforces wallet-based access control
pub fn retrieve_token(env: Env, user: Address, token_hash: BytesN<32>) -> Option<TokenMetadata> {
    user.require_auth();  // Only user can retrieve
    
    let permission: Option<Permission> = 
        env.storage().persistent().get(&DataKey::Permissions(user.clone()));
    
    match permission {
        Some(Permission::Owner) => { /* allow */ },
        _ => { /* deny */ }
    }
}

// Retrieve all cards for a user
pub fn retrieve_all_tokens(env: Env, user: Address) -> Vec<TokenMetadata> {
    user.require_auth();
    // Returns all active cards for the user
}
```

## Key Management

### User Responsibilities

✅ Users must:
- Securely store their Stellar secret key
- Use wallet software (Freighter, Albedo, etc.)
- Never share their secret key

✅ Benefits:
- Full control over their data
- Can decrypt anywhere with their key
- No dependency on Tychee servers
- True web3 self-custody

### Server Responsibilities

✅ Tychee servers:
- Never see unencrypted card data
- Cannot decrypt user data (no master key)
- Only route encrypted payloads to blockchain
- Provide indexing and metadata services

❌ Tychee servers cannot:
- Decrypt user's card data
- Recover lost wallet keys
- Access user data without their signature

## Backup & Recovery

### User Backup (Required)

Users must backup their Stellar secret key:

```
Method 1: Hardware Wallet (Ledger, Trezor)
Method 2: Paper Backup (write down secret key)
Method 3: Encrypted Cloud Storage (with strong password)
```

### No Master Key Recovery

Since there's no master key, Tychee **cannot** recover:
- Lost wallet keys
- Forgotten passphrases
- Encrypted data without user's key

This is **by design** - true self-custody means true responsibility.

## Compliance Notes (RBI)

### Card-on-File Tokenisation (CoFT)

✅ **Compliant Implementation**:
- No actual card data stored (only tokens)
- User consent required (wallet signature)
- Encrypted storage (on-chain)
- Audit trail (blockchain events)
- Revocation support
- Token expiration

✅ **Web3 Enhancement**:
- User-owned encryption (beyond RBI requirements)
- Decentralized storage (on Stellar)
- Immutable audit trail (blockchain)
- No centralized database breach risk

## Cryptographic Primitives

| Layer | Algorithm | Key Size | Use Case |
|-------|-----------|----------|----------|
| Key Derivation (Browser) | Wallet Signature + SHA-256 | 256-bit | Wallet signature → Encryption key |
| Key Derivation (Server) | SHA-256 | 256-bit | Secret key → Encryption key |
| Symmetric Encryption | AES-GCM | 256-bit | Card data encryption |
| Authentication | Ed25519 | 256-bit | Stellar signatures |
| Hashing | SHA-256 | 256-bit | Token indexing |

## Code Examples

### Full Tokenization Flow

```typescript
import { TycheeSDK, CardData } from '@tychee/sdk';

// 1. Initialize with user's wallet
const sdk = new TycheeSDK({
  stellarNetwork: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  tokenVaultAddress: 'CONTRACT_ADDRESS',
  useAccountAbstraction: false,
});

await sdk.initialize('SXXX...'); // User's secret key

// 2. Card data (never stored unencrypted)
const card: CardData = {
  pan: '4242424242424242',
  cvv: '123',
  expiryMonth: '12',
  expiryYear: '26',
  cardholderName: 'Alice',
  network: 'visa',
};

// 3. Tokenize (encryption happens client-side)
const metadata = await sdk.storeCard(card);
// ✅ Card encrypted with key derived from user's secret
// ✅ Encrypted payload stored on Soroban (keyed by user + hash)
// ✅ Multiple cards per wallet supported
// ✅ User can decrypt later with same secret key

// 4. Store another card (multi-card support)
const metadata2 = await sdk.storeCard(anotherCard);
// ✅ Same user, different card — both stored on-chain

// 5. Retrieve all cards
const allCards = await sdk.retrieveAllCards();

// 6. Retrieve and decrypt a specific card
const token = await sdk.retrieveCard(metadata.tokenHash);
const decryptedCard = await sdk.decryptCard(token.encryptedPayload);
// ✅ Only works if user has the secret key

// 7. Revoke a specific card
await sdk.revokeCard(metadata2.tokenHash);
// ✅ Only the specified card is revoked; others remain active
```

### Account Abstraction with User Keys

Even with account abstraction (gasless tx), encryption keys remain user-owned:

```typescript
const sdk = new TycheeSDK({
  // ... config
  useAccountAbstraction: true,
  aaMode: 'sponsored', // Gas sponsored, but keys still user-owned
});

// User's secret key still required for encryption
await sdk.initialize('SXXX...');

// Encryption: User's key
// Gas payment: Sponsor's account
// Best of both worlds!
```

## Security Audit Checklist

- [x] No server-side master keys
- [x] User-owned encryption keys
- [x] Keys derived from wallet signature (browser) / secret key (server)
- [x] Client-side encryption
- [x] AES-256-GCM authenticated encryption
- [x] Secure key derivation (SHA-256 of wallet signature)
- [x] Multi-card per wallet support
- [x] Access control on-chain
- [x] Audit trail via events
- [x] RBI CoFT compliant
- [x] No plaintext storage
- [x] HTTPS in transit
- [x] Wallet signature required

---

**Tychee: True Web3 Self-Custody** 🔐
