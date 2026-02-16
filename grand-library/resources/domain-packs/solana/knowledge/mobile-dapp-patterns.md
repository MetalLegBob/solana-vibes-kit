---
pack: solana
confidence: 8/10
sources_checked: 11
last_updated: "2026-02-16"
---

# Building for Solana Mobile: dApp Patterns & Best Practices

## The Mobile Landscape

Solana Mobile Stack (SMS) provides a crypto-native mobile experience via the **Saga** and **Seeker** Android devices and the **Solana dApp Store**. Unlike web dApps that rely on browser extensions, mobile dApps use the **Mobile Wallet Adapter (MWA)** protocol for native app-to-app wallet communication.

**Key difference from web:** No browser extensions. MWA uses Android Intents to connect dApps directly to wallet apps installed on the same device.

## Mobile Wallet Adapter Protocol

MWA is the core protocol for Solana mobile. It enables:
- Wallet connection via Android Intents
- Transaction signing (with wallet app handling submission)
- Message signing for authentication
- Authorization state management

### Session Establishment Flow

```
1. dApp broadcasts Intent: solana-wallet://
2. User picks wallet from system dialog
3. Wallet opens, starts WebSocket connection
4. Session established → dApp can send requests
```

**Diagram:**
```
[dApp] --Intent--> [Android System] --Launch--> [Wallet App]
   |                                                  |
   |<-------- WebSocket Connection (localhost) ------>|
   |                                                  |
   |-- authorize() -->                                |
   |                  <-- {accounts, auth_token} -----|
   |                                                  |
   |-- signAndSendTransactions() -->                  |
   |                  <-- {signatures} ---------------|
```

### React Native Implementation

**1. Install dependencies:**

```bash
yarn add \
  @solana-mobile/mobile-wallet-adapter-protocol-web3js \
  @solana-mobile/mobile-wallet-adapter-protocol \
  @solana/web3.js \
  react-native-get-random-values \
  @craftzdog/react-native-buffer \
  react-native-quick-base64 \
  @react-native-async-storage/async-storage
```

**2. Setup polyfills (CRITICAL - must load first):**

```typescript
// src/polyfills.ts
import 'react-native-get-random-values'; // Must be first
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;
```

**3. Import polyfills in entry file:**

```typescript
// App.tsx (FIRST LINE)
import './src/polyfills';
import { /* ... */ } from '@solana/web3.js'; // Now safe to use
```

**4. Connect to wallet with `transact`:**

```typescript
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const APP_IDENTITY = {
  name: 'My Solana dApp',
  uri: 'https://myapp.io',
  icon: 'favicon.ico' // Resolves to https://myapp.io/favicon.ico
};

async function connectWallet() {
  const authorizationResult = await transact(async (wallet: Web3MobileWallet) => {
    return await wallet.authorize({
      cluster: 'devnet',
      identity: APP_IDENTITY
    });
  });

  // authorizationResult contains:
  // - accounts: PublicKey[] (usually just one)
  // - auth_token: string (store for reauthorization)
  // - wallet_uri_base: string

  const publicKey = authorizationResult.accounts[0].address;
  const authToken = authorizationResult.auth_token;

  // Store authToken in AsyncStorage for next session
  await AsyncStorage.setItem('auth_token', authToken);

  return publicKey;
}
```

**5. Reauthorize with stored `auth_token`:**

```typescript
async function reconnectWallet() {
  const storedAuthToken = await AsyncStorage.getItem('auth_token');

  if (!storedAuthToken) {
    // No previous session, do full authorize
    return await connectWallet();
  }

  try {
    const result = await transact(async (wallet: Web3MobileWallet) => {
      return await wallet.reauthorize({
        auth_token: storedAuthToken,
        identity: APP_IDENTITY
      });
    });

    return result.accounts[0].address;
  } catch (error) {
    // Token expired/invalid, clear and do full authorize
    await AsyncStorage.removeItem('auth_token');
    return await connectWallet();
  }
}
```

**6. Sign and send transactions:**

MWA provides two patterns:

**Pattern A: Wallet signs AND sends (recommended):**

```typescript
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

async function sendSOL(to: string, amount: number) {
  const authToken = await AsyncStorage.getItem('auth_token');

  const signature = await transact(async (wallet) => {
    // Build transaction
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const publicKey = new PublicKey(/* user's key */);

    const { blockhash } = await connection.getLatestBlockhash();

    const instructions = [
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(to),
        lamports: amount
      })
    ];

    const message = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    // Wallet signs AND sends
    const result = await wallet.signAndSendTransactions({
      transactions: [transaction],
      auth_token: authToken
    });

    return result.signatures[0];
  });

  console.log('Transaction signature:', signature);
  return signature;
}
```

**Pattern B: dApp signs, wallet sends (less common):**

```typescript
const signedTx = await transact(async (wallet) => {
  const signed = await wallet.signTransactions({
    transactions: [transaction],
    auth_token: authToken
  });
  return signed[0];
});

// dApp submits to RPC manually
const connection = new Connection(/* ... */);
const signature = await connection.sendRawTransaction(signedTx.serialize());
await connection.confirmTransaction(signature, 'confirmed');
```

**Why prefer Pattern A?** Wallets can apply their own priority fees and handle submission errors better.

### 7. Sign In with Solana (SIWS)

Combines `authorize` + `signMessage` in one step for authentication:

```typescript
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { verifySignIn } from '@solana/wallet-standard-util';

async function signInWithSolana() {
  const result = await transact(async (wallet) => {
    return await wallet.authorize({
      cluster: 'mainnet-beta',
      identity: APP_IDENTITY,
      sign_in_payload: {
        domain: 'myapp.io',
        statement: 'Sign in to My App',
        uri: 'https://myapp.io',
        version: '1',
        chainId: 'mainnet',
        nonce: generateNonce(), // Random string
        issuedAt: new Date().toISOString()
      }
    });
  });

  // result.sign_in_result contains signed message
  const signInOutput = result.sign_in_result;

  // Verify on backend
  const isValid = await verifySignIn(signInOutput);

  if (!isValid) {
    throw new Error('Invalid sign-in signature');
  }

  return result.accounts[0].address;
}
```

See [Phantom SIWS docs](https://docs.phantom.app/solana/signing-a-message/sign-in-with-solana) for backend verification.

## React Native + Expo Setup

**Important:** You MUST use Expo's **Development Build**, not Expo Go. MWA requires native modules that Expo Go doesn't support.

**1. Initialize with Solana Mobile template:**

```bash
npx create-expo-app MyApp --template @solana-mobile/solana-mobile-expo-template
cd MyApp
yarn install
```

**2. Build a development client:**

```bash
# Install expo-dev-client
npx expo install expo-dev-client

# Build for Android locally
npx expo run:android

# Or use EAS cloud build
eas build --profile development --platform android --local
```

**3. Run the app:**

```bash
npx expo start --dev-client
```

**Project structure:**

```
src/
├── polyfills.ts          # Crypto shims (loads first)
├── App.tsx               # Root component
├── providers/
│   ├── AuthorizationProvider.tsx  # MWA state management
│   └── ConnectionProvider.tsx     # RPC connection
├── hooks/
│   ├── useAuthorization.ts
│   └── useMobileWallet.ts
├── screens/
│   ├── HomeScreen.tsx
│   └── SendScreen.tsx
└── utils/
    ├── verifySetup.ts    # Polyfill verification
    └── constants.ts      # RPC endpoints, cluster config
```

## Mobile Transaction Signing Patterns

### Optimistic UI Updates

```typescript
async function transferSOL(to: string, amount: number) {
  // 1. Optimistically update UI
  setBalance(prev => prev - amount);
  setStatus('pending');

  try {
    const signature = await sendSOL(to, amount);

    // 2. Poll for confirmation in background
    const connection = new Connection(/* ... */);
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      // 3. Rollback on error
      setBalance(prev => prev + amount);
      setStatus('failed');
    } else {
      setStatus('confirmed');
    }
  } catch (error) {
    setBalance(prev => prev + amount);
    setStatus('failed');
  }
}
```

### Deep Linking for Wallet Discovery

When user clicks "Connect Wallet", Android shows installed MWA wallets via Intent:

```typescript
// MWA automatically handles this when you call transact()
// No manual deep linking needed - Android Intent system handles discovery
```

**User flow:**
1. User taps "Connect Wallet"
2. Android shows dialog: "Open with Phantom | Solflare | Backpack"
3. User selects wallet
4. Wallet opens, shows authorization prompt
5. dApp receives `auth_token` + accounts

## Solana dApp Store Publishing

The Solana dApp Store is a crypto-friendly alternative to Google Play, with:
- **Zero fees** on in-app purchases, subscriptions, or app sales
- **Direct economic relationship** with users (on-chain or off-chain)
- **Community-curated** catalog (no traditional app store rules)

### Publishing Steps

**1. Install dApp Store CLI:**

```bash
mkdir publishing
cd publishing
pnpm init
pnpm install --save-dev @solana-mobile/dapp-store-cli
npx dapp-store init
```

**2. Prepare your app:**

- Build a signed APK/AAB
- Create app metadata (name, description, screenshots)
- Prepare video preview assets (requires `ffmpeg`)

**3. Mint a Publisher NFT:**

The dApp Store uses on-chain NFTs to represent apps. Each app is an NFT in your wallet.

```bash
npx dapp-store create \
  --name "My App" \
  --android-package "com.myapp" \
  --solana-address "YourPublicKey..."
```

**4. Submit to catalog:**

```bash
npx dapp-store publish \
  --apk path/to/app.apk \
  --nft-mint YourNFTMintAddress
```

**5. Policy compliance:**

Ensure your dApp follows the [Publisher Policy](https://docs.solanamobile.com/dapp-publishing/policy):
- No malware, scams, or illegal content
- Clear disclosure of fees/risks
- Proper wallet integration (MWA compliance)

### Progressive Web App (PWA) to APK

Already have a web dApp? Convert it to Android:

```bash
npx dapp-store convert-pwa \
  --url https://myapp.io \
  --output ./app.apk
```

This generates an APK wrapper around your PWA for dApp Store submission.

## Saga/Seeker Device Features

**Saga** and **Seeker** are Solana-optimized Android phones with:
- **Seed Vault**: Secure hardware for key storage (not accessible via MWA yet)
- **Pre-installed Phantom wallet**: Reduces onboarding friction
- **Optimized RPC**: Device-level RPC caching for faster requests
- **dApp Store**: Pre-installed, no Google Play required

**How to target Saga/Seeker:**

No special code needed. Your MWA app works on any Android device. Saga/Seeker just provide better UX:
- Faster wallet connections (optimized Android OS)
- Better default wallet (pre-installed)
- Users are crypto-native (higher conversion)

**Testing without Saga/Seeker:**

Use Android Emulator + Mock MWA Wallet:

```bash
git clone https://github.com/solana-mobile/mobile-wallet-adapter
cd mobile-wallet-adapter/android/fakedapp
# Open in Android Studio, build to emulator
```

## iOS Limitations

**MWA does NOT work on iOS.** The protocol relies on:
- Android Intents (iOS doesn't have equivalent)
- Localhost WebSocket connections (iOS sandboxing blocks this)

**Workarounds for iOS:**

1. **Wallet In-App Browser**: Some wallets (e.g., Phantom) have in-app browsers that inject wallet into `window.solana`
2. **Safari Web Extension**: Glow Wallet and Nightly Wallet support signing via Safari extension
3. **Embedded Wallets**: Use Privy, Magic, or Web3Auth for cross-platform support (covered in separate docs)

**Bottom line:** Build MWA for Android, use embedded wallets for cross-platform.

## React Native Hooks Pattern

Reusable hook for MWA connection:

```typescript
// hooks/useMobileWallet.ts
import { useState, useCallback } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useMobileWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await transact(async (wallet) => {
        return await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY
        });
      });

      const pubkey = result.accounts[0].address;
      setPublicKey(pubkey);
      await AsyncStorage.setItem('auth_token', result.auth_token);

      return pubkey;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const authToken = await AsyncStorage.getItem('auth_token');
    if (authToken) {
      await transact(async (wallet) => {
        await wallet.deauthorize({ auth_token: authToken });
      });
      await AsyncStorage.removeItem('auth_token');
    }
    setPublicKey(null);
  }, []);

  return { publicKey, isConnecting, connect, disconnect };
}
```

## Common Pitfalls

1. **Forgetting polyfills**: `crypto.getRandomValues is not a function` means polyfills aren't loaded first
2. **Using Expo Go**: MWA requires Development Build (custom native code)
3. **Not storing `auth_token`**: Users must reauthorize every session without it
4. **Testing only on emulator**: Real devices have better WebSocket timing; always test on hardware
5. **Assuming iOS support**: MWA is Android-only; plan for separate iOS strategy
6. **Not handling wallet app not found**: Prompt user to install a wallet if none detected

## Testing Checklist

- [ ] Test on Android emulator with Mock MWA Wallet
- [ ] Test on real Android device with Phantom/Solflare
- [ ] Test authorization flow (first time + reauthorization)
- [ ] Test transaction signing and submission
- [ ] Test wallet app not installed scenario
- [ ] Test offline/reconnection handling
- [ ] Test on Saga/Seeker device (if available)

## Tools & Resources

**SDKs:**
- `@solana-mobile/mobile-wallet-adapter-protocol-web3js` (React Native)
- `@solana-mobile/mobile-wallet-adapter-protocol` (core protocol)
- `@solana/web3.js` (Solana transactions)

**Templates:**
- [Solana Mobile Expo Template](https://www.npmjs.com/package/@solana-mobile/solana-mobile-expo-template)
- [React Native dApp Scaffold](https://github.com/solana-mobile/solana-mobile-dapp-scaffold)

**Testing:**
- [Mock MWA Wallet](https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/android/fakewallet)
- [Phantom Mobile](https://phantom.app/download)

**Publishing:**
- [dApp Store CLI](https://www.npmjs.com/package/@solana-mobile/dapp-store-cli)
- [dApp Store Docs](https://docs.solanamobile.com/dapp-publishing/intro)

**Docs:**
- [Solana Mobile Docs](https://docs.solanamobile.com)
- [MWA Spec](https://github.com/solana-mobile/mobile-wallet-adapter/blob/main/spec/spec.md)
- [QuickNode Mobile Guide](https://www.quicknode.com/guides/solana-development/dapps/build-a-solana-mobile-app-on-android-with-react-native)

## Next Steps

- Start with the [Expo template](https://www.npmjs.com/package/@solana-mobile/solana-mobile-expo-template)
- Build basic wallet connection + balance display
- Add transaction signing for SOL transfers
- Integrate Anchor programs via `@coral-xyz/anchor` (works in React Native with polyfills)
- Test on real device with Phantom wallet
- Publish to Solana dApp Store
