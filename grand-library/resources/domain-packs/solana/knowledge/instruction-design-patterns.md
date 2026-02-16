---
pack: solana
confidence: 8/10
sources_checked: 10
last_updated: "2026-02-16"
---

# How do I design efficient instruction sets for my program?

## Overview

Instruction set design fundamentally impacts user experience, transaction costs, and program maintainability. Well-designed instructions balance granularity (doing enough per instruction), atomicity (ensuring consistent state), compute efficiency (staying within CU limits), and composability (enabling multi-instruction workflows).

## Instruction Granularity: Fine-Grained vs Coarse

### Fine-Grained Instructions

Separate instructions for each atomic operation.

```rust
#[program]
pub mod fine_grained {
    pub fn create_order(ctx: Context<CreateOrder>, price: u64) -> Result<()> {
        ctx.accounts.order.price = price;
        ctx.accounts.order.status = OrderStatus::Open;
        Ok(())
    }

    pub fn fund_order(ctx: Context<FundOrder>, amount: u64) -> Result<()> {
        // Transfer funds to escrow
        transfer_to_escrow(ctx, amount)?;
        ctx.accounts.order.funded = true;
        Ok(())
    }

    pub fn activate_order(ctx: Context<ActivateOrder>) -> Result<()> {
        require!(ctx.accounts.order.funded, ErrorCode::NotFunded);
        ctx.accounts.order.status = OrderStatus::Active;
        Ok(())
    }
}
```

**Client Usage (3 transactions):**

```typescript
// Transaction 1: Create
await program.methods.createOrder(price).rpc();

// Transaction 2: Fund
await program.methods.fundOrder(amount).rpc();

// Transaction 3: Activate
await program.methods.activateOrder().rpc();
```

**Advantages:**
- Simpler instruction logic (easier to audit)
- Lower CU per instruction
- More flexible composition

**Disadvantages:**
- 3x transaction fees
- 3x network latency
- Risk of partial completion (order created but never funded)

### Coarse-Grained Instructions

Combine related operations into a single instruction.

```rust
#[program]
pub mod coarse_grained {
    pub fn create_and_fund_order(
        ctx: Context<CreateAndFundOrder>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        // Create order
        ctx.accounts.order.price = price;
        ctx.accounts.order.status = OrderStatus::Open;

        // Fund order
        transfer_to_escrow(ctx, amount)?;
        ctx.accounts.order.funded = true;

        // Activate
        ctx.accounts.order.status = OrderStatus::Active;

        Ok(())
    }
}
```

**Client Usage (1 transaction):**

```typescript
// Single transaction: Create + Fund + Activate
await program.methods.createAndFundOrder(price, amount).rpc();
```

**Advantages:**
- 1x transaction fee (67% cost reduction)
- Atomic (all-or-nothing)
- Better UX (one confirmation)

**Disadvantages:**
- Higher CU per instruction
- Less flexible (cannot fund later)
- More complex logic

### Hybrid Approach (Recommended)

Provide both fine-grained and coarse-grained instructions.

```rust
#[program]
pub mod hybrid {
    // Coarse-grained (common path)
    pub fn create_and_fund_order(
        ctx: Context<CreateAndFundOrder>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        create_order_internal(&mut ctx.accounts.order, price)?;
        fund_order_internal(ctx, amount)?;
        Ok(())
    }

    // Fine-grained (advanced users)
    pub fn create_order(ctx: Context<CreateOrder>, price: u64) -> Result<()> {
        create_order_internal(&mut ctx.accounts.order, price)
    }

    pub fn fund_order(ctx: Context<FundOrder>, amount: u64) -> Result<()> {
        fund_order_internal(ctx, amount)
    }
}
```

**Best Practice:** Optimize for the common case with coarse-grained instructions, but provide fine-grained alternatives for power users.

## Batching Multiple Operations in One Transaction

Solana transactions can contain multiple instructions, enabling atomic multi-step operations.

### Basic Multi-Instruction Transaction

```typescript
import { Transaction } from "@solana/web3.js";

async function batchOperations() {
    const tx = new Transaction();

    // Add multiple instructions
    tx.add(
        await program.methods.createUser().instruction(),
        await program.methods.depositFunds(amount).instruction(),
        await program.methods.subscribe(tier).instruction()
    );

    // Execute atomically
    const signature = await provider.sendAndConfirm(tx);
    return signature;
}
```

**Key Property:** All instructions succeed or all fail—no partial execution.

### Real-World Example: DEX Swap with Referral

```rust
#[program]
pub mod dex {
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        // Perform swap logic
        let amount_out = calculate_swap(amount_in, &ctx.accounts.pool)?;

        require!(
            amount_out >= minimum_amount_out,
            ErrorCode::SlippageExceeded
        );

        execute_swap(ctx, amount_in, amount_out)?;

        Ok(())
    }

    pub fn pay_referral_fee(
        ctx: Context<PayReferral>,
        amount: u64,
    ) -> Result<()> {
        transfer_tokens(
            ctx.accounts.fee_payer.to_account_info(),
            ctx.accounts.referrer.to_account_info(),
            amount,
        )?;
        Ok(())
    }
}
```

**Client-Side Batching:**

```typescript
async function swapWithReferral(
    amountIn: number,
    minOut: number,
    referrer: PublicKey
) {
    const tx = new Transaction();

    // Instruction 1: Perform swap
    tx.add(
        await program.methods
            .swap(new BN(amountIn), new BN(minOut))
            .accounts({ /* ... */ })
            .instruction()
    );

    // Instruction 2: Pay referral (5% of output)
    const referralFee = Math.floor(minOut * 0.05);
    tx.add(
        await program.methods
            .payReferralFee(new BN(referralFee))
            .accounts({ referrer, /* ... */ })
            .instruction()
    );

    return await provider.sendAndConfirm(tx);
}
```

**Benefits:**
- Atomic swap + referral payment
- Single transaction fee
- Guaranteed referral payment (no separate tx that might fail)

## Atomic Multi-Instruction Patterns

### Pattern 1: Setup → Execute → Cleanup

```typescript
async function atomicWorkflow() {
    const tx = new Transaction();

    // Setup: Create temporary accounts
    tx.add(
        await program.methods.createTempAccount().instruction()
    );

    // Execute: Core business logic
    tx.add(
        await program.methods.processData().instruction()
    );

    // Cleanup: Close temporary accounts
    tx.add(
        await program.methods.closeTempAccount().instruction()
    );

    return await provider.sendAndConfirm(tx);
}
```

**Use Case:** Operations requiring temporary state that should not persist.

### Pattern 2: Validate → Execute

```rust
#[program]
pub mod validated_execution {
    pub fn validate_state(ctx: Context<Validate>) -> Result<()> {
        // Pre-execution checks
        require!(ctx.accounts.state.is_valid, ErrorCode::InvalidState);
        require!(ctx.accounts.state.balance > 0, ErrorCode::InsufficientBalance);
        Ok(())
    }

    pub fn execute_operation(ctx: Context<Execute>) -> Result<()> {
        // Main operation (assumes validation passed)
        perform_operation(ctx)?;
        Ok(())
    }
}
```

**Client-Side:**

```typescript
const tx = new Transaction();
tx.add(
    await program.methods.validateState().instruction(),
    await program.methods.executeOperation().instruction()
);
```

**Benefit:** If validation fails, execution never happens (saves CU on failed transactions).

### Pattern 3: Parallel Operations

For independent operations that don't conflict on accounts.

```rust
#[program]
pub mod parallel_ops {
    pub fn update_profile(ctx: Context<UpdateProfile>, name: String) -> Result<()> {
        ctx.accounts.profile.name = name;
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        ctx.accounts.reward_vault.transfer_to_user()?;
        Ok(())
    }

    pub fn refresh_timestamp(ctx: Context<RefreshTimestamp>) -> Result<()> {
        ctx.accounts.state.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}
```

**Client-Side Batching:**

```typescript
// These can be batched since they touch different accounts
const tx = new Transaction();
tx.add(
    await program.methods.updateProfile("Alice").instruction(),
    await program.methods.claimReward().instruction(),
    await program.methods.refreshTimestamp().instruction()
);
```

**Solana Optimization:** The runtime can parallelize instructions that access different accounts, improving throughput.

## Optional Accounts Pattern

Some instructions need flexibility based on user intent.

### Approach 1: UncheckedAccount with Manual Validation

```rust
#[derive(Accounts)]
pub struct ConditionalOperation<'info> {
    pub required: Account<'info, Required>,

    /// CHECK: Only used if flag is set
    pub optional: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
}

pub fn conditional_op(
    ctx: Context<ConditionalOperation>,
    use_optional: bool,
) -> Result<()> {
    if use_optional {
        // Validate only when used
        let optional_account = Account::<OptionalType>::try_from(
            &ctx.accounts.optional
        )?;

        // Use the account
        process_optional(optional_account)?;
    }

    process_required(&ctx.accounts.required)?;
    Ok(())
}
```

**Client-Side:**

```typescript
// With optional account
await program.methods
    .conditionalOp(true)
    .accounts({
        required: requiredPda,
        optional: optionalPda,
        authority: authority.publicKey,
    })
    .rpc();

// Without optional account (pass system program or dummy)
await program.methods
    .conditionalOp(false)
    .accounts({
        required: requiredPda,
        optional: SystemProgram.programId,
        authority: authority.publicKey,
    })
    .rpc();
```

### Approach 2: Multiple Instructions

```rust
pub fn operation_without_optional(ctx: Context<BaseOp>) -> Result<()> {
    process_base(&ctx.accounts)?;
    Ok(())
}

pub fn operation_with_optional(ctx: Context<OptionalOp>) -> Result<()> {
    process_base(&ctx.accounts.base)?;
    process_optional(&ctx.accounts.optional)?;
    Ok(())
}
```

**Trade-off:** More instructions to maintain, but clearer validation and no runtime branching.

## Instruction Data Encoding Efficiency

### Inefficient: Large Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Operation {
    Swap { amount_in: u64, min_out: u64 },
    AddLiquidity { amount_a: u64, amount_b: u64 },
    RemoveLiquidity { shares: u64 },
    // ... 20 more variants
}

pub fn execute(ctx: Context<Execute>, op: Operation) -> Result<()> {
    match op {
        Operation::Swap { amount_in, min_out } => { /* ... */ },
        // ... handle all variants
    }
    Ok(())
}
```

**Problem:** Borsh serializes the entire enum, including unused fields.

### Efficient: Separate Instructions

```rust
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_out: u64,
) -> Result<()> {
    // Only serialize what's needed
    execute_swap(ctx, amount_in, min_out)
}

pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
) -> Result<()> {
    execute_add_liquidity(ctx, amount_a, amount_b)
}
```

**Benefit:** Smaller instruction data, faster serialization, clearer intent.

### Data Packing for Complex Parameters

```rust
// Instead of multiple u64 parameters
pub fn inefficient(
    ctx: Context<Op>,
    param1: u64,
    param2: u64,
    param3: u64,
    param4: u64,
) -> Result<()> { /* ... */ }

// Pack into a struct
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct OpParams {
    pub param1: u64,
    pub param2: u64,
    pub param3: u64,
    pub param4: u64,
}

pub fn efficient(
    ctx: Context<Op>,
    params: OpParams,
) -> Result<()> { /* ... */ }
```

**Benefit:** Easier to extend, better organization, same serialization size.

## Discriminator Design

Anchor automatically generates 8-byte discriminators (hash of instruction name).

### Standard Discriminator

```rust
// Anchor generates:
// SHA256("global:initialize")[..8]
pub fn initialize(ctx: Context<Initialize>) -> Result<()> { /* ... */ }
```

**Discriminator:** 8 bytes prepended to instruction data.

### Custom Discriminators (Advanced)

```rust
use anchor_lang::prelude::*;

#[program]
pub mod custom_discriminator {
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Manual discriminator handling
        Ok(())
    }
}

// Override discriminator in IDL (manual editing)
// "discriminator": [1, 2, 3, 4, 5, 6, 7, 8]
```

**Use Case:** Migrating from non-Anchor programs or creating custom encoding schemes.

### Discriminator Collisions

Extremely rare due to SHA256, but verify in IDL:

```bash
# Check generated discriminators
cat target/idl/my_program.json | jq '.instructions[] | {name: .name, discriminator: .discriminator}'
```

## Versioning Instructions

Programs evolve; instruction sets must support backward compatibility.

### Approach 1: Versioned Instructions

```rust
#[program]
pub mod versioned {
    // V1: Original
    pub fn swap_v1(
        ctx: Context<SwapV1>,
        amount_in: u64,
    ) -> Result<()> {
        execute_swap_v1(ctx, amount_in)
    }

    // V2: Added slippage protection
    pub fn swap_v2(
        ctx: Context<SwapV2>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        execute_swap_v2(ctx, amount_in, min_amount_out)
    }
}
```

**Benefit:** Old clients continue to work; new clients use improved version.

### Approach 2: Versioned Parameters

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum SwapParams {
    V1 { amount_in: u64 },
    V2 { amount_in: u64, min_amount_out: u64 },
}

pub fn swap(
    ctx: Context<Swap>,
    params: SwapParams,
) -> Result<()> {
    match params {
        SwapParams::V1 { amount_in } => {
            // V1 behavior (no slippage check)
            execute_swap_v1(ctx, amount_in)
        }
        SwapParams::V2 { amount_in, min_amount_out } => {
            // V2 behavior (with slippage check)
            execute_swap_v2(ctx, amount_in, min_amount_out)
        }
    }
}
```

**Benefit:** Single instruction, multiple versions via enum.

### Approach 3: Optional Parameters

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SwapParams {
    pub amount_in: u64,
    pub min_amount_out: Option<u64>, // None = V1 behavior
}

pub fn swap(
    ctx: Context<Swap>,
    params: SwapParams,
) -> Result<()> {
    let amount_out = calculate_swap(params.amount_in)?;

    if let Some(min) = params.min_amount_out {
        require!(amount_out >= min, ErrorCode::SlippageExceeded);
    }

    execute_swap(ctx, params.amount_in, amount_out)
}
```

**Benefit:** Backward compatible without multiple instructions.

## Transaction Size Constraints

Transactions are limited to ~1232 bytes.

### Avoiding Oversized Transactions

```rust
// BAD: Large strings or vectors in instruction data
pub fn bad_instruction(
    ctx: Context<Bad>,
    data: Vec<u8>, // Could be huge!
) -> Result<()> { /* ... */ }

// GOOD: Store large data in accounts
pub fn good_instruction(
    ctx: Context<Good>,
    data_account: Account<'info, DataStorage>,
) -> Result<()> {
    // Read from account data instead
    let data = &data_account.data;
    Ok(())
}
```

### Multi-Transaction Pattern for Large Data

```rust
// Step 1: Initialize storage
pub fn init_data_storage(
    ctx: Context<InitDataStorage>,
    total_size: u32,
) -> Result<()> {
    ctx.accounts.storage.total_size = total_size;
    ctx.accounts.storage.written = 0;
    Ok(())
}

// Step 2: Write chunks
pub fn write_chunk(
    ctx: Context<WriteChunk>,
    chunk: Vec<u8>,
    offset: u32,
) -> Result<()> {
    let storage = &mut ctx.accounts.storage;
    let data = &mut storage.data;

    // Write chunk at offset
    data[offset as usize..(offset as usize + chunk.len())]
        .copy_from_slice(&chunk);

    storage.written += chunk.len() as u32;
    Ok(())
}

// Step 3: Finalize
pub fn finalize_data(ctx: Context<FinalizeData>) -> Result<()> {
    require!(
        ctx.accounts.storage.written == ctx.accounts.storage.total_size,
        ErrorCode::IncompleteData
    );
    Ok(())
}
```

**Client-Side:**

```typescript
// Split data into chunks
const CHUNK_SIZE = 800; // Leave room for other tx data
const chunks = chunkArray(largeData, CHUNK_SIZE);

for (let i = 0; i < chunks.length; i++) {
    await program.methods
        .writeChunk(chunks[i], i * CHUNK_SIZE)
        .rpc();
}

await program.methods.finalizeData().rpc();
```

## Compute Budget Optimization

Instructions can request compute budget adjustments.

### Setting Compute Budget (Client-Side)

```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

async function expensiveOperation() {
    const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400_000, // Request more CU
    });

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1_000, // Priority fee
    });

    const tx = new Transaction();
    tx.add(computeIx, priorityIx);
    tx.add(await program.methods.expensiveOp().instruction());

    return await provider.sendAndConfirm(tx);
}
```

**Best Practice:** Request only what you need; excess CU is wasted.

## Real-World Design Example: NFT Marketplace

```rust
#[program]
pub mod nft_marketplace {
    // Coarse-grained (90% of users)
    pub fn list_and_transfer_nft(
        ctx: Context<ListAndTransfer>,
        price: u64,
    ) -> Result<()> {
        list_nft_internal(ctx, price)?;
        transfer_to_escrow(ctx)?;
        Ok(())
    }

    // Fine-grained (advanced users)
    pub fn list_nft(ctx: Context<ListNFT>, price: u64) -> Result<()> {
        list_nft_internal(ctx, price)
    }

    pub fn transfer_nft_to_escrow(ctx: Context<TransferToEscrow>) -> Result<()> {
        transfer_to_escrow(ctx)
    }

    // Batch buy multiple NFTs
    pub fn buy_multiple_nfts(
        ctx: Context<BuyMultiple>,
        listing_ids: Vec<u64>,
    ) -> Result<()> {
        for listing_id in listing_ids {
            buy_nft_internal(ctx, listing_id)?;
        }
        Ok(())
    }

    // Atomic cancel + relist
    pub fn cancel_and_relist(
        ctx: Context<CancelAndRelist>,
        new_price: u64,
    ) -> Result<()> {
        cancel_listing_internal(ctx)?;
        list_nft_internal(ctx, new_price)?;
        Ok(())
    }
}
```

**Design Decisions:**
1. **Coarse-grained default:** `list_and_transfer_nft` covers common case
2. **Fine-grained escape hatch:** `list_nft` + `transfer_nft_to_escrow` for flexibility
3. **Batch operations:** `buy_multiple_nfts` reduces tx overhead
4. **Atomic workflows:** `cancel_and_relist` ensures no gaps

## Common Pitfalls

1. **Too Many Instructions:** Over-granularity increases tx costs and latency
2. **Too Few Instructions:** Monolithic instructions hit CU limits
3. **Non-Atomic Operations:** Related steps split across txs risk partial completion
4. **Large Instruction Data:** Exceeds tx size limit
5. **Missing Optional Paths:** Forces users into one-size-fits-all instructions

## Performance Benchmarks

| Pattern | Transactions | Total Fees | Latency | CU Usage |
|---------|--------------|------------|---------|----------|
| Fine-grained (3 instructions) | 3 | 15,000 lamports | ~1200ms | 3 × 5,000 CU |
| Coarse-grained (1 instruction) | 1 | 5,000 lamports | ~400ms | 12,000 CU |
| Batched (3 in 1 tx) | 1 | 5,000 lamports | ~400ms | 15,000 CU |

**Key Insight:** Batching 3 instructions saves 66% on fees and 66% on latency with only 20% more CU.

## Sources

- [Ultimate Solana Optimization Guide 2024](https://www.rapidinnovation.io/post/solana-optimization-and-best-practices-guide)
- [Batch Transactions on Solana for Improved Efficiency](https://blockchain.oodles.io/dev-blog/batch-transactions-solana/)
- [Solana: Instructions and Messages | Chainstack](https://chainstack.com/solana-instructions-and-messages/)
- [Understanding Transactions and Instructions in Solana](https://medium.com/@mirmohmmadluqman/understanding-transactions-and-instructions-in-solana-a-clear-guide-9860047c5527)
- [The Solana Programming Model | Helius](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana)
- [Solana Fundamentals Reference Guide | Quicknode](https://www.quicknode.com/guides/solana-development/getting-started/solana-fundamentals-reference-guide)
- [Rust Program Structure | Solana](https://solana.com/docs/programs/rust/program-structure)
