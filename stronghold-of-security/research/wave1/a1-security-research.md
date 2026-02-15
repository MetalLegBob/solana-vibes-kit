# Solana Security Vulnerability Patterns - Compiled Research

**Compiled:** 2026-02-06
**Sources:** Published security research from auditing firms and academic papers
**Note:** WebSearch unavailable - compiled from training data (current through January 2025)

## Disclaimer

This document compiles vulnerability patterns from published security research. Without access to WebSearch, this represents patterns documented in my training data through January 2025. For the most current research, please verify directly with:
- Neodyme (neodyme.io)
- OtterSec (osec.io)
- Sec3/Soteria (sec3.dev)
- Trail of Bits (trailofbits.com)
- Halborn (halborn.com)
- Zellic (zellic.io)

---

## Summary Statistics

**Total Patterns Documented:** 40
**Severity Breakdown:**
- CRITICAL: 12 patterns
- HIGH: 18 patterns
- MEDIUM: 10 patterns
- LOW: 0 patterns

**Category Breakdown:**
- Account Validation: 7 patterns
- Arithmetic: 3 patterns
- State Machine: 4 patterns
- CPI: 3 patterns
- Token/Economic: 4 patterns
- Access Control: 3 patterns
- Upgrade/Admin: 3 patterns
- Error Handling: 2 patterns
- Timing: 1 pattern
- Oracle: 1 pattern
- Rent: 2 patterns
- SPL Token: 3 patterns
- Advanced Exploits: 4 patterns

---

## Account Validation Vulnerabilities

### 1. Missing Signer Check

**Source:** Multiple firms - Common finding across audits
**Disclosure date:** Ongoing pattern

**Description:**
Instruction handlers fail to verify that critical accounts have signed the transaction, allowing unauthorized users to call privileged functions.

**Mechanism:**
- Solana passes account metadata including `is_signer` flag
- Programs must explicitly check this flag
- Missing checks allow any account to impersonate authorized signers

**Vulnerable pattern:**
```rust
// VULNERABLE: No signer verification
pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // Authority account not verified as signer
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
    )
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    pub from: Account<'info, TokenAccount>,
    pub to: Account<'info, TokenAccount>,
    pub authority: AccountInfo<'info>, // Missing Signer constraint
    pub token_program: Program<'info, Token>,
}
```

**Safe pattern:**
```rust
// SAFE: Signer constraint enforced
#[derive(Accounts)]
pub struct Transfer<'info> {
    pub from: Account<'info, TokenAccount>,
    pub to: Account<'info, TokenAccount>,
    #[account(mut, signer)] // Explicit signer check
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

**Detection strategy:**
- Audit all instruction handlers for privileged operations
- Verify every authority/admin account has `Signer` constraint
- Check for raw `AccountInfo` types that should be `Signer`

**Root cause:** Account Validation

**Severity:** CRITICAL

---

### 2. Missing Owner Check

**Source:** Neodyme, OtterSec - Common audit finding
**Disclosure date:** 2021-2023 (ongoing)

**Description:**
Programs fail to verify that accounts are owned by the expected program, allowing attackers to pass malicious accounts with crafted data.

**Mechanism:**
- Every Solana account has an `owner` field (the program that owns it)
- Programs must verify accounts are owned by expected programs
- Missing checks allow fake accounts with arbitrary data

**Vulnerable pattern:**
```rust
// VULNERABLE: No owner verification
pub fn process_data(ctx: Context<ProcessData>) -> Result<()> {
    let user_data = &ctx.accounts.user_data;
    // Using data from unverified account
    let balance = user_data.balance;
    // ... process using balance
    Ok(())
}

#[derive(Accounts)]
pub struct ProcessData<'info> {
    pub user_data: AccountInfo<'info>, // Owner not checked
}
```

**Safe pattern:**
```rust
// SAFE: Owner verified via Account wrapper
#[derive(Accounts)]
pub struct ProcessData<'info> {
    #[account(
        constraint = user_data.owner == id() @ ErrorCode::InvalidOwner
    )]
    pub user_data: Account<'info, UserData>, // Anchor checks owner automatically
}
```

**Detection strategy:**
- Look for raw `AccountInfo` usage without owner checks
- Verify Account types match expected program ownership
- Check PDA derivations include proper owner verification

**Root cause:** Account Validation

**Severity:** CRITICAL

---

### 3. Arbitrary CPI (Cross-Program Invocation)

**Source:** Neodyme - "Breaking Solana" blog series
**Disclosure date:** 2022-04

**Description:**
Programs accept program IDs from user input and invoke them via CPI without validation, allowing execution of arbitrary programs.

**Mechanism:**
- Attacker passes malicious program as instruction account
- Vulnerable program invokes it via CPI
- Malicious program executes with victim's context/accounts

**Vulnerable pattern:**
```rust
// VULNERABLE: Arbitrary program invocation
pub fn proxy_call(ctx: Context<ProxyCall>, data: Vec<u8>) -> Result<()> {
    // No validation of target_program identity
    invoke(
        &Instruction {
            program_id: *ctx.accounts.target_program.key,
            accounts: vec![/* accounts */],
            data,
        },
        &[/* account_infos */],
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct ProxyCall<'info> {
    pub target_program: AccountInfo<'info>, // Arbitrary program!
}
```

**Safe pattern:**
```rust
// SAFE: Whitelist allowed programs
pub fn proxy_call(ctx: Context<ProxyCall>, data: Vec<u8>) -> Result<()> {
    // Verify program is in allowlist
    require!(
        ALLOWED_PROGRAMS.contains(ctx.accounts.target_program.key),
        ErrorCode::UnauthorizedProgram
    );

    invoke(
        &Instruction {
            program_id: *ctx.accounts.target_program.key,
            accounts: vec![/* accounts */],
            data,
        },
        &[/* account_infos */],
    )?;
    Ok(())
}

const ALLOWED_PROGRAMS: &[Pubkey] = &[
    solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    // ... other trusted programs
];
```

**Detection strategy:**
- Search for `invoke()` or `invoke_signed()` calls
- Verify all target programs are validated before invocation
- Check if program IDs come from user input

**Root cause:** CPI

**Severity:** CRITICAL

---

### 4. PDA Seed Collision

**Source:** Sec3/Soteria, Neodyme
**Disclosure date:** 2022-2023

**Description:**
Programs use insufficient or predictable seeds for PDA derivation, allowing attackers to create PDAs that collide with legitimate accounts.

**Mechanism:**
- PDAs derived from seeds + program ID
- Weak seeds allow different input combinations to produce same PDA
- Attacker initializes account before legitimate user

**Vulnerable pattern:**
```rust
// VULNERABLE: Insufficient seed uniqueness
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32,
        seeds = [b"vault"], // No user-specific seed!
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Safe pattern:**
```rust
// SAFE: Include user-specific data in seeds
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32,
        seeds = [b"vault", user.key().as_ref()], // User-specific
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Detection strategy:**
- Review all PDA seed derivations
- Ensure seeds include unique identifiers (user pubkey, mint, etc.)
- Check for hardcoded-only seeds

**Root cause:** Account Validation

**Severity:** HIGH

---

### 5. Missing Discriminator Check

**Source:** OtterSec, Neodyme
**Disclosure date:** 2022-2023

**Description:**
Programs fail to verify account discriminators (type identifiers), allowing wrong account types to be passed where specific types are expected.

**Mechanism:**
- Anchor uses 8-byte discriminator to identify account types
- Programs may deserialize wrong account type without checking
- Attacker passes account of different type with overlapping fields

**Vulnerable pattern:**
```rust
// VULNERABLE: Manual deserialization without discriminator check
pub fn update_config(ctx: Context<UpdateConfig>) -> Result<()> {
    let account_data = &ctx.accounts.config.data.borrow();
    // Directly deserializing without checking discriminator
    let config: Config = Config::try_from_slice(&account_data[8..])?;
    // ... use config
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Use Anchor's Account wrapper (checks discriminator)
pub fn update_config(ctx: Context<UpdateConfig>) -> Result<()> {
    let config = &ctx.accounts.config; // Anchor verified discriminator
    // ... use config
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>, // Discriminator checked automatically
}
```

**Detection strategy:**
- Look for manual deserialization of account data
- Verify Account<'info, T> is used instead of AccountInfo
- Check custom deserialize implementations include discriminator validation

**Root cause:** Account Validation

**Severity:** HIGH

---

### 6. Type Cosplay / Account Substitution

**Source:** Neodyme - "Breaking Solana" series
**Disclosure date:** 2022-04

**Description:**
Programs accept accounts by name without verifying their actual type or relationship, allowing substitution of similar-looking but malicious accounts.

**Mechanism:**
- Program expects Account A but doesn't enforce its identity
- Attacker passes Account B with compatible structure
- Program operates on wrong account with potentially malicious data

**Vulnerable pattern:**
```rust
// VULNERABLE: No relationship verification
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub vault: Account<'info, Vault>,
    pub vault_token_account: Account<'info, TokenAccount>, // Not verified to belong to vault!
    pub authority: Signer<'info>,
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Attacker could pass their own token account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(), // Wrong account!
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}
```

**Safe pattern:**
```rust
// SAFE: Verify account relationships
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub vault: Account<'info, Vault>,
    #[account(
        constraint = vault_token_account.owner == vault.key() @ ErrorCode::InvalidVault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
}
```

**Detection strategy:**
- Map expected relationships between accounts
- Verify constraints enforce these relationships
- Check that account fields reference expected accounts

**Root cause:** Account Validation

**Severity:** CRITICAL

---

### 7. Account Data Matching

**Source:** Halborn, Sec3
**Disclosure date:** 2023-2024

**Description:**
Programs assume account data relationships without validating them, allowing attackers to pass accounts that pass individual checks but are mismatched.

**Mechanism:**
- Program checks vault.mint and token_account.mint separately
- Doesn't check they match each other
- Attacker passes valid but mismatched accounts

**Vulnerable pattern:**
```rust
// VULNERABLE: No cross-account validation
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub stake_pool: Account<'info, StakePool>,
    #[account(
        mut,
        constraint = stake_token.mint == ACCEPTED_MINT @ ErrorCode::InvalidMint
    )]
    pub stake_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = reward_token.mint == REWARD_MINT @ ErrorCode::InvalidReward
    )]
    pub reward_token: Account<'info, TokenAccount>,
}

// Attacker passes token accounts that don't match pool configuration!
```

**Safe pattern:**
```rust
// SAFE: Validate relationships between accounts
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub stake_pool: Account<'info, StakePool>,
    #[account(
        mut,
        constraint = stake_token.mint == stake_pool.stake_mint @ ErrorCode::InvalidMint
    )]
    pub stake_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = reward_token.mint == stake_pool.reward_mint @ ErrorCode::InvalidReward
    )]
    pub reward_token: Account<'info, TokenAccount>,
}
```

**Detection strategy:**
- Map all account relationships in context struct
- Verify constraints check cross-account consistency
- Test with valid-but-mismatched accounts

**Root cause:** Account Validation

**Severity:** HIGH

---

## Arithmetic Vulnerabilities

### 8. Integer Overflow/Underflow

**Source:** Multiple firms - Standard finding
**Disclosure date:** Ongoing

**Description:**
Arithmetic operations overflow or underflow without checks, causing incorrect calculations or state corruption.

**Mechanism:**
- Rust allows overflow in release builds by default
- Unchecked operations wrap around (255 + 1 = 0)
- Financial calculations produce wrong results

**Vulnerable pattern:**
```rust
// VULNERABLE: Unchecked arithmetic
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.total_deposits = vault.total_deposits + amount; // Can overflow!
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Use checked arithmetic
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.total_deposits = vault.total_deposits
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    Ok(())
}
```

**Detection strategy:**
- Search for `+`, `-`, `*`, `/` operators on financial values
- Verify checked_* methods are used for all arithmetic
- Look for unchecked casts between integer types

**Root cause:** Arithmetic

**Severity:** HIGH

---

### 9. Precision Loss in Division

**Source:** OtterSec, Halborn
**Disclosure date:** 2022-2024

**Description:**
Division operations lose precision due to integer math, causing incorrect calculations especially in fee/reward distributions.

**Mechanism:**
- Solana uses integer math (no floating point)
- Division truncates: 5 / 2 = 2 (not 2.5)
- Small amounts or percentages can round to zero

**Vulnerable pattern:**
```rust
// VULNERABLE: Precision loss
pub fn calculate_fee(amount: u64, fee_bps: u64) -> u64 {
    // If amount * fee_bps < 10000, result is 0
    (amount * fee_bps) / 10000 // Loses precision on small amounts
}
```

**Safe pattern:**
```rust
// SAFE: Multiply before divide, check minimum
pub fn calculate_fee(amount: u64, fee_bps: u64) -> Result<u64> {
    let numerator = (amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(ErrorCode::Overflow)?;

    let fee = (numerator / 10000) as u64;

    // Ensure fee is reasonable
    require!(fee > 0 || amount == 0, ErrorCode::FeeTooSmall);

    Ok(fee)
}
```

**Detection strategy:**
- Review all division operations on token amounts
- Check order of operations (multiply before divide)
- Verify minimum thresholds for small amounts

**Root cause:** Arithmetic

**Severity:** MEDIUM

---

### 10. Reward Calculation Manipulation

**Source:** Halborn, Sec3
**Disclosure date:** 2023-2024

**Description:**
Reward distribution logic can be gamed through timing, donation attacks, or rounding errors to extract excess rewards.

**Mechanism:**
- User deposits large amount right before reward distribution
- Extracts proportional rewards without time-weighted exposure
- Withdraws immediately after

**Vulnerable pattern:**
```rust
// VULNERABLE: No time-weighting
pub fn distribute_rewards(ctx: Context<Distribute>, total_rewards: u64) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let user = &mut ctx.accounts.user;

    // User gets rewards based only on current share
    let user_rewards = (total_rewards as u128)
        .checked_mul(user.shares as u128)
        .unwrap()
        .checked_div(pool.total_shares as u128)
        .unwrap() as u64;

    user.rewards += user_rewards;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Time-weighted or accrual-based rewards
pub fn distribute_rewards(ctx: Context<Distribute>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user;

    // Update global reward per share
    let time_elapsed = Clock::get()?.unix_timestamp - pool.last_update;
    let reward_per_share_increase = (pool.reward_rate as u128)
        .checked_mul(time_elapsed as u128)
        .unwrap()
        .checked_div(pool.total_shares as u128)
        .unwrap();

    pool.accumulated_reward_per_share += reward_per_share_increase;

    // User rewards based on their debt
    let pending_rewards = ((user.shares as u128)
        .checked_mul(pool.accumulated_reward_per_share)
        .unwrap() as u64)
        .checked_sub(user.reward_debt)
        .unwrap();

    user.rewards += pending_rewards;
    user.reward_debt = (user.shares as u128)
        .checked_mul(pool.accumulated_reward_per_share)
        .unwrap() as u64;

    pool.last_update = Clock::get()?.unix_timestamp;
    Ok(())
}
```

**Detection strategy:**
- Review staking/reward mechanisms for time-weighting
- Check if deposits/withdrawals can game reward distribution
- Verify accrual accounting is used

**Root cause:** Token/Economic

**Severity:** HIGH

---

## State Machine Vulnerabilities

### 11. Initialization Race Condition

**Source:** Neodyme, OtterSec
**Disclosure date:** 2022-2023

**Description:**
Programs fail to prevent double initialization or race conditions during account creation, allowing attacker to front-run legitimate initialization.

**Mechanism:**
- User transaction to initialize account is in mempool
- Attacker sees transaction, front-runs with own initialization
- Attacker controls the account state/authority

**Vulnerable pattern:**
```rust
// VULNERABLE: No initialization check
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    // No check if already initialized
    config.authority = *ctx.accounts.authority.key;
    config.bump = *ctx.bumps.get("config").unwrap();
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>, // Could already be initialized!
    pub authority: Signer<'info>,
}
```

**Safe pattern:**
```rust
// SAFE: Use Anchor's init constraint
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>, // Fails if already exists
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Detection strategy:**
- Check all initialization functions use `init` constraint
- Verify accounts cannot be re-initialized
- Look for manual initialization without checks

**Root cause:** State Machine

**Severity:** HIGH

---

### 12. Missing Close Check (Closed Account Exploitation)

**Source:** OtterSec, Neodyme
**Disclosure date:** 2022-2023

**Description:**
Programs fail to verify that accounts haven't been closed, allowing reuse of closed accounts with stale data or zero lamports.

**Mechanism:**
- Account is closed (lamports drained, marked for deletion)
- Account data remains until garbage collection
- Attacker references closed account in new transaction

**Vulnerable pattern:**
```rust
// VULNERABLE: No lamport check
pub fn use_account(ctx: Context<UseAccount>) -> Result<()> {
    let data = &ctx.accounts.data_account;
    // Account could be closed (0 lamports) but data still readable
    process(data.value);
    Ok(())
}

#[derive(Accounts)]
pub struct UseAccount<'info> {
    pub data_account: Account<'info, DataAccount>, // No close check
}
```

**Safe pattern:**
```rust
// SAFE: Verify account has lamports
#[derive(Accounts)]
pub struct UseAccount<'info> {
    #[account(
        constraint = data_account.to_account_info().lamports() > 0 @ ErrorCode::AccountClosed
    )]
    pub data_account: Account<'info, DataAccount>,
}
```

**Detection strategy:**
- Check if programs handle account closure properly
- Verify lamport checks before using account data
- Look for close instruction followed by reuse

**Root cause:** State Machine

**Severity:** MEDIUM

---

### 13. Reinitialization Attack

**Source:** Neodyme
**Disclosure date:** 2022

**Description:**
Programs allow accounts to be closed and reinitialized with different parameters, bypassing original constraints.

**Mechanism:**
- User creates account with legitimate parameters
- User closes account
- User reinitializes with malicious parameters
- Program doesn't prevent this sequence

**Vulnerable pattern:**
```rust
// VULNERABLE: Close + reinit possible
pub fn close_account(ctx: Context<Close>) -> Result<()> {
    let account = &mut ctx.accounts.account;
    let dest = &mut ctx.accounts.destination;

    // Transfer lamports
    **dest.lamports.borrow_mut() += account.to_account_info().lamports();
    **account.to_account_info().lamports.borrow_mut() = 0;

    // No flag preventing reinitialization
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Set closed flag, check in init
#[account]
pub struct MyAccount {
    pub authority: Pubkey,
    pub data: u64,
    pub closed: bool, // Permanent closed flag
}

pub fn close_account(ctx: Context<Close>) -> Result<()> {
    let account = &mut ctx.accounts.account;
    account.closed = true; // Mark as closed permanently
    // ... transfer lamports
    Ok(())
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let account = &mut ctx.accounts.account;
    require!(!account.closed, ErrorCode::AccountClosed);
    // ... initialize
    Ok(())
}
```

**Detection strategy:**
- Check if close + reinit sequence is possible
- Verify permanent flags prevent reinitialization
- Test account lifecycle for exploitable sequences

**Root cause:** State Machine

**Severity:** HIGH

---

### 14. State Transition Validation Missing

**Source:** Halborn, Sec3
**Disclosure date:** 2023-2024

**Description:**
Programs don't enforce valid state transitions, allowing users to skip required steps or transition to invalid states.

**Mechanism:**
- State machine has defined lifecycle (Created -> Active -> Settled)
- Program doesn't check current state before transition
- User jumps directly to final state

**Vulnerable pattern:**
```rust
// VULNERABLE: No state validation
pub fn settle(ctx: Context<Settle>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    // No check that order is in Active state
    order.status = OrderStatus::Settled;
    // ... distribute funds
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Validate state transitions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OrderStatus {
    Created,
    Active,
    Settled,
    Cancelled,
}

pub fn settle(ctx: Context<Settle>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // Enforce valid transition
    require!(
        order.status == OrderStatus::Active,
        ErrorCode::InvalidStateTransition
    );

    order.status = OrderStatus::Settled;
    // ... distribute funds
    Ok(())
}
```

**Detection strategy:**
- Map state machine transitions
- Verify each transition checks current state
- Test invalid state transition attempts

**Root cause:** State Machine

**Severity:** MEDIUM

---

## CPI (Cross-Program Invocation) Vulnerabilities

### 15. Missing CPI Guard

**Source:** Neodyme, Coral/Anchor team
**Disclosure date:** 2022

**Description:**
Programs don't prevent being called via CPI when they should only be called as top-level instructions, enabling complex attack chains.

**Mechanism:**
- Attacker creates malicious program
- Malicious program invokes victim via CPI
- Victim executes with attacker's manipulated context

**Vulnerable pattern:**
```rust
// VULNERABLE: No CPI prevention
pub fn sensitive_operation(ctx: Context<SensitiveOp>) -> Result<()> {
    // Can be called via CPI from any program
    let vault = &mut ctx.accounts.vault;
    vault.authority = ctx.accounts.new_authority.key();
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Require top-level invocation
pub fn sensitive_operation(ctx: Context<SensitiveOp>) -> Result<()> {
    // Verify not called via CPI
    require!(
        ctx.accounts.vault.to_account_info().key() == ctx.accounts.vault.key(),
        ErrorCode::CpiNotAllowed
    );

    // Or use Anchor's require_* macros
    let vault = &mut ctx.accounts.vault;
    vault.authority = ctx.accounts.new_authority.key();
    Ok(())
}

// Or in Anchor 0.28+
#[account(
    mut,
    constraint = vault.to_account_info().owner == ctx.program_id @ ErrorCode::InvalidCpi
)]
pub vault: Account<'info, Vault>,
```

**Detection strategy:**
- Identify sensitive instructions (authority changes, withdrawals)
- Verify CPI protection on these instructions
- Test if instruction can be called via CPI

**Root cause:** CPI

**Severity:** HIGH

---

### 16. Signer Authorization in CPI

**Source:** Multiple firms
**Disclosure date:** 2022-2023

**Description:**
Programs invoke CPI with PDA signers without properly verifying the PDA authority, allowing unauthorized CPI calls.

**Mechanism:**
- Program uses PDA as authority for CPI
- Program doesn't verify caller has rights to use PDA
- Attacker triggers CPI using program's PDA authority

**Vulnerable pattern:**
```rust
// VULNERABLE: PDA authority not validated
pub fn withdraw_via_cpi(ctx: Context<WithdrawCpi>, amount: u64) -> Result<()> {
    let seeds = &[b"vault", &[ctx.accounts.vault.bump]];
    let signer = &[&seeds[..]];

    // No check that caller should control this PDA
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_tokens.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer,
        ),
        amount,
    )
}
```

**Safe pattern:**
```rust
// SAFE: Verify caller authority
pub fn withdraw_via_cpi(ctx: Context<WithdrawCpi>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // Verify caller is authorized
    require!(
        vault.authority == ctx.accounts.caller.key(),
        ErrorCode::Unauthorized
    );

    let seeds = &[b"vault", &[vault.bump]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_tokens.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer,
        ),
        amount,
    )
}
```

**Detection strategy:**
- Find all invoke_signed calls
- Verify authorization before PDA signing
- Check that PDA usage is access-controlled

**Root cause:** CPI

**Severity:** CRITICAL

---

### 17. CPI Return Value Not Checked

**Source:** OtterSec, Trail of Bits
**Disclosure date:** 2022-2024

**Description:**
Programs invoke other programs via CPI but don't check return values or account state changes, assuming success when operations may have failed.

**Mechanism:**
- CPI may return error but program continues
- Token transfer may fail but program updates state
- Results in accounting mismatch

**Vulnerable pattern:**
```rust
// VULNERABLE: Unchecked CPI result
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Transfer tokens
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?; // Error returned but state already modified?

    // Update state BEFORE verifying transfer
    let vault = &mut ctx.accounts.vault;
    vault.total_deposits += amount; // Could be incorrect if transfer failed

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Verify account state after CPI
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault_tokens_before = ctx.accounts.vault_tokens.amount;

    // Perform transfer
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Reload account and verify actual change
    ctx.accounts.vault_tokens.reload()?;
    let actual_deposited = ctx.accounts.vault_tokens.amount - vault_tokens_before;

    require!(
        actual_deposited == amount,
        ErrorCode::DepositMismatch
    );

    // Update state based on verified amount
    let vault = &mut ctx.accounts.vault;
    vault.total_deposits += actual_deposited;

    Ok(())
}
```

**Detection strategy:**
- Review all CPI calls
- Verify state updates occur after CPI success
- Check if account state is reloaded and verified

**Root cause:** CPI

**Severity:** HIGH

---

## Token/Economic Vulnerabilities

### 18. Unchecked Token Account Ownership

**Source:** Multiple firms
**Disclosure date:** Ongoing

**Description:**
Programs accept token accounts without verifying they belong to expected mint, allowing wrong token deposits or fake token exploits.

**Mechanism:**
- Program expects USDC but doesn't check mint
- User passes worthless token with same amount
- Program credits user as if they deposited USDC

**Vulnerable pattern:**
```rust
// VULNERABLE: No mint verification
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>, // Which mint?
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
}
```

**Safe pattern:**
```rust
// SAFE: Verify mint matches expected
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        constraint = user_token_account.mint == vault_token_account.mint @ ErrorCode::MintMismatch
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.mint == vault.accepted_mint @ ErrorCode::InvalidMint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub vault: Account<'info, Vault>,
    pub user: Signer<'info>,
}
```

**Detection strategy:**
- Check all token account usage
- Verify mint constraints exist
- Ensure consistent mint across related accounts

**Root cause:** Account Validation

**Severity:** CRITICAL

---

### 19. Donation/Inflation Attack

**Source:** Sec3, OtterSec
**Disclosure date:** 2023-2024

**Description:**
Attacker donates large amount to pool before victim deposits, manipulating share price to steal victim's deposit through rounding errors.

**Mechanism:**
- Pool calculates shares = deposit / (total_assets / total_shares)
- Attacker donates directly to vault (not via deposit function)
- Inflates total_assets without increasing shares
- Victim deposit rounds down to 0 shares

**Vulnerable pattern:**
```rust
// VULNERABLE: Donation can manipulate share price
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Get current balance (includes donations!)
    let total_assets = ctx.accounts.vault_tokens.amount;

    // Calculate shares
    let shares = if vault.total_shares == 0 {
        amount
    } else {
        (amount as u128)
            .checked_mul(vault.total_shares as u128)
            .unwrap()
            .checked_div(total_assets as u128)
            .unwrap() as u64 // Can round to 0!
    };

    vault.total_shares += shares;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Track internal accounting, not token balance
#[account]
pub struct Vault {
    pub total_shares: u64,
    pub total_assets: u64, // Internal accounting
    pub bump: u8,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Use internal accounting, not actual token balance
    let shares = if vault.total_shares == 0 {
        amount
    } else {
        (amount as u128)
            .checked_mul(vault.total_shares as u128)
            .unwrap()
            .checked_div(vault.total_assets as u128)
            .unwrap() as u64
    };

    require!(shares > 0, ErrorCode::InsufficientDeposit);

    // Transfer tokens
    token::transfer(/*...*/)?;

    // Update internal accounting
    vault.total_shares += shares;
    vault.total_assets += amount;

    Ok(())
}
```

**Detection strategy:**
- Check if vault/pool uses token balance for calculations
- Verify internal accounting tracks deposits/withdrawals
- Test with direct token transfers (donations)

**Root cause:** Token/Economic

**Severity:** CRITICAL

---

### 20. Flash Loan Price Manipulation

**Source:** Multiple firms - DeFi standard issue
**Disclosure date:** 2022-2024

**Description:**
Programs rely on spot prices from AMMs that can be manipulated within a single transaction via flash loans or large swaps.

**Mechanism:**
- Attacker flash loans large amount
- Manipulates AMM price via large swap
- Exploits protocol that uses manipulated price
- Reverses swap and repays flash loan

**Vulnerable pattern:**
```rust
// VULNERABLE: Using spot price
pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
    // Gets current spot price from AMM
    let price = get_spot_price(
        ctx.accounts.amm_pool.amount_a,
        ctx.accounts.amm_pool.amount_b,
    );

    // Uses manipulable price for liquidation
    let collateral_value = user.collateral * price;
    require!(collateral_value < user.debt, ErrorCode::Healthy);

    // ... perform liquidation
    Ok(())
}

fn get_spot_price(amount_a: u64, amount_b: u64) -> u64 {
    (amount_b as u128 * PRECISION / amount_a as u128) as u64
}
```

**Safe pattern:**
```rust
// SAFE: Use TWAP or oracle
pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
    // Use time-weighted average price
    let price = ctx.accounts.oracle.get_twap()?;

    // Or use Chainlink/Pyth oracle
    let price_feed = &ctx.accounts.price_feed;
    let price = price_feed.get_price()?;

    // Verify price is fresh
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp - price_feed.last_update < MAX_PRICE_AGE,
        ErrorCode::StalePrice
    );

    let collateral_value = user.collateral * price;
    require!(collateral_value < user.debt, ErrorCode::Healthy);

    Ok(())
}
```

**Detection strategy:**
- Identify all price usage in protocol
- Verify prices come from manipulation-resistant sources
- Check for TWAP implementation or oracle integration

**Root cause:** Oracle

**Severity:** CRITICAL

---

### 21. Slippage Not Enforced

**Source:** OtterSec, Halborn
**Disclosure date:** 2022-2024

**Description:**
Swap/trade functions don't enforce minimum output amounts, allowing MEV bots to sandwich attack users with extreme slippage.

**Mechanism:**
- User submits swap without minimum output check
- MEV bot front-runs with large swap (moves price)
- User swap executes at terrible price
- MEV bot back-runs with reverse swap (profit)

**Vulnerable pattern:**
```rust
// VULNERABLE: No slippage protection
pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Calculate output (subject to manipulation)
    let amount_out = calculate_swap_output(
        amount_in,
        pool.reserve_a,
        pool.reserve_b,
    );

    // No minimum check - user accepts any amount!
    transfer_tokens(amount_in, amount_out)?;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Require minimum output
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64, // User specifies minimum acceptable
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    let amount_out = calculate_swap_output(
        amount_in,
        pool.reserve_a,
        pool.reserve_b,
    );

    // Enforce slippage protection
    require!(
        amount_out >= min_amount_out,
        ErrorCode::SlippageExceeded
    );

    transfer_tokens(amount_in, amount_out)?;

    Ok(())
}
```

**Detection strategy:**
- Review all swap/trade functions
- Verify min_amount_out or similar parameter exists
- Check that minimum is enforced before execution

**Root cause:** Token/Economic

**Severity:** HIGH

---

## Access Control Vulnerabilities

### 22. Insufficient Authority Validation

**Source:** Multiple firms - Most common vulnerability
**Disclosure date:** Ongoing

**Description:**
Functions that should be restricted to specific roles (admin, owner) don't properly verify the caller's authority.

**Mechanism:**
- Function intended for admin only
- No check that caller is the admin
- Any user can call privileged function

**Vulnerable pattern:**
```rust
// VULNERABLE: No authority check
pub fn update_fee(ctx: Context<UpdateFee>, new_fee: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    // Anyone can update the fee!
    config.fee = new_fee;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    pub caller: Signer<'info>, // Signer but not verified as authority
}
```

**Safe pattern:**
```rust
// SAFE: Verify authority
pub fn update_fee(ctx: Context<UpdateFee>, new_fee: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.fee = new_fee;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(
        mut,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}
```

**Detection strategy:**
- List all privileged operations
- Verify each has authority constraint
- Check that authority field exists and is checked

**Root cause:** Access Control

**Severity:** CRITICAL

---

### 23. Delegate Authority Misuse

**Source:** Neodyme, OtterSec
**Disclosure date:** 2022-2023

**Description:**
Programs mishandle token account delegates, allowing unauthorized transfers by checking owner instead of delegate or vice versa.

**Mechanism:**
- Token accounts have owner AND delegate fields
- Program checks wrong field for authorization
- Attacker uses delegate to bypass owner checks

**Vulnerable pattern:**
```rust
// VULNERABLE: Only checking owner
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Checks that caller owns the account
    require!(
        ctx.accounts.token_account.owner == ctx.accounts.user.key(),
        ErrorCode::Unauthorized
    );

    // But token might have delegate that can transfer!
    token::transfer(/*...*/)?;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Verify no delegate or delegate is authorized
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let token_account = &ctx.accounts.token_account;

    // Check owner
    require!(
        token_account.owner == ctx.accounts.user.key(),
        ErrorCode::Unauthorized
    );

    // Verify no unauthorized delegate
    if let COption::Some(delegate) = token_account.delegate {
        require!(
            delegate == ctx.accounts.user.key(),
            ErrorCode::UnauthorizedDelegate
        );
    }

    token::transfer(/*...*/)?;
    Ok(())
}
```

**Detection strategy:**
- Review token account usage
- Check if delegate field is considered
- Verify delegate can't bypass owner checks

**Root cause:** Access Control

**Severity:** HIGH

---

### 24. Missing Freeze Authority Check

**Source:** OtterSec
**Disclosure date:** 2023

**Description:**
Programs don't verify that token accounts aren't frozen before performing operations, allowing frozen accounts to be used incorrectly.

**Mechanism:**
- Token mint has freeze authority
- Accounts can be frozen (no transfers allowed)
- Program uses frozen account without checking state

**Vulnerable pattern:**
```rust
// VULNERABLE: No freeze check
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Attempts transfer from potentially frozen account
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Check frozen state
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let user_tokens = &ctx.accounts.user_tokens;

    // Verify account is not frozen
    require!(
        user_tokens.is_frozen() == false,
        ErrorCode::AccountFrozen
    );

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

**Detection strategy:**
- Check token operations for freeze state validation
- Verify handling of frozen accounts
- Test behavior with frozen token accounts

**Root cause:** Account Validation

**Severity:** MEDIUM

---

## Upgrade/Admin Vulnerabilities

### 25. Unprotected Upgrade Authority

**Source:** Multiple firms
**Disclosure date:** 2022-2024

**Description:**
Program upgrade authority not properly secured, allowing unauthorized program updates that can drain all funds.

**Mechanism:**
- Upgrade authority is single keypair
- Key compromised or not rotated to multisig
- Attacker deploys malicious program version

**Vulnerable pattern:**
```rust
// Deployment configuration issue, not code:
// solana program deploy --upgrade-authority keypair.json
// Authority is single keypair without multisig protection
```

**Safe pattern:**
```bash
# Use multisig or governance for upgrade authority
# Deploy with Squads multisig as authority
solana program deploy \
  --upgrade-authority <MULTISIG_PDA> \
  --program-id <PROGRAM_ID>

# Or make immutable after testing
solana program set-upgrade-authority <PROGRAM_ID> --final
```

**Detection strategy:**
- Check upgrade authority of deployed programs
- Verify multisig or governance controls upgrades
- Audit upgrade authority transfer history

**Root cause:** Upgrade/Admin

**Severity:** CRITICAL

---

### 26. Admin Key Rotation Not Implemented

**Source:** Halborn, Trail of Bits
**Disclosure date:** 2023-2024

**Description:**
Programs have admin/authority fields but no function to update them, making key compromise permanent.

**Mechanism:**
- Admin key is set at initialization
- No way to change admin if key compromised
- Compromised admin has permanent control

**Vulnerable pattern:**
```rust
// VULNERABLE: No way to update authority
#[account]
pub struct Config {
    pub authority: Pubkey,
    pub fee: u64,
}

// Initialization sets authority
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.config.authority = ctx.accounts.authority.key();
    Ok(())
}

// No update_authority function!
```

**Safe pattern:**
```rust
// SAFE: Authority can be updated
#[account]
pub struct Config {
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>, // Two-step transfer
    pub fee: u64,
}

pub fn transfer_authority(
    ctx: Context<TransferAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.pending_authority = Some(new_authority);
    Ok(())
}

pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(
        config.pending_authority == Some(ctx.accounts.new_authority.key()),
        ErrorCode::Unauthorized
    );
    config.authority = ctx.accounts.new_authority.key();
    config.pending_authority = None;
    Ok(())
}
```

**Detection strategy:**
- Identify authority/admin fields
- Verify update functions exist
- Check for two-step transfer pattern

**Root cause:** Upgrade/Admin

**Severity:** HIGH

---

### 27. Emergency Pause Missing

**Source:** Halborn, Sec3
**Disclosure date:** 2023-2024

**Description:**
Programs lack emergency pause functionality to halt operations during active exploit, allowing attacker to drain protocol.

**Mechanism:**
- Vulnerability discovered in production
- No way to pause deposits/withdrawals
- Attacker continues exploit while fix is deployed

**Vulnerable pattern:**
```rust
// VULNERABLE: No pause mechanism
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Always executable, even during emergency
    token::transfer(/*...*/)?;
    ctx.accounts.vault.total += amount;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Pausable operations
#[account]
pub struct Config {
    pub authority: Pubkey,
    pub paused: bool,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    // Check pause state
    require!(!config.paused, ErrorCode::Paused);

    token::transfer(/*...*/)?;
    ctx.accounts.vault.total += amount;
    Ok(())
}

pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    // Only authority can pause
    require!(
        config.authority == ctx.accounts.authority.key(),
        ErrorCode::Unauthorized
    );
    config.paused = true;
    Ok(())
}

pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(
        config.authority == ctx.accounts.authority.key(),
        ErrorCode::Unauthorized
    );
    config.paused = false;
    Ok(())
}
```

**Detection strategy:**
- Check if critical operations have pause mechanism
- Verify only authority can pause/unpause
- Test that pause actually blocks operations

**Root cause:** Upgrade/Admin

**Severity:** MEDIUM

---

## Error Handling Vulnerabilities

### 28. Unchecked Deserialization

**Source:** Neodyme, Trail of Bits
**Disclosure date:** 2022-2023

**Description:**
Programs deserialize account data without proper error handling, causing panics or using corrupted data.

**Mechanism:**
- Deserialization fails but error not caught
- Program panics or continues with partial data
- Can cause incorrect state or DoS

**Vulnerable pattern:**
```rust
// VULNERABLE: Unwrap can panic
pub fn process(ctx: Context<Process>) -> Result<()> {
    let account_data = ctx.accounts.data.data.borrow();
    let data: MyData = MyData::try_from_slice(&account_data).unwrap(); // Panic!
    // ... use data
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Proper error handling
pub fn process(ctx: Context<Process>) -> Result<()> {
    let account_data = ctx.accounts.data.data.borrow();

    // Handle deserialization error
    let data: MyData = MyData::try_from_slice(&account_data)
        .map_err(|_| ErrorCode::DeserializationFailed)?;

    // Or use Anchor's Account wrapper (handles this automatically)
    let data = &ctx.accounts.typed_data; // Already deserialized safely

    Ok(())
}
```

**Detection strategy:**
- Search for unwrap(), expect(), panic!
- Review manual deserialization code
- Verify error handling on all Result types

**Root cause:** Error Handling

**Severity:** MEDIUM

---

### 29. Ignore CPI Errors (Continue on Failure)

**Source:** OtterSec, Sec3
**Disclosure date:** 2023

**Description:**
Programs catch and suppress CPI errors instead of propagating them, causing state updates despite failed operations.

**Mechanism:**
- Token transfer CPI fails
- Program catches error but continues
- Updates state as if transfer succeeded
- Accounting mismatch between state and reality

**Vulnerable pattern:**
```rust
// VULNERABLE: Swallowing errors
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Attempt transfer
    let transfer_result = token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    );

    // Ignores error and continues!
    if transfer_result.is_err() {
        msg!("Transfer failed, but continuing anyway");
    }

    // Updates state regardless of transfer success
    ctx.accounts.vault.total += amount;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Propagate errors
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Transfer - error will propagate automatically
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_tokens.to_account_info(),
                to: ctx.accounts.vault_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?; // Propagate error

    // Only executes if transfer succeeded
    ctx.accounts.vault.total += amount;
    Ok(())
}
```

**Detection strategy:**
- Look for error handling that continues execution
- Check if state updates occur regardless of CPI results
- Verify ? operator is used on CPI calls

**Root cause:** Error Handling

**Severity:** HIGH

---

## Timing Vulnerabilities

### 30. Timestamp Dependence

**Source:** Multiple firms
**Disclosure date:** 2022-2024

**Description:**
Programs rely on block timestamps for critical logic, but validators can manipulate timestamps within bounds.

**Mechanism:**
- Program uses Clock::get()?.unix_timestamp for access control
- Validator can set timestamp within ~30s window
- Attacker validator manipulates timestamp to bypass checks

**Vulnerable pattern:**
```rust
// VULNERABLE: Strict timestamp checks
pub fn claim_rewards(ctx: Context<Claim>) -> Result<()> {
    let clock = Clock::get()?;
    let user = &ctx.accounts.user;

    // Validator can manipulate timestamp
    require!(
        clock.unix_timestamp >= user.unlock_time,
        ErrorCode::StillLocked
    );

    // Reward depends on exact timestamp
    let rewards = calculate_rewards(
        user.stake,
        clock.unix_timestamp - user.stake_time,
    );

    transfer_rewards(rewards)?;
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Slot-based or tolerant timing
pub fn claim_rewards(ctx: Context<Claim>) -> Result<()> {
    let clock = Clock::get()?;
    let user = &ctx.accounts.user;

    // Use slot number instead (can't be manipulated)
    require!(
        clock.slot >= user.unlock_slot,
        ErrorCode::StillLocked
    );

    // Or use timestamp with tolerance
    require!(
        clock.unix_timestamp >= user.unlock_time + SAFETY_MARGIN,
        ErrorCode::StillLocked
    );

    let rewards = calculate_rewards(
        user.stake,
        clock.slot - user.stake_slot,
    );

    transfer_rewards(rewards)?;
    Ok(())
}
```

**Detection strategy:**
- Find Clock::get()?.unix_timestamp usage
- Check if critical logic depends on exact timestamp
- Verify slot numbers used instead for ordering

**Root cause:** Timing

**Severity:** MEDIUM

---

## Rent Vulnerabilities

### 31. Rent Siphoning Attack

**Source:** Neodyme, Sec3
**Disclosure date:** 2022-2023

**Description:**
Programs don't protect against rent withdrawal from accounts that should remain rent-exempt, allowing drainage of protocol accounts.

**Mechanism:**
- Account is rent-exempt (has sufficient lamports)
- Attacker withdraws lamports below rent-exempt threshold
- Account becomes rent-paying and eventually garbage collected

**Vulnerable pattern:**
```rust
// VULNERABLE: No rent protection
pub fn withdraw_lamports(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // No check that vault remains rent-exempt
    **vault.to_account_info().lamports.borrow_mut() -= amount;
    **ctx.accounts.destination.lamports.borrow_mut() += amount;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Maintain rent exemption
pub fn withdraw_lamports(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let rent = Rent::get()?;

    let required_rent = rent.minimum_balance(vault.to_account_info().data_len());
    let available = vault.to_account_info().lamports()
        .checked_sub(required_rent)
        .ok_or(ErrorCode::InsufficientLamports)?;

    require!(amount <= available, ErrorCode::WouldBreakRentExemption);

    **vault.to_account_info().lamports.borrow_mut() -= amount;
    **ctx.accounts.destination.lamports.borrow_mut() += amount;

    Ok(())
}
```

**Detection strategy:**
- Find lamport withdrawal operations
- Verify rent-exemption is maintained
- Check for minimum balance validation

**Root cause:** Account Validation

**Severity:** MEDIUM

---

### 32. Account Reallocation Without Rent Check

**Source:** Halborn, OtterSec
**Disclosure date:** 2023-2024

**Description:**
Programs reallocate account size without ensuring sufficient rent, causing accounts to become rent-paying or fail.

**Mechanism:**
- Account resized to larger size
- Additional rent not provided
- Account falls below rent-exempt threshold

**Vulnerable pattern:**
```rust
// VULNERABLE: Resize without rent check
pub fn expand_storage(ctx: Context<ExpandStorage>, new_size: usize) -> Result<()> {
    let account = &mut ctx.accounts.data_account;

    // Resize without checking rent
    account.to_account_info().realloc(new_size, false)?;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Calculate and verify rent before reallocation
pub fn expand_storage(ctx: Context<ExpandStorage>, new_size: usize) -> Result<()> {
    let account = &mut ctx.accounts.data_account;
    let rent = Rent::get()?;

    let current_lamports = account.to_account_info().lamports();
    let required_lamports = rent.minimum_balance(new_size);

    require!(
        current_lamports >= required_lamports,
        ErrorCode::InsufficientRent
    );

    account.to_account_info().realloc(new_size, false)?;

    Ok(())
}
```

**Detection strategy:**
- Find realloc() calls
- Verify rent calculation before resizing
- Check that sufficient lamports exist

**Root cause:** Account Validation

**Severity:** MEDIUM

---

## SPL Token Specific Vulnerabilities

### 33. Token Account Authority Confusion

**Source:** OtterSec, Neodyme
**Disclosure date:** 2022-2023

**Description:**
Programs confuse token account "owner" field with token account "authority" for operations, leading to authorization bypasses.

**Mechanism:**
- Token accounts have "owner" (wallet that owns the account)
- Token program uses "authority" parameter for transfers
- Program checks wrong field for authorization

**Vulnerable pattern:**
```rust
// VULNERABLE: Checks account owner instead of transfer authority
pub fn admin_transfer(ctx: Context<AdminTransfer>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    // Checks token account owner, not who can authorize transfers
    require!(
        ctx.accounts.source_token.owner == config.authority,
        ErrorCode::Unauthorized
    );

    // But the authority parameter in transfer is different!
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.source_token.to_account_info(),
                to: ctx.accounts.dest_token.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(), // Wrong authority!
            },
        ),
        amount,
    )?;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Verify actual transfer authority
pub fn admin_transfer(ctx: Context<AdminTransfer>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    // Verify the signer is the authorized admin
    require!(
        ctx.accounts.admin.key() == config.authority,
        ErrorCode::Unauthorized
    );

    // Verify admin can actually authorize this transfer
    require!(
        ctx.accounts.source_token.owner == ctx.accounts.admin.key() ||
        ctx.accounts.source_token.delegate == COption::Some(ctx.accounts.admin.key()),
        ErrorCode::CannotAuthorizeTransfer
    );

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.source_token.to_account_info(),
                to: ctx.accounts.dest_token.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}
```

**Detection strategy:**
- Review token transfer authorization logic
- Verify distinction between account owner and transfer authority
- Check delegate handling

**Root cause:** Access Control

**Severity:** HIGH

---

### 34. Native SOL Wrapping Confusion

**Source:** OtterSec
**Disclosure date:** 2023

**Description:**
Programs treat native SOL and wrapped SOL (WSOL) equivalently without proper handling, leading to loss of funds or incorrect accounting.

**Mechanism:**
- Native SOL token account has special semantics
- Close_account returns SOL to owner, not a specified account
- Wrapped SOL can be "created" by transferring SOL to token account

**Vulnerable pattern:**
```rust
// VULNERABLE: Assumes all token accounts behave identically
pub fn withdraw_token(ctx: Context<WithdrawToken>, amount: u64) -> Result<()> {
    // Transfer tokens
    token::transfer(/*...*/)?;

    // Close empty account - but if WSOL, SOL goes to owner, not vault!
    token::close_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.user_token.to_account_info(),
                destination: ctx.accounts.vault.to_account_info(), // Ignored for WSOL!
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
    )?;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Handle native SOL specially
pub fn withdraw_token(ctx: Context<WithdrawToken>, amount: u64) -> Result<()> {
    let is_native = ctx.accounts.user_token.is_native();

    // Transfer tokens
    token::transfer(/*...*/)?;

    if is_native {
        // For native SOL, sync_native to update amount
        token::sync_native(/*...*/)?;

        // Don't close native accounts or handle specially
        msg!("Warning: Native SOL account not closed");
    } else {
        // Safe to close non-native accounts
        token::close_account(/*...*/)?;
    }

    Ok(())
}
```

**Detection strategy:**
- Check if program handles native SOL token accounts
- Verify is_native() checks before close operations
- Test with both WSOL and regular SPL tokens

**Root cause:** SPL Token

**Severity:** MEDIUM

---

### 35. Mint Authority Not Checked

**Source:** Multiple firms
**Disclosure date:** 2022-2024

**Description:**
Programs accept mint accounts without verifying mint authority, allowing attackers to create unlimited supply tokens.

**Mechanism:**
- Attacker creates token mint with themselves as mint authority
- Program accepts deposits of this token
- Attacker mints unlimited supply and deposits

**Vulnerable pattern:**
```rust
// VULNERABLE: No mint authority verification
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(init, payer = creator, space = 8 + 64)]
    pub pool: Account<'info, Pool>,
    pub token_mint: Account<'info, Mint>, // Any mint accepted!
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Safe pattern:**
```rust
// SAFE: Verify mint authority is None or trusted
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(init, payer = creator, space = 8 + 64)]
    pub pool: Account<'info, Pool>,
    #[account(
        constraint = token_mint.mint_authority == COption::None @ ErrorCode::MintHasAuthority
        // Or check mint_authority is a trusted program/DAO
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Detection strategy:**
- Find mint account usage
- Verify mint_authority and freeze_authority constraints
- Check for unlimited supply token risks

**Root cause:** Account Validation

**Severity:** HIGH

---

## Advanced Exploit Patterns

### 36. Duplicate Mutable Accounts

**Source:** Neodyme - "Breaking Solana" Part 2
**Disclosure date:** 2022-05

**Description:**
Programs don't prevent the same account being passed multiple times as different parameters, allowing double-spending or state corruption.

**Mechanism:**
- Instruction accepts two mutable accounts
- Attacker passes same account for both
- Operations on each alias affect the same account
- Can double-spend, corrupt state, or bypass checks

**Vulnerable pattern:**
```rust
// VULNERABLE: No duplicate account check
pub fn transfer_between_accounts(
    ctx: Context<TransferBetween>,
    amount: u64,
) -> Result<()> {
    let from = &mut ctx.accounts.from_account;
    let to = &mut ctx.accounts.to_account;

    // If from == to, both point to same account
    from.balance -= amount; // Decrements
    to.balance += amount;   // Increments same account!
    // Net effect: balance unchanged but operation "succeeded"

    Ok(())
}

#[derive(Accounts)]
pub struct TransferBetween<'info> {
    #[account(mut)]
    pub from_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub to_account: Account<'info, UserAccount>, // Could be same as from!
}
```

**Safe pattern:**
```rust
// SAFE: Verify accounts are distinct
#[derive(Accounts)]
pub struct TransferBetween<'info> {
    #[account(mut)]
    pub from_account: Account<'info, UserAccount>,
    #[account(
        mut,
        constraint = to_account.key() != from_account.key() @ ErrorCode::DuplicateAccount
    )]
    pub to_account: Account<'info, UserAccount>,
}
```

**Detection strategy:**
- Find instructions with multiple mutable accounts of same type
- Verify inequality constraints between related accounts
- Test by passing same account multiple times

**Root cause:** Account Validation

**Severity:** CRITICAL

---

### 37. Bump Seed Canonicalization

**Source:** Neodyme, Coral/Anchor team
**Disclosure date:** 2021-2022

**Description:**
Programs accept any valid bump seed instead of canonical bump, allowing multiple PDAs for same seeds and bypass of uniqueness assumptions.

**Mechanism:**
- PDAs can have multiple valid bump seeds (0-255)
- Canonical bump is the first one that produces valid PDA
- Programs may assume one PDA per seed combination
- Attacker uses non-canonical bump to create second account

**Vulnerable pattern:**
```rust
// VULNERABLE: Accepts any bump
pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
    // Manually verify PDA but don't check canonical bump
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[b"vault", ctx.accounts.user.key().as_ref()],
        ctx.program_id,
    );

    require!(
        ctx.accounts.vault.key() == expected_pda,
        ErrorCode::InvalidPDA
    ); // But what if user passed different bump?

    ctx.accounts.vault.bump = bump; // Stores non-canonical bump!
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Use Anchor's seeds constraint (enforces canonical bump)
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 1,
        seeds = [b"vault", user.key().as_ref()],
        bump // Anchor finds and enforces canonical bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Detection strategy:**
- Find manual PDA derivation and verification
- Verify canonical bump is enforced
- Use Anchor's seeds/bump constraints

**Root cause:** Account Validation

**Severity:** HIGH

---

### 38. Program Derived Address (PDA) Verification Bypass

**Source:** Trail of Bits, Neodyme
**Disclosure date:** 2022-2023

**Description:**
Programs verify PDA address but not the seeds used to derive it, allowing attackers to use different seeds that happen to produce the same address.

**Mechanism:**
- Program checks account.key() == expected_pda
- Doesn't check which seeds were used
- Attacker finds collision or uses different valid derivation

**Vulnerable pattern:**
```rust
// VULNERABLE: Only checks address, not derivation
pub fn use_vault(ctx: Context<UseVault>) -> Result<()> {
    let (expected_vault, _bump) = Pubkey::find_program_address(
        &[b"vault", ctx.accounts.user.key().as_ref()],
        ctx.program_id,
    );

    // Only checks the resulting address
    require!(
        ctx.accounts.vault.key() == expected_vault,
        ErrorCode::InvalidVault
    );

    // But attacker could have derived this address using different seeds!
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Use Anchor's seeds constraint (re-derives and compares)
#[derive(Accounts)]
pub struct UseVault<'info> {
    #[account(
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump // Re-derives PDA and verifies it matches
    )]
    pub vault: Account<'info, Vault>,
    pub user: Signer<'info>,
}
```

**Detection strategy:**
- Find manual PDA verification
- Verify seeds are re-derived and checked
- Use Anchor's seeds constraint instead of manual checks

**Root cause:** Account Validation

**Severity:** HIGH

---

### 39. Account Borrow Violation (RefCell)

**Source:** Neodyme, Trail of Bits
**Disclosure date:** 2022-2023

**Description:**
Programs borrow account data mutably multiple times or while immutably borrowed, causing runtime panics.

**Mechanism:**
- Solana account data wrapped in RefCell
- Multiple mutable borrows cause panic
- Mutable borrow while immutable borrow exists causes panic

**Vulnerable pattern:**
```rust
// VULNERABLE: Multiple mutable borrows
pub fn process(ctx: Context<Process>) -> Result<()> {
    let account = &ctx.accounts.data;

    // First borrow
    let data1 = account.to_account_info().data.borrow_mut();

    // Second borrow - PANIC!
    let data2 = account.to_account_info().data.borrow_mut();

    // Program crashes
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Single borrow scope or use Anchor abstractions
pub fn process(ctx: Context<Process>) -> Result<()> {
    let account = &mut ctx.accounts.data;

    // Use Anchor's Account wrapper - handles borrowing
    account.value += 1;

    // Or manage borrow scopes carefully
    {
        let data = account.to_account_info().data.borrow_mut();
        // Use data
    } // Borrow dropped here

    {
        let data = account.to_account_info().data.borrow_mut();
        // Safe to borrow again
    }

    Ok(())
}
```

**Detection strategy:**
- Search for .borrow_mut() calls
- Verify borrowing scope is managed
- Prefer Anchor Account abstractions

**Root cause:** Error Handling

**Severity:** MEDIUM

---

### 40. Sysvar Account Substitution

**Source:** Halborn, OtterSec
**Disclosure date:** 2023-2024

**Description:**
Programs accept sysvar accounts (Clock, Rent, etc.) without verifying their address, allowing attackers to pass fake accounts with manipulated data.

**Mechanism:**
- Sysvars have well-known addresses
- Program accepts AccountInfo without checking address
- Attacker passes account with same structure but fake data

**Vulnerable pattern:**
```rust
// VULNERABLE: Sysvar address not verified
pub fn time_locked_operation(ctx: Context<TimeLocked>) -> Result<()> {
    let clock_account = &ctx.accounts.clock;

    // Deserializes without verifying this is actually the Clock sysvar
    let clock = Clock::from_account_info(clock_account)?;

    require!(
        clock.unix_timestamp >= ctx.accounts.user.unlock_time,
        ErrorCode::StillLocked
    );

    Ok(())
}

#[derive(Accounts)]
pub struct TimeLocked<'info> {
    pub user: Account<'info, User>,
    pub clock: AccountInfo<'info>, // Could be fake!
}
```

**Safe pattern:**
```rust
// SAFE: Verify sysvar address or use Anchor's Sysvar type
pub fn time_locked_operation(ctx: Context<TimeLocked>) -> Result<()> {
    let clock = &ctx.accounts.clock;
    // Anchor's Clock type verifies the address automatically

    require!(
        clock.unix_timestamp >= ctx.accounts.user.unlock_time,
        ErrorCode::StillLocked
    );

    Ok(())
}

#[derive(Accounts)]
pub struct TimeLocked<'info> {
    pub user: Account<'info, User>,
    pub clock: Sysvar<'info, Clock>, // Address verified by Anchor
}
```

**Detection strategy:**
- Find sysvar usage
- Verify address is checked against sysvar constants
- Use Anchor's Sysvar<'info, T> type

**Root cause:** Account Validation

**Severity:** HIGH

---

## Summary of Research

This document compiled **40 distinct vulnerability patterns** from published Solana security research. The patterns span all major vulnerability categories encountered in Solana smart contract audits:

**Critical Severity (12 patterns):** Account validation failures, authorization bypasses, economic exploits
**High Severity (18 patterns):** State manipulation, CPI issues, token handling errors
**Medium Severity (10 patterns):** Timing issues, error handling, operational safety

**Key Takeaways:**

1. **Account validation is paramount** - Most critical vulnerabilities stem from insufficient verification of account ownership, type, and relationships

2. **Use Anchor's constraints** - The framework's account validation macros prevent most common vulnerability classes

3. **Economic logic requires special care** - Token mechanics, reward distribution, and DeFi primitives need careful auditing for manipulation vectors

4. **CPI is powerful and dangerous** - Cross-program invocations require strict validation of programs, accounts, and authority

5. **Defensive programming is essential** - Check arithmetic, verify state transitions, validate all assumptions

**For current research and specific CVE details, consult:**
- Security firm blogs and audit reports
- Solana Foundation security advisories
- Academic papers on blockchain security
- GitHub security advisories for major protocols

---

**Document compiled:** 2026-02-06
**Training data current through:** January 2025
**Verification:** Patterns represent well-established vulnerability classes; always verify with current sources for the latest research and disclosures.
