---
pack: solana
topic: "Wallet Adapter Patterns"
decision: "How do I integrate wallet connection for Solana dApps?"
confidence: 9/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Wallet Adapter Patterns for Solana dApps

## Decision Summary

For production Solana dApps, use **@solana/wallet-adapter** ecosystem (via Wallet Standard) as the primary integration approach. The wallet-adapter provides a unified interface for 20+ wallets (Phantom, Solflare, Backpack, etc.) while the Wallet Standard provides the underlying protocol. For mobile web, additionally integrate **@solana-mobile/wallet-standard-mobile** to support Mobile Wallet Adapter (MWA).

## Wallet Adapter vs Wallet Standard

### Wallet Standard (Protocol Layer)
- **Chain-agnostic** protocol defining how wallets attach to `window` and expose APIs
- Event-based model: wallets fire `standard:register` events when available
- Pioneered on Solana, now expanding to other chains
- Located at `@wallet-standard/app`, `@solana/wallet-standard-features`

### Wallet Adapter (Integration Layer)
- **Built on top of Wallet Standard** - provides React/UI components
- Automatically detects wallets implementing Wallet Standard
- Provides `WalletProvider`, hooks (`useWallet`, `useConnection`), and UI components
- Handles connection state, auto-connect, and wallet selection UI

**Key insight**: You don't choose between them. Wallet Adapter uses Wallet Standard under the hood. Implement wallet-adapter and you get both.

## Core React Integration Pattern

### 1. Provider Setup

```tsx
// app.tsx or _app.tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

// For mobile web support (Android Chrome)
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa
} from '@solana-mobile/wallet-standard-mobile';

// Register MWA for mobile web (call in non-SSR context)
if (typeof window !== 'undefined') {
  registerMwa({
    appIdentity: {
      name: 'Your App',
      uri: 'https://yourapp.io',
      icon: 'relative/path/to/icon.png'
    },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: ['solana:mainnet', 'solana:devnet'],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: createDefaultWalletNotFoundHandler()
  });
}

export function App({ children }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Empty array - wallets auto-detected via Wallet Standard
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**Critical details**:
- `wallets={[]}` empty array - Wallet Standard auto-detects wallets
- `autoConnect` enables session persistence across page reloads
- `ConnectionProvider` → `WalletProvider` → `WalletModalProvider` → Your components (order matters)
- For Next.js: Mark as `'use client'` and check `typeof window !== 'undefined'` before MWA registration

### 2. Using the Wallet in Components

```tsx
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function YourComponent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signMessage } = useWallet();

  if (!publicKey) {
    return <WalletMultiButton />;
  }

  return (
    <div>
      <p>Connected: {publicKey.toBase58()}</p>
      {/* Your dApp logic */}
    </div>
  );
}
```

## Multi-Wallet Support Strategy

### Auto-Detection (Recommended)
Wallet-adapter auto-detects wallets via Wallet Standard. No manual wallet imports needed.

```tsx
// This detects all installed wallets automatically
const wallets = useMemo(() => [], []);
```

### Explicit Wallet List (Legacy Pattern)
Only needed for wallets not yet implementing Wallet Standard:

```tsx
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallets = useMemo(() => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter()
], []);
```

**When to use**: Supporting legacy wallets or specific wallet versions. Modern approach is auto-detection.

## Mobile Wallet Detection & Integration

### Mobile Web (Android Chrome)
**Problem**: Mobile users browse on Android Chrome but wallets are native apps.
**Solution**: Mobile Wallet Adapter (MWA) via `@solana-mobile/wallet-standard-mobile`

```tsx
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-standard-mobile';

function ConnectButton() {
  const { connected, connect, wallet, select, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = async () => {
    // Check if MWA is available (Android web environment)
    const mobileWallet = wallets.find(
      w => w.adapter.name === SolanaMobileWalletAdapterWalletName
    );

    if (wallet?.adapter?.name === SolanaMobileWalletAdapterWalletName) {
      // MWA already selected - connect directly
      await connect();
    } else if (mobileWallet) {
      // MWA available but not selected - select it
      select(mobileWallet.adapter.name);
    } else {
      // Show wallet selection modal
      setVisible(true);
    }
  };

  return <button onClick={handleConnect}>Connect Wallet</button>;
}
```

**Critical UX guideline**: On mobile web, call `connect()` directly instead of showing modal. Android Chrome blocks navigation not from user gestures.

### Display Name Override for MWA
```tsx
function WalletListItem({ wallet }) {
  const displayName = wallet.adapter.name === SolanaMobileWalletAdapterWalletName
    ? 'Use Installed Wallet'
    : wallet.adapter.name;

  return <div>{displayName}</div>;
}
```

### Mobile Native (React Native)
Use `@solana-mobile/mobile-wallet-adapter-protocol-web3js`:

```tsx
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const result = await transact(async (wallet: Web3MobileWallet) => {
  const { accounts, auth_token } = await wallet.authorize({
    cluster: 'mainnet-beta',
    identity: { uri: 'https://yourapp.io', name: 'Your App' }
  });

  const signed = await wallet.signTransactions({
    transactions: [tx],
    auth_token
  });

  return signed;
});
```

## Wallet Connection UX Patterns

### Auto-Connect & Session Management

```tsx
// Auto-connect enabled in provider
<WalletProvider wallets={wallets} autoConnect>

// Session persisted in localStorage automatically
// Wallet reconnects on page reload without user action
```

**How it works**:
- First connection stores wallet preference in `localStorage`
- On reload, `autoConnect` attempts reconnection with stored wallet
- User stays connected across sessions until explicit disconnect

### Custom Auto-Connect Logic
```tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

function useWalletPersistence() {
  const { publicKey, connect, disconnect, wallet } = useWallet();
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(true);

  useEffect(() => {
    // Store connection state
    if (publicKey) {
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletPublicKey', publicKey.toBase58());
    }
  }, [publicKey]);

  useEffect(() => {
    // Restore connection on mount
    const wasConnected = localStorage.getItem('walletConnected');
    if (wasConnected && autoConnectEnabled && !publicKey) {
      connect().catch(() => {
        localStorage.removeItem('walletConnected');
      });
    }
  }, [wallet, autoConnectEnabled]);

  return { setAutoConnectEnabled };
}
```

### Sign-In With Solana (SIWS)
For combined connect + authentication in single user action:

```tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaSignInInput } from '@solana/wallet-standard-features';

function SignInButton() {
  const { signIn } = useWallet();

  const handleSignIn = async () => {
    const input: SolanaSignInInput = {
      domain: window.location.host,
      statement: 'Sign in to My dApp',
      uri: window.location.origin
    };

    try {
      const output = await signIn(input);
      // output contains: account, signedMessage, signature
      // Verify signature server-side for JWT auth
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return <button onClick={handleSignIn}>Sign In</button>;
}
```

**Mobile web requirement**: Must call `signIn()` from user gesture (click). Programmatic calls in `useEffect` blocked by Chrome.

## Signing Patterns

### Sign and Send Transaction (Recommended)
```tsx
const { publicKey, sendTransaction } = useWallet();
const { connection } = useConnection();

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPubkey,
    lamports: 1000000
  })
);

// Wallet signs AND submits to RPC
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction(signature);
```

**Why recommended**:
- Wallet can add priority fees intelligently
- Prevents replay attacks with durable nonces
- Wallet controls RPC submission (may use private RPC)

### Sign Transaction Only
```tsx
const { signTransaction } = useWallet();

tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.feePayer = publicKey;

const signedTx = await signTransaction(tx);
const signature = await connection.sendRawTransaction(signedTx.serialize());
```

**When to use**: Custom transaction submission logic, batch processing.

### Sign Multiple Transactions
```tsx
const { signAllTransactions } = useWallet();

const signedTxs = await signAllTransactions([tx1, tx2, tx3]);
// Note: Wallet capability limits apply (typically max 10 txs)
```

### Sign Message
```tsx
const { signMessage, publicKey } = useWallet();

const message = new TextEncoder().encode('Hello Solana');
const signature = await signMessage(message);

// Verify signature
import { sign } from 'tweetnacl';
const verified = sign.detached.verify(
  message,
  signature,
  publicKey.toBytes()
);
```

## Common Issues & Solutions

### Issue: Wallet Not Found

**Symptom**: `WalletNotFoundError` or wallet doesn't appear in list

**Causes & Solutions**:
1. **Extension not installed**: Provide install link
   ```tsx
   onWalletNotFound: () => {
     window.open('https://phantom.app', '_blank');
   }
   ```

2. **Wallet Standard not registered yet**: Wait for registration event
   ```tsx
   import { getWallets } from '@wallet-standard/app';

   const { get, on } = getWallets();
   on('register', () => {
     // New wallet registered
     console.log('Wallet registered:', get());
   });
   ```

3. **Mobile wallet not detected**: User on mobile web but no MWA setup
   ```tsx
   // Display "Install a Solana wallet" message with links to:
   // - Phantom (iOS/Android)
   // - Solflare (iOS/Android)
   // - Backpack (iOS/Android)
   ```

### Issue: User Rejected Request

**Symptom**: `WalletSignTransactionError: User rejected the request`

```tsx
try {
  await signTransaction(tx);
} catch (error) {
  if (error.name === 'WalletSignTransactionError') {
    // User clicked "Reject" in wallet popup
    console.log('User cancelled transaction');
    // Show friendly message - don't retry automatically
  }
}
```

**UX guidance**: Never auto-retry after rejection. User intentionally declined.

### Issue: Auto-Connect Fails After Reload

**Symptom**: `autoConnect` enabled but wallet doesn't reconnect

**Causes**:
1. **Wallet disconnected programmatically**: Check `localStorage` for stale state
2. **Wallet extension disabled/removed**: Clear stored preference
3. **Wallet changed permissions**: Need fresh authorization

```tsx
useEffect(() => {
  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      // Clear stored state on persistent failure
      localStorage.removeItem('walletName');
      setAutoConnect(false);
    }
  };

  if (autoConnect && !connected) {
    handleConnect();
  }
}, [autoConnect, connected]);
```

### Issue: Mobile Chrome Navigation Blocked

**Symptom**: `Navigation is blocked: solana-wallet:/v1/associate...`

**Cause**: `connect()` or `signMessage()` called programmatically (not from user click)

```tsx
// ❌ BAD - Blocked by Chrome
useEffect(() => {
  if (needsAuth) {
    signMessage(message); // Called in effect - BLOCKED
  }
}, [needsAuth]);

// ✅ GOOD - User gesture
<button onClick={() => signMessage(message)}>Sign In</button>
```

**Solution**: Always invoke wallet methods from click/tap handlers on mobile web.

### Issue: Multiple Wallet Instances

**Symptom**: Same wallet appears twice in list

**Cause**: Wallet registered via both Wallet Standard and explicit adapter

```tsx
// ❌ Creates duplicate
const wallets = useMemo(() => [
  new PhantomWalletAdapter() // Phantom also auto-detected
], []);

// ✅ Let Wallet Standard handle it
const wallets = useMemo(() => [], []);
```

### Issue: Anchor Integration Confusion

**Symptom**: Unclear how to use wallet-adapter with Anchor programs

```tsx
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

function useAnchorProgram() {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  if (!anchorWallet) return null;

  const provider = new AnchorProvider(connection, anchorWallet, {});
  const program = new Program(IDL, PROGRAM_ID, provider);

  return program;
}
```

**Key**: Use `useAnchorWallet()` hook - returns Anchor-compatible wallet interface.

### Issue: Transaction Too Large

**Symptom**: `Transaction too large` when signing

**Solutions**:
1. **Split into multiple transactions**: Use `signAllTransactions`
2. **Use versioned transactions**: Support lookup tables
   ```tsx
   import { VersionedTransaction } from '@solana/web3.js';

   const message = MessageV0.compile({ ... });
   const tx = new VersionedTransaction(message);
   await signTransaction(tx);
   ```

3. **Check wallet capabilities**:
   ```tsx
   import { getWallets } from '@wallet-standard/app';

   const wallet = getWallets().get()[0];
   const capabilities = wallet.features['solana:signTransaction'];
   // Check max transaction size supported
   ```

## Wallet-Specific Notes

### Phantom
- **Market leader** - ~60% Solana wallet market share (2025)
- Supports: Browser extension (Chrome, Firefox, Brave, Edge), iOS, Android
- Features: NFT display, in-wallet swaps, multi-chain (Solana + Ethereum + Polygon + Bitcoin)
- Auto-detected via Wallet Standard
- Deep linking: `https://phantom.app/ul/v1/connect?app_url=...`

### Solflare
- **Security-focused** - Hardware wallet support (Ledger)
- Supports: Browser extension, iOS, Android, Web wallet
- Features: Staking UI, NFT gallery, Token extensions support
- Best for: Users prioritizing security, hardware wallet users
- Auto-detected via Wallet Standard

### Backpack
- **Next-gen wallet** - xNFT platform (executable NFTs)
- Supports: Browser extension, iOS, Android
- Features: Built-in chat, xNFT marketplace, Mad Lads integration
- Unique: Can run mini-apps (xNFTs) inside wallet
- Auto-detected via Wallet Standard
- Target audience: Power users, developers, crypto-native

### Magic Eden Wallet
- **NFT-first** - Integrated with Magic Eden marketplace
- Supports: Browser extension
- Works with Wallet Standard out-of-box
- Best for: NFT traders, Magic Eden users

### Glow Wallet
- **Mobile-optimized** - Safari Web Extension on iOS
- Supports: iOS app with Safari extension
- Notable: One of few iOS wallets with Safari extension signing
- Auto-detected via Wallet Standard

## Installation & Dependencies

### Core packages (Web):
```json
{
  "dependencies": {
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.39",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/web3.js": "^1.95.0"
  }
}
```

### Mobile web support:
```json
{
  "dependencies": {
    "@solana-mobile/wallet-standard-mobile": "^0.4.3",
    "@solana-mobile/wallet-adapter-mobile": "^2.2.5"
  }
}
```

### React Native:
```json
{
  "dependencies": {
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.2.5",
    "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.2.5",
    "@react-native-async-storage/async-storage": "^1.17.7"
  }
}
```

## Architecture Comparison

### Raw web3.js (Manual Integration)
```tsx
// ❌ Don't do this in production
const provider = window.solana;
await provider.connect();
const { publicKey } = provider;
const signed = await provider.signTransaction(tx);
```

**Problems**:
- Only works with one wallet (Phantom)
- No multi-wallet UI
- No auto-connect, session management
- Manual error handling
- No mobile support

### Wallet Adapter (Recommended)
```tsx
// ✅ Production-ready
<WalletProvider wallets={[]} autoConnect>
  <WalletMultiButton />
  {/* Your app */}
</WalletProvider>
```

**Benefits**:
- 20+ wallets supported
- Built-in UI components
- Auto-connect, error handling
- Mobile web support (MWA)
- Type-safe hooks

## Testing Recommendations

### Local Development
1. Test with multiple wallets: Phantom, Solflare, Backpack
2. Test wallet-not-installed flow
3. Test user rejection flow
4. Test network switching (devnet/mainnet)

### Mobile Testing
1. **Android Chrome**: Test MWA flow end-to-end
2. **iOS Safari**: Verify fallback messaging (MWA not supported)
3. Test wallet in-app browsers (Phantom, Solflare mobile apps)

### Error Cases
```tsx
// Test each error scenario
const testCases = [
  'WalletNotFoundError',
  'WalletNotConnectedError',
  'WalletSignTransactionError',
  'WalletSendTransactionError',
  'WalletTimeoutError'
];
```

## Production Checklist

- [ ] Custom `appIdentity` configured for mobile (name, URI, icon)
- [ ] Auto-connect enabled for session persistence
- [ ] Error boundaries around wallet operations
- [ ] User-friendly error messages (not raw error codes)
- [ ] Install links for wallet-not-found scenarios
- [ ] Mobile web tested on Android Chrome
- [ ] Wallet disconnection flow tested
- [ ] Network switching handled gracefully
- [ ] Transaction confirmation UX clear
- [ ] HTTPS enforced (required for wallet security)

## Key Takeaways

1. **Use Wallet Standard via Wallet Adapter** - Don't build custom wallet integrations
2. **Empty wallet array** - Let Wallet Standard auto-detect wallets
3. **Enable autoConnect** - Persist sessions across reloads
4. **Mobile web needs MWA** - Register `@solana-mobile/wallet-standard-mobile`
5. **User gestures on mobile** - Call wallet methods from click handlers
6. **signIn for auth** - Combine connect + sign in single action
7. **sendTransaction preferred** - Let wallet handle submission + priority fees
8. **Test multi-wallet** - Don't assume Phantom only
9. **Handle rejections gracefully** - User rejections are normal UX
10. **Wallet Standard is the future** - Replaces adapter-specific integrations

## Resources

- [Wallet Adapter GitHub](https://github.com/anza-xyz/wallet-adapter)
- [Wallet Standard Spec](https://github.com/anza-xyz/wallet-standard)
- [Mobile Wallet Adapter Spec](https://solana-mobile.github.io/mobile-wallet-adapter/spec/spec.html)
- [Solana Cookbook - Wallet Connection](https://solana.com/developers/cookbook/wallets/connect-wallet-react)
- [Phantom Developer Docs](https://docs.phantom.com/)
- [Jupiter Wallet Kit](https://dev.jup.ag/tool-kits/wallet-kit) - Open-source alternative with unified interface
