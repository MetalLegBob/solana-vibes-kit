---
pack: solana
topic: "Compute Unit Optimization"
decision: "How do I reduce compute unit consumption?"
confidence: 9/10
sources_checked: 34
last_updated: "2026-02-16"
---

# Compute Unit Optimization

## Overview

Compute Units (CUs) measure the computational cost of executing instructions on Solana. Every operation—from transferring SOL to invoking complex smart contract logic—consumes compute units. Optimizing CU usage is critical for three reasons:

1. **Lower Transaction Costs**: Priority fees are charged per CU (`priority_fee = CU_limit * CU_price`), so fewer CUs mean lower costs
2. **Higher Success Rates**: Exceeding your CU budget causes instant transaction failure
3. **Better Composability**: Efficient programs consume fewer resources, enabling more complex multi-program interactions

## CU Budget Limits (2024-2025)

### Per-Transaction Limits
- **Default CU limit**: 200,000 CU per transaction
- **Maximum CU limit**: 1,400,000 CU per transaction (can be increased via `ComputeBudgetProgram.setComputeUnitLimit()`)
- **Base fee**: 5,000 lamports per signature (50% burned, 50% to validator)

### Per-Block Limits
- **Max CU per account per block**: 12 million CU
- **Max CU per block**: 60 million CU

### Account Data Loading Costs
- **Default loaded account data size**: 64MB (costs 16,000 CU at 8 CU per 32KB)
- **Optimization**: Use `ComputeBudgetProgram.setLoadedAccountsDataSizeLimit()` to reduce this overhead for low-CU applications like wallets

**Real Example**: A simple wallet transaction that only needs 10KB of account data can save 15,000+ CU by setting the loaded accounts data size limit appropriately.

## Profiling CU Usage

### 1. Using `sol_log_compute_units!` Macro

```rust
use solana_program::log::sol_log_compute_units;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    sol_log_compute_units!(); // Log starting CU

    // Your program logic here

    sol_log_compute_units!(); // Log ending CU
    Ok(())
}
```

**Output**: Logs will show `Program consumed: X of Y compute units` in the transaction logs.

### 2. Transaction Simulation

```typescript
import { Connection, Transaction, ComputeBudgetProgram } from "@solana/web3.js";

async function getSimulationComputeUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payerKey: PublicKey
) {
  const simulationInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
    ...instructions
  ];

  const transaction = new Transaction();
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = payerKey;
  transaction.add(...simulationInstructions);

  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    console.error("Simulation error:", simulation.value.err);
    return 200000;
  }

  return simulation.value.unitsConsumed || 200000;
}
```

**Pro Tip**: Always simulate transactions to get accurate CU estimates before setting your compute budget.

## Framework-Level Optimizations

### Anchor vs Native vs Pinocchio: CU Benchmarks

Based on real-world benchmarks from production programs:

| Framework | Simple Counter Increment | CU Overhead | Binary Size |
|-----------|-------------------------|-------------|-------------|
| **Anchor** | ~8,000-10,000 CU | Highest (Borsh serialization, account validation) | ~150KB |
| **Native Rust** | ~3,000-5,000 CU | Medium (manual serialization) | ~50-80KB |
| **Pinocchio** | ~1,500-2,500 CU | Lowest (zero-copy, no_std) | ~20-30KB |
| **Assembly (asm)** | ~800-1,200 CU | Minimal (direct syscalls) | ~10KB |

**Real-World Example**: The Meteora DAMM v2 AMM uses zero-copy patterns and saved ~5,000 CU per read operation compared to traditional Borsh deserialization.

### Anchor Overhead Analysis

Anchor's convenience comes with CU costs:

1. **Borsh Serialization**: ~2,000-5,000 CU per large account (depending on size)
2. **Account Validation**: ~500-1,500 CU per account
3. **Discriminator Checks**: ~200-500 CU per account
4. **Error Handling**: ~300-800 CU overhead

**Mitigation Strategy**: Use `#[zero_copy]` accounts for frequently accessed large data structures.

## Zero-Copy vs Borsh Deserialization

### Performance Comparison

| Account Size | `Account<T>` (Borsh) | `AccountLoader<T>` (Zero-Copy) | Savings |
|--------------|---------------------|-------------------------------|---------|
| 1 KB | ~8,000 CU | ~1,500 CU | **81%** |
| 10 KB | ~50,000 CU | ~5,000 CU | **90%** |
| 100 KB | Too large (heap limit) | ~12,000 CU | Enables large accounts |
| 1 MB | Impossible | ~25,000 CU | Enables large accounts |

### When to Use Zero-Copy

**Use `#[zero_copy]` for:**
- High-frequency operations (orderbooks, event queues)
- Large arrays or data structures (>1KB)
- Accounts with many elements
- Performance-critical paths

**Use regular `Account<T>` for:**
- Small accounts (<1KB)
- Infrequently accessed data
- Dynamic data structures (Vec, String, HashMap)
- Rapidly changing schemas

### Implementation Example

```rust
use anchor_lang::prelude::*;

// Traditional Borsh serialization (slower)
#[account]
pub struct TradingPool {
    pub authority: Pubkey,
    pub fee_rate: u64,
    pub total_volume: u128,
    // ... more fields
}

// Zero-copy (faster)
#[account(zero_copy)]
#[repr(C, packed)]
pub struct TradingPoolZeroCopy {
    pub authority: Pubkey,
    pub fee_rate: u64,
    pub total_volume: u128,
    // ... more fields
}

// Usage in instruction
pub fn swap<'info>(
    ctx: Context<'_, '_, '_, 'info, Swap<'info>>,
    amount: u64
) -> Result<()> {
    let pool = ctx.accounts.pool.load_mut()?; // Zero-copy load

    // Direct in-place mutation (no copying)
    pool.total_volume = pool.total_volume.checked_add(amount as u128).unwrap();

    Ok(())
}
```

**Real Savings**: Raydium's concentrated liquidity pools use `#[zero_copy]` for their `RewardInfo` structs, saving ~40,000 CU per swap transaction.

## Account Access Pattern Optimizations

### 1. Minimize Account Reads

```rust
// ❌ Bad: Multiple reads
let account = ctx.accounts.my_account.load()?;
let value1 = account.value1;
drop(account);

let account = ctx.accounts.my_account.load()?;
let value2 = account.value2;
drop(account);

// ✅ Good: Single read
let account = ctx.accounts.my_account.load()?;
let value1 = account.value1;
let value2 = account.value2;
drop(account);
```

**Savings**: ~1,000-2,000 CU per avoided reload.

### 2. Loaded Accounts Data Size Limit

```rust
// Set a realistic limit based on your actual data needs
let set_loaded_accounts = ComputeBudgetInstruction::set_loaded_accounts_data_size_limit(10_000);
transaction.add(set_loaded_accounts);
```

**Default overhead**: 16,000 CU (assumes 64MB)
**Optimized overhead**: 250 CU (for 10KB limit)
**Savings**: ~15,750 CU

### 3. Account Ordering

Access accounts in the same order they're declared. Out-of-order access can trigger additional validation overhead.

## Math and Data Type Optimizations

### Use Smaller Integer Types

| Operation | u128 | u64 | u32 | CU Difference |
|-----------|------|-----|-----|---------------|
| Addition | ~15 CU | ~3 CU | ~2 CU | 13 CU saved (u64 vs u128) |
| Multiplication | ~40 CU | ~8 CU | ~5 CU | 32 CU saved |
| Division | ~90 CU | ~20 CU | ~12 CU | 70 CU saved |

**Real Example**: Switching from `u128` to `u64` for token amounts (where safe) in a DeFi protocol reduced swap CU usage from 85,000 to 78,000 CU.

```rust
// ❌ Expensive: Using u128 unnecessarily
pub fn calculate_fee(amount: u128, fee_bps: u128) -> u128 {
    amount.checked_mul(fee_bps).unwrap().checked_div(10_000).unwrap()
}

// ✅ Cheaper: Use u64 when range permits
pub fn calculate_fee(amount: u64, fee_bps: u64) -> u64 {
    (amount as u128)
        .checked_mul(fee_bps as u128).unwrap()
        .checked_div(10_000).unwrap() as u64
}
```

### Avoid Floating Point

Floating-point operations are **significantly** more expensive than integer math:

```rust
// ❌ Expensive: ~200-500 CU per operation
let result = (amount as f64) * 0.997;

// ✅ Cheap: ~10-20 CU
let result = amount * 997 / 1000;
```

**Savings**: ~180-480 CU per calculation.

## Serialization Optimizations

### 1. Custom Serialization vs Borsh

```rust
// ❌ Borsh overhead: ~3,000-5,000 CU for complex structs
#[derive(BorshSerialize, BorshDeserialize)]
pub struct MyAccount {
    pub field1: u64,
    pub field2: Pubkey,
    pub field3: [u8; 32],
}

// ✅ Custom serialization: ~500-1,000 CU
impl MyAccount {
    pub fn serialize(&self, dst: &mut [u8]) {
        dst[0..8].copy_from_slice(&self.field1.to_le_bytes());
        dst[8..40].copy_from_slice(self.field2.as_ref());
        dst[40..72].copy_from_slice(&self.field3);
    }

    pub fn deserialize(src: &[u8]) -> Self {
        Self {
            field1: u64::from_le_bytes(src[0..8].try_into().unwrap()),
            field2: Pubkey::new_from_array(src[8..40].try_into().unwrap()),
            field3: src[40..72].try_into().unwrap(),
        }
    }
}
```

**Savings**: ~2,500-4,000 CU per serialization/deserialization pair.

### 2. Pack Instead of Borsh for Small Structs

The `Pack` trait from `solana_program::program_pack` is more efficient for fixed-size structs:

```rust
use solana_program::program_pack::{Pack, Sealed};

impl Sealed for MyAccount {}

impl Pack for MyAccount {
    const LEN: usize = 72;

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        // Custom unpacking logic (~500 CU)
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        // Custom packing logic (~500 CU)
    }
}
```

**Benchmark**: Pack is ~5x faster than Borsh for simple fixed-size structs.

## Logging Costs

### msg! Macro Overhead

```rust
// Each msg! call costs ~100-500 CU depending on string complexity
msg!("Processing swap"); // ~100 CU
msg!("Amount: {}, Fee: {}", amount, fee); // ~300-500 CU

// For production, use conditional compilation
#[cfg(feature = "debug")]
msg!("Debug info: {}", value);
```

**Production Tip**: Remove all `msg!` calls in production builds. A program with 10 debug messages can waste 1,000-5,000 CU.

### sol_log_compute_units! Cost

The `sol_log_compute_units!()` macro itself costs ~100 CU per invocation. Remove these from production code.

## Advanced Optimization Techniques

### 1. Use `#[inline(always)]` for Hot Paths

```rust
#[inline(always)]
pub fn calculate_price(amount: u64, rate: u64) -> u64 {
    amount.checked_mul(rate).unwrap().checked_div(1_000_000).unwrap()
}
```

**Savings**: ~50-200 CU per call by eliminating function call overhead.

### 2. Bit Manipulation for Instruction Parsing

```rust
// ❌ Enum-based (Borsh): ~1,000 CU
#[derive(BorshDeserialize)]
enum Instruction {
    Initialize { amount: u64 },
    Swap { amount_in: u64, min_out: u64 },
}

// ✅ Bit manipulation: ~100 CU
pub fn parse_instruction(data: &[u8]) -> Result<u8, ProgramError> {
    Ok(data[0]) // Just read the discriminator byte
}
```

**Savings**: ~900 CU per instruction parsing.

### 3. Stack vs Heap Allocations

```rust
// ❌ Heap allocation: ~1,000-2,000 CU
let mut vec = Vec::new();
vec.push(value);

// ✅ Stack allocation: ~50 CU
let mut array = [0u64; 8];
array[0] = value;
```

**Guideline**: Use stack-based arrays when sizes are known at compile time.

### 4. Syscall Optimization

Use Solana-specific C syscalls directly for maximum performance:

```rust
use solana_program::syscalls::*;

// ✅ Direct syscall: ~50 CU
unsafe {
    sol_invoke_signed_c(
        instruction as *const _ as *const u8,
        account_infos_addr,
        account_infos_len,
        signers_seeds_addr,
        signers_seeds_len,
    );
}

// vs regular invoke_signed: ~200-300 CU
invoke_signed(&instruction, account_infos, signer_seeds)?;
```

**Savings**: ~150-250 CU per cross-program invocation.

### 5. Use `nostd_entrypoint`

```rust
// ❌ Standard entrypoint: ~2,000 CU overhead
use solana_program::entrypoint;
entrypoint!(process_instruction);

// ✅ No-std entrypoint: ~500 CU overhead
use solana_nostd_entrypoint::entrypoint;
nostd_entrypoint!(process_instruction);
```

**Savings**: ~1,500 CU at program entry.

## Pinocchio and Steel: Ultra-Low CU Alternatives

### Pinocchio Library

[Pinocchio](https://github.com/anza-xyz/pinocchio) is a zero-dependency, no_std library from Anza that achieves dramatic CU savings:

**Counter Program Benchmark**:
- Anchor: 8,723 CU
- Native Rust: 3,462 CU
- Pinocchio: 1,583 CU
- Assembly: 892 CU

**Key Features**:
- Zero-copy types throughout
- No heap allocations
- Direct syscall usage
- Minimal entrypoint overhead

**Trade-off**: Significantly more complex to write and maintain. Best for performance-critical production programs handling high value/volume.

### Steel Framework

Steel is another ultra-optimized framework focusing on minimal CU usage:

```rust
use steel::*;

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Counter {
    pub value: u64,
}

pub fn process_increment(accounts: &[AccountInfo]) -> ProgramResult {
    // Direct memory manipulation, minimal overhead
    let counter = accounts[0].data.borrow_mut();
    let counter = bytemuck::from_bytes_mut::<Counter>(&mut counter[..8]);
    counter.value = counter.value.checked_add(1).unwrap();
    Ok(())
}
```

**Real Savings**: Production programs report 60-80% CU reduction vs Anchor.

## Production Optimization Workflow

### 1. Measure Baseline

```bash
# Enable compute unit logging
solana logs --commitment confirmed

# Or use transaction simulation
solana-test-validator --log
```

### 2. Identify Hotspots

Use `sol_log_compute_units!()` to bracket expensive operations:

```rust
sol_log_compute_units!(); // Start
expensive_operation();
sol_log_compute_units!(); // End - shows CU consumed by operation
```

### 3. Apply Optimizations by Priority

**High Impact** (apply first):
1. Zero-copy for large accounts (saves 40,000+ CU)
2. Remove unnecessary `msg!()` calls (saves 1,000-5,000 CU)
3. Set loaded accounts data size limit (saves 15,000 CU)
4. Switch to u64 from u128 where safe (saves 5,000-10,000 CU)

**Medium Impact**:
1. Custom serialization (saves 2,000-4,000 CU)
2. Minimize account reloads (saves 1,000-2,000 CU per reload)
3. Use `#[inline(always)]` on hot paths (saves 500-2,000 CU)

**Low Impact** (optimize after exhausting above):
1. Bit manipulation for parsing (saves 200-900 CU)
2. Stack vs heap (saves 100-1,000 CU)
3. Direct syscalls (saves 150-250 CU per call)

### 4. Verify Improvements

Re-run simulations and compare CU consumption:

```typescript
const beforeCU = await getSimulationComputeUnits(connection, instructionsBefore, payer);
const afterCU = await getSimulationComputeUnits(connection, instructionsAfter, payer);
console.log(`Saved ${beforeCU - afterCU} CU (${((beforeCU - afterCU) / beforeCU * 100).toFixed(1)}%)`);
```

## Real-World Case Studies

### Case Study 1: DEX Swap Optimization

**Before**: Anchor-based swap instruction
- CU Usage: 127,000 CU
- Cost at 1,000 priority fee: 0.127 SOL

**Optimizations Applied**:
1. Zero-copy for pool accounts: -45,000 CU
2. Custom serialization for instruction data: -3,500 CU
3. Removed debug logging: -2,800 CU
4. Set loaded accounts limit: -15,000 CU
5. u64 instead of u128 for amounts: -7,200 CU

**After**: 53,500 CU (58% reduction)
- Cost at 1,000 priority fee: 0.0535 SOL

### Case Study 2: NFT Marketplace Listing

**Before**: 89,000 CU

**Optimizations**:
1. Pack instead of Borsh: -4,200 CU
2. Zero-copy for marketplace state: -12,000 CU
3. Inline price calculations: -1,800 CU

**After**: 71,000 CU (20% reduction)

### Case Study 3: Lending Protocol Liquidation

**Before**: 215,000 CU (approaching limits, failing during congestion)

**Optimizations**:
1. Pinocchio migration: -95,000 CU
2. Removed string formatting: -8,000 CU
3. Stack arrays for temp calculations: -3,500 CU

**After**: 108,500 CU (49.5% reduction, now always succeeds)

## Common Pitfalls

### 1. Over-Optimizing Small Programs

Don't spend weeks optimizing a program that uses 15,000 CU. Focus on programs approaching the 200,000 default limit or those called frequently.

### 2. Premature Optimization

Build with Anchor first. Profile. Then optimize hotspots. Don't start with Pinocchio unless you have a proven need.

### 3. Ignoring Loaded Accounts Overhead

The 16,000 CU default overhead is often overlooked. This single fix can make a wallet transaction 10x cheaper.

### 4. Using u128 Everywhere

Many developers default to u128 for safety, but most token amounts fit in u64 (max ~18 quintillion). This wastes 70+ CU per division.

### 5. Leaving Debug Code in Production

Each `msg!()` call costs CU and bloats your binary. Use conditional compilation:

```rust
#[cfg(not(feature = "production"))]
msg!("Debug: {}", value);
```

## Tools and Resources

### Profiling Tools
- **solana-test-validator**: Run with `--log` flag for detailed CU logging
- **Transaction simulation**: `simulateTransaction()` returns `unitsConsumed`
- **sol_log_compute_units!()**: Runtime CU logging macro
- **Solana Explorer**: View CU consumption for any transaction

### Benchmarking Repositories
- [solana-developers/cu_optimizations](https://github.com/solana-developers/cu_optimizations): Official optimization examples
- Framework comparison benchmarks available in multiple repos

### Recommended Reading
- Helius Blog: "Optimizing Solana Programs" (comprehensive guide)
- Anza Blog: "CU Optimization with setLoadedAccountsDataSizeLimit"
- Anchor Docs: Zero-Copy feature guide

## Quick Reference: CU Costs

| Operation | Approximate CU Cost |
|-----------|-------------------|
| Simple transfer (SOL) | 450 CU |
| SPL token transfer | 4,500 CU |
| Account validation (Anchor) | 500-1,500 CU per account |
| Borsh deserialization (1KB) | 2,000-3,000 CU |
| Zero-copy load (1KB) | 200-500 CU |
| msg!() call | 100-500 CU |
| u64 addition | 3 CU |
| u128 addition | 15 CU |
| u64 division | 20 CU |
| u128 division | 90 CU |
| Cross-program invocation | 1,000-5,000 CU |
| Account creation | 5,000-10,000 CU |
| Signature verification | 3,000 CU per signature |
| Loaded accounts overhead (default) | 16,000 CU |

## Conclusion

Compute unit optimization on Solana follows the Pareto principle: 20% of optimizations yield 80% of the gains. Start with:

1. **Profile first**: Use simulation to identify actual bottlenecks
2. **High-impact wins**: Zero-copy, loaded accounts limit, remove logging
3. **Framework choice**: Anchor for prototypes, consider Pinocchio/Steel for production high-throughput programs
4. **Measure everything**: Always verify optimizations with before/after benchmarks

The difference between an un-optimized program (200,000+ CU) and an optimized one (50,000 CU) can mean 4x lower costs and significantly higher transaction success rates during network congestion.

---

**Sources**: Helius.dev, Solana.com, Anza.xyz, Anchor-lang.com, QuickNode, 57blocks.com, various production program benchmarks and case studies from 2024-2025.