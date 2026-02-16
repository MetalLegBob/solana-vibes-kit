---
pack: solana
topic: "Transaction Simulation"
decision: "How do I simulate transactions before sending?"
confidence: 9/10
sources_checked: 24
last_updated: "2026-02-16"
---

# Transaction Simulation on Solana

## TL;DR

Transaction simulation runs your transaction against current blockchain state without committing it. Use `simulateTransaction` RPC to:
- Estimate compute units (CU) needed
- Catch errors before paying fees
- Parse program logs for debugging
- Validate account states

**Critical patterns:**
```typescript
// Simulate → extract CU → set budget → send
const simulation = await connection.simulateTransaction(tx, {
  replaceRecentBlockhash: true,  // Use latest blockhash
  sigVerify: false,              // Skip signature checks
});

if (simulation.value.err) {
  throw new Error(`Simulation failed: ${simulation.value.err}`);
}

const computeUnits = Math.ceil(simulation.value.unitsConsumed * 1.1); // 10% buffer
```

**When to skip preflight:** High-frequency trading, latency-critical operations where you've already simulated locally. Otherwise, keep it on.

## The simulateTransaction RPC Method

### Basic Usage

The `simulateTransaction` RPC method executes a transaction in a sandboxed environment without broadcasting it to the network.

**Parameters:**
- `transaction` (string, required): Base58 or base64 encoded transaction
- `config` (object, optional):
  - `commitment`: Finality level (`processed`, `confirmed`, `finalized`)
  - `sigVerify` (bool): Verify signatures (default: `false`)
  - `replaceRecentBlockhash` (bool): Use latest blockhash (default: `false`)
  - `minContextSlot` (number): Minimum slot for evaluation
  - `encoding`: `base58` (deprecated) or `base64`
  - `innerInstructions` (bool): Include inner instructions
  - `accounts`: Configuration for account data retrieval

**Response fields:**
- `err`: Error object if simulation failed (null on success)
- `logs`: Array of program execution logs
- `accounts`: Account states after simulation
- `unitsConsumed`: Compute units used
- `returnData`: Data returned by programs

### TypeScript Example (web3.js v1)

```typescript
import { Connection, Transaction, ComputeBudgetProgram } from "@solana/web3.js";

async function getSimulationUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey
): Promise<number | undefined> {
  // Add max CU limit for accurate simulation
  const testInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testVersionedTx = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      recentBlockhash: PublicKey.default.toString(), // Placeholder
    }).compileToV0Message()
  );

  const simulation = await connection.simulateTransaction(testVersionedTx, {
    replaceRecentBlockhash: true, // Replace placeholder with real blockhash
    sigVerify: false,             // Don't verify signatures
  });

  if (simulation.value.err) {
    console.error("Simulation error:", simulation.value.err);
    return undefined;
  }

  return simulation.value.unitsConsumed;
}
```

### Why replaceRecentBlockhash Matters

Setting `replaceRecentBlockhash: true` tells the RPC to use the **latest blockhash** instead of the one in your transaction. This is critical because:
- Simulations happen against current state
- Your transaction might have a stale blockhash
- Without this flag, simulation fails with "blockhash not found"

**Conflicts with sigVerify:** If you enable `sigVerify`, you can't use `replaceRecentBlockhash` because changing the blockhash invalidates signatures. For simulation, you almost always want `sigVerify: false` and `replaceRecentBlockhash: true`.

## What Preflight Checks Catch (and What They Don't)

Preflight is the automatic simulation that SDKs run before sending transactions. It's enabled by default in `sendTransaction`.

### What Preflight Catches

1. **Insufficient funds**: Account balance too low for transfer or fees
2. **Account ownership errors**: Writing to accounts you don't own
3. **Program errors**: Custom program errors that would cause transaction failure
4. **Compute budget exceeded**: Transaction uses more CU than allocated
5. **Invalid account states**: Missing accounts, wrong data sizes, etc.
6. **Math overflows**: Arithmetic errors in program logic

### What Preflight Misses

1. **Race conditions**: State changes between simulation and execution
   - Another transaction modifies the same accounts
   - Price changes in DEX swaps
   - Nonce increments in sequential operations

2. **Blockhash expiration**: Simulation uses current blockhash, but by the time transaction lands, it may be expired

3. **Network congestion**: Simulation doesn't account for:
   - Priority fee requirements
   - Block inclusion probability
   - Leader schedule changes

4. **Stale state**: If you simulate with `confirmed` commitment but send to `processed`, state might differ

5. **Account locks**: Multiple transactions competing for write access to the same accounts

**Key insight:** Preflight validates logic and current state, but can't predict future state or network conditions.

## Compute Unit (CU) Estimation via Simulation

### Why Estimate CUs?

1. **Lower costs**: Only request CUs you need
2. **Higher success rate**: Transactions with accurate CU limits fit more easily in blocks
3. **Better composability**: Efficient programs are easier to combine

Default CU limit is 200,000. Max is 1.4M. Most simple operations use far less.

### The Simulation → Send Pattern

```typescript
async function sendOptimizedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: Keypair
) {
  // Step 1: Simulate to get CU estimate
  let cuEstimate = await getSimulationUnits(connection, instructions, payer.publicKey);

  if (!cuEstimate) {
    throw new Error("Simulation failed");
  }

  // Step 2: Add 10% buffer for safety
  // (Priority fee instructions add ~50 CU, margin accounts for variance)
  const cuLimit = Math.ceil(cuEstimate * 1.1);

  // Step 3: Build final transaction with optimized CU
  const transaction = new Transaction();

  // Add compute budget first
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit })
  );

  // Optional: Add priority fee (calculated per CU)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 10_000 // Adjust based on network conditions
    })
  );

  // Add actual instructions
  transaction.add(...instructions);

  // Step 4: Send with fresh blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  // Step 5: Sign and send
  transaction.sign(payer);

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false } // Keep preflight unless you have reason to skip
  );

  // Step 6: Confirm
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return signature;
}
```

### Common CU Estimates

- **SOL transfer**: ~300 CU
- **SPL token transfer**: ~1,700-2,000 CU
- **NFT mint**: ~100,000-150,000 CU
- **Jupiter swap**: ~80,000-200,000 CU (varies by route complexity)
- **Serum DEX trade**: ~50,000-100,000 CU

Always simulate your specific transaction rather than using estimates.

### Handling Low CU Estimates

Some operations simulate with very low CU counts (e.g., 300 CU for SOL transfer). Set a minimum:

```typescript
const cuLimit = Math.max(1000, Math.ceil(cuEstimate * 1.1));
```

This prevents setting a CU limit so low that adding priority fee instructions pushes you over.

## Log Parsing from Simulation Results

### Anatomy of Simulation Logs

```typescript
const simulation = await connection.simulateTransaction(tx, {
  replaceRecentBlockhash: true,
  sigVerify: false,
});

// Example logs output:
[
  "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
  "Program log: Instruction: Transfer",
  "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1714 of 200000 compute units",
  "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success"
]
```

### Parsing Patterns

```typescript
function parseSimulationLogs(logs: string[]) {
  const programInvocations: string[] = [];
  const errors: string[] = [];
  let totalCU = 0;

  for (const log of logs) {
    // Extract program invocations
    if (log.includes("invoke [1]")) {
      const match = log.match(/Program (\w+) invoke/);
      if (match) programInvocations.push(match[1]);
    }

    // Extract CU consumption
    if (log.includes("consumed")) {
      const match = log.match(/consumed (\d+) of/);
      if (match) totalCU += parseInt(match[1]);
    }

    // Detect errors
    if (log.includes("failed") || log.includes("error")) {
      errors.push(log);
    }
  }

  return { programInvocations, errors, totalCU };
}
```

### Extracting Custom Program Errors

```typescript
function parseCustomError(logs: string[]): string | null {
  for (const log of logs) {
    // Pattern: "custom program error: 0x1"
    const match = log.match(/custom program error: (0x[0-9a-fA-F]+)/);
    if (match) {
      const errorCode = parseInt(match[1], 16);
      return `Custom error code: ${errorCode}`;
    }
  }
  return null;
}
```

**With Anchor programs**, you can map error codes to messages using the IDL:

```typescript
import { Program } from "@coral-xyz/anchor";

function getAnchorErrorMessage(program: Program, errorCode: number): string {
  const error = program.idl.errors?.find(e => e.code === errorCode);
  return error?.msg || `Unknown error: ${errorCode}`;
}
```

## Helius Enhanced Simulation APIs

Helius provides enhanced transaction parsing that makes simulation results human-readable.

### Enhanced Transaction Parsing

```typescript
// Standard simulateTransaction gives you raw logs
// Helius Enhanced Transactions parse them into structured data

const response = await fetch(
  `https://api-mainnet.helius-rpc.com/v0/transactions?api-key=${HELIUS_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: [signature],
    }),
  }
);

const data = await response.json();

// Returns structured data like:
{
  type: "SWAP",
  source: "JUPITER",
  tokenInputs: [{ mint: "So11...", amount: 1000000 }],
  tokenOutputs: [{ mint: "EPjF...", amount: 100000000 }],
  // ... human-readable fields
}
```

### When to Use Enhanced APIs

- **Debugging complex transactions**: Understand multi-instruction flows
- **Building UIs**: Display transaction details to users
- **Analytics**: Track specific transaction types (swaps, NFT sales, etc.)
- **Error diagnosis**: Get clearer error messages

**Not for:** Real-time CU estimation (use standard `simulateTransaction` for speed).

## Common Simulation Pitfalls

### 1. Stale State in Simulation

**Problem:** You fetch account data, build transaction, simulate. But between simulation and send, account state changes.

```typescript
// BAD: State can change between these steps
const accountInfo = await connection.getAccountInfo(account);
const tx = buildTransaction(accountInfo);
const sim = await connection.simulateTransaction(tx); // Uses old state
await sendTransaction(tx); // Might fail if state changed
```

**Solution:** Use `minContextSlot` to ensure simulation uses fresh state:

```typescript
const slot = await connection.getSlot();
const sim = await connection.simulateTransaction(tx, {
  minContextSlot: slot,
  replaceRecentBlockhash: true,
  sigVerify: false,
});
```

Or simulate right before sending:

```typescript
// Fetch, simulate, send in quick succession
const recentState = await connection.getAccountInfo(account);
const tx = buildTransaction(recentState);
const sim = await connection.simulateTransaction(tx, { ... });
if (!sim.value.err) {
  await sendTransaction(tx);
}
```

### 2. Race Conditions in High-Frequency Operations

**Problem:** Simulating sequentially-dependent transactions without accounting for state changes.

```typescript
// BAD: Second tx simulates based on pre-first-tx state
const tx1 = buildTx1();
const tx2 = buildTx2(); // Depends on tx1 completing

await connection.simulateTransaction(tx1);
await connection.simulateTransaction(tx2); // WRONG: state doesn't reflect tx1
```

**Solution:** Chain simulations logically or use mock state:

```typescript
// Option 1: Send tx1, wait for confirmation, then simulate tx2
const sig1 = await sendAndConfirmTransaction(tx1);
const tx2 = buildTx2(); // Now uses post-tx1 state
await connection.simulateTransaction(tx2);

// Option 2: Use Helius Sender for atomic bundles (advanced)
```

### 3. Ignoring Simulation Errors

**Problem:** Proceeding with send even when simulation fails.

```typescript
// BAD
const sim = await connection.simulateTransaction(tx);
// No error check!
await connection.sendTransaction(tx); // Will fail on-chain, waste fees
```

**Solution:** Always check `simulation.value.err`:

```typescript
const sim = await connection.simulateTransaction(tx, {
  replaceRecentBlockhash: true,
  sigVerify: false,
});

if (sim.value.err) {
  const customError = parseCustomError(sim.value.logs || []);
  throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)} - ${customError}`);
}

// Safe to send
await connection.sendTransaction(tx);
```

### 4. Wrong Commitment Level Mismatch

**Problem:** Simulating with `confirmed` but sending with `processed` (or vice versa).

```typescript
// BAD: Inconsistent commitment
const sim = await connection.simulateTransaction(tx, {
  commitment: 'confirmed', // Uses confirmed state
});

const signature = await connection.sendTransaction(tx, {
  preflightCommitment: 'processed', // Preflight uses processed state
});
```

**Solution:** Match commitment levels:

```typescript
const commitment = 'confirmed';

const sim = await connection.simulateTransaction(tx, {
  commitment,
  replaceRecentBlockhash: true,
  sigVerify: false,
});

const signature = await connection.sendTransaction(tx, {
  preflightCommitment: commitment,
});
```

**Best practice:** Use `confirmed` for most applications (balance between speed and safety).

### 5. Not Accounting for Priority Fee CU Overhead

**Problem:** Simulating without priority fee instructions, then adding them later, pushing over CU limit.

```typescript
// BAD
const cuEstimate = await getSimulationUnits(connection, instructions, payer);
const tx = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: cuEstimate }), // No buffer!
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }), // Adds ~50 CU
  ...instructions
);
// Transaction might exceed CU limit!
```

**Solution:** Simulate with priority fee included OR add buffer:

```typescript
// Option 1: Include priority fee in simulation
const instructionsWithFees = [
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
  ...instructions,
];
const cuEstimate = await getSimulationUnits(connection, instructionsWithFees, payer);

// Option 2: Add buffer (10% covers priority fee overhead)
const cuEstimate = await getSimulationUnits(connection, instructions, payer);
const cuLimit = Math.ceil(cuEstimate * 1.1);
```

## When to Skip Preflight

### Set skipPreflight: true When

1. **High-frequency trading**: Every millisecond counts, and you've simulated locally
2. **Retrying failed transactions**: You know it should work, just needs to land
3. **Network congestion**: Preflight adds RPC latency during high load
4. **You've already simulated**: No need to simulate twice

### Keep Preflight When

1. **User-facing applications**: Catch errors before wasting user fees
2. **Complex multi-instruction transactions**: Higher chance of edge case errors
3. **First-time operations**: New code paths should be validated
4. **Low-volume operations**: Latency isn't critical

### How to Skip Preflight Safely

```typescript
// Simulate manually, then send with skipPreflight
const sim = await connection.simulateTransaction(tx, {
  replaceRecentBlockhash: true,
  sigVerify: false,
});

if (sim.value.err) {
  throw new Error("Won't send - simulation failed");
}

// Safe to skip preflight since we already validated
const signature = await connection.sendRawTransaction(
  tx.serialize(),
  {
    skipPreflight: true,
    maxRetries: 0, // Handle retries yourself
  }
);
```

**Why skipPreflight with maxRetries: 0?**
- RPC nodes retry transactions automatically by default
- With `skipPreflight: true`, you're managing the transaction lifecycle yourself
- Setting `maxRetries: 0` prevents the RPC from retrying stale transactions
- You implement your own retry logic with fresh blockhashes

### Complete skipPreflight Pattern

```typescript
async function sendWithManualPreflight(
  connection: Connection,
  transaction: Transaction,
  signer: Keypair
) {
  // 1. Get fresh blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = signer.publicKey;
  transaction.sign(signer);

  // 2. Manual simulation (replaces preflight)
  const sim = await connection.simulateTransaction(transaction, {
    replaceRecentBlockhash: false, // We just set a fresh one
    sigVerify: true,              // Verify since we signed
  });

  if (sim.value.err) {
    throw new Error(`Preflight failed: ${JSON.stringify(sim.value.err)}`);
  }

  // 3. Send with skipPreflight
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    {
      skipPreflight: true,
      maxRetries: 0,
    }
  );

  // 4. Confirm with timeout
  try {
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
  } catch (err) {
    // Handle expiration, implement retry with new blockhash
    throw new Error(`Transaction ${signature} failed to confirm`);
  }

  return signature;
}
```

## Preflight vs. Commitment Levels

Understanding the relationship between `preflightCommitment` and `commitment`:

- **preflightCommitment**: Commitment level for simulation before sending
- **commitment**: Commitment level for fetching blockchain state (e.g., `getLatestBlockhash`)

```typescript
// These are independent settings
const signature = await connection.sendTransaction(transaction, {
  preflightCommitment: 'processed', // How to simulate
});

const blockhash = await connection.getLatestBlockhash('confirmed'); // What state to use
```

**Best practice:** Use same commitment for both to avoid state inconsistencies.

## Real-World Example: Jupiter Swap with Simulation

```typescript
import { Connection, VersionedTransaction } from "@solana/web3.js";

async function executeJupiterSwap(
  connection: Connection,
  swapTransaction: VersionedTransaction,
  payer: Keypair
) {
  // 1. Simulate to check for errors
  const simulation = await connection.simulateTransaction(swapTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  if (simulation.value.err) {
    // Parse Jupiter-specific errors
    const logs = simulation.value.logs || [];
    const slippageError = logs.some(log => log.includes("SlippageToleranceExceeded"));

    if (slippageError) {
      throw new Error("Swap failed: Price moved beyond slippage tolerance");
    }

    throw new Error(`Swap simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  // 2. Extract actual CU usage
  const cuUsed = simulation.value.unitsConsumed || 100_000;
  console.log(`Jupiter swap will use ~${cuUsed} CU`);

  // 3. Get fresh blockhash (Jupiter already sets CU budget)
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  swapTransaction.message.recentBlockhash = blockhash;

  // 4. Sign
  swapTransaction.sign([payer]);

  // 5. Send (keep preflight for safety)
  const signature = await connection.sendRawTransaction(
    swapTransaction.serialize(),
    {
      skipPreflight: false, // Let RPC simulate one more time
      maxRetries: 0,        // We'll handle retries
    }
  );

  // 6. Confirm
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  console.log(`Swap confirmed: ${signature}`);
  return signature;
}
```

## Troubleshooting Simulation Failures

### Error: "Blockhash not found"

**Cause:** Using stale blockhash in simulation.

**Fix:** Set `replaceRecentBlockhash: true` or use fresh blockhash.

### Error: "Account not found"

**Cause:** Account doesn't exist or wrong pubkey.

**Fix:** Verify account addresses, check if accounts need to be created first.

### Error: "Computational budget exceeded"

**Cause:** Transaction uses more CU than allocated.

**Fix:** Increase CU limit or optimize program logic.

```typescript
transaction.add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
);
```

### Error: "Custom program error: 0x1"

**Cause:** Program-specific error (code varies by program).

**Fix:** Check program documentation for error codes, parse with IDL if using Anchor.

### Simulation succeeds but send fails

**Cause:** Race condition - state changed between simulation and send.

**Fix:** Simulate immediately before sending, or use atomic bundles.

## Summary Checklist

Before sending any transaction:

- [ ] Simulate with `replaceRecentBlockhash: true` and `sigVerify: false`
- [ ] Check `simulation.value.err` is null
- [ ] Extract `unitsConsumed` and add 10% buffer for CU limit
- [ ] Add priority fee based on network conditions
- [ ] Use fresh blockhash (`getLatestBlockhash`)
- [ ] Decide: keep preflight (safer) or skip (faster)
- [ ] If skipping preflight, set `maxRetries: 0` and handle yourself
- [ ] Confirm with blockhash expiration check

**Key principle:** Simulation gives you a preview, not a guarantee. Always account for state changes and network conditions between simulation and execution.

---

## Sources

- Solana RPC Docs: simulateTransaction method
- Helius Transaction Optimization Guide
- Solana Cookbook: Compute Unit Optimization
- QuickNode Solana Transaction Strategies
- Metaplex Umi: Priority Fees & CU Guide
- Solana Web3.js Documentation
- Helius Enhanced Transactions API
- Solana Retrying Transactions Guide
- Stack Overflow: Solana Commitment Levels
- Developers' Experience with Transaction Failures
