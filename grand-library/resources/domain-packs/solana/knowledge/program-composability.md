---
pack: solana
confidence: 8/10
sources_checked: 14
last_updated: "2026-02-16"
---

# How do I build programs that other programs can integrate with?

Composability on Solana—the ability for programs to call other programs—is the foundation of DeFi protocols, NFT marketplaces, and complex multi-program workflows. Unlike Ethereum's implicit composability (any contract can call any other via ABI), Solana requires explicit CPI (Cross-Program Invocation) design. Programs must be intentionally designed to be called by other programs, or integration becomes brittle and error-prone.

## Cross-Program Invocations (CPI) Basics

A CPI is when one program invokes an instruction on another program. This is how Solana achieves composability.

### Simple CPI Example (Anchor)

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    // Call the SPL Token program's transfer instruction
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

**Key components**:
1. **CpiContext**: Wraps the target program and accounts for the CPI
2. **Accounts struct**: Defines which accounts the target instruction expects
3. **Invoke**: Anchor's CPI helper functions (e.g., `token::transfer`) handle serialization and invocation

### CPI Depth Limit

**Critical constraint**: CPIs can be nested up to 4 levels deep.

```
User Transaction (depth 0)
  └─> Program A (depth 1)
       └─> Program B (depth 2)
            └─> Program C (depth 3)
                 └─> Program D (depth 4)
                      └─> Program E ❌ FAILS (exceeds depth limit)
```

**Design implication**: Complex workflows (e.g., Jupiter aggregator routing through 5+ DEXs) must be flattened or batched across multiple transactions.

## Designing CPI-Friendly Interfaces

### Principle 1: Expose Granular Instructions

**Bad design** (monolithic instruction):
```rust
// Single instruction that does everything
pub fn swap_and_stake(
    ctx: Context<SwapAndStake>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    // 1. Swap tokens via DEX
    // 2. Stake received tokens
    // 3. Update user rewards
    // ... all in one instruction
}
```

**Problem**: External programs can't reuse individual steps (e.g., "just swap" without staking).

**Good design** (granular instructions):
```rust
// Separate instructions for each atomic operation
pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
    // Just the swap logic
}

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    // Just the staking logic
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    // Just the rewards logic
}
```

**Benefit**: Composable programs can call `swap` + `stake` + `claim_rewards` independently, enabling custom workflows.

**Real example**: Marinade Finance exposes `deposit`, `withdraw`, `claim_rewards` as separate instructions, allowing integrators to build custom liquid staking flows.

### Principle 2: Design Accounts for External Callers

**Problem**: Accounts with implicit dependencies (e.g., "authority must be the program PDA") prevent external callers from using the instruction.

**Bad design**:
```rust
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        constraint = authority.key() == vault.authority,  // ❌ Hardcoded authority
    )]
    pub authority: Signer<'info>,
}
```

If an external program calls this instruction, it can't pass its own authority—only the vault's hardcoded authority works.

**Good design**:
```rust
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    // ✅ Accept any signer; validate authority in instruction logic
    pub authority: Signer<'info>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Validate authority (flexible for CPI callers)
    require!(
        ctx.accounts.authority.key() == vault.authority ||
        ctx.accounts.authority.key() == vault.delegate,
        ErrorCode::Unauthorized
    );

    // Deposit logic...
    Ok(())
}
```

**Principle**: Design accounts to accept parameters, not hardcode assumptions.

### Principle 3: PDA Authority Delegation

Programs that accept CPIs often use PDAs as "authority delegates" to sign on behalf of the calling program.

**Pattern**: Delegated PDA authority

```rust
#[derive(Accounts)]
pub struct DepositViaCpi<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    /// CHECK: This account can be any PDA; the vault validates it
    pub delegate_authority: AccountInfo<'info>,
    pub user: Signer<'info>,
}

pub fn deposit_via_cpi(ctx: Context<DepositViaCpi>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // Validate that delegate_authority is authorized
    require!(
        vault.is_authorized_delegate(&ctx.accounts.delegate_authority.key()),
        ErrorCode::UnauthorizedDelegate
    );

    // Proceed with deposit using delegate_authority as signer...
    Ok(())
}
```

**Real example**: Jupiter's aggregator uses a "route authority" PDA that signs swaps on behalf of the user, allowing the aggregator to compose multiple DEX calls in a single transaction.

## Anchor CPI Module Generation

Anchor automatically generates CPI helpers from your program's IDL (Interface Definition Language).

### Exporting the CPI Module

In your program's `lib.rs`:
```rust
// Generate CPI helpers for external programs
#[cfg(not(feature = "no-entrypoint"))]
pub mod cpi;
```

This creates a `cpi` module that external programs can import:

```toml
# External program's Cargo.toml
[dependencies]
my_program = { path = "../my_program", features = ["cpi"] }
```

### Using Generated CPI Helpers

```rust
use my_program::cpi::accounts::Deposit;
use my_program::cpi::deposit;

pub fn call_my_program_deposit(ctx: Context<CallDeposit>, amount: u64) -> Result<()> {
    let cpi_accounts = Deposit {
        vault: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        user: ctx.accounts.user.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.my_program.to_account_info(),
        cpi_accounts,
    );

    deposit(cpi_ctx, amount)?;
    Ok(())
}
```

**Benefit**: Type-safe CPIs with compile-time checks for account structures.

## Versioning Your Interface

**Problem**: Programs are immutable once deployed. If you change an instruction's account structure, external integrators break.

**Solution**: Version your instructions explicitly.

```rust
// v1 instruction (legacy)
pub fn deposit_v1(ctx: Context<DepositV1>, amount: u64) -> Result<()> {
    // Old logic
}

// v2 instruction (new features)
pub fn deposit_v2(
    ctx: Context<DepositV2>,
    amount: u64,
    slippage_bps: u16,  // New parameter
) -> Result<()> {
    // New logic with slippage protection
}
```

**Alternatively**, use a "feature flags" account:
```rust
#[account]
pub struct ProtocolConfig {
    pub version: u8,
    pub features_enabled: u64,  // Bitflags for features
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    if config.version >= 2 && config.features_enabled & FEATURE_SLIPPAGE != 0 {
        // Use v2 logic with slippage checks
    } else {
        // Use v1 logic
    }
}
```

**Real example**: Serum DEX has multiple instruction versions (v1, v2, v3) to support legacy integrators while adding new features.

## Error Handling Across CPI Boundaries

**Critical gotcha**: Errors in CPIs propagate up the call stack. If Program B returns an error during a CPI from Program A, the entire transaction fails.

### Handling CPI Errors

```rust
pub fn deposit_with_fallback(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Try primary protocol
    match deposit_cpi(&ctx, amount) {
        Ok(_) => {
            msg!("Deposit succeeded via primary protocol");
            Ok(())
        }
        Err(e) => {
            msg!("Primary protocol failed: {:?}, trying fallback", e);
            // Try fallback protocol
            deposit_fallback_cpi(&ctx, amount)?;
            Ok(())
        }
    }
}
```

**Gotcha**: Anchor's `?` operator immediately propagates errors. Use `match` or `if let Err(e)` to handle errors gracefully.

### Custom Error Codes for CPI Callers

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient vault balance")]
    InsufficientBalance,  // Caller can check: error.code == 6000

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,     // Caller can check: error.code == 6001

    #[msg("Unauthorized delegate")]
    UnauthorizedDelegate, // Caller can check: error.code == 6002
}
```

External programs can pattern-match on error codes to decide how to proceed.

## Real Composable Programs

### Jupiter Aggregator (Multi-DEX Routing)

Jupiter's aggregator composes swaps across multiple DEXs (Orca, Raydium, Serum) in a single transaction:

```
User Transaction
  └─> Jupiter: route_swap()
       ├─> Orca: swap() [CPI depth 1]
       ├─> Raydium: swap() [CPI depth 1]
       └─> Serum: new_order_v3() [CPI depth 1]
```

**Key design**: Jupiter's `route_swap` instruction accepts an array of "swap legs," each targeting a different DEX. This keeps CPI depth at 1 (Jupiter → DEX), avoiding the 4-depth limit.

### Marinade Liquid Staking (CPI-Friendly Deposits)

Marinade exposes `deposit` as a standalone instruction:

```rust
pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    // Transfer SOL to stake pool
    // Mint mSOL tokens to user
    // Update stake pool state
}
```

External programs (e.g., a DeFi protocol) can call `deposit` to automatically stake users' SOL and receive mSOL:

```rust
// DeFi protocol calls Marinade's deposit
marinade::cpi::deposit(cpi_ctx, user_sol_amount)?;
```

**Benefit**: Composability unlocks "stake-and-earn" products where users deposit SOL into a DeFi protocol, which auto-stakes it via Marinade.

## Documentation for Integrators

**Essential docs for CPI-friendly programs**:

1. **IDL (JSON)**: Auto-generated by Anchor, describes all instructions and accounts
2. **CPI Examples**: Show how to call each instruction from another program
3. **Account Constraints**: Document which account constraints can be relaxed for CPI callers
4. **Error Codes**: Explain what each error means and how to handle it
5. **PDA Seeds**: Document all PDA derivation schemes (critical for CPI callers to compute addresses)

**Example**: Marinade's [Integration Guide](https://docs.marinade.finance/developers/integration-guide) includes CPI examples, account structures, and PDA seed formulas.

## 2026 Composability Landscape

### Anchor 0.30+ Improvements
- **CpiContext simplification**: `CpiContext::new()` now auto-infers program ID from IDL
- **Typed error handling**: CPI errors now return structured error objects (not just `ProgramError`)
- **IDL versioning**: IDLs now include a version field for breaking change detection

### Firedancer + CPI Performance
With Firedancer's multi-threaded execution, CPIs across programs can run in parallel if they don't share writable accounts. Design for parallelism by minimizing shared state accounts.

### Program-Derived Addresses (PDA) Standardization
The 2026 Solana Program Library (SPL) now recommends a standard PDA naming scheme:
- `[b"authority", program_id.as_ref()]` for program authority PDAs
- `[b"user", user_pubkey.as_ref()]` for user-specific PDAs
- `[b"vault", mint.as_ref()]` for token vault PDAs

Following this convention makes your program more predictable for integrators.

## Summary

- **Granular instructions**: Expose atomic operations, not monolithic workflows
- **Flexible accounts**: Accept parameters instead of hardcoding constraints
- **PDA delegation**: Use PDAs as authority delegates for CPI callers
- **Anchor CPI module**: Export CPI helpers for type-safe integration
- **Versioning**: Version instructions explicitly or use feature flags
- **Error handling**: CPIs propagate errors; handle them gracefully
- **CPI depth limit**: Max 4 levels; design for shallow call stacks
- **Real examples**: Study Jupiter (multi-DEX routing) and Marinade (liquid staking)
- **Documentation**: Provide IDL, CPI examples, and PDA seed formulas

Composability is not automatic on Solana. Design your program with CPIs in mind from day one, or risk building a walled garden.
