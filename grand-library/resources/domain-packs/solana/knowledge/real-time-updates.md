---
pack: solana
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# Real-Time On-Chain Data in Frontend Applications

## The Problem

Displaying fresh on-chain data in your frontend requires keeping state synchronized with the blockchain. Polling is simple but wasteful. WebSocket subscriptions are efficient but complex to manage. How do you handle connection drops, cache invalidation, and React component lifecycles without building everything from scratch?

## Core Patterns

### 1. WebSocket Account Subscriptions

Solana provides native WebSocket RPC methods for real-time updates. The key methods are:

- `accountNotifications(address, options)` - subscribe to account changes
- `onAccountChange(publicKey, callback, commitment)` - Web3.js 1.x wrapper
- `RpcSubscriptions` class - Solana Kit (Web3.js 2.x) approach

**Solana Kit (Web3.js 2.x) Pattern:**

```typescript
import { createSolanaRpcSubscriptions } from '@solana/kit';

const rpcSubscriptions = createSolanaRpcSubscriptions('wss://your-endpoint.com');

const accountAddress = 'YourPublicKey...';
const abortController = new AbortController();

// Subscribe to account changes
const subscription = await rpcSubscriptions
  .accountNotifications(accountAddress, { commitment: 'confirmed' })
  .subscribe({ abortSignal: abortController.signal });

try {
  for await (const notification of subscription) {
    console.log('Account updated:', notification.value.lamports);
    // Update your UI state here
  }
} catch (error) {
  console.error('Subscription error:', error);
} finally {
  abortController.abort(); // Cleanup on unmount
}
```

**Web3.js 1.x Pattern:**

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const accountToWatch = new PublicKey('Your...');

const subscriptionId = connection.onAccountChange(
  accountToWatch,
  (updatedAccountInfo, context) => {
    console.log('New balance:', updatedAccountInfo.lamports);
    // Update React state here
  },
  'confirmed'
);

// Cleanup
connection.removeAccountChangeListener(subscriptionId);
```

### 2. React Hook Patterns with SWR

For production apps, use SWR (stale-while-revalidate) or React Query to handle caching, revalidation, and deduplication automatically.

**Using SWR for Real-Time Balance:**

```typescript
import useSWR from 'swr';
import { Connection, PublicKey } from '@solana/web3.js';

const fetcher = async (url: string) => {
  const connection = new Connection(url);
  const publicKey = new PublicKey('Your...');
  const balance = await connection.getBalance(publicKey);
  return balance;
};

function BalanceDisplay() {
  const { data: balance, error, isLoading } = useSWR(
    'https://api.mainnet-beta.solana.com',
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading balance</div>;

  return <div>Balance: {balance / 1e9} SOL</div>;
}
```

**Combining WebSocket + SWR:**

```typescript
import useSWR from 'swr';
import { useEffect } from 'react';

function useAccountInfo(address: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/account/${address}`,
    fetcher,
    { revalidateOnFocus: false } // Disable polling
  );

  useEffect(() => {
    if (!address) return;

    const connection = new Connection(/* ... */);
    const subscriptionId = connection.onAccountChange(
      new PublicKey(address),
      (accountInfo) => {
        // Optimistic update: immediately refresh cache
        mutate(accountInfo, { revalidate: false });
      }
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [address, mutate]);

  return { data, error, isLoading };
}
```

### 3. Polling vs. Subscriptions Trade-offs

**When to use Polling:**
- Requests are random/infrequent (not worth a persistent connection)
- Simple balance checks every 10-30 seconds
- Low-stakes UI updates (dashboards, portfolio trackers)
- Development/prototyping (easier to debug)

**When to use WebSockets:**
- Real-time trading/DEX interfaces (latency matters)
- HFT/MEV applications (every millisecond counts)
- Live NFT mint monitoring
- Transaction confirmation tracking

**Hybrid Pattern:**
```typescript
// Use SWR with conditional refresh interval
const { data } = useSWR(key, fetcher, {
  refreshInterval: isUserActive ? 2000 : 30000, // Fast when active, slow when idle
  revalidateOnFocus: true
});
```

### 4. Connection Management in Browsers

WebSocket connections can drop. Handle reconnection gracefully:

```typescript
import { useEffect, useRef, useState } from 'react';

function useResilientSubscription(address: string) {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let subscriptionId: number;
    const connection = new Connection(/* ... */);

    const subscribe = async () => {
      try {
        subscriptionId = connection.onAccountChange(
          new PublicKey(address),
          (accountInfo) => {
            setIsConnected(true);
            // Handle update
          }
        );
      } catch (error) {
        setIsConnected(false);
        // Exponential backoff retry
        reconnectTimeoutRef.current = setTimeout(subscribe, 5000);
      }
    };

    subscribe();

    return () => {
      if (subscriptionId) {
        connection.removeAccountChangeListener(subscriptionId);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [address]);

  return { isConnected };
}
```

### 5. Optimistic UI Updates

Don't wait for blockchain confirmation to update the UI:

```typescript
async function transferSOL(to: string, amount: number) {
  // 1. Optimistically update UI
  setBalance(prev => prev - amount);
  setStatus('pending');

  try {
    // 2. Send transaction
    const signature = await connection.sendTransaction(transaction, [payer]);

    // 3. Confirm in background
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      // 4. Rollback on error
      setBalance(prev => prev + amount);
      setStatus('failed');
    } else {
      setStatus('confirmed');
    }
  } catch (error) {
    // Rollback on error
    setBalance(prev => prev + amount);
    setStatus('failed');
  }
}
```

### 6. Cache Invalidation Strategies

**Time-based invalidation (SWR):**
```typescript
useSWR(key, fetcher, {
  dedupingInterval: 2000, // Don't refetch if data < 2s old
  revalidateOnFocus: true, // Refetch when tab gains focus
  revalidateOnReconnect: true // Refetch when network reconnects
});
```

**Event-based invalidation:**
```typescript
import { mutate } from 'swr';

// After sending a transaction, invalidate related queries
await sendTransaction(/* ... */);
mutate('/api/balance'); // Force refresh balance
mutate('/api/transactions'); // Force refresh tx history
```

## Component Pattern: Real-Time Balance Card

Full example combining patterns:

```typescript
import { useEffect } from 'react';
import useSWR from 'swr';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

function BalanceCard({ address }: { address: string }) {
  const { data: balance, mutate } = useSWR(
    address ? `/balance/${address}` : null,
    async () => {
      const pubkey = new PublicKey(address);
      return await connection.getBalance(pubkey);
    },
    { refreshInterval: 10000 } // Fallback: poll every 10s
  );

  // Layer WebSocket on top of polling
  useEffect(() => {
    if (!address) return;

    const pubkey = new PublicKey(address);
    const subscriptionId = connection.onAccountChange(
      pubkey,
      (accountInfo) => {
        // Immediately update cache when WebSocket fires
        mutate(accountInfo.lamports, { revalidate: false });
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [address, mutate]);

  if (!balance) return <div>Loading...</div>;

  return (
    <div>
      <h3>Balance</h3>
      <p>{(balance / 1e9).toFixed(4)} SOL</p>
    </div>
  );
}
```

## Advanced: Yellowstone gRPC for High-Throughput

For mission-critical apps (HFT, indexers), native WebSockets are too slow. Use **Yellowstone Geyser gRPC** instead:

- **Dragon's Mouth gRPC**: Ultra-low latency (p90 ~5ms for slots vs. ~10ms for native WS)
- **Fumarole gRPC**: 100% data completeness, no missed slots
- **Whirligig WebSockets**: High-performance WebSocket proxy on top of gRPC

This requires a specialized RPC provider (e.g., Triton, Helius, QuickNode with Yellowstone enabled).

## Tools & Providers

**RPC Providers with WebSocket support:**
- QuickNode (includes WebSocket + Yellowstone gRPC options)
- Helius (Yellowstone gRPC, ChainStream API)
- Syndica (ChainStream API for real-time streaming)
- Triton One (Yellowstone stack: Dragon's Mouth, Whirligig)

**Alternative to WebSockets:**
- **Streams** (QuickNode/Helius): Managed solution, routes data to webhooks/destinations
- **Polling with SWR**: Simplest, good enough for most dApps

## Common Pitfalls

1. **Forgetting to unsubscribe**: Always return cleanup function in `useEffect`
2. **Creating subscriptions on every render**: Wrap in `useEffect` with dependency array
3. **Not handling reconnection**: WebSocket can drop; implement retry logic
4. **Overloading RPC with subscriptions**: Billing is per-response, not per-subscription
5. **Using `revalidateOnMount: true` with SWR**: Causes redundant fetches; use WebSocket + `mutate()` instead

## React Native Considerations

For mobile apps using React Native, WebSocket behavior is the same, but:

- Use `@solana/web3.js` with proper polyfills (`react-native-get-random-values`, `@craftzdog/react-native-buffer`)
- SWR works identically in React Native
- Test on real devices, not just emulators (WebSocket timing differences)

## Next Steps

- Start with **SWR + polling** for MVP (simplest, lowest latency to production)
- Add **WebSocket subscriptions** when you need sub-second updates
- Consider **Yellowstone gRPC** if you're building HFT/indexers
- Use **Streams** (managed) if you need to route data to multiple backends
