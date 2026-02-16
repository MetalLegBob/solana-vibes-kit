---
pack: solana
topic: "Next.js + Solana Patterns"
decision: "Best patterns for Next.js + Solana dApps?"
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Next.js + Solana Patterns

## Decision: What are the best patterns for building Next.js + Solana dApps?

**Use App Router with client-only wallet components, server-side RPC calls, and environment variable isolation. Leverage create-solana-dapp scaffolds but understand the hydration constraints.**

### Confidence: 8/10

Strong consensus on patterns, but ecosystem is transitioning from `@solana/web3.js` v1 to `@solana/kit` v2 with different API surface areas.

---

## Pattern 1: Scaffold with create-solana-dapp

### What

Official scaffolding tool for Solana + Next.js apps. Now defaults to **no Anchor**, uses modern `@solana/kit` v2.

```bash
# Modern approach (2025+)
npx create-solana-dapp --template next-tailwind

# Legacy approach (if you need Anchor)
npx create-solana-dapp --template next-tailwind --legacy
```

### Why

- Provides battle-tested structure for monorepo setups
- Includes wallet adapter configuration out of the box
- Tailwind + TypeScript preconfigured
- Community-maintained templates at `solana-developers/solana-templates`

### Trade-offs

- **New versions removed Anchor by default** — you now manually run `anchor init` inside the project if needed
- Templates moved from individual repos to centralized `solana-developers/solana-templates`
- **Breaking change in 2024-2025**: `@solana/web3.js` v1 (class-based) → `@solana/kit` v2 (functional, modular)

### Example

```typescript
// Old web3.js v1 pattern
import { Connection } from "@solana/web3.js";
const connection = new Connection("https://api.devnet.solana.com");

// New @solana/kit v2 pattern (more verbose but tree-shakeable)
import { createSolanaRpc } from "@solana/kit";
const rpc = createSolanaRpc("https://api.devnet.solana.com");
```

**Code Reference**: `solana-developers/template-next-tailwind` (archived, moved to `solana-templates`)

---

## Pattern 2: App Router vs Pages Router

### What

**App Router** is the modern Next.js pattern (Next.js 13+), but wallet integration requires understanding Server vs Client Components.

### Why App Router is Preferred

- Built-in support for React Server Components (RSC)
- Better data fetching patterns with async components
- Layout composition with `layout.tsx`
- Improved routing with nested folders

### The Hydration Constraint

**Wallet adapters MUST be client-only.** This is the #1 source of errors in Next.js + Solana apps.

### The Problem

```typescript
// ❌ THIS WILL CAUSE HYDRATION ERRORS
// app/page.tsx (Server Component by default)
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Page() {
  return <WalletMultiButton />; // Error: Server/client mismatch
}
```

### The Solution: Dynamic Imports

```typescript
// ✅ CORRECT: Use dynamic import with ssr: false
// app/page.tsx
import dynamic from 'next/dynamic';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Page() {
  return <WalletMultiButtonDynamic />;
}
```

### Why This Works

- `ssr: false` tells Next.js to skip rendering this component on the server
- Component only hydrates on the client after JavaScript loads
- Prevents "Hydration failed because initial UI does not match" error

### Alternative: useEffect Guard

```typescript
// ✅ ALSO WORKS: Client-side only rendering guard
'use client';

import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return <WalletMultiButton />;
}
```

---

## Pattern 3: Server Components for Solana RPC Calls

### What

**Fetch blockchain data in Server Components**, not client components. Keep wallet interactions client-side.

### Why

- Faster initial page loads (no client-side waterfall)
- RPC endpoints stay server-side (no exposure in browser bundle)
- Reduces client JavaScript payload
- Better SEO for on-chain data

### Example

```typescript
// ✅ app/token/[mint]/page.tsx (Server Component)
import { createSolanaRpc } from '@solana/kit';

export default async function TokenPage({ params }: { params: { mint: string } }) {
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);

  // Server-side data fetch
  const accountInfo = await rpc.getAccountInfo(params.mint);

  return (
    <div>
      <h1>Token: {params.mint}</h1>
      <pre>{JSON.stringify(accountInfo, null, 2)}</pre>
    </div>
  );
}
```

### Pattern: Hybrid Architecture

```
┌─────────────────────────────────────┐
│  Server Components (RSC)            │
│  - Fetch on-chain data via RPC      │
│  - Parse transactions               │
│  - Read program accounts            │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Client Components                  │
│  - Wallet adapter (connect/sign)    │
│  - Transaction building             │
│  - User interactions                │
└─────────────────────────────────────┘
```

---

## Pattern 4: Wallet Provider Setup (App Router)

### What

Wrap your app with Solana wallet context providers. Must be a **client component**.

### Implementation

```typescript
// ✅ app/providers.tsx
'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Providers({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

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

```typescript
// ✅ app/layout.tsx (Root Layout)
import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Key Points

- **Mark providers with `'use client'`** — they manage state
- Root `layout.tsx` can stay a Server Component
- Import wallet adapter CSS globally in providers
- Use `useMemo` to prevent recreating wallet instances

---

## Pattern 5: Environment Variables for RPC Endpoints

### What

**Never hardcode RPC URLs.** Use environment variables with Next.js conventions.

### Setup

```bash
# .env.local (DO NOT COMMIT)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://example.solana-devnet.quiknode.pro/YOUR_KEY/

# Server-only RPC (not exposed to browser)
SOLANA_RPC_URL=https://example.solana-mainnet.quiknode.pro/YOUR_PRIVATE_KEY/
```

### Usage Pattern

```typescript
// ✅ Client-side wallet provider
// app/providers.tsx
'use client';

export default function Providers({ children }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  // ...
}
```

```typescript
// ✅ Server-side data fetching
// app/api/token/route.ts
export async function GET() {
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
  // This endpoint stays server-side only
}
```

### Security Rules

| Variable Prefix | Exposed to Browser? | Use Case |
|----------------|-------------------|----------|
| `NEXT_PUBLIC_*` | ✅ Yes | Wallet connections, public RPC endpoints |
| No prefix | ❌ No | Private RPC endpoints, API keys |

### next.config.js Pattern (Legacy)

```javascript
// ⚠️ Only needed for older Next.js versions
module.exports = {
  env: {
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  },
};
```

**Not needed in Next.js 13+** — `NEXT_PUBLIC_*` variables are auto-injected.

---

## Pattern 6: Hydration Errors — The Complete Guide

### What

The most common error in Next.js + Solana apps:

```
Error: Hydration failed because the initial UI does not match
what was rendered on the server.
```

### Root Causes

1. **Wallet components rendered server-side**
2. **Dynamic content (timestamps, random data) without client guards**
3. **Browser APIs (`window`, `localStorage`) used during SSR**
4. **Third-party libraries not SSR-compatible**
5. **Browser extensions modifying HTML** (Grammarly, ad blockers)

### Solutions by Scenario

#### Scenario 1: Wallet Components

```typescript
// ❌ CAUSES HYDRATION ERROR
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Page() {
  return <WalletMultiButton />;
}
```

```typescript
// ✅ FIX: Dynamic import with ssr: false
import dynamic from 'next/dynamic';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Page() {
  return <WalletMultiButtonDynamic />;
}
```

#### Scenario 2: Time-Dependent Content

```typescript
// ❌ CAUSES HYDRATION ERROR (server time ≠ client time)
export default function Page() {
  return <div>Current time: {new Date().toISOString()}</div>;
}
```

```typescript
// ✅ FIX: Client-only rendering with useEffect
'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toISOString());
  }, []);

  return <div>Current time: {time || 'Loading...'}</div>;
}
```

#### Scenario 3: Browser-Only APIs

```typescript
// ❌ CAUSES HYDRATION ERROR
'use client';

export default function Page() {
  const isClient = typeof window !== 'undefined';

  return <div>{isClient ? 'Client' : 'Server'}</div>;
  // Server renders "Server", client renders "Client" → mismatch!
}
```

```typescript
// ✅ FIX: Mount guard pattern
'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Now safe to use window, localStorage, etc.
  return <div>{window.location.href}</div>;
}
```

#### Scenario 4: suppressHydrationWarning (Escape Hatch)

```typescript
// ✅ Use sparingly for unavoidable mismatches
export default function Page() {
  return (
    <div suppressHydrationWarning>
      {new Date().toISOString()}
    </div>
  );
}
```

**Warning**: Only silences the warning, doesn't fix the mismatch. React won't patch the difference.

### Debugging Hydration Errors

Next.js 14+ provides detailed diffs in the console:

```
Warning: Text content did not match.
Server: "2024-01-15T10:30:00.000Z"
Client: "2024-01-15T10:30:01.234Z"
```

**Steps to debug**:
1. Check console for the exact mismatch
2. Search codebase for dynamic imports without `ssr: false`
3. Look for `typeof window !== 'undefined'` checks in render
4. Disable browser extensions to rule out interference
5. Use React DevTools to inspect component tree

---

## Pattern 7: Data Fetching Patterns

### Server-Side Fetching (Preferred)

```typescript
// ✅ app/account/[address]/page.tsx
import { createSolanaRpc } from '@solana/kit';

export default async function AccountPage({ params }) {
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);

  // Runs on server, not exposed to client
  const balance = await rpc.getBalance(params.address);

  return <div>Balance: {balance / 1e9} SOL</div>;
}
```

### Client-Side Fetching (When Needed)

```typescript
// ✅ app/components/LiveBalance.tsx
'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export default function LiveBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) return;

    const fetch = async () => {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9);
    };

    fetch();
    const interval = setInterval(fetch, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, [publicKey, connection]);

  return <div>Balance: {balance ?? '...'} SOL</div>;
}
```

### When to Use Each

| Pattern | Use When | Pros | Cons |
|---------|----------|------|------|
| Server-Side | Initial page load, SEO needed | Fast, secure RPC URLs | No real-time updates |
| Client-Side | Real-time data, user-specific | Interactive, polling | Exposes RPC endpoint |
| Hybrid | Both needed | Best of both worlds | More complexity |

---

## Pattern 8: Transaction Signing Pattern

### What

Transactions must be built and signed **client-side** with wallet adapter hooks.

### Implementation

```typescript
// ✅ app/components/SendSol.tsx
'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState } from 'react';

export default function SendSol() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = async () => {
    if (!publicKey) {
      alert('Connect wallet first');
      return;
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
      })
    );

    try {
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      alert(`Success: ${signature}`);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount (SOL)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleSend} disabled={!publicKey}>
        Send SOL
      </button>
    </div>
  );
}
```

### Key Points

- **Never sign transactions on the server** — wallets can't access private keys
- Use `sendTransaction` from wallet adapter (handles signing + sending)
- Always confirm transactions with `confirmTransaction`
- Handle errors gracefully (user rejection, insufficient funds, etc.)

---

## Pattern 9: Multiple RPC Endpoints (Advanced)

### What

Use multiple RPC providers for higher availability and reduced latency.

### Setup

```typescript
// ✅ lib/rpc-pool.ts
import { Connection } from '@solana/web3.js';

const endpoints = [
  process.env.SOLANA_RPC_PRIMARY!,
  process.env.SOLANA_RPC_SECONDARY!,
  process.env.SOLANA_RPC_TERTIARY!,
];

export function getConnection(): Connection {
  // Round-robin or random selection
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  return new Connection(endpoint, 'confirmed');
}
```

### Use Cases

- **Geographic distribution**: Faster queries from different regions
- **Load balancing**: Avoid rate limits
- **Fallback resilience**: If one RPC fails, try another

### Trade-offs

- Adds complexity to connection management
- Need to handle connection failures gracefully
- Some RPCs may be out of sync (use commitment levels wisely)

---

## Pattern 10: TypeScript Best Practices

### Strict Wallet Types

```typescript
// ✅ app/hooks/useWalletBalance.ts
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export function useWalletBalance(): number | null {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      const bal = await connection.getBalance(publicKey);
      if (!cancelled) {
        setBalance(bal / 1e9);
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  return balance;
}
```

### Type-Safe Transactions

```typescript
import { Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';

interface SendTokensParams {
  mint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
}

function buildTokenTransferTx({ mint, recipient, amount }: SendTokensParams): Transaction {
  // Type-safe transaction building
  const tx = new Transaction();
  // ...
  return tx;
}
```

---

## Anti-Patterns to Avoid

### ❌ Don't: Hardcode RPC URLs

```typescript
// ❌ BAD: URL exposed in client bundle
const connection = new Connection('https://api.mainnet-beta.solana.com');
```

```typescript
// ✅ GOOD: Environment variable
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
```

### ❌ Don't: Use SSR for Wallet Components

```typescript
// ❌ BAD: Will cause hydration errors
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Page() {
  return <WalletMultiButton />;
}
```

### ❌ Don't: Fetch Wallet Data on Server

```typescript
// ❌ BAD: Server doesn't have wallet context
export default async function Page() {
  const wallet = useWallet(); // Error: Hooks can't be used in Server Components
}
```

### ❌ Don't: Ignore Commitment Levels

```typescript
// ❌ BAD: May read stale data
const balance = await connection.getBalance(publicKey);

// ✅ GOOD: Explicit commitment
const balance = await connection.getBalance(publicKey, 'confirmed');
```

---

## Checklist for New Projects

- [ ] Scaffold with `create-solana-dapp` or manual setup
- [ ] Configure environment variables (`.env.local`, `.env.production`)
- [ ] Set up wallet provider in `app/providers.tsx` with `'use client'`
- [ ] Use dynamic imports for all wallet UI components (`ssr: false`)
- [ ] Implement server-side RPC calls for initial data
- [ ] Add client-side polling for real-time updates (if needed)
- [ ] Handle hydration errors with `useEffect` guards
- [ ] Test with multiple wallets (Phantom, Solflare, Backpack)
- [ ] Add error boundaries for transaction failures
- [ ] Configure TypeScript strict mode
- [ ] Set up commitment levels for RPC calls
- [ ] Test on both devnet and mainnet-beta
- [ ] Add loading states for async operations
- [ ] Implement transaction confirmation UI

---

## Common Errors and Solutions

### Error: "Hydration failed because the initial UI does not match"

**Cause**: Wallet component rendered server-side.

**Solution**: Use `dynamic(() => import('...'), { ssr: false })`.

---

### Error: "useWallet must be used within WalletProvider"

**Cause**: Missing wallet provider wrapper or used in Server Component.

**Solution**: Wrap app in `app/providers.tsx` and mark component with `'use client'`.

---

### Error: "window is not defined"

**Cause**: Browser API used during SSR.

**Solution**: Guard with `useEffect` or `isMounted` state.

---

### Error: "Failed to fetch account"

**Cause**: Invalid RPC endpoint or network mismatch.

**Solution**: Check `.env.local` variables and network selection (devnet vs mainnet).

---

## Resources

- **Official Docs**: [solana.com/docs/frontend/nextjs-solana](https://solana.com/docs/frontend/nextjs-solana)
- **Wallet Adapter**: [github.com/anza-xyz/wallet-adapter](https://github.com/anza-xyz/wallet-adapter)
- **Templates**: [github.com/solana-developers/solana-templates](https://github.com/solana-developers/solana-templates)
- **Next.js Hydration Guide**: [nextjs.org/docs/messages/react-hydration-error](https://nextjs.org/docs/messages/react-hydration-error)
- **create-solana-dapp**: [github.com/solana-developers/create-solana-dapp](https://github.com/solana-developers/create-solana-dapp)

---

## Summary

Building Next.js + Solana dApps requires understanding the boundary between server and client rendering:

1. **Use create-solana-dapp** for scaffolding (be aware of v2 changes)
2. **App Router is preferred**, but wallet components must be client-only
3. **Dynamic imports with `ssr: false`** for all wallet UI components
4. **Server Components for RPC calls**, client components for wallet interactions
5. **Environment variables** for RPC endpoints (`NEXT_PUBLIC_*` for client, no prefix for server)
6. **Hydration errors** are common — use `useEffect` guards and dynamic imports
7. **TypeScript strict mode** for type safety with wallet hooks
8. **Multiple RPC endpoints** for production resilience

The ecosystem is transitioning from `@solana/web3.js` v1 to `@solana/kit` v2, which is more modular but also more verbose. Plan accordingly based on your project timeline.
