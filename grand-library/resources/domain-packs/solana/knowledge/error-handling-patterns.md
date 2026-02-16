---
pack: solana
topic: "Error Handling Patterns"
decision: "How should I structure errors in Solana programs?"
confidence: 9/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Error Handling Patterns in Solana Programs

## Overview

Error handling in Solana differs fundamentally from EVM chains. Errors don't "revert" with opcodes — they return enum values. Programs must always return `Result<()>`, either `Ok(())` for success or `Err(Error)` for failure. When a program returns an error, the entire transaction aborts immediately, including any CPIs.

**Key insight:** Unlike Ethereum where you might catch reverts, Solana errors abort the entire transaction. You cannot catch CPI errors — if a CPI fails, your transaction fails.

## Anchor's #[error_code] Macro

The `#[error_code]` attribute is Anchor's primary tool for defining custom program errors.

### Basic Error Definition

```rust
#[error_code]
pub enum MyError {
    #[msg("Amount must be greater than or equal to 10")]
    AmountTooSmall,

    #[msg("Amount must be less than or equal to 100")]
    AmountTooLarge,

    #[msg("Insufficient balance for operation")]
    InsufficientBalance,
}
```

### Error Numbering Scheme

Anchor assigns error codes using a fixed numbering system:

| Range | Purpose |
|-------|---------|
| >= 100 | Instruction error codes (Anchor framework) |
| >= 1000 | IDL error codes |
| >= 2000 | Constraint error codes |
| >= 3000 | Account error codes |
| >= 4100 | Misc error codes |
| >= 6000 | **Custom user errors** (your errors start here) |

Your first custom error gets code `6000`, the second `6001`, and so on.

**Example:**
```rust
#[error_code]
pub enum CustomError {
    InvalidAmount,      // Error code: 6000
    Unauthorized,       // Error code: 6001
    AccountLocked,      // Error code: 6002
}
```

## Throwing Errors: err! vs require!

### Using err! Macro

The `err!` macro explicitly returns an error:

```rust
pub fn set_data(ctx: Context<SetData>, data: u64) -> Result<()> {
    if data > 100 {
        return err!(MyError::DataTooLarge);
    }
    ctx.accounts.my_account.data = data;
    Ok(())
}
```

### Using require! Macro

The `require!` macro provides cleaner syntax for validation:

```rust
pub fn set_data(ctx: Context<SetData>, data: u64) -> Result<()> {
    require!(data >= 10, MyError::DataTooSmall);
    require!(data <= 100, MyError::DataTooLarge);

    ctx.accounts.my_account.data = data;
    Ok(())
}
```

**Under the hood:** `require!` is syntactic sugar for `err!` — they compile to the same code.

### Specialized require! Macros

Anchor provides specialized macros for common validations:

| Macro | Purpose |
|-------|---------|
| `require!` | General condition check |
| `require_eq!` | Ensures two non-pubkey values are equal |
| `require_neq!` | Ensures two non-pubkey values are not equal |
| `require_keys_eq!` | Ensures two pubkeys are equal |
| `require_keys_neq!` | Ensures two pubkeys are not equal |
| `require_gt!` | Ensures first value > second value |
| `require_gte!` | Ensures first value >= second value |

**Example:**
```rust
require_keys_eq!(
    ctx.accounts.user.key(),
    ctx.accounts.authority.key(),
    MyError::Unauthorized
);

require_gt!(amount, 0, MyError::InvalidAmount);
```

## Custom Error Design Patterns

### 1. Category-Based Organization

Structure errors by functional category:

```rust
#[error_code]
pub enum VaultError {
    // Authorization (6000-6009)
    #[msg("Unauthorized access attempt")]
    Unauthorized,
    #[msg("Missing required signature")]
    MissingSignature,

    // State validation (6010-6019)
    #[msg("Vault is locked")]
    VaultLocked,
    #[msg("Vault already initialized")]
    AlreadyInitialized,

    // Amount validation (6020-6029)
    #[msg("Amount exceeds maximum")]
    AmountTooLarge,
    #[msg("Insufficient balance")]
    InsufficientBalance,

    // Timing (6030-6039)
    #[msg("Operation not yet active")]
    NotYetActive,
    #[msg("Operation has expired")]
    Expired,
}
```

### 2. Context-Rich Error Messages

Write error messages that guide debugging:

```rust
#[error_code]
pub enum StakingError {
    // Bad: Generic message
    #[msg("Invalid amount")]
    InvalidAmount,

    // Good: Specific context
    #[msg("Stake amount must be between 10 and 1000 tokens")]
    StakeAmountOutOfRange,

    // Better: Actionable guidance
    #[msg("Cannot stake: minimum stake period of 7 days not met")]
    MinimumStakePeriodNotMet,
}
```

### 3. Module-Specific Error Files

For large programs, organize errors by module:

```
programs/my-program/src/
├── lib.rs
├── instructions/
│   ├── stake.rs
│   ├── unstake.rs
│   └── claim.rs
└── errors/
    ├── mod.rs
    ├── stake_errors.rs
    ├── vault_errors.rs
    └── admin_errors.rs
```

```rust
// errors/mod.rs
pub use stake_errors::*;
pub use vault_errors::*;
pub use admin_errors::*;

// errors/stake_errors.rs
#[error_code]
pub enum StakeError {
    #[msg("Stake amount below minimum threshold")]
    BelowMinimumStake,
    // ... more stake-related errors
}
```

## Error Propagation in Cross-Program Invocations (CPI)

### Critical Rule: CPI Errors Abort Everything

When you make a CPI, you **cannot** catch the error. If the called program returns an error, your entire transaction fails immediately:

```rust
// This will NOT work — you cannot catch CPI errors
pub fn transfer_tokens(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    let result = token::transfer(cpi_ctx, amount);

    // ❌ This match is USELESS for CPI errors
    match result {
        Ok(()) => msg!("Transfer succeeded"),
        Err(err) => {
            msg!("Transfer failed: {:?}", err);
            // This code path never executes for CPI errors
            // Transaction has already aborted
        }
    }

    Ok(())
}
```

### Pre-Validate Before CPI

Since you can't catch CPI errors, validate conditions before making the call:

```rust
pub fn safe_transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // Validate BEFORE CPI
    require!(
        ctx.accounts.from.amount >= amount,
        MyError::InsufficientBalance
    );

    require!(
        ctx.accounts.from.owner == ctx.accounts.authority.key(),
        MyError::Unauthorized
    );

    // Now safe to CPI — preconditions met
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        ),
        amount
    )?;

    Ok(())
}
```

### Recursive Call Stack Limit

Solana limits CPI depth to **4 levels**. The transaction starts at level 1:

```
Transaction (level 1)
  → Program A (level 2)
      → Program B (level 3)
          → Program C (level 4)
              → Program D (level 5) ❌ FAILS
```

**In production:** Complex DeFi protocols can hit this limit. Design your program architecture to minimize CPI depth.

## Client-Side Error Parsing

### Parsing from IDL (TypeScript)

When Anchor programs fail, the TypeScript SDK returns structured errors:

```typescript
import { AnchorError } from "@coral-xyz/anchor";

try {
    await program.methods
        .validateAmount(150)
        .accounts({ /* ... */ })
        .rpc();
} catch (error) {
    if (error instanceof AnchorError) {
        console.log("Error code:", error.error.errorCode.code);
        // Logs: "AmountTooLarge"

        console.log("Error number:", error.error.errorCode.number);
        // Logs: 6001

        console.log("Error message:", error.error.errorMessage);
        // Logs: "Amount must be less than or equal to 100"
    }
}
```

### Parsing Raw Error Codes

For programs without Anchor IDL, decode raw error numbers:

```typescript
// Error appears as: "custom program error: 0x1771" (hex)
const errorCodeHex = "0x1771";
const errorCodeDecimal = parseInt(errorCodeHex, 16); // 6001

// Or from decimal directly
// Error appears as: "custom program error: 6001"
if (errorCodeDecimal >= 6000) {
    const customIndex = errorCodeDecimal - 6000;
    console.log(`Custom error #${customIndex}`);
    // For 6001: "Custom error #1" (second error in your enum)
}
```

### Using @solana/errors Package

The `@solana/errors` package provides standardized error handling:

```typescript
import {
    isSolanaError,
    SOLANA_ERROR__TRANSACTION__SIGNATURES_MISSING
} from '@solana/errors';

try {
    await sendTransaction(tx);
} catch (e) {
    if (isSolanaError(e, SOLANA_ERROR__TRANSACTION__SIGNATURES_MISSING)) {
        // TypeScript now knows the error type and context
        console.log("Missing signatures:", e.context.addresses);
    }
}
```

### Decoding Error Codes in Development

Use the `@solana/errors` CLI to decode error codes:

```bash
npx @solana/errors decode -- 123
```

## ProgramError vs Custom Errors

### Anchor's Error Type

Anchor returns a custom `Error` enum with two variants:

```rust
pub enum Error {
    AnchorError(Box<AnchorError>),
    ProgramError(Box<ProgramErrorWithOrigin>),
}
```

**AnchorError:** Custom errors you define + built-in Anchor framework errors
**ProgramError:** Standard Solana errors from `solana_program` crate

### Common ProgramError Variants

| Error | Code | Meaning |
|-------|------|---------|
| `InvalidArgument` | 0x1 | Invalid parameters passed |
| `InvalidInstructionData` | 0x2 | Instruction data malformed |
| `InvalidAccountData` | 0x3 | Account data doesn't match expected format |
| `AccountDataTooSmall` | 0x4 | Account doesn't have enough space |
| `InsufficientFunds` | 0x5 | Not enough lamports for operation |
| `IncorrectProgramId` | 0x6 | Wrong program owns the account |
| `MissingRequiredSignature` | 0x7 | Required signer didn't sign |
| `AccountAlreadyInitialized` | 0x8 | Account already initialized |
| `UninitializedAccount` | 0x9 | Account not initialized |

### When to Use Each

**Use Custom Errors (6000+):**
- Business logic validation (amounts, timing, state)
- Authorization checks specific to your program
- Application-specific constraints

**Use ProgramError:**
- Low-level account validation (ownership, size)
- Signature verification
- System-level constraints

**Example:**
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Custom error for business logic
    require!(
        !ctx.accounts.vault.locked,
        VaultError::VaultLocked  // 6000+
    );

    // Anchor handles ProgramError automatically via constraints
    // #[account(mut, has_one = authority)]  <- generates ProgramError
}
```

## Error Logging & Compute Unit (CU) Costs

### The msg! Macro Cost

Every `msg!` call costs compute units:

```rust
// Costs ~10-20 CU per msg! call
msg!("Processing transfer of {} tokens", amount);
```

**In production:** Minimize logging in hot paths. Each `msg!` consumes CU from your budget (max 1.4M CU per transaction).

### Strategic Logging

```rust
pub fn complex_operation(ctx: Context<Operation>) -> Result<()> {
    // ❌ Expensive: Logging every step
    msg!("Step 1: Validating...");
    validate_inputs(&ctx)?;
    msg!("Step 2: Processing...");
    process(&ctx)?;
    msg!("Step 3: Finalizing...");
    finalize(&ctx)?;

    // ✅ Better: Log only on error or completion
    validate_inputs(&ctx)?;
    process(&ctx)?;
    finalize(&ctx)?;
    msg!("Operation completed successfully");

    Ok(())
}
```

### Error Messages Are Always Included

Custom error messages from `#[msg("...")]` are **always** logged when an error is returned, regardless of whether you use `msg!`:

```rust
#[error_code]
pub enum MyError {
    #[msg("This message will appear in logs automatically")]
    SomeError,
}

// When this error is returned, the message is logged automatically
require!(condition, MyError::SomeError);
```

**Cost consideration:** Error messages don't cost CU at definition time, only when the error is actually returned.

## Production Error Handling Patterns

### 1. Fail Fast with Clear Messages

```rust
pub fn execute_trade(ctx: Context<Trade>, amount: u64) -> Result<()> {
    // Validate everything up front
    require!(amount > 0, TradeError::InvalidAmount);
    require!(!ctx.accounts.pool.paused, TradeError::PoolPaused);
    require_keys_eq!(
        ctx.accounts.user.key(),
        ctx.accounts.user_account.owner,
        TradeError::Unauthorized
    );

    // All validations passed, proceed with trade
    execute_trade_logic(ctx, amount)?;
    Ok(())
}
```

### 2. Separate Validation from Execution

```rust
pub fn stake_tokens(ctx: Context<Stake>, amount: u64) -> Result<()> {
    // Validation layer
    validate_stake_preconditions(&ctx, amount)?;

    // Execution layer (only runs if validation passed)
    execute_stake(&ctx, amount)?;

    Ok(())
}

fn validate_stake_preconditions(
    ctx: &Context<Stake>,
    amount: u64
) -> Result<()> {
    require!(amount >= MIN_STAKE, StakeError::BelowMinimum);
    require!(amount <= MAX_STAKE, StakeError::AboveMaximum);
    require!(
        ctx.accounts.user_token.amount >= amount,
        StakeError::InsufficientBalance
    );
    Ok(())
}
```

### 3. Guard Against Underflow/Overflow

```rust
use anchor_lang::solana_program::program_error::ProgramError;

pub fn calculate_rewards(ctx: Context<Claim>) -> Result<()> {
    let stake = ctx.accounts.stake_account.amount;
    let rate = ctx.accounts.pool.reward_rate;

    // ❌ Dangerous: Can overflow
    let rewards = stake * rate;

    // ✅ Safe: Check for overflow
    let rewards = stake
        .checked_mul(rate)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // ✅ Also safe: Check for underflow
    let remaining = ctx.accounts.pool.rewards_available
        .checked_sub(rewards)
        .ok_or(StakeError::InsufficientRewards)?;

    Ok(())
}
```

### 4. Transaction Retry Logic (Client-Side)

Since Solana transactions can be dropped during network congestion, implement client-side retry logic:

```typescript
async function sendTransactionWithRetry(
    connection: Connection,
    transaction: Transaction,
    signers: Signer[],
    maxRetries: number = 3
): Promise<string> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Get fresh blockhash for each attempt
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            const signature = await connection.sendTransaction(
                transaction,
                signers,
                {
                    skipPreflight: false,  // Keep preflight checks
                    maxRetries: 0  // Handle retries ourselves
                }
            );

            await connection.confirmTransaction(signature, 'confirmed');
            return signature;

        } catch (error) {
            lastError = error;

            // Don't retry on program errors
            if (error instanceof AnchorError) {
                throw error;
            }

            // Only retry on network issues
            await new Promise(resolve =>
                setTimeout(resolve, 1000 * (i + 1))
            );
        }
    }

    throw lastError;
}
```

### 5. Differentiate Retry vs Abort Errors

**Retry-able errors (network issues):**
- `BlockhashNotFound` (-32002)
- `NodeIsUnhealthy` (-32005)
- `TransactionSignatureVerificationFailure` (-32003)

**Abort errors (program logic):**
- Any `AnchorError` (custom program errors 6000+)
- `ProgramError::Custom` from your program
- Constraint violations

```typescript
function shouldRetry(error: any): boolean {
    // Never retry program logic errors
    if (error instanceof AnchorError) {
        return false;
    }

    // Retry network-related errors
    const retryableCodes = [-32002, -32003, -32005];
    return retryableCodes.includes(error?.code);
}
```

## Common Error Patterns by Use Case

### Token Operations

```rust
#[error_code]
pub enum TokenError {
    #[msg("Insufficient token balance for operation")]
    InsufficientBalance,

    #[msg("Token mint mismatch")]
    MintMismatch,

    #[msg("Transfer amount exceeds allowance")]
    ExceedsAllowance,

    #[msg("Token account is frozen")]
    AccountFrozen,
}
```

### Access Control

```rust
#[error_code]
pub enum AccessError {
    #[msg("Caller is not authorized to perform this action")]
    Unauthorized,

    #[msg("Admin signature required")]
    AdminSignatureRequired,

    #[msg("Multisig threshold not met")]
    ThresholdNotMet,
}
```

### Time-Based Operations

```rust
#[error_code]
pub enum TimingError {
    #[msg("Operation not yet active")]
    NotYetActive,

    #[msg("Operation has expired")]
    Expired,

    #[msg("Cooldown period not elapsed")]
    CooldownActive,

    #[msg("Timestamp is in the future")]
    FutureTimestamp,
}
```

### State Machine Errors

```rust
#[error_code]
pub enum StateError {
    #[msg("Pool is paused")]
    PoolPaused,

    #[msg("Account is locked")]
    AccountLocked,

    #[msg("Invalid state transition")]
    InvalidTransition,

    #[msg("Already initialized")]
    AlreadyInitialized,
}
```

## Testing Error Conditions

### Anchor Test Examples

```typescript
describe("Error handling", () => {
    it("should fail with AmountTooLarge", async () => {
        try {
            await program.methods
                .validateAmount(150)  // Max is 100
                .accounts({ /* ... */ })
                .rpc();

            assert.fail("Expected error was not thrown");
        } catch (error) {
            assert.ok(error instanceof AnchorError);
            assert.equal(error.error.errorCode.code, "AmountTooLarge");
            assert.equal(error.error.errorCode.number, 6001);
        }
    });

    it("should handle insufficient balance", async () => {
        const amount = new BN(1000000);  // More than user has

        try {
            await program.methods
                .withdraw(amount)
                .accounts({ /* ... */ })
                .rpc();

            assert.fail("Should have failed");
        } catch (error) {
            // Check for custom error
            assert.include(
                error.error.errorMessage,
                "Insufficient balance"
            );
        }
    });
});
```

### Testing CPI Errors

```rust
// In your program's tests
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::system_instruction;

    #[test]
    fn test_cpi_error_propagation() {
        // Create a scenario that will fail in CPI
        let result = process_instruction_that_makes_cpi();

        // Assert the error is what we expect
        assert_eq!(
            result.unwrap_err(),
            ProgramError::InsufficientFunds.into()
        );
    }
}
```

## Best Practices Summary

1. **Error Numbering:** Start custom errors at 6000, group by category in ranges
2. **Clear Messages:** Write actionable error messages that guide debugging
3. **Fail Fast:** Validate inputs before expensive operations or CPIs
4. **Pre-CPI Validation:** Check all conditions before CPI since you can't catch errors
5. **Minimize Logging:** Use `msg!` sparingly to conserve compute units
6. **Safe Math:** Use `checked_*` operations to prevent overflow/underflow
7. **Client Retry Logic:** Implement exponential backoff for network errors only
8. **Test Error Paths:** Write tests for every error condition
9. **IDL Documentation:** Error messages in `#[msg]` appear in IDL for clients
10. **Modular Errors:** Separate error definitions by module in large programs

## Real-World Example: Complete Pattern

```rust
// errors.rs
#[error_code]
pub enum VaultError {
    // Authorization (6000-6009)
    #[msg("Unauthorized: caller is not the vault authority")]
    Unauthorized,

    // State (6010-6019)
    #[msg("Vault is locked and cannot process withdrawals")]
    VaultLocked,
    #[msg("Vault has insufficient liquidity")]
    InsufficientLiquidity,

    // Amounts (6020-6029)
    #[msg("Withdrawal amount exceeds balance")]
    ExceedsBalance,
    #[msg("Amount must be greater than 0")]
    InvalidAmount,

    // Timing (6030-6039)
    #[msg("Withdrawal not allowed during cooldown period")]
    CooldownActive,
}

// lib.rs
#[program]
pub mod vault {
    use super::*;

    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64
    ) -> Result<()> {
        // Validate authorization
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.vault.authority,
            VaultError::Unauthorized
        );

        // Validate state
        require!(
            !ctx.accounts.vault.locked,
            VaultError::VaultLocked
        );

        // Validate amount
        require!(
            amount > 0,
            VaultError::InvalidAmount
        );

        let balance = ctx.accounts.user_account.amount;
        require!(
            balance >= amount,
            VaultError::ExceedsBalance
        );

        // Safe math
        let new_balance = balance
            .checked_sub(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // Execute withdrawal (all validations passed)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
            )
            .with_signer(&[&ctx.accounts.vault.signer_seeds()]),
            amount
        )?;

        ctx.accounts.user_account.amount = new_balance;
        msg!("Withdrawal completed: {} tokens", amount);

        Ok(())
    }
}
```

## References

- [Anchor Error Documentation](https://www.anchor-lang.com/docs/features/errors)
- [Anchor Error Code Attribute](https://docs.rs/anchor-lang/latest/anchor_lang/attr.error_code.html)
- [Solana Program Error](https://docs.rs/solana-program/latest/solana_program/program_error/enum.ProgramError.html)
- [@solana/errors Package](https://www.npmjs.com/package/@solana/errors)
- [CPI Security Patterns](https://www.asymmetric.re/blog-archived/invocation-security-navigating-vulnerabilities-in-solana-cpis)
- [Solana Error Troubleshooting Guide](https://developers.metaplex.com/guides/general/how-to-diagnose-solana-transaction-errors)
