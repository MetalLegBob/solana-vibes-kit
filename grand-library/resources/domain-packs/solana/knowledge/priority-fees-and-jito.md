---
pack: solana
topic: "Priority Fees & Jito Tips"
decision: "How do I handle priority fees and Jito tips?"
confidence: 9/10
sources_checked: 28
last_updated: "2026-02-16"
---

# Priority Fees & Jito Tips

## The Two Paths to Transaction Priority

On Solana, you have two mechanisms for getting transactions included during congestion:

1. **Priority fees** - Native Solana mechanism, paid per compute unit
2. **Jito tips** - MEV infrastructure that bundles transactions with tips to validators

**Reality check:** As of early 2025, Jito represents over 60% of priority fee volume on Solana. It's not a niche tool anymore—it's mainstream infrastructure for transaction reliability.

---

## Priority Fees: Per-CU Pricing

### How It Works

Priority fees use a **per-compute-unit pricing model**:

```
Prioritization fee = CU limit × CU price (in micro-lamports)
Total fee = Base fee (5000 lamports) + Prioritization fee
```

**Example:**
- Transaction uses 200,000 compute units
- You set CU price at 100,000 micro-lamports/CU
- Priority fee = 200,000 × 100,000 / 1,000,000 = 20,000 lamports (0.00002 SOL)
- At $100/SOL, that's $0.002

### Real Fee Data (Early 2025)

From live network data:

| Condition | Low | Medium | High |
|-----------|-----|--------|------|
| **Normal** | 61,328 μL/CU | 140,000 μL/CU | 281,174 μL/CU |
| **Congestion** | 500,000 μL/CU | 1,500,000 μL/CU | 5,000,000+ μL/CU |

**Translation:** During normal times, most transactions pay $0.0005-0.002. During congestion (memecoin launches, airdrops), fees can spike to $0.01-0.05+ per transaction.

### Local Fee Markets

Solana uses **account-level priority queues**. Transactions competing for the same account (e.g., a hot DEX pool) bid against each other. This means:

- ✅ You can pay low fees for isolated operations
- ❌ High-demand accounts (Raydium pools, token programs) require competitive fees
- 🎯 Strategy: Estimate fees *per account*, not globally

---

## Fee Estimation APIs

### getRecentPrioritizationFees (RPC)

Native Solana method that returns recent fee data:

```javascript
const fees = await connection.getRecentPrioritizationFees({
  lockedWritableAccounts: ['CxELquR1gPP8...'], // Target account
});

// Returns array: [{ slot: 348125, prioritizationFee: 1234 }, ...]
// Calculate 50th, 75th, 90th percentiles for strategy
```

**Use it for:**
- Account-specific fee estimation
- Understanding recent congestion
- Building dynamic fee strategies

**Limitation:** Shows what *happened*, not what's needed *now*. Caches ~150 blocks of data.

### Helius Priority Fee API

Higher-level API that recommends fees based on priority level:

```javascript
// Request
POST https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
{
  "jsonrpc": "2.0",
  "method": "getPriorityFeeEstimate",
  "params": [{
    "accountKeys": ["JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"],
    "options": { "priority_level": "High" }
  }]
}

// Response includes recommended micro-lamports/CU
```

**Priority levels:**
- `Low` - Budget-conscious, may wait longer
- `Medium` - Balanced, works for most use cases
- `High` - Time-sensitive, higher success rate
- `VeryHigh` - Emergency, maximum priority

---

## Jito Bundles: Atomic Transaction Execution

### What Are Jito Bundles?

Bundles are **groups of transactions** with three guarantees:

1. **Sequential** - Execute in exact order you specify
2. **Atomic** - All-or-nothing (one fails = all fail)
3. **Same slot** - Never split across blocks

### When to Use Bundles

| Use Case | Why Bundle? |
|----------|-------------|
| **Arbitrage** | Execute buy → sell atomically |
| **Multi-step swaps** | Wrap SOL → swap → unwrap in one shot |
| **NFT sniping** | Approve + transfer without race conditions |
| **Coordinated actions** | Multiple wallets acting together |

### Jito Tip Mechanism

Bundles include a **tip transaction** sent to a Jito tip account. Validators running Jito-Solana prioritize bundles by tip amount.

**Tip accounts (rotate by epoch):**
```
96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5
HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe
Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY
... (8 total)
```

### Real Jito Tip Data

**Tip ranges and success rates (2025 data):**

| Strategy | Tip Amount (SOL) | Success Rate | Use Case |
|----------|------------------|--------------|----------|
| Conservative | 0.005-0.01 | ~60% | Low-value, can retry |
| Balanced | 0.02-0.05 | ~80% | Standard MEV operations |
| Aggressive | 0.1+ | ~95% | High-value arbitrage |

**Real-world observation:** Average Jito tip is ~0.01 SOL ($1 at $100/SOL). During high volatility, average tips increase but *event count stays the same*—existing users just pay more.

**Bundle pricing formula:**
```
Expected value > Tip + Gas costs

// Example: $100 arbitrage opportunity
// Tip: 0.02 SOL ($2) + Gas: 0.00005 SOL ($0.005)
// Profit: $97.995 ✅
```

### Bundle Submission Flow

```javascript
import { searcherClient } from 'jito-ts/sdk/block-engine/searcher';

// 1. Create transactions
const tx1 = new Transaction().add(/* instructions */);
const tx2 = new Transaction().add(/* instructions */);

// 2. Add tip to last transaction
const tipAccount = "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5";
const tipAmount = 0.01 * LAMPORTS_PER_SOL;

tx2.add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(tipAccount),
    lamports: tipAmount,
  })
);

// 3. Sign all transactions
const signedTxs = [
  await wallet.signTransaction(tx1),
  await wallet.signTransaction(tx2),
];

// 4. Send bundle to Jito Block Engine
const bundleId = await searcher.sendBundle(signedTxs);
```

**Critical:** Bundles only work when a Jito-Solana validator is the leader (~80-85% of slots as of 2025). Check leader schedule before sending.

---

## Dynamic Fee Strategies

### Strategy 1: Percentile-Based Estimation

```javascript
async function estimateFee(connection, accounts, percentile = 75) {
  const fees = await connection.getRecentPrioritizationFees({
    lockedWritableAccounts: accounts,
  });

  const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (percentile / 100));

  return sorted[index];
}

// Usage
const fee = await estimateFee(connection, [dexPoolAddress], 75);
// Use 75th percentile for moderate priority
```

### Strategy 2: Adaptive Fee Bumping

```javascript
async function sendWithRetry(tx, maxRetries = 3) {
  let cuPrice = 100000; // Start at 100k micro-lamports

  for (let i = 0; i < maxRetries; i++) {
    tx.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice })
    );

    try {
      const sig = await connection.sendTransaction(tx);
      await connection.confirmTransaction(sig, 'confirmed');
      return sig;
    } catch (e) {
      cuPrice *= 2; // Double fee on failure
      console.log(`Retry ${i+1} with ${cuPrice} μL/CU`);
    }
  }
  throw new Error('Failed after retries');
}
```

### Strategy 3: Hybrid (Priority Fee + Jito Bundle)

For maximum reliability:

```javascript
// Set high priority fee on individual transactions
tx.instructions.unshift(
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
);

// Then wrap in Jito bundle with tip
const bundle = [tx, tipTx];
await searcher.sendBundle(bundle);
```

**Why this works:** You compete in *both* queues. If Jito leader is active, bundle gets priority. If not, high priority fee works on regular validators.

---

## Transaction Landing Optimization

### Success Rate by Approach (2025 Benchmarks)

| Method | Normal Conditions | Congestion | Notes |
|--------|-------------------|------------|-------|
| **No priority fee** | 95%+ | 30-50% | Fails during any spike |
| **Static priority fee** | 97% | 60-70% | Overpays or underpays |
| **Dynamic fees (75th %ile)** | 98% | 80-85% | Good balance |
| **Jito bundle (0.02 SOL)** | 99% | 85-90% | Only works on Jito leaders |
| **Hybrid (priority + Jito)** | 99%+ | 95%+ | Best reliability, highest cost |

### Compute Unit Optimization

**Don't overpay by requesting too many CUs:**

```javascript
// 1. Simulate transaction to get actual CU usage
const simulation = await connection.simulateTransaction(tx);
const actualCUs = simulation.value.unitsConsumed;

// 2. Set limit slightly above actual (add 10% buffer)
const cuLimit = Math.ceil(actualCUs * 1.1);

tx.instructions.unshift(
  ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit })
);

// 3. Now your priority fee is efficient
// Fee = cuLimit × cuPrice (not max 1.4M × cuPrice)
```

**Real impact:** Default CU limit is 200k for simple transfers, 1.4M for compute. If your swap uses 80k CUs but you don't set a limit, you pay for 200k.

---

## Common Pitfalls

### 1. Using Global Fees for Hot Accounts

❌ **Wrong:**
```javascript
// Global average: 100k μL/CU
// Your tx: Raydium SOL/USDC pool (high contention)
// Result: Dropped, others paying 1M+ μL/CU
```

✅ **Right:**
```javascript
const poolFees = await getRecentPrioritizationFees({
  lockedWritableAccounts: [raydiumPoolAddress]
});
// Use 75th-90th percentile of pool-specific fees
```

### 2. Forgetting to Check Jito Leader Schedule

Jito bundles only work on Jito validators. If a non-Jito validator is leader:
- Bundle gets rejected
- No fallback

**Solution:** Check leader schedule or use hybrid approach.

### 3. Overpaying with Huge CU Limits

```javascript
// You pay: 1,400,000 CU × 500k μL = 700k lamports (0.0007 SOL)
// You needed: 80,000 CU × 500k μL = 40k lamports (0.00004 SOL)
// Waste: 17.5× overpayment
```

Always simulate first, then set precise CU limits.

### 4. Static Fees During Volatility

Network conditions change every slot. Fees estimated 5 minutes ago may be 10× too low now.

**Solution:** Re-estimate fees right before submission, or use a fee API.

---

## Advanced: Bundle vs Regular Transaction Decision Tree

```
Is transaction time-sensitive?
├─ No → Use low priority fee, accept 2-5s confirmation
└─ Yes → Needs confirmation within 1-2 slots
    │
    ├─ Is it multi-step and atomicity matters?
    │   └─ Yes → Use Jito bundle
    │
    ├─ Is MEV a risk (e.g., DEX trade)?
    │   └─ Yes → Use Jito bundle (prevents frontrunning)
    │
    └─ Single transaction, just needs speed?
        └─ Use high priority fee (cheaper than bundle tip)
```

---

## Code Example: Complete Implementation

```javascript
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { ComputeBudgetProgram } from '@solana/web3.js';

async function sendOptimizedTransaction(
  connection: Connection,
  tx: Transaction,
  targetAccounts: string[],
  priorityLevel: 'medium' | 'high' = 'medium'
) {
  // 1. Simulate to get actual CU usage
  const simulation = await connection.simulateTransaction(tx);
  const cuUsed = simulation.value.unitsConsumed || 200000;
  const cuLimit = Math.ceil(cuUsed * 1.2); // 20% buffer

  // 2. Get recent fees for target accounts
  const recentFees = await connection.getRecentPrioritizationFees({
    lockedWritableAccounts: targetAccounts.map(a => new PublicKey(a))
  });

  // 3. Calculate percentile (50th = medium, 75th = high)
  const percentile = priorityLevel === 'high' ? 0.75 : 0.50;
  const sorted = recentFees
    .map(f => f.prioritizationFee)
    .sort((a, b) => a - b);
  const feeEstimate = sorted[Math.floor(sorted.length * percentile)];

  // Add 20% buffer to fee estimate
  const cuPrice = Math.ceil(feeEstimate * 1.2);

  // 4. Add compute budget instructions
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice })
  );

  // 5. Send and confirm
  const signature = await connection.sendTransaction(tx, {
    skipPreflight: false, // Simulate first
    maxRetries: 3,
  });

  const confirmation = await connection.confirmTransaction(
    signature,
    'confirmed'
  );

  return { signature, cuUsed, cuPrice, totalFee: cuLimit * cuPrice / 1e6 };
}

// Usage
const result = await sendOptimizedTransaction(
  connection,
  swapTransaction,
  ['JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'], // Jupiter program
  'high'
);

console.log(`Tx confirmed: ${result.signature}`);
console.log(`Priority fee paid: ${result.totalFee} lamports`);
```

---

## Key Takeaways

1. **Priority fees use per-CU pricing** - Optimize CU limits to avoid overpaying
2. **Local fee markets matter** - Estimate fees per account, not globally
3. **Real median fees: 61k-140k μL/CU (normal), 500k-5M+ μL/CU (congestion)**
4. **Jito tips: 0.01-0.05 SOL gets 60-80% success, 0.1+ SOL gets 95%+**
5. **Jito now handles 60%+ of priority volume** - It's mainstream, not niche
6. **Bundles guarantee atomicity** - Use for MEV, multi-step ops, anti-frontrunning
7. **Hybrid approach (priority + Jito) gives 95%+ success** during congestion
8. **Always simulate transactions** to get accurate CU usage before setting limits

**Bottom line:** Don't guess. Estimate fees dynamically based on recent data for your specific accounts, set precise CU limits, and choose Jito bundles when atomicity or MEV protection matters. During congestion, be ready to pay 10-50× normal fees or wait.

---

## References

- Helius Priority Fee API: https://www.helius.dev/docs/priority-fee-api
- Jito Bundle Documentation: https://jito-labs.gitbook.io/mev/searcher-resources/bundles
- QuickNode Jito Guide: https://www.quicknode.com/guides/solana-development/transactions/jito-bundles
- Solana Fee Mechanics: https://solana.com/developers/guides/advanced/how-to-use-priority-fees
- Pine Analytics Jito Report: https://pineanalytics.substack.com/p/jitos-role-in-solana-deep-dive
- Chorus One Latency Analysis: https://chorus.one/reports-research/transaction-latency-on-solana
