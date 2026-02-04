# Tychee - Web3 Card Tokenization & Rewards Platform

> **Secure card tokenization SDK for Stellar with an example rewards dApp**

##  Overview

Tychee is a comprehensive card tokenization SDK and rewards platform built on Stellar's Soroban smart contracts. It enables regulations-compliant tokenization of debit/credit cards while providing a gamified rewards experience for users and merchants.

### Key Features

-  **Regulations-Compliant Card Tokenization** - AES-256-GCM encryption stored on-chain
-  **Stellar Blockchain** - Secure, fast, and low-cost transactions
-  **Gamified Rewards** - Premium points system with tier progression
-  **Merchant Discovery** - Hyperlocal deals and merchant discovery
-  **Blockchain Vouchers** - NFT-like vouchers that can be traded
-  **AI-Powered Insights** - Spending analytics and recommendations
-  **Account Abstraction** - Optional gasless transactions and meta-tx support

## Project Structure

```
tychee/
├── soroban/                    # Rust smart contracts
│   └── contracts/
│       ├── token_vault/        # Card tokenization contract
│       └── account_abstraction/ # AA contract
├── sdk/                        # TypeScript SDK
│   └── src/
│       ├── core/              # SDK engine
│       ├── crypto.ts          # Encryption utilities
│       └── types.ts           # TypeScript definitions
├── src/                       # Next.js frontend
│   ├── app/                   # App router pages
│   │   ├── cards/            # Cards Hub
│   │   ├── spends/           # Spends Hub
│   │   ├── rewards/          # Rewards
│   │   ├── store/            # Products/Services Store
│   │   ├── vouchers/         # Vouchers
│   │   ├── partners/         # Partners Dashboard
│   │   └── api/              # Serverless API routes
│   ├── components/           # React components
│   └── lib/                  # Utilities
└── prisma/                    # Database schema
```

##  Quick Start

### Prerequisites

- Node.js 18+ 
- Rust 1.71+ (for Soroban contracts)
- Stellar CLI ([Installation](https://developers.stellar.org/docs/tools/developer-tools))
- Vercel account (for deployment)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd tychee
npm install
```

2. **Set up environment variables:**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
- Stellar network URLs (testnet)
- Soroban contract addresses
- Vercel Postgres credentials

3. **Build Soroban contracts:**

```bash
cd soroban
cargo build --target wasm32-unknown-unknown --release
```

4. **Deploy contracts to Stellar testnet:**

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/token_vault.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet
```

5. **Initialize database:**

Run the SQL schema in `prisma/schema.sql` on your Vercel Postgres instance.

6. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔧 SDK Usage

### Install SDK

```bash
npm install @tychee/sdk
```

### Basic Example

```typescript
import { TycheeSDK, CardData } from '@tychee/sdk';

// Initialize SDK
const sdk = new TycheeSDK({
  stellarNetwork: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  tokenVaultAddress: 'YOUR_CONTRACT_ADDRESS',
  useAccountAbstraction: false,
});

// Initialize with user's secret key
await sdk.initialize('SXXX...');

// Tokenize a card
const cardData: CardData = {
  pan: '4242424242424242',
  cvv: '123',
  expiryMonth: '12',
  expiryYear: '26',
  cardholderName: 'John Doe',
  network: 'visa',
};

const tokenMetadata = await sdk.storeCard(cardData);
console.log('Card tokenized:', tokenMetadata);

// Retrieve token
const token = await sdk.retrieveCard();

// Revoke token
await sdk.revokeCard();
```

## 🎨 Frontend Features

### 1. Cards Hub
- Secure card tokenization flow
- Card management interface
- Visual card display with glassmorphism
- Real-time status updates

### 2. Spends Hub
- Transaction history
- Category-based spending analytics
- AI-powered insights
- Export functionality

### 3. Rewards
- Points balance with tier system (Bronze → Platinum)
- Rewards catalog
- Redemption interface
- 2x points promotions

### 4. Store
- Local merchant discovery
- Product catalog with search/filters
- Distance-based sorting
- Discount badges

### 5. Vouchers
- Blockchain-verified vouchers
- Copy-to-claim functionality
- Expiry warnings
- Ticket-style UI

### 6. Partners Dashboard
- Revenue analytics
- API key management
- Webhook configuration
- Integration guide

## 🔐 Security & Compliance

### RBI Compliance
- Card-on-File Tokenisation (CoFT) guidelines followed
- No raw card data stored
- Only tokenized references with encrypted payloads
- Complete audit trail via blockchain events

### Encryption (Web3-Native, User-Owned)
- **No Master Keys**: Zero server-side master keys - users own their encryption
- **Key Derivation**: Keys derived from user's Stellar secret key (SHA-256)
- **Client-side**: libsodium.js for browser key stretching (Argon2)
- **Encryption**: AES-256-GCM (ring-compatible)
- **On-chain**: Encrypted payloads stored on Soroban
- **Self-Custody**: Only user can decrypt their data (true web3)

### Access Control
- User authentication required for all operations
- Permission-based token access
- Revocation support
- Emergency pause functionality

## 📱 API Routes

All API routes are serverless functions deployed on Vercel:

- `POST /api/points` - Add/track rewards points
- `GET /api/points?userId=` - Get user points balance
- `GET /api/products?category=` - List products/services
- `GET /api/vouchers?userId=` - List available vouchers
- `PUT /api/vouchers` - Redeem voucher
- `GET /api/spends?userId=` - Get spending analytics
- `POST /api/spends` - Record transaction
- `GET /api/partners?partnerId=` - Partner analytics
- `POST /api/research` - Generate AI insights

See [docs/API.md](docs/API.md) for full API documentation.

##  Nielsen's Usability Heuristics

The frontend implements Jakob Nielsen's usability principles:

1. **Visibility of system status** - Real-time feedback, loading states, progress indicators
2. **Match system/real world** - Familiar card UI, intuitive navigation
3. **User control** - Cancel operations, filter options, undo support
4. **Consistency** - Unified design system, predictable interactions
5. **Error prevention** - Form validation, confirmation dialogs
6. **Recognition vs recall** - Clear labels, persistent navigation
7. **Flexibility** - Keyboard shortcuts, quick actions
8. **Aesthetic design** - Premium glassmorphism with vibrant gradients
9. **Error recovery** - Helpful error messages, retry options
10. **Help & documentation** - Contextual tooltips, security banners

## 🚢 Deployment

### Vercel Deployment

1. **Connect to Vercel:**

```bash
npm install -g vercel
vercel login
vercel link
```

2. **Set environment variables in Vercel dashboard**

3. **Deploy:**

```bash
vercel --prod
```

### Stellar Mainnet Deployment

1. Switch network to mainnet in contracts
2. Fund your account with XLM
3. Deploy contracts to mainnet
4. Update frontend environment variables

##  Testing

```bash
# SDK tests
cd sdk
npm test

# Soroban contract tests
cd soroban/contracts/token_vault
cargo test

# Frontend E2E tests
npm run test:e2e

# API route tests
npm run test:api
```

## Documentation

- [SDK Documentation](docs/SDK.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

##  Contributing

Contributions welcome! Please read our [contributing guidelines](.github/CONTRIBUTING.md). All contributors must sign our Contributor License Agreement (CLA).

## License

**Business Source License 1.1**

Project Tychee is licensed under the Business Source License 1.1 (BSL 1.1).

### Why BSL 1.1?

BSL with public code visibility provides transparency without surrendering the SaaS moat. This approach offers several key benefits:

1. **Transparency for Regulators**: Regulated financial infrastructure (card tokenization) benefits from auditable code. BSL lets regulators see the Soroban contracts + encryption logic while keeping the business logic proprietary.

2. **Competitive Protection**: Blocks competitors from copying your SaaS service for ~3 years, protecting the core business model while allowing legitimate use cases.

3. **Automatic Transition**: Unlike pure proprietary licensing, BSL automatically converts to Apache 2.0 post-Series A (or on a fixed date: **January 27, 2029**). This appeases open-source advocates and fuels community contributions later without re-licensing friction.

4. **Public Code Visibility**: BSL with public code visibility shows transparency and builds trust, while maintaining business protections.

### License Terms

**Licensor**: Tychee Labs  
**License Change Date**: January 27, 2029 (3 years)  
**Change License**: Apache License 2.0

**You may use the Licensed Work for:**
- Internal evaluation and testing
- Non-production development
- Educational and research purposes
- Building on Soroban contracts via Stellar's X-Ray primitives
- Integrating your own SaaS on top (e.g., embedding Tychee's SDK in your fintech)
- Contributing patches (CLA required)

**Prohibited without commercial license:**
- Offering card tokenization/SaaS competing with Tychee
- Wrapping Tychee as a managed service for end-users
- Modifying and reselling the Soroban contracts

### Commercial Licensing

For traditional banks, fintech companies, and enterprises that wish to deploy Tychee in-house (not as SaaS), we offer Commercial Licenses. See [LICENSE-COMMERCIAL](LICENSE-COMMERCIAL) for details.

**Contact**: ops@tychee.store

For the full license text, see [LICENSE](LICENSE).

## 🔗 Links

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Docs](https://soroban.stellar.org/)
- [RBI Card Tokenisation Guidelines](https://www.rbi.org.in/)

---

Built with ❤️ using Stellar, Next.js, and Rust
