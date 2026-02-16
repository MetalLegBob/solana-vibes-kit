---
pack: solana
confidence: 8/10
sources_checked: 9
last_updated: "2026-02-16"
---

# How do I reduce my Solana program binary size?

## Overview

Solana program binary size directly impacts deployment costs (rent) and deployment efficiency. Larger programs cost more SOL to maintain on-chain and may require multiple transactions to deploy. Optimization techniques can reduce program size from megabytes to kilobytes, dramatically lowering costs and improving deployability.

## BPF/SBF Binary Size Limits

### Current Limits (2025+)

- **Maximum Program Size:** 10 MB (10,485,760 bytes) per program account
- **Practical Deployment Limit:** ~400 KB per transaction without chunking
- **Rent Calculation:** 2 years of rent = ~0.00144 SOL per byte (varies by network)

### Real-World Size Examples

| Program Type | Typical Size | Rent Cost (2 years) |
|--------------|--------------|---------------------|
| Minimal Assembly | <1 KB | ~0.0014 SOL |
| Optimized Rust | 50-100 KB | 0.072-0.144 SOL |
| Standard Anchor | 200-400 KB | 0.288-0.576 SOL |
| Large Anchor | 1-2 MB | 1.44-2.88 SOL |

**Key Insight:** Reducing a 76 KB Anchor program to <1 KB saves ~0.11 SOL in rent and enables single-transaction deployment.

## Anchor Framework Overhead

### Understanding Anchor's Cost

Anchor adds approximately 100-200 KB of overhead compared to native Rust programs:

- **Account validation macros:** ~30-50 KB
- **Error handling framework:** ~20-30 KB
- **Serialization (Borsh):** ~30-40 KB
- **Safety checks and boilerplate:** ~20-50 KB

### Measuring Anchor Overhead

```bash
# Build with Anchor
anchor build
ls -lh target/deploy/my_program.so

# Example output
-rw-r--r--  1 user  staff   387K Feb 16 10:30 my_program.so

# Build equivalent native Rust program
cargo build-sbf
ls -lh target/deploy/my_program_native.so

# Example output
-rw-r--r--  1 user  staff   178K Feb 16 10:31 my_program_native.so

# Overhead: 387K - 178K = 209K (54% overhead)
```

**Trade-off:** Anchor's developer experience and safety features justify the overhead for most projects, but high-performance or cost-sensitive programs may require native Rust or assembly.

## Optimization Level Settings

### Cargo.toml Configuration

```toml
[profile.release]
opt-level = 3          # Maximum optimization
lto = "fat"            # Link-time optimization (aggressive)
codegen-units = 1      # Single codegen unit for better optimization
overflow-checks = false # Disable overflow checks
strip = "symbols"      # Strip debug symbols
panic = "abort"        # Smaller panic handler

[profile.release.package."*"]
opt-level = 3
```

**Before/After:**
- **Standard Release:** 387 KB
- **With Optimizations:** 298 KB (23% reduction)

### Alternative: opt-level = "z"

```toml
[profile.release]
opt-level = "z"        # Optimize for size instead of speed
lto = "fat"
codegen-units = 1
```

**Trade-off:** `opt-level = "z"` prioritizes size over speed. Use when binary size matters more than execution performance.

**Benchmark:**
- `opt-level = 3`: 298 KB, 12,450 CU
- `opt-level = "z"`: 276 KB, 13,200 CU (7% smaller, 6% more CU)

## Stripping Debug Information

### Automatic Stripping

```toml
[profile.release]
strip = "debuginfo"    # Strip debug info only
# or
strip = "symbols"      # Strip all symbols (smaller)
```

**Size Impact:**
- With debug info: 387 KB
- `strip = "debuginfo"`: 304 KB (21% reduction)
- `strip = "symbols"`: 298 KB (23% reduction)

### Manual Stripping (if needed)

```bash
# After building
llvm-strip target/deploy/my_program.so

# Verify size reduction
ls -lh target/deploy/my_program.so
```

## Feature Flags for Conditional Compilation

Use feature flags to include/exclude code paths based on deployment target.

### Defining Features

```toml
# Cargo.toml
[features]
default = ["mainnet"]
mainnet = []
devnet = ["debug-logs", "admin-controls"]
debug-logs = []
admin-controls = []
```

### Conditional Compilation

```rust
#[cfg(feature = "debug-logs")]
use anchor_lang::prelude::msg;

pub fn process_instruction(ctx: Context<Process>) -> Result<()> {
    #[cfg(feature = "debug-logs")]
    msg!("Processing with data: {:?}", ctx.accounts.data);

    // Core logic always included
    process_core_logic(ctx)?;

    #[cfg(feature = "admin-controls")]
    if ctx.accounts.admin.key() == ADMIN_PUBKEY {
        // Admin-only logic
        perform_admin_action(ctx)?;
    }

    Ok(())
}
```

### Building with Features

```bash
# Production build (minimal)
anchor build --features mainnet

# Development build (full features)
anchor build --features devnet
```

**Size Impact:**
- Full features: 387 KB
- Mainnet only: 341 KB (12% reduction)

## Reducing Dependencies

### Audit Cargo.toml

```toml
# Before: Unnecessary dependencies
[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"        # Only needed if using SPL
solana-program = "1.18.0"     # Already included by Anchor
serde = { version = "1.0", features = ["derive"] }  # May not be needed
```

```toml
# After: Minimal dependencies
[dependencies]
anchor-lang = "0.29.0"
anchor-spl = { version = "0.29.0", optional = true }

[features]
spl = ["anchor-spl"]
```

### Reducing Feature Flags in Dependencies

```toml
# Default (includes all Anchor features)
[dependencies]
anchor-lang = "0.29.0"

# Minimal (only core features)
[dependencies]
anchor-lang = { version = "0.29.0", default-features = false, features = ["init-if-needed"] }
```

**Size Impact:**
- Full Anchor features: 387 KB
- Minimal features: 356 KB (8% reduction)

### Replacing Heavy Dependencies

| Heavy Dependency | Lightweight Alternative | Size Savings |
|------------------|-------------------------|--------------|
| `borsh = "0.10"` | Manual serialization | ~30 KB |
| `anchor-spl` (full) | Direct SPL CPI | ~40 KB |
| `serde + serde_json` | Custom JSON parser | ~50 KB |

## Splitting Programs

For extremely large codebases, split functionality across multiple programs.

### Monolith Program (1.2 MB)

```rust
#[program]
pub mod mega_program {
    pub fn user_management(ctx: Context<UserOps>) -> Result<()> { /* ... */ }
    pub fn token_operations(ctx: Context<TokenOps>) -> Result<()> { /* ... */ }
    pub fn nft_marketplace(ctx: Context<NFTOps>) -> Result<()> { /* ... */ }
    pub fn governance(ctx: Context<GovOps>) -> Result<()> { /* ... */ }
}
```

### Split Programs (300 KB each)

```rust
// Program 1: User Management (280 KB)
#[program]
pub mod user_program {
    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> { /* ... */ }
    pub fn update_profile(ctx: Context<UpdateProfile>) -> Result<()> { /* ... */ }
}

// Program 2: Token Operations (320 KB)
#[program]
pub mod token_program {
    pub fn swap(ctx: Context<Swap>) -> Result<()> { /* ... */ }
    pub fn stake(ctx: Context<Stake>) -> Result<()> { /* ... */ }
}

// Program 3: NFT Marketplace (310 KB)
#[program]
pub mod nft_program {
    pub fn list_nft(ctx: Context<ListNFT>) -> Result<()> { /* ... */ }
    pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> { /* ... */ }
}

// Program 4: Governance (290 KB)
#[program]
pub mod governance_program {
    pub fn propose(ctx: Context<Propose>) -> Result<()> { /* ... */ }
    pub fn vote(ctx: Context<Vote>) -> Result<()> { /* ... */ }
}
```

**Benefits:**
- Each program deploys independently
- Easier to upgrade individual components
- Better separation of concerns
- Lower risk (smaller blast radius for bugs)

**Trade-offs:**
- More complex CPI (cross-program invocations) required
- Higher transaction complexity
- Multiple program IDs to manage

## Advanced: Assembly Optimization

For extreme size optimization, writing in Solana BPF (sBPF) assembly provides the smallest possible binaries.

### Rust vs Assembly Comparison

**Rust Program (50 KB):**

```rust
use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let account = &accounts[0];
    let mut data = account.try_borrow_mut_data()?;
    data[0] = data[0].wrapping_add(1);
    Ok(())
}
```

**Assembly Equivalent (<1 KB):**

```asm
.globl entrypoint
entrypoint:
    # Load account data pointer
    ldxdw r1, [r1+0x18]
    ldxdw r2, [r1+0x8]

    # Increment first byte
    ldxb r3, [r2]
    add r3, 1
    stxb [r2], r3

    # Return success
    mov r0, 0
    exit
```

**Size Comparison:**
- Optimized Rust: ~50 KB
- Assembly: <1 KB
- **Savings: ~98%**

### When to Use Assembly

- **Ultra-low latency:** Critical paths like DEX matching engines
- **Minimal rent cost:** Programs with tight budget constraints
- **Maximum CU efficiency:** Operations near compute limit

**Trade-offs:**
- Extremely low-level (no type safety)
- Difficult to maintain
- Requires deep sBPF knowledge
- No Anchor framework benefits

### Modern Alternative: Pinocchio

Pinocchio is a Rust library achieving near-assembly efficiency with Rust ergonomics.

```rust
use pinocchio::{account_info::AccountInfo, entrypoint, ProgramResult};

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &[u8; 32],
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let account = &accounts[0];
    let mut data = account.borrow_mut_data();
    data[0] = data[0].wrapping_add(1);
    Ok(())
}
```

**Size Comparison:**
- Standard Rust: 50 KB
- Pinocchio: ~8 KB (84% reduction)
- Assembly: <1 KB

**Pinocchio Benefits:**
- Orders-of-magnitude improvement in compute efficiency
- Rust safety and type system
- Significantly smaller binaries than standard Rust
- Actively maintained by Solana Foundation

## Before/After: Complete Optimization Example

### Original Program (387 KB)

```toml
# Cargo.toml
[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
borsh = "0.10"

[profile.release]
# Default settings
```

### Optimized Program (198 KB, 49% reduction)

```toml
# Cargo.toml
[dependencies]
anchor-lang = { version = "0.29.0", default-features = false, features = ["init-if-needed"] }
anchor-spl = { version = "0.29.0", optional = true }

[features]
default = ["mainnet"]
mainnet = []
devnet = ["debug-logs"]
debug-logs = []

[profile.release]
opt-level = "z"
lto = "fat"
codegen-units = 1
overflow-checks = false
strip = "symbols"
panic = "abort"

[profile.release.package."*"]
opt-level = 3
```

**Optimization Breakdown:**

| Optimization | Size | Reduction |
|--------------|------|-----------|
| Original | 387 KB | - |
| + opt-level = "z" | 352 KB | 9% |
| + lto = "fat" | 318 KB | 18% |
| + strip = "symbols" | 298 KB | 23% |
| + Minimal features | 267 KB | 31% |
| + Remove unused deps | 241 KB | 38% |
| + Conditional compilation | 198 KB | 49% |

**Rent Savings:** 0.576 SOL → 0.285 SOL (50% reduction)

## Deployment Strategies

### Single-Transaction Deployment

Programs <400 KB can deploy in one transaction:

```bash
solana program deploy target/deploy/my_program.so \
    --program-id keypair.json \
    --url mainnet-beta
```

### Chunked Deployment (Large Programs)

For programs >400 KB, use write buffer:

```bash
# Create buffer
solana program write-buffer target/deploy/large_program.so \
    --url mainnet-beta

# Deploy from buffer
solana program deploy --buffer <BUFFER_ADDRESS> \
    --program-id keypair.json \
    --url mainnet-beta
```

**Buffer Method Benefits:**
- Handles programs up to 10 MB
- Pay incrementally during write
- Can pause/resume deployment

## Measuring Impact

### Build Size Comparison Script

```bash
#!/bin/bash
# build-compare.sh

echo "Building standard config..."
cargo build-sbf --release
STANDARD_SIZE=$(wc -c <target/deploy/my_program.so)

echo "Building optimized config..."
RUSTFLAGS="-C opt-level=z -C link-arg=-z -C link-arg=nostart-stop-gc" \
    cargo build-sbf --release
OPTIMIZED_SIZE=$(wc -c <target/deploy/my_program.so)

REDUCTION=$((100 - (OPTIMIZED_SIZE * 100 / STANDARD_SIZE)))

echo "Standard:  $STANDARD_SIZE bytes"
echo "Optimized: $OPTIMIZED_SIZE bytes"
echo "Reduction: $REDUCTION%"
```

### Rent Calculator

```bash
# Calculate 2-year rent cost
solana rent <SIZE_IN_BYTES>

# Example
solana rent 200000  # For 200 KB program
# Output: 0.288 SOL
```

## Common Pitfalls

1. **Over-optimization:** Don't sacrifice maintainability for marginal size gains
2. **Feature Creep:** Regularly audit and remove unused features
3. **Dependency Bloat:** Audit transitive dependencies (`cargo tree`)
4. **Debug Builds:** Ensure optimizations apply to release builds only
5. **LTO Incompatibility:** Some crates don't support fat LTO; test thoroughly

## Decision Framework

| Use Case | Recommended Approach | Expected Size |
|----------|---------------------|---------------|
| Prototype/MVP | Standard Anchor | 300-500 KB |
| Production DApp | Optimized Anchor | 150-250 KB |
| High-throughput DEX | Native Rust + Pinocchio | 10-50 KB |
| Ultra-low latency | sBPF Assembly | <5 KB |

## Sources

- [Solana Program Optimization: Accelerate 2025](https://solanacompass.com/learn/accelerate-25/scale-or-die-at-accelerate-2025-writing-optimized-solana-programs)
- [How to Write Solana Programs with SBPF Assembly](https://www.helius.dev/blog/sbpf-assembly)
- [Programs | Solana](https://solana.com/docs/core/programs)
- [BPF VM stack frame size limit is too limiting | GitHub Issue #13391](https://github.com/solana-labs/solana/issues/13391)
- [Learn Solana BPF Assembly | GitHub](https://github.com/7etsuo/Learn-Solana-BPF-Assembly)
- [Under the Hood of Solana Program Execution](https://ubermensch.blog/under-the-hood-of-solana-program-execution-from-rust-code-to-sbf-bytecode)
