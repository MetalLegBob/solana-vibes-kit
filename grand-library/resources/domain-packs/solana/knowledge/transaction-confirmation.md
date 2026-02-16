---
pack: solana
topic: "Transaction Confirmation"
decision: "How do I reliably confirm transactions on Solana?"
confidence: 9/10
sources_checked: 24
last_updated: "2026-02-16"
---

# How do I reliably confirm transactions on Solana?

Reliably confirming Solana transactions requires understanding commitment levels, blockhash lifecycle, retry strategies, and proper error handling. Unlike Ethereum's nonce-based system, Solana uses recent blockhashes for transaction uniqueness and expiry, creating unique challenges for transaction confirmation.

## Commitment Levels: Balancing Speed vs Certainty

Solana offers three commitment levels that balance latency against finality guarantees:

### Processed
- **What it means**: Transaction is in a block (nothing more)
- **Latency**: Lowest (~400ms)
- **Risk**: Can be rolled back; may be part of a fork
- **Use case**: UI updates, real-time price feeds where you'll re-check confirmation

### Confirmed
- **What it means**: Block has supermajority validator votes (~66% stake)
- **Latency**: ~2-5 seconds behind processed
- **Risk**: Very low rollback probability (<0.01% under normal conditions)
- **Use case**: Most production applications; recommended default

### Finalized
- **What it means**: Confirmed block + 31 additional confirmed blocks on top
- **Latency**: ~13 seconds behind confirmed (~32 slots × ~400ms)
- **Risk**: Irreversible; guaranteed finality
- **Use case**: High-value transfers, bridge operations, exchange deposits

**Production pattern**: Use `confirmed` for blockhash fetching (extends validity window by ~13s vs finalized) and transaction confirmation monitoring. Only use `finalized` when irreversibility is critical.

## Blockhash Lifecycle and Expiry

### The 150-Block Window

Every transaction must reference a recent blockhash. The network only accepts transactions using blockhashes from the most recent 151 blocks:

- **Time window**: ~60-90 seconds (150 blocks × ~400ms avg slot time)
- **Validity check**: Transactions expire when `currentBlockHeight > lastValidBlockHeight`
- **Critical number**: `lastValidBlockHeight` (not just the blockhash itself)

### Production Blockhash Strategy

```typescript
// GOOD: Fetch blockhash with confirmed commitment
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

// Build and sign transaction
const tx = new Transaction({ recentBlockhash: blockhash, feePayer });
// ... add instructions ...
tx.sign(keypair);

// Send with custom retry logic
const signature = await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: false,
  maxRetries: 0, // Control retries yourself
});

// Monitor until expiry
let blockHeight = await connection.getBlockHeight('confirmed');
while (blockHeight <= lastValidBlockHeight) {
  const status = await connection.getSignatureStatus(signature);

  if (status?.value?.confirmationStatus === 'confirmed') {
    return signature; // Success!
  }

  if (status?.value?.err) {
    throw new Error('Transaction failed'); // Don't retry on execution errors
  }

  await sleep(2000); // Poll every 2s
  blockHeight = await connection.getBlockHeight('confirmed');
}

throw new Error('Transaction expired'); // Blockhash expired
```

**Key insight**: Track `lastValidBlockHeight`, not elapsed time. Network speed varies; block height doesn't lie.

## Retry Strategies: When and How

### The RPC Node Default Behavior

By default, RPC nodes:
- Rebroadcast transactions every 2 seconds
- Continue until transaction finalizes OR blockhash expires (~80s)
- Stop if their rebroadcast queue exceeds 10,000 transactions (drops new submissions)

### Custom Retry Logic (Production-Tested)

**When to implement custom retries**:
- Network congestion (>1000 TPS)
- Time-sensitive operations (arbitrage, liquidations)
- Need for priority fee adjustment mid-flight

**Two proven approaches**:

#### 1. Constant Interval (Mango Markets Pattern)
```typescript
const RETRY_INTERVAL = 2000; // 2s, same as RPC default
const MAX_RETRIES = 40; // ~80s total

for (let i = 0; i < MAX_RETRIES; i++) {
  const status = await connection.getSignatureStatus(signature);
  if (status?.value?.confirmationStatus) return status;

  // Re-send same transaction
  await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true, // Already validated
    maxRetries: 0,
  });

  await sleep(RETRY_INTERVAL);
}
```

#### 2. Exponential Backoff with Blockhash Refresh
```typescript
let retries = 0;
let currentBlockhash = blockhash;
let currentValidHeight = lastValidBlockHeight;

while (retries < MAX_RETRIES) {
  const blockHeight = await connection.getBlockHeight('confirmed');

  // Blockhash expired - refresh and re-sign
  if (blockHeight > currentValidHeight) {
    const { blockhash: newBlockhash, lastValidBlockHeight: newHeight } =
      await connection.getLatestBlockhash('confirmed');

    currentBlockhash = newBlockhash;
    currentValidHeight = newHeight;

    // Re-sign with new blockhash
    tx.recentBlockhash = currentBlockhash;
    tx.sign(keypair);
  }

  await connection.sendRawTransaction(tx.serialize(), { maxRetries: 0 });

  const delay = Math.min(1000 * Math.pow(2, retries), 8000);
  await sleep(delay);
  retries++;
}
```

**Critical rule**: Only re-sign when blockhash expires. Otherwise, both old and new transactions can land, causing duplicate execution.

## sendTransaction Options: Preflight and Retries

### Key Parameters

```typescript
connection.sendTransaction(transaction, signers, {
  skipPreflight: false,           // Simulate before sending?
  preflightCommitment: 'confirmed', // Bank slot for simulation
  maxRetries: 0,                  // RPC node retry limit
});
```

### skipPreflight Decision Matrix

| Use Case | skipPreflight | Why |
|----------|---------------|-----|
| **Default/Recommended** | `false` | Catches errors before broadcasting; prevents dropped txs from misconfiguration |
| **Ultra-low latency** | `true` | Saves ~200-500ms; use only if you're pre-simulating yourself |
| **High priority fees** | `true` | You want it to land ASAP, even if it might fail |
| **Idempotent operations** | `false` | Safe to fail; catch errors early |

**Production rule**: Set `skipPreflight: false` unless you have <500ms latency requirements. The network will drop misconfigured transactions anyway, wasting your time and priority fees.

### preflightCommitment Best Practice

**Always match your blockhash commitment**:
```typescript
const { blockhash } = await connection.getLatestBlockhash('confirmed');
// ... build tx ...

await connection.sendTransaction(tx, signers, {
  preflightCommitment: 'confirmed', // Must match blockhash commitment!
});
```

Mismatched commitments cause simulation against wrong bank state, leading to false preflight failures.

## WebSocket Subscriptions: Real-Time Monitoring

### Why WebSockets Over Polling

- **Latency**: 100-200ms notification vs 2000ms+ polling interval
- **Efficiency**: Single subscription vs repeated REST calls
- **Guaranteed notification**: Auto-unsubscribes after first result

### Production Implementation

```typescript
const subscriptionId = connection.onSignature(
  signature,
  (result, context) => {
    if (result.err) {
      console.error('Transaction failed:', result.err);
    } else {
      console.log('Confirmed at slot:', context.slot);
    }
    // Automatically unsubscribed after this callback
  },
  'confirmed', // Commitment level
);

// Fallback: Poll getSignatureStatus in case WebSocket drops
const timeout = setTimeout(async () => {
  const status = await connection.getSignatureStatus(signature);
  // ... handle status ...
}, 30000);
```

### WebSocket Connection Health

**Critical**: RPC nodes have 10-minute inactivity timers. Send pings every 60s:

```typescript
const ws = new WebSocket(RPC_WS_URL);
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping();
  }
}, 60000);

ws.on('close', () => clearInterval(pingInterval));
```

### enableReceivedNotification

Most RPC providers support `enableReceivedNotification: true` for instant feedback when the node receives your transaction (before processing):

```typescript
connection.onSignature(
  signature,
  callback,
  { commitment: 'confirmed', enableReceivedNotification: true }
);
```

Useful for UX ("Transaction received...") but doesn't guarantee inclusion.

## Durable Nonces: Offline Signing and No-Expiry Transactions

### The Problem Durable Nonces Solve

Standard transactions expire in ~60-90s. This breaks:
- Multi-sig workflows (proposal → review → approval)
- Cold wallet signing (air-gapped devices)
- Regulatory approval flows (hours/days)

### How Durable Nonces Work

Instead of a recent blockhash, use a nonce account's stored value:

1. **Create nonce account**: Stores a 32-byte nonce value (no expiry)
2. **Build transaction**: Reference nonce value instead of blockhash
3. **First instruction**: `advanceNonceAccount` (prevents replay attacks)
4. **Sign offline**: Take hours/days; nonce doesn't expire
5. **Submit**: Nonce advances after successful execution

### Production Example

```typescript
// 1. Create nonce account (one-time setup)
const nonceAccount = Keypair.generate();
const tx = SystemProgram.createNonceAccount({
  fromPubkey: payer.publicKey,
  noncePubkey: nonceAccount.publicKey,
  authorizedPubkey: authority.publicKey,
  lamports: await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH),
});

// 2. Get current nonce value
const accountInfo = await connection.getAccountInfo(nonceAccount.publicKey);
const nonceData = NonceAccount.fromAccountData(accountInfo.data);
const nonce = nonceData.nonce;

// 3. Build transaction with nonce
const tx = new Transaction();
tx.recentBlockhash = nonce; // Use nonce instead of blockhash!

tx.add(
  SystemProgram.nonceAdvance({
    noncePubkey: nonceAccount.publicKey,
    authorizedPubkey: authority.publicKey,
  })
);

// ... add your instructions ...

tx.add(
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient,
    lamports: amount,
  })
);

// 4. Sign offline (take as long as needed)
tx.sign(authority, payer);

// 5. Submit (hours/days later)
await connection.sendRawTransaction(tx.serialize());
```

### Nonce Account Rent

Nonce accounts require rent (~0.0015 SOL). They're not free, but they're reusable. Close them when done to reclaim rent.

### Nonce Limitations

- **Advance required**: First instruction must be `nonceAdvance` (prevents replay)
- **Single use per value**: After execution, nonce changes
- **Authority control**: Only nonce authority can advance it
- **Not for high-frequency**: Adds instruction overhead; use for slow/offline signing only

## Common Failure Modes and Mitigation

### 1. Blockhash Expiry (`TransactionExpiredBlockheightExceededError`)

**Cause**: Network processed `lastValidBlockHeight` without confirming your transaction.

**Mitigation**:
- Fetch blockhash with `confirmed` commitment (longer window)
- Implement retry logic with blockhash refresh
- Increase priority fees during congestion

### 2. Dropped Transactions (No Fee Charged)

**Cause**:
- RPC node rebroadcast queue >10,000 transactions
- Network fork discarded your block
- Leader didn't receive transaction

**Mitigation**:
- Use premium RPC with dedicated TPU connections (Triton, Helius)
- Set `maxRetries: 0` and implement custom rebroadcast
- Monitor with WebSocket + polling fallback

### 3. Failed Transactions (Fee Charged)

**Cause**: Execution error (insufficient balance, account locked, program error)

**Mitigation**:
- Keep `skipPreflight: false` to catch errors pre-flight
- Check account balances before submitting
- Simulate with `connection.simulateTransaction()` for complex logic
- **Never retry execution errors** without fixing the issue

### 4. Account Write-Locked

**Cause**: Another transaction is currently writing to the same account.

**Mitigation**:
- Use `getSignatureStatuses` with `searchTransactionHistory: true`
- Implement exponential backoff (500ms → 1s → 2s)
- Avoid parallel writes to same account

### 5. Network Congestion (High TPS)

**Cause**: Validator capacity exceeded; incoming txs > processing capacity.

**Mitigation**:
- **Priority fees**: Bid for block space (use recent `getRecentPrioritizationFees`)
- **Custom retries**: Constant interval (Mango pattern) during congestion
- **Jito bundles**: Atomic multi-transaction execution via MEV
- **Staked connections**: Helius/Triton offer TPU access for staked customers

## Production Checklist

- [ ] Fetch blockhash with `confirmed` commitment
- [ ] Store `lastValidBlockHeight`, not just blockhash
- [ ] Set `maxRetries: 0` and implement custom retry logic
- [ ] Use `skipPreflight: false` unless <500ms latency required
- [ ] Match `preflightCommitment` to blockhash commitment
- [ ] Monitor with `onSignature` WebSocket + polling fallback
- [ ] Implement 60s WebSocket pings for connection health
- [ ] Track `currentBlockHeight` to detect expiry
- [ ] Refresh blockhash and re-sign only after expiry
- [ ] Never retry transactions with execution errors
- [ ] Add priority fees during congestion (check `getRecentPrioritizationFees`)
- [ ] Use durable nonces for multi-sig/offline signing workflows
- [ ] Log transaction signatures for post-mortem analysis
- [ ] Test with devnet congestion (use stress testing tools)

## Real Numbers to Remember

- **Blockhash validity**: 151 blocks (~60-90 seconds)
- **Slot time**: ~400ms average
- **Finalization lag**: 32 slots (~13 seconds behind confirmed)
- **RPC rebroadcast**: Every 2 seconds
- **RPC queue limit**: 10,000 transactions
- **WebSocket timeout**: 10 minutes inactivity
- **Confirmed rollback**: <0.01% probability
- **Nonce account rent**: ~0.0015 SOL

## Advanced: Jito MEV and Bundle Submission

For atomic multi-transaction execution or guaranteed ordering:

```typescript
const bundle = new Bundle([tx1, tx2, tx3], 5); // 5 slots validity
const bundleId = await jito.sendBundle(bundle);
```

Jito bundles bypass mempool, execute atomically, and pay only on inclusion. Use for:
- Multi-step DeFi operations
- MEV protection
- Guaranteed transaction ordering

Requires Jito RPC and additional priority fees.

---

## Sources

- [Retrying Transactions | Solana](https://solana.com/developers/guides/advanced/retry)
- [Transaction Confirmation & Expiration | Solana](https://solana.com/developers/guides/advanced/confirmation)
- [What are Solana Commitment Levels? | Helius](https://www.helius.dev/blog/solana-commitment-levels)
- [Solana Commitment Status | Solana Validator](https://docs.solanalabs.com/consensus/commitments)
- [How to Land Transactions on Solana | Helius](https://www.helius.dev/blog/how-to-land-transactions-on-solana)
- [Comprehensive Guide to Optimizing Solana Transactions | QuickNode](https://www.quicknode.com/guides/solana-development/transactions/how-to-optimize-solana-transactions)
- [Solana Transaction Optimization Guide | Helius](https://www.helius.dev/docs/sending-transactions/optimizing-transactions)
- [How to Deal with Blockhash Errors on Solana | Helius](https://www.helius.dev/blog/how-to-deal-with-blockhash-errors-on-solana)
- [Solana: How to handle the transaction expiry error | Chainstack](https://docs.chainstack.com/docs/solana-how-to-handle-the-transaction-expiry-error)
- [sendTransaction RPC Method | Solana](https://solana.com/docs/rpc/http/sendtransaction)
- [signatureSubscribe RPC Method | Solana](https://solana.com/docs/rpc/websocket/signaturesubscribe)
- [How to Create Solana WebSocket Subscriptions | QuickNode](https://www.quicknode.com/guides/solana-development/getting-started/how-to-create-websocket-subscriptions-to-solana-blockchain-using-typescript)
- [Solana Transaction Propagation - Handling Dropped Transactions | QuickNode](https://www.quicknode.com/guides/solana-development/transactions/solana-transaction-propagation-handling-dropped-transactions)
- [Durable & Offline Transaction Signing using Nonces | Solana](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces)
- [How to Send Offline Transactions on Solana using Durable Nonce | QuickNode](https://www.quicknode.com/guides/solana-development/transactions/how-to-send-offline-tx)
- [Solana Durable Nonces: Advanced Transaction Management | Chainary](https://www.chainary.net/articles/solana-durable-nonces-advanced-transaction-management-offline-signing)
- [Solana Transaction Confirmation | Blockhash, Commitment levels | Omniatech](https://omniatech.io/pages/solana-transaction-confirmation/)
- [Solana: What is the right transaction commitment level? | Chainstack](https://chainstack.com/solana-transaction-commitment-levels/)
- [Solana Error Code Reference | QuickNode](https://www.quicknode.com/docs/solana/error-references)
- [How to Debug Failed Transactions on Solana | Uniblock](https://www.uniblock.dev/blog/how-to-debug-failed-transactions-on-solana)
