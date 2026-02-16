---
pack: solana
topic: "Debugging Solana Programs"
decision: "How do I debug transaction failures and program errors?"
confidence: 9/10
sources_checked: 28
last_updated: "2026-02-16"
---

# Debugging Solana Programs

## Decision Statement

When debugging Solana transaction failures and program errors, follow a systematic workflow: (1) capture the transaction signature, (2) inspect logs and error codes in an explorer, (3) decode inner instructions and account state changes, (4) identify the error category (program/account/compute/network), (5) use simulation and local testing tools to reproduce, and (6) apply targeted fixes based on error patterns. Real debugging requires understanding Solana's error taxonomy, not just tool lists.

## Context & Reasoning

Solana debugging is fundamentally different from traditional web debugging because you cannot SSH into a node or add breakpoints to on-chain code. Instead, debugging relies on transaction simulation, program logs, explorers, and understanding Solana's error numbering schemes. Failed transactions often result from insufficient compute units, account constraints, PDA mismatches, or CPI failures—and the default error messages are cryptic by design.

The most critical insight: **most debugging happens post-mortem through transaction logs and simulation**, not through traditional runtime debugging. Solana's parallel execution model means errors often manifest as account access conflicts, compute budget exhaustion, or serialization failures that require architectural fixes, not just code patches.

## Transaction Error Taxonomy

### 1. Program Errors (Custom & Anchor)

**Custom Program Errors (6000+)**
- Error codes ≥ 6000 are user-defined errors in Anchor programs
- Defined using `#[error_code]` attribute in `errors.rs`
- Format: `InstructionError(index, { Custom: 6001 })`
- Example: `0x1771` in hex = 6001 in decimal = first custom error

```rust
#[error_code]
pub enum MyError {
    #[msg("Amount must be greater than or equal to 10")]
    AmountTooSmall,  // Error code 6000
    #[msg("Amount must be less than or equal to 100")]
    AmountTooLarge,  // Error code 6001
}
```

**Anchor Internal Errors**
- Error codes 100-5999 are Anchor framework errors
- 100+: Instruction errors
- 1000+: IDL errors
- 2000+: Constraint errors
- 3000+: Account errors
- 4100+: Misc errors

**Common Program Error Codes**
- `0x0` (0): Account in use
- `0x1` (1): Insufficient funds for operation (token transfer, rent)
- `0x2` (2): Invalid Mint
- `0x3` (3): Mint mismatch
- `0x4` (4): Owner does not match
- `0x23` (35): Custom program error (check program's errors.rs)

### 2. Compute Budget Errors

**ComputeBudgetExceeded**
- Default limit: 200,000 CU per transaction
- Maximum: 1.4M CU per transaction
- Causes: Heavy CPIs, large loops, proof verification, excessive logging
- Solution pattern:

```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 900_000 }));
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5 }));
```

**Compute profiling workflow:**
1. Simulate transaction to get actual CU consumption
2. Add 10-15% margin for edge cases
3. Set compute unit limit slightly above measured usage
4. Monitor with `msg!("Checkpoint: compute units consumed")` (but remove in production—logging is expensive)

### 3. Account Errors

**Common account-related failures:**
- **AccountNotFound**: Wrong account passed or PDA derived incorrectly
- **InvalidAccountData**: Account owned by wrong program
- **AccountBorrowFailed**: Multiple mutable borrows of same account
- **NotRentExempt**: Account doesn't have enough lamports for rent exemption
- **InvalidAccountOwner**: Account owner doesn't match expected program

**PDA debugging pattern:**
```rust
// Debug PDA derivation
function debugPDA(seeds, programId) {
    console.log('Seeds:', seeds.map(s =>
        Buffer.isBuffer(s) ? s.toString('hex') : s
    ));
    console.log('Program ID:', programId.toString());

    try {
        const [pda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
        console.log('PDA:', pda.toString(), 'Bump:', bump);
        return [pda, bump];
    } catch (e) {
        console.error('PDA derivation failed:', e);
        throw e;
    }
}
```

### 4. Signature & Blockhash Errors

**SignatureVerificationFailure (-32003)**
- Missing required signer
- Incorrect keypair used
- PDA incorrectly marked as signer (PDAs sign via program, not transaction)

**BlockhashNotFound / Blockhash Expired**
- Blockhashes expire in 60-90 seconds
- Fetch fresh blockhash before each transaction
- Don't reuse blockhashes across multiple transactions

### 5. Network & RPC Errors

**HTTP-level errors:**
- 429: Rate limit exceeded (get better RPC or implement backoff)
- 503: Node temporarily offline (switch RPC endpoint)
- 413: Request body too large (split transaction or compress)

**RPC-specific errors:**
- -32002: Transaction simulation failed (decode logs for root cause)
- -32004: Block not available for slot (transient—retry)
- -32005: Node unhealthy (node lagging—switch endpoint)

## Program Log Analysis

### Reading Solana Logs

Every transaction produces logs that tell the story of execution. Pattern to look for:

```
> Program <PROGRAM_ID> invoke [1]
> Program log: Instruction: <METHOD_NAME>
> Program log: <YOUR_MSG_MACRO_OUTPUT>
> Program <PROGRAM_ID> consumed <CU_COUNT> compute units
> Program <PROGRAM_ID> success/failed: <ERROR>
```

**Key log patterns:**
- `invoke [1]` = depth 1 (main instruction)
- `invoke [2]` = depth 2 (CPI call)
- `consumed X compute units` = actual CU usage (optimize if near limit)
- `custom program error: 0xHEX` = decode to decimal for error code

**Log analysis workflow:**
```rust
// In program code, add strategic logging
msg!("Checkpoint 1: data validated");
msg!("Checkpoint 2: accounts verified");
msg!("Processing transfer: {} lamports", amount);
msg!("Final state: {}", account.data);
```

**IMPORTANT**: Remove excessive `msg!` calls in production. Logging is expensive—each `msg!` macro consumes compute units. One base58-encoded public key log can cost 11,962 CU.

### Decoding Error Codes

**Hex to Decimal conversion:**
- Error `0x1e` in logs = 30 in decimal
- Error `0x1771` = 6001 (first custom Anchor error)
- Error `0x1` = InsufficientFunds

**Finding program-specific errors:**
1. Locate program's GitHub repository
2. Find `errors.rs` or `lib.rs` with `#[error_code]`
3. Match error number to enum variant
4. Read the `#[msg("...")]` attribute for explanation

Example from Metaplex Core:
```rust
// Error code 20 in logs
#[error_code]
pub enum CoreError {
    // ... other errors ...
    InvalidInstructionData, // This is error 20
}
```

## Solana Explorer & Transaction Inspectors

### Using Block Explorers for Debugging

**Top explorers for debugging:**
1. **Solana Explorer** (explorer.solana.com)
   - Transaction inspector: paste base58/base64 encoded message
   - Official Solana Foundation tool
   - Shows raw instruction data, account metas

2. **SolanaFM** (solana.fm)
   - Best for tracing inner instructions
   - Shows token account changes inline
   - CPI cascade visualization

3. **Solscan** (solscan.io)
   - Acquired by Etherscan in 2024
   - Groups token actions together
   - Human-readable account labels

4. **Orb** (solana.orb.land)
   - Built on Helius's archival system
   - 2-10x faster than BigTable queries
   - AI transaction explanations
   - Advanced filtering and sorting

**Explorer debugging workflow:**
1. Copy transaction signature
2. Paste into explorer
3. Expand "Program Instruction Logs"
4. Look for innerInstructions (often where hidden transfers occur)
5. Check pre/post token balances
6. Review account metas (read/write, signer flags)
7. Inspect compute unit consumption
8. Download raw transaction JSON for deeper analysis

### Inner Instructions & CPIs

Inner instructions are not uniformly surfaced by every explorer. They represent cross-program invocations (CPIs) and are critical for debugging multi-program interactions.

**What to check in inner instructions:**
- Token program transfers (often hidden from top-level view)
- PDA account creations
- Rent-exempt account funding
- Authority transfers
- Cross-program state changes

**Missing inner instructions?** Use `getConfirmedTransaction` RPC method with full details, or switch to an explorer with better CPI decoding.

## Anchor Error Handling

### Anchor Error Types

Anchor returns a custom `Error` type:
```rust
pub enum Error {
    AnchorError(Box<AnchorError>),
    ProgramError(Box<ProgramErrorWithOrigin>),
}
```

**AnchorError structure:**
```rust
pub struct AnchorError {
    pub error_name: String,
    pub error_code_number: u32,
    pub error_msg: String,
    pub error_origin: Option<ErrorOrigin>,
    pub compared_values: Option<ComparedValues>,
}
```

### Using `require!` and `err!` Macros

**Pattern 1: require! (recommended)**
```rust
pub fn validate_amount(ctx: Context<ValidateAmount>, amount: u64) -> Result<()> {
    require!(amount >= 10, CustomError::AmountTooSmall);
    require!(amount <= 100, CustomError::AmountTooLarge);
    Ok(())
}
```

**Pattern 2: err! (more control)**
```rust
pub fn set_data(ctx: Context<SetData>, data: MyAccount) -> Result<()> {
    if data.data >= 100 {
        return err!(MyError::DataTooLarge);
    }
    ctx.accounts.my_account.set_inner(data);
    Ok(())
}
```

**Pattern 3: require_keys_eq (for public key comparison)**
```rust
require_keys_eq!(
    ctx.accounts.authority.key(),
    expected_authority,
    CustomError::UnauthorizedAccess
);
```

### TypeScript Client Error Response

When Anchor programs fail, the TypeScript SDK returns:
```typescript
{
  errorLogs: [
    'Program log: AnchorError thrown in programs/my-program/src/lib.rs:11.',
    'Error Code: AmountTooLarge. Error Number: 6001.',
    'Error Message: Amount must be less than or equal to 100.'
  ],
  error: {
    errorCode: { code: 'AmountTooLarge', number: 6001 },
    errorMessage: 'Amount must be less than or equal to 100',
    origin: { file: 'programs/my-program/src/lib.rs', line: 11 }
  }
}
```

## Simulation & Local Testing

### Transaction Simulation

**Skip preflight to force on-chain registration:**

Most SDKs simulate transactions before sending (preflight check). If simulation fails, the transaction isn't sent. To debug, skip preflight and force the transaction on-chain:

```typescript
// Umi
const tx = createV1(umi, { ...args })
  .sendAndConfirm(umi, { send: { skipPreflight: true } });

// web3.js
const res = await connection.sendTransaction(transaction, signers, {
  skipPreflight: true,
  preflightCommitment: 'confirmed'
});
```

**Why skip preflight?**
- Failed simulations don't create shareable transaction signatures
- Skipping preflight registers the failed transaction on-chain
- You can then share the signature with others for debugging
- Explorer shows all accounts, instructions, logs, and error messages

**simulateTransaction for debugging:**
```typescript
const simulation = await connection.simulateTransaction(transaction, {
  commitment: 'processed',
  replaceRecentBlockhash: true
});

if (simulation.value.err) {
  console.log('Simulation error:', simulation.value.err);
  console.log('Logs:', simulation.value.logs);
  console.log('Units consumed:', simulation.value.unitsConsumed);
}
```

### Local Validator Testing

**Using solana-test-validator:**
```bash
# Start local validator with your program
solana-test-validator \
  --bpf-program <PROGRAM_ID> \
  target/deploy/my_program.so

# In another terminal, stream logs
solana logs
```

**Anchor local testing patterns:**

```rust
// tests/integration.rs
use solana_program_test::*;
use solana_sdk::signature::Keypair;

#[tokio::test]
async fn test_my_instruction() {
    // Enable logging
    solana_logger::setup_with_default("solana_runtime::message=debug");

    let program_id = Pubkey::new_unique();
    let mut program_test = ProgramTest::new(
        "my_program",
        program_id,
        processor!(process_instruction),
    );

    let (mut banks_client, payer, recent_blockhash) =
        program_test.start().await;

    // Build and process transaction
    let mut transaction = Transaction::new_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);

    match banks_client.process_transaction(transaction).await {
        Ok(_) => println!("Transaction succeeded"),
        Err(e) => {
            println!("Transaction failed: {:?}", e);
            // Analyze error here
        }
    }
}
```

**Key testing tools:**
- `solana-program-test`: Bare-bones local runtime (supports breakpoints)
- `solana-validator`: Local validator node (more realistic, no breakpoints)
- `solana-test-validator`: CLI tool for running local validator

## Compute Budget Profiling

### Measuring Compute Unit Consumption

**Client-side simulation:**
```typescript
async function getSimulationComputeUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payerKey: PublicKey
): Promise<number | null> {
  const simulationInstructions = [
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ...instructions
  ];

  const message = new TransactionMessage({
    payerKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: simulationInstructions,
  }).compileToV0Message();

  const simulation = await connection.simulateTransaction(
    new VersionedTransaction(message)
  );

  return simulation.value.unitsConsumed || null;
}
```

**Program-side profiling:**
```rust
use anchor_lang::prelude::*;

#[program]
pub mod my_program {
    use super::*;

    pub fn expensive_operation(ctx: Context<ExpensiveOp>) -> Result<()> {
        msg!("Starting operation");

        // Expensive operation here
        let result = do_heavy_computation();

        msg!("Operation complete");
        Ok(())
    }
}

// In logs, you'll see:
// Program consumed X compute units
```

### Optimizing Compute Usage

**Common CU optimization strategies:**

1. **Remove excessive logging** (biggest quick win)
   ```rust
   // BAD: 11,962 CU per log
   msg!("Account: {}", account_key.to_string());

   // GOOD: Minimal logging in production
   // Remove msg! calls after debugging
   ```

2. **Avoid redundant account deserializations**
   ```rust
   // BAD: Multiple deserializations
   let account1 = Account::try_from(&account_info)?;
   // ... later ...
   let account2 = Account::try_from(&account_info)?;

   // GOOD: Deserialize once, reuse
   let account = Account::try_from(&account_info)?;
   ```

3. **Minimize CPI calls**
   ```rust
   // BAD: Multiple separate CPIs
   token::transfer(ctx1)?;
   token::transfer(ctx2)?;
   token::transfer(ctx3)?;

   // GOOD: Batch operations when possible
   token::transfer_batch(ctx)?;
   ```

4. **Use smaller data types**
   ```rust
   // BAD: Unnecessary precision
   pub struct Counter {
       pub count: u64,  // 8 bytes
   }

   // GOOD: Right-sized types
   pub struct Counter {
       pub count: u16,  // 2 bytes (if max value < 65535)
   }
   ```

5. **Avoid expensive operations**
   - Base58 encoding/decoding is expensive
   - PDA derivation: `find_program_address` costs 12,136+ CU
   - String concatenation in logs
   - Large loops (consider batch processing)

**Compute budget best practices:**
- Default: 200K CU (sufficient for most operations)
- Increase only when necessary (up to 1.4M CU max)
- Add 10-15% margin above measured consumption
- Profile before and after optimizations
- Use `compute_fn!` macro for benchmarking specific code sections

## Common Error Patterns & Solutions

### Pattern 1: "Custom program error: 0x1"

**Symptom:** Transaction fails with `InstructionError(0, { Custom: 1 })`

**Common causes:**
1. Insufficient SOL for transaction fees
2. Insufficient token balance for transfer
3. Account not rent-exempt

**Debugging workflow:**
```typescript
// Check account balances
const balance = await connection.getBalance(accountPubkey);
console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

const minBalance = await connection.getMinimumBalanceForRentExemption(
  accountDataSize
);
console.log('Min balance for rent exemption:', minBalance / LAMPORTS_PER_SOL);

// For token accounts
const tokenAccount = await getAccount(connection, tokenAccountAddress);
console.log('Token balance:', tokenAccount.amount);
```

### Pattern 2: PDA Derivation Mismatches

**Symptom:** `InvalidAccountData` or `AccountNotFound` when using PDAs

**Common causes:**
1. Wrong seeds used in derivation
2. Wrong program ID
3. Seeds in wrong order
4. Bump seed not included/wrong bump

**Solution:**
```rust
// On-chain: Derive PDA
let (pda, bump) = Pubkey::find_program_address(
    &[b"vault", user.key().as_ref()],
    ctx.program_id
);

// Client: Must use exact same seeds and order
const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), user.publicKey.toBuffer()],
    programId
);
```

**Debug checklist:**
- Seeds match exactly (client vs on-chain)
- Seed order is identical
- Program ID is correct
- Not using `create_program_address` (use `find_program_address`)

### Pattern 3: CPI Failures

**Symptom:** Transaction succeeds but inner instruction fails, or `InstructionError(N, ...)` where N > 0

**Debugging CPIs:**
1. Check inner instructions in explorer
2. Verify account ownership for invoked program
3. Ensure signer seeds are passed correctly
4. Confirm invoked program's required accounts

```rust
// Calling another program (CPI)
let cpi_accounts = Transfer {
    from: ctx.accounts.from.to_account_info(),
    to: ctx.accounts.to.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};
let cpi_program = ctx.accounts.token_program.to_account_info();
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

// If authority is a PDA, need to provide seeds
let seeds = &[b"authority", &[bump]];
let signer_seeds = &[&seeds[..]];
token::transfer(cpi_ctx.with_signer(signer_seeds), amount)?;
```

### Pattern 4: Account Meta Mismatches

**Symptom:** Transaction fails with account ownership errors

**Common causes:**
- Account marked writable but should be read-only (or vice versa)
- Account not marked as signer when signature required
- PDA marked as signer (PDAs don't sign transactions)

**Solution:**
```rust
// In Anchor, use correct constraints
#[derive(Accounts)]
pub struct MyInstruction<'info> {
    #[account(mut)]  // Writable
    pub writable_account: Account<'info, MyAccount>,

    pub readonly_account: Account<'info, MyAccount>,  // Read-only

    #[account(mut, signer)]  // Must sign AND be writable
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"pda"],
        bump
    )]  // PDA: not a signer
    pub pda_account: Account<'info, MyPDA>,
}
```

### Pattern 5: Blockhash Expiration in Production

**Symptom:** Random "Blockhash not found" errors, especially under load

**Root cause:** Fetching blockhash once and reusing for multiple transactions

**Solution:**
```typescript
// BAD: Reusing blockhash
const blockhash = await connection.getLatestBlockhash();
for (const instruction of instructions) {
  const tx = new Transaction({ ...blockhash, ...instruction });
  await connection.sendTransaction(tx); // May fail if loop is slow
}

// GOOD: Fresh blockhash per transaction
for (const instruction of instructions) {
  const blockhash = await connection.getLatestBlockhash();
  const tx = new Transaction({ ...blockhash, ...instruction });
  await connection.sendTransaction(tx);
}

// BETTER: Batch into single transaction when possible
const blockhash = await connection.getLatestBlockhash();
const tx = new Transaction({ ...blockhash });
tx.add(...instructions);
await connection.sendTransaction(tx);
```

## Real Debugging Workflow (Step-by-Step)

### Workflow for Failed Transaction

1. **Capture the transaction signature**
   ```typescript
   try {
     const sig = await connection.sendTransaction(transaction);
     console.log('Transaction signature:', sig);
   } catch (error) {
     console.error('Transaction failed:', error);
     // If signature exists in error, use it
     if (error.signature) {
       console.log('Failed transaction signature:', error.signature);
     }
   }
   ```

2. **Inspect in explorer**
   - Paste signature into Solana Explorer / SolanaFM / Solscan
   - Read program logs from top to bottom
   - Note which instruction index failed
   - Expand inner instructions

3. **Decode error code**
   ```bash
   # If you see: custom program error: 0x1771
   # Convert hex to decimal
   echo $((0x1771))  # Output: 6001

   # This is custom error code 6001 (first user-defined error)
   ```

4. **Check account states**
   ```typescript
   // Before transaction
   const accountBefore = await connection.getAccountInfo(targetAccount);
   console.log('Owner:', accountBefore.owner.toString());
   console.log('Data length:', accountBefore.data.length);
   console.log('Lamports:', accountBefore.lamports);
   ```

5. **Simulate locally**
   ```bash
   # Run test that reproduces the failure
   anchor test --skip-local-validator  # Use devnet
   # OR
   anchor test  # Use local validator
   ```

6. **Add strategic logging**
   ```rust
   msg!("Step 1: Validating inputs");
   msg!("Step 2: Amount = {}", amount);
   msg!("Step 3: Calling CPI");
   msg!("Step 4: Success");
   ```

7. **Iterate and fix**
   - Apply targeted fix based on error category
   - Re-test with simulation
   - Deploy and verify on devnet
   - Remove excessive logging before mainnet

### Workflow for Debugging CPI Failures

1. **Identify which CPI failed**
   - Check instruction index in error: `InstructionError(2, ...)` means 3rd instruction (0-indexed)
   - In logs, find `invoke [2]` (depth 2 = CPI)

2. **Verify account ownership**
   ```typescript
   const accountInfo = await connection.getAccountInfo(account);
   console.log('Owner:', accountInfo.owner.toString());
   console.log('Expected owner:', expectedProgramId.toString());
   ```

3. **Check PDA signer seeds**
   ```rust
   // Ensure seeds are passed when PDA is authority
   let seeds = &[
       b"vault",
       user.key().as_ref(),
       &[bump]
   ];
   let signer_seeds = &[&seeds[..]];

   let cpi_ctx = CpiContext::new_with_signer(
       cpi_program,
       cpi_accounts,
       signer_seeds
   );
   ```

4. **Verify invoked program's requirements**
   - Check invoked program's IDL
   - Ensure all required accounts are passed
   - Confirm account order matches IDL

### Workflow for Compute Budget Issues

1. **Measure actual consumption**
   ```typescript
   const simulation = await connection.simulateTransaction(transaction);
   console.log('Units consumed:', simulation.value.unitsConsumed);
   console.log('Default limit: 200000');
   console.log('Exceeded:', simulation.value.unitsConsumed > 200000);
   ```

2. **Identify expensive operations**
   - Review program logs for CU consumption per instruction
   - Profile with `msg!` checkpoints (then remove)
   - Look for multiple CPIs, large loops, excessive logging

3. **Optimize or increase budget**
   ```typescript
   // Option A: Increase budget
   transaction.add(
     ComputeBudgetProgram.setComputeUnitLimit({
       units: Math.floor(simulation.value.unitsConsumed * 1.15)
     })
   );

   // Option B: Optimize program code
   // - Remove msg! calls
   // - Reduce CPIs
   // - Use smaller data types
   ```

## Advanced Debugging Techniques

### Using solana logs Command

```bash
# Stream all program logs
solana logs

# Filter by program ID
solana logs --program <PROGRAM_ID>

# Follow specific transaction
solana logs | grep <SIGNATURE>
```

### Custom Error Logging in Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_detailed_errors() {
        let result = call_instruction();

        if let Err(e) = result {
            // Extract error details
            match e {
                Error::AnchorError(anchor_err) => {
                    println!("Error name: {}", anchor_err.error_name);
                    println!("Error code: {}", anchor_err.error_code_number);
                    println!("Error message: {}", anchor_err.error_msg);
                }
                Error::ProgramError(prog_err) => {
                    println!("Program error: {:?}", prog_err);
                }
            }
            panic!("Test failed with error: {:?}", e);
        }
    }
}
```

### RPC Method for Transaction Details

```typescript
// Get full transaction with all metadata
const transaction = await connection.getTransaction(signature, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0
});

console.log('Transaction meta:', transaction?.meta);
console.log('Logs:', transaction?.meta?.logMessages);
console.log('Pre balances:', transaction?.meta?.preBalances);
console.log('Post balances:', transaction?.meta?.postBalances);
console.log('Pre token balances:', transaction?.meta?.preTokenBalances);
console.log('Post token balances:', transaction?.meta?.postTokenBalances);
console.log('Inner instructions:', transaction?.meta?.innerInstructions);
```

### Memory and Heap Debugging

```rust
// Request larger heap if needed
use solana_program::entrypoint;
entrypoint!(process_instruction);

// In instruction handler
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Default heap: 32KB
    // Can request up to 256KB via ComputeBudgetInstruction::request_heap_frame

    msg!("Heap usage: {}", /* heap monitoring */);
    Ok(())
}
```

## Best Practices Summary

1. **Always test on devnet first** — Don't debug mainnet failures; reproduce on devnet

2. **Use skipPreflight strategically** — Skip preflight to get on-chain transaction signatures for sharing with team

3. **Instrument with msg! during development** — But remove before production (each msg! costs CU)

4. **Profile compute usage early** — Don't wait until transactions fail in production

5. **Decode error codes systematically** — Hex → decimal → check errors.rs → find root cause

6. **Inspect inner instructions** — Most token/account issues hide in CPIs

7. **Validate account ownership** — Wrong owner is the most common account error

8. **Fresh blockhashes** — Don't reuse; fetch per transaction or batch into single tx

9. **Read logs top to bottom** — Follow invoke depth to trace execution flow

10. **Use multiple explorers** — Different explorers decode different aspects; cross-reference

## Common Mistakes to Avoid

1. **Trusting simulation in all cases** — Simulation can succeed but on-chain execution fail (race conditions, RPC state mismatch)

2. **Ignoring inner instructions** — Hidden transfers and state changes occur in CPIs

3. **Over-provisioning compute budget** — Requesting 1.4M CU when you need 50K wastes fees

4. **Marking PDAs as signers** — PDAs sign via program logic, not transaction signatures

5. **Reusing error codes** — Each custom error needs unique number (6000+)

6. **Base58 encoding in logs** — Extremely expensive; convert to hex or omit in production

7. **Not checking pre/post balances** — Account state diffs reveal what actually happened

8. **Assuming error messages are complete** — Many errors show as generic "custom program error: 0xNNN"—you must decode

9. **Debugging without transaction signature** — Can't debug without on-chain record; use skipPreflight if needed

10. **Ignoring commitment levels** — `processed` vs `confirmed` vs `finalized` affects what state you see

## Recommended Tools

- **Explorers**: Solana Explorer, SolanaFM, Solscan, Orb
- **Local testing**: Anchor Test, solana-program-test, solana-test-validator
- **RPC providers**: QuickNode (with logs feature), Helius, Alchemy
- **CLI tools**: solana CLI, anchor CLI, solana logs
- **Simulation**: connection.simulateTransaction(), Anchor client simulation
- **Error decoders**: Manual (check errors.rs), explorer built-in decoders
- **Profiling**: msg! macros, transaction simulation, compute_fn! benchmarks

## Conclusion

Debugging Solana programs requires a different mental model than traditional debugging. You're debugging a distributed system with parallel execution, not a linear program. The key skills are: (1) reading and interpreting logs, (2) understanding Solana's error taxonomy, (3) using explorers effectively, (4) simulating transactions locally, and (5) systematically ruling out error categories (compute/account/program/network). Master these patterns and you'll debug Solana transactions faster than the chain can finalize them.
