---
pack: solana
topic: "Versioned Transactions & ALTs"
decision: "When do I need versioned transactions and Address Lookup Tables?"
confidence: 9/10
sources_checked: 28
last_updated: "2026-02-16"
---

# When do I need versioned transactions and Address Lookup Tables?

## The Transaction Size Problem

Solana transactions face a hard limit of **1232 bytes** for packet data (after headers from the 1280-byte IPv6 MTU). This constraint exists to ensure fast, reliable UDP transmission across the network.

**What eats up transaction space:**
- Each account address: 32 bytes
- Each signature: 64 bytes
- Instruction data and metadata

**Legacy transaction limits:**
- Maximum ~35 accounts per transaction
- Practically limited to 2-hop swaps on DEXs
- Complex DeFi operations often impossible in a single transaction

## What Are Versioned Transactions?

Introduced in **Epoch 358 (October 10, 2022)**, Solana now supports two transaction types:

1. **Legacy transactions** - Original format, no ALT support
2. **v0 (versioned) transactions** - Support Address Lookup Tables

Versioned transactions are backward compatible but unlock the ability to reference accounts through lookup tables rather than listing them explicitly.

## What Are Address Lookup Tables (ALTs)?

ALTs are on-chain accounts that store collections of addresses. Instead of including full 32-byte addresses in your transaction, you reference them by their 1-byte index in the lookup table.

**The compression math:**
- Without ALT: 32 bytes per address
- With ALT: 1 byte per address (31 bytes saved per account!)

**Account limits:**
- Legacy transactions: ~32 accounts
- v0 with one ALT: Up to 64 accounts
- v0 with multiple ALTs: 256+ accounts possible

Each ALT can store up to 256 addresses (0-255 index range).

## When You NEED Versioned Transactions & ALTs

### 1. **Multi-hop DeFi Operations**

**Jupiter Aggregator** is the canonical example:
- Pre-v0: Limited to 2-hop swaps in a single transaction
- Post-v0: 3+ hop routes possible atomically
- Jupiter maintains their own ALTs with common DEX accounts
- Complex routes (SOL → USDC → RAY → BONK) now fit in one transaction

**Real-world impact:** Jupiter announced versioned transaction support in January 2023, immediately enabling better prices through more complex routing.

### 2. **Complex Program Composition**

When your transaction needs to interact with:
- Multiple programs simultaneously
- Programs with many associated accounts (PDAs, mint accounts, vaults)
- Batch operations across multiple protocols

**Example use cases:**
- Atomic arbitrage across 3+ DEXs
- Liquidation bots accessing multiple lending protocols
- NFT batch operations (listing, delisting, transferring across collections)
- DAO governance multi-sig operations with many signers

### 3. **High-Account Smart Contracts**

If your program requires:
- 20+ accounts in a single instruction
- Multiple instructions with overlapping large account sets
- Gaming applications with many state accounts
- Social protocols with extensive graph connections

### 4. **Jito Bundle Integration**

Jito Bundles execute multiple transactions sequentially and atomically. Using versioned transactions within bundles allows:
- Each bundled transaction to access 64+ accounts
- Complex MEV strategies (sandwich attacks, arbitrage across many pools)
- Atomic DeFi operations with better capital efficiency

**Important:** Jito Bundles work with versioned transactions - they're complementary features, not alternatives.

## When You DON'T Need ALTs

You can skip ALTs if:
- Your transaction uses fewer than 25-30 accounts
- You're doing simple token transfers
- Single-hop swaps or basic DeFi operations
- The complexity overhead isn't worth the benefit

## ALT Lifecycle & Management

### 1. Creation

```typescript
// Creates a new ALT and returns its address
const [createInstruction, lookupTableAddress] =
  AddressLookupTableProgram.createLookupTable({
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    recentSlot: await connection.getSlot(),
  });
```

**Cost:** Rent-exempt minimum (varies by number of addresses stored)
- Base ALT account: ~0.00204 SOL
- Each address adds to rent requirement
- Typical ALT with 50 addresses: ~0.015 SOL

### 2. Extending (Adding Addresses)

```typescript
const extendInstruction = AddressLookupTableProgram.extendLookupTable({
  lookupTable: lookupTableAddress,
  authority: wallet.publicKey,
  payer: wallet.publicKey,
  addresses: [address1, address2, address3, ...],
});
```

**Limits:**
- Add ~20-30 addresses per transaction (varies by transaction size)
- Need multiple transactions for large ALTs
- Only the authority can extend

**Critical:** New addresses have a **warm-up period** - they can't be used until the next slot after being added.

### 3. The Warm-up Period

**Most common gotcha:** Newly created or extended ALTs aren't immediately usable.

- **Creation:** ALT is usable in the same slot for addresses added during creation
- **Extension:** New addresses require **1 slot** before use (~400-600ms)
- **Best practice:** Create/extend ALT, then wait for slot confirmation before using

```typescript
// WRONG - Will fail
const [createIx, lutAddress] = createLookupTable(...);
await sendTransaction([createIx, extendIx]);
// Immediately try to use ALT - FAILS!

// RIGHT - Wait for slot
const [createIx, lutAddress] = createLookupTable(...);
await sendTransaction([createIx]);
await connection.confirmTransaction(txSig);
// Wait for next slot
await new Promise(resolve => setTimeout(resolve, 500));
// Now use ALT in new transaction
```

### 4. Deactivation

Before closing an ALT, you must deactivate it:

```typescript
const deactivateInstruction = AddressLookupTableProgram.deactivateLookupTable({
  lookupTable: lookupTableAddress,
  authority: wallet.publicKey,
});
```

**Deactivation period:** ~512 slots (~5 minutes) before you can close
- Prevents in-flight transactions from failing
- During deactivation, ALT can still be read but not extended

### 5. Closing (Reclaiming Rent)

```typescript
const closeInstruction = AddressLookupTableProgram.closeLookupTable({
  lookupTable: lookupTableAddress,
  authority: wallet.publicKey,
  recipient: wallet.publicKey, // Receives rent back
});
```

**Important:** Can only close after full deactivation period (512 slots)

## Cost Analysis

### Creation & Maintenance Costs

| Operation | Cost | Notes |
|-----------|------|-------|
| Create base ALT | ~0.00204 SOL | Rent-exempt minimum |
| ALT with 50 addresses | ~0.015 SOL | Scales with address count |
| ALT with 200 addresses | ~0.05 SOL | Near maximum capacity |
| Extend (add addresses) | Transaction fee only | No additional rent if already funded |
| Deactivate | Transaction fee only | ~0.000005 SOL |
| Close | Transaction fee only | **Rent returned to recipient** |

### Break-even Analysis

**One-time operation:**
- Creating ALT just for a single complex transaction: Usually not worth it
- Exception: High-value MEV where transaction success is critical

**Repeated operations:**
- Protocol using same account set repeatedly: Absolutely worth it
- Jupiter, Raydium, Orca all maintain public ALTs for this reason
- User applications calling these protocols can reference their ALTs

**Shared ALTs:**
- Many protocols publish their ALTs for public use
- You can include Jupiter's ALTs in your transactions for free
- No need to create your own for common accounts

## Integration Patterns

### Pattern 1: Using Existing Protocol ALTs

```typescript
// Jupiter maintains public ALTs
const jupiterALT = new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");
const addressLookupTableAccounts = await connection
  .getAddressLookupTable(jupiterALT)
  .then(res => res.value);

const message = new TransactionMessage({
  payerKey: wallet.publicKey,
  recentBlockhash: blockhash,
  instructions: [swapInstruction],
}).compileToV0Message([addressLookupTableAccounts]);

const transaction = new VersionedTransaction(message);
```

**Advantage:** Zero setup cost, instant usability

### Pattern 2: Application-Specific ALT

For applications with consistent account sets:

1. Create ALT during app initialization
2. Store ALT address in app config
3. Reuse across all user transactions
4. Amortize creation cost over many transactions

### Pattern 3: Dynamic ALT Management

For variable account sets:

1. Maintain a pool of pre-warmed ALTs
2. Dynamically select based on transaction needs
3. Periodically refresh/extend as account sets change

## Real-World Examples

### Jupiter Swap Routing

**Before v0 transactions:**
- Route: SOL → USDC → BONK (2 hops)
- Required: 2 separate transactions
- User experience: Poor (2 approvals, risk of partial execution)

**After v0 + ALTs:**
- Route: SOL → USDC → RAY → BONK (3+ hops)
- Required: 1 atomic transaction
- Jupiter's ALT contains: All major DEX program IDs, common pool accounts
- Result: Better prices, better UX

### Complex DeFi Strategies

**Example: Leveraged yield farming**
1. Borrow from lending protocol (Solend)
2. Swap borrowed asset (Jupiter)
3. Deposit into yield farm (Saber/Orca)
4. Stake LP tokens (Quarry)

**Account requirements:**
- User accounts: 5
- Lending protocol: 8 accounts
- DEX swap: 10 accounts
- Yield farm: 8 accounts
- Staking: 6 accounts
- **Total: 37 accounts** - Impossible without ALTs

### NFT Marketplace Batch Operations

**Listing 10 NFTs simultaneously:**
- Each NFT listing: 8 accounts (mint, metadata, escrow, etc.)
- Without ALT: Impossible (80 accounts needed)
- With ALT: All NFT-related accounts in lookup table
- Result: Single transaction batch listing

## Common Pitfalls & Solutions

### Pitfall 1: Warm-up Period Violations

**Problem:** Using newly added addresses immediately

**Solution:** Always wait one slot after extending

```typescript
// Extend ALT
await sendTransaction(extendIx);
await waitForSlot(1); // Helper function to wait

// Now safe to use
const tx = buildTransactionWithALT(lutAddress);
```

### Pitfall 2: Authority Management

**Problem:** Losing control of ALT authority

**Solution:**
- Use a secure authority keypair (multisig for production)
- Consider freezing authority if ALT is immutable
- Document authority rotation procedures

### Pitfall 3: Stale ALT Addresses

**Problem:** Program accounts changed, ALT still references old addresses

**Solution:**
- Implement ALT health checks
- Version your ALTs (create new ones when account sets change)
- Monitor on-chain program upgrades that might change account structures

### Pitfall 4: Exceeding Compute Budget

**Problem:** Large transactions with ALTs still hit compute limits

**Solution:**
- ALTs solve size problems, not compute problems
- May still need compute budget instruction
- Consider splitting logic across multiple instructions

## Versioned Transactions in Practice

### Building a v0 Transaction

```typescript
import {
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';

// 1. Get ALT account
const lookupTableAccount = await connection
  .getAddressLookupTable(lutAddress)
  .then(res => res.value);

// 2. Build message with ALT
const message = TransactionMessage.compileToV0Message({
  payerKey: payer.publicKey,
  recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  instructions: instructions,
  addressLookupTableAccounts: [lookupTableAccount],
});

// 3. Create versioned transaction
const transaction = new VersionedTransaction(message);

// 4. Sign and send
transaction.sign([payer]);
await connection.sendTransaction(transaction);
```

### Wallet Support

As of 2026, all major Solana wallets support versioned transactions:
- Phantom ✅
- Solflare ✅
- Backpack ✅
- Glow ✅
- Ledger (hardware): Limited support

**Important:** Always check wallet capabilities before requiring v0 transactions in your app. Provide fallback to legacy transactions when possible.

## Decision Framework

**Use versioned transactions + ALTs when:**

✅ Transaction requires >30 accounts
✅ Multi-protocol composition (3+ programs)
✅ Repeated operations with consistent account sets
✅ Complex routing/arbitrage strategies
✅ Building protocol infrastructure (DEX, lending, etc.)
✅ Jito Bundle optimization for MEV

**Skip ALTs when:**

❌ Simple operations (<25 accounts)
❌ One-time complex transactions (not worth setup)
❌ Targeting users with limited wallet support
❌ Development/testing phase (add later if needed)

## Advanced: ALT + Jito Bundles

Jito Bundles allow atomic, sequential execution of multiple transactions. Combining with ALTs:

```typescript
// Each transaction in bundle can use ALTs
const bundle = [
  buildV0Transaction(setupInstructions, altAccounts),
  buildV0Transaction(swapInstructions, altAccounts),
  buildV0Transaction(stakeInstructions, altAccounts),
];

// Submit to Jito
await jitoClient.sendBundle(bundle);
```

**Use case:** Complex MEV strategies requiring many accounts across multiple atomic transactions.

## Performance Characteristics

**Transaction size reduction:**
- 20 accounts without ALT: ~640 bytes of addresses
- 20 accounts with ALT: ~20 bytes of indexes
- **Savings: ~620 bytes** (enough space for ~19 more accounts!)

**Lookup overhead:**
- Minimal: ~1-2µs per address lookup
- Negligible compared to signature verification (~100µs)
- ALTs improve efficiency, not just capacity

## Migration Guide

### Migrating from Legacy to v0

1. **Audit account usage:** Count max accounts in complex transactions
2. **Design ALT strategy:** Create tables for common account sets
3. **Update transaction building:** Switch to TransactionMessage.compileToV0Message
4. **Test thoroughly:** Warm-up periods are the most common issue
5. **Gradual rollout:** Support both legacy and v0 during transition
6. **Monitor wallet support:** Track user wallet capabilities

### Compatibility Layer

```typescript
async function buildTransaction(instructions, payer, connection) {
  const blockhash = await connection.getLatestBlockhash();

  // Try v0 with ALT if available
  if (shouldUseALT(instructions)) {
    const alt = await getOrCreateALT(instructions);
    return buildV0Transaction(instructions, alt, payer, blockhash);
  }

  // Fallback to legacy
  return buildLegacyTransaction(instructions, payer, blockhash);
}
```

## Key Takeaways

1. **Transaction size limit (1232 bytes) is the fundamental constraint** that ALTs solve
2. **v0 transactions + ALTs increase account limit from ~32 to 256+** through address compression
3. **Warm-up period (1 slot) is the most common gotcha** - always wait after extending ALTs
4. **Cost is negligible for repeated operations** (~0.015 SOL that's fully recoverable)
5. **All major protocols (Jupiter, Raydium, Orca) use ALTs** - you can reference their public tables
6. **Jito Bundles + ALTs** enable complex atomic MEV strategies
7. **Not always necessary** - simple operations don't need the complexity

## Further Reading

- [Solana Docs: Address Lookup Tables](https://solana.com/developers/guides/advanced/lookup-tables)
- [Solana Docs: Versioned Transactions Proposal](https://docs.solanalabs.com/proposals/versioned-transactions)
- [QuickNode: How to Use Lookup Tables](https://www.quicknode.com/guides/solana-development/accounts-and-data/how-to-use-lookup-tables-on-solana)
- [Jupiter Docs: Composing with Versioned Transactions](https://docs.jup.ag/docs/additional-topics/composing-with-versioned-transaction)
- [Jito Labs: Bundles Documentation](https://jito-labs.gitbook.io/mev/searcher-resources/bundles)

---

**Pro tip:** Start by using existing protocol ALTs (Jupiter, Raydium) before creating your own. Only invest in custom ALTs once you've validated that your application genuinely needs >30 accounts per transaction.