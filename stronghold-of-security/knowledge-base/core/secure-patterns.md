# Solana Secure Patterns Knowledge Base
<!-- Compiled from Wave 1 research (a2-secure-patterns-1, a2-secure-patterns-2). -->
<!-- Last updated: 2026-02-06 -->
<!-- Pattern count: 58 -->

## Categories
1. [Account Validation](#account-validation) (SP-001 to SP-007)
2. [PDA Security](#pda-security) (SP-008 to SP-011)
3. [CPI Safety](#cpi-safety) (SP-012 to SP-014)
4. [Access Control](#access-control) (SP-015 to SP-018)
5. [State Machine](#state-machine) (SP-019 to SP-026)
6. [Arithmetic Safety](#arithmetic-safety) (SP-027 to SP-035)
7. [Oracle Integration](#oracle-integration) (SP-036 to SP-040)
8. [Token Transfer](#token-transfer) (SP-041 to SP-045)
9. [Error Handling](#error-handling) (SP-046 to SP-049)
10. [Timing & Ordering](#timing--ordering) (SP-050 to SP-058)

---

## Account Validation

### SP-001: PDA Derivation with Canonical Bump
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-004 (PDA Seed Collision), EP-005 (Bump Seed Canonicalization)

**Secure Pattern:**
```rust
#[account(
    init, payer = user,
    space = 8 + UserAccount::INIT_SPACE,
    seeds = [b"user", user.key().as_ref()],
    bump
)]
pub user_account: Account<'info, UserAccount>,
// In handler: account.bump = ctx.bumps.user_account;
```
**Key Rules:**
- Always use `seeds` + `bump` constraints together
- Store canonical bump in account struct (`ctx.bumps.account_name`)
- Never use `find_program_address` in instruction logic (expensive, unnecessary)
- Seeds must come from validated/immutable data only

---

### SP-002: Signer Validation via Type System
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-001 (Missing Signer Check)

**Secure Pattern:**
```rust
#[account(mut, has_one = authority)]
pub config: Account<'info, Config>,
pub authority: Signer<'info>,  // Type enforces is_signer = true
```
**Key Rules:**
- Use `Signer<'info>` type, never manual `is_signer` checks on `UncheckedAccount`
- Combine with `has_one` to validate stored authority matches the signer
- `has_one` field name must exactly match the struct field (case-sensitive)

---

### SP-003: Account Ownership Validation
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-002 (Missing Owner Check)

**Secure Pattern:**
```rust
pub data_account: Account<'info, DataAccount>,     // Owner = this program (auto)
pub token_account: Account<'info, TokenAccount>,    // Owner = Token Program (auto)
pub custom_program: Program<'info, CustomProgram>,  // Validates program ID
```
**Key Rules:**
- `Account<'info, T>` auto-validates owner == current program
- `Program<'info, T>` validates program ID and executable flag
- Use explicit `owner` constraint only for non-standard cases
- Never use `UncheckedAccount` when a typed alternative exists

---

### SP-004: Token Account Validation
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-006 (Missing Constraint Chain), EP-051 (Token Account Confusion)

**Secure Pattern:**
```rust
#[account(mut, associated_token::mint = mint, associated_token::authority = from_authority)]
pub from_token_account: Account<'info, TokenAccount>,
#[account(mut, associated_token::mint = mint, associated_token::authority = to_authority)]
pub to_token_account: Account<'info, TokenAccount>,
pub mint: Account<'info, Mint>,
pub from_authority: Signer<'info>,
pub token_program: Program<'info, Token>,
```
**Key Rules:**
- Always validate both `mint` and `authority` on token accounts
- Use `associated_token::mint` and `associated_token::authority` for ATAs
- For non-ATA accounts, use `constraint` with explicit mint/owner checks
- Never accept token accounts without mint validation

---

### SP-005: Program Account Validation for CPI
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-042 (Arbitrary CPI), EP-049 (Unverified Token Program)

**Secure Pattern:**
```rust
pub token_program: Program<'info, Token>,  // Validates program ID automatically
// For custom programs:
#[account(constraint = custom_program.key() == EXPECTED_ID @ ErrorCode::InvalidProgram)]
pub custom_program: UncheckedAccount<'info>,
```
**Key Rules:**
- Use `Program<'info, T>` for all CPI targets
- For unknown programs, validate ID with `constraint` against a constant
- Never pass `UncheckedAccount` as CPI program without explicit ID validation

---

### SP-006: Safe UncheckedAccount Usage
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-002, EP-006 (all missing-validation patterns)

**Secure Pattern:**
```rust
/// CHECK: Metadata PDA validated by seeds against Metaplex program
#[account(
    mut,
    seeds = [b"metadata", metadata_program.key().as_ref(), mint.key().as_ref()],
    bump,
    seeds::program = metadata_program.key(),
)]
pub metadata: UncheckedAccount<'info>,
```
**Key Rules:**
- Every `UncheckedAccount` MUST have `/// CHECK:` comment explaining why it's safe
- Add constraints: `owner`, `seeds` (PDA), or program ID validation
- Only use when no standard Anchor type exists (Account, Program, Signer, Sysvar)
- Red flag: `/// CHECK: Trust me bro` or `/// CHECK: This is safe`

---

### SP-007: has_one Constraint for Relationships
**Category:** Account Validation  **Anchor Version:** 0.29+
**Counters:** EP-026 (Missing Authority Check)

**Secure Pattern:**
```rust
#[account(
    mut,
    has_one = authority @ ErrorCode::Unauthorized,
    has_one = token_account @ ErrorCode::InvalidTokenAccount,
)]
pub vault: Account<'info, Vault>,
```
**Key Rules:**
- Use `has_one` for all stored Pubkey references that must match instruction accounts
- Field name in `has_one` must exactly match both the stored field and the accounts struct field
- Add custom error with `@` for clear error messages
- Prefer `has_one` over manual `require!` comparisons

---

## PDA Security

### SP-008: Deterministic Seed Construction
**Category:** PDA  **Anchor Version:** 0.29+
**Counters:** EP-004 (PDA Seed Collision)

**Secure Pattern:**
```rust
seeds = [
    b"vault",              // Constant prefix
    user.key().as_ref(),   // User-specific
    mint.key().as_ref(),   // Asset-specific
]
```
**Key Rules:**
- Include constant prefix + entity-specific keys for uniqueness
- Use `.as_ref()` for Pubkey conversion to bytes
- For numeric seeds, use fixed-width encoding: `&counter.to_le_bytes()`
- Never use variable-length strings as seeds (prefix attack risk)
- Include enough dimensions to prevent collisions (user + asset + action)

---

### SP-009: Stored Bump vs Runtime Lookup
**Category:** PDA  **Anchor Version:** 0.29+
**Counters:** EP-005 (Bump Seed Canonicalization)

**Secure Pattern:**
```rust
// On init: store the bump
account.bump = ctx.bumps.user_account;
// On subsequent use: reference stored bump
#[account(seeds = [b"user", user.key().as_ref()], bump = user_account.bump)]
pub user_account: Account<'info, UserAccount>,
```
**Key Rules:**
- Store bump in account struct during initialization
- Reference stored bump with `bump = account.bump` in subsequent instructions
- This saves ~3000 CU vs `find_program_address` at runtime
- Ensures canonical bump is always used (prevents non-canonical bump attacks)

---

### SP-010: PDA as Signer in CPI
**Category:** PDA  **Anchor Version:** 0.29+
**Counters:** EP-043 (CPI Signer Privilege Escalation)

**Secure Pattern:**
```rust
let signer_seeds: &[&[&[u8]]] = &[&[
    b"vault",
    user.key().as_ref(),
    &[vault.bump],
]];
let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);
token::transfer(cpi_ctx, amount)?;
```
**Key Rules:**
- Seeds in `invoke_signed` must exactly match the PDA derivation seeds
- Include the stored bump as the last seed element
- Never hardcode bumps — always use the stored canonical bump
- Validate that the PDA account matches the expected derived address

---

### SP-011: PDA Collision Avoidance
**Category:** PDA  **Anchor Version:** 0.29+
**Counters:** EP-004 (PDA Seed Collision)

**Secure Pattern:**
```rust
// Multi-dimensional seeds prevent collision
seeds = [b"position", pool.key().as_ref(), user.key().as_ref(), &position_index.to_le_bytes()]
// For string-like seeds, prefix with length
let name_bytes = name.as_bytes();
let name_len = (name_bytes.len() as u16).to_le_bytes();
seeds = [b"record", &name_len, name_bytes]
```
**Key Rules:**
- Include all identity dimensions (who, what, which instance)
- For variable-length data, prefix with length to prevent "ab"+"c" == "a"+"bc" attacks
- Use index/counter for multiple instances per user
- Test: can two different logical entities produce the same PDA?

---

## CPI Safety

### SP-012: CPI Target Program Validation
**Category:** CPI  **Anchor Version:** 0.29+
**Counters:** EP-042 (Arbitrary CPI), EP-049 (Unverified Token Program)

**Secure Pattern:**
```rust
pub token_program: Program<'info, Token>,           // Auto-validates
pub associated_token_program: Program<'info, AssociatedToken>,
pub system_program: Program<'info, System>,
// Custom: validate against known ID constant
#[account(constraint = program.key() == KNOWN_PROGRAM_ID)]
pub custom_program: UncheckedAccount<'info>,
```
**Key Rules:**
- Every CPI target MUST be validated before invocation
- Use `Program<'info, T>` for standard programs (Token, System, ATA)
- For custom programs, validate with `constraint` against hardcoded Pubkey constant
- Never trust user-provided program accounts without validation

---

### SP-013: Safe invoke_signed Pattern
**Category:** CPI  **Anchor Version:** 0.29+
**Counters:** EP-043, EP-044 (CPI Privilege Escalation/Propagation)

**Secure Pattern:**
```rust
// 1. Validate all accounts BEFORE CPI
require!(amount > 0, ErrorCode::InvalidAmount);
require!(vault.balance >= amount, ErrorCode::InsufficientFunds);

// 2. Update state BEFORE CPI (checks-effects-interactions)
vault.balance = vault.balance.checked_sub(amount).ok_or(ErrorCode::Underflow)?;

// 3. Perform CPI with validated PDA signer
let signer_seeds = &[&[b"vault", user.as_ref(), &[vault.bump]][..]];
let cpi_ctx = CpiContext::new_with_signer(program, accounts, signer_seeds);
token::transfer(cpi_ctx, amount)?;
```
**Key Rules:**
- Follow checks-effects-interactions: validate → update state → CPI
- Use `checked_*` arithmetic before CPI
- Propagate CPI errors with `?` operator (never ignore with `let _ =`)
- Limit PDA signer authority to minimum necessary operations

---

### SP-014: Token Program CPI Patterns
**Category:** CPI  **Anchor Version:** 0.29+
**Counters:** EP-046 (Missing CPI Error Propagation), EP-051-057 (Token patterns)

**Secure Pattern:**
```rust
// Transfer: validates from, to, authority, and amount
token::transfer(cpi_ctx, amount)?;
// Mint: validates mint authority
token::mint_to(cpi_ctx, amount)?;
// Burn: validates burn authority
token::burn(cpi_ctx, amount)?;
// Close: validates destination for remaining lamports
token::close_account(cpi_ctx)?;
```
**Key Rules:**
- Always propagate errors from token CPIs
- Validate token accounts (mint, authority) in Accounts struct before CPI
- For Token-2022, check transfer hooks and extension compatibility
- Close token accounts only when no longer needed (lamports go to specified account)

---

## Access Control

### SP-015: Admin Authority Pattern
**Category:** Access Control  **Anchor Version:** 0.29+
**Counters:** EP-026 (Missing Authority Check), EP-068 (Single Admin Key)

**Secure Pattern:**
```rust
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub pending_admin: Option<Pubkey>,  // For two-step transfer
    pub is_paused: bool,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(has_one = admin @ ErrorCode::Unauthorized)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}
```
**Key Rules:**
- Store admin pubkey in config account, validate with `has_one`
- Use two-step authority transfer (propose → accept) to prevent lockout
- Consider multisig for high-value operations
- Log authority changes for audit trail

---

### SP-016: Role-Based Access Control
**Category:** Access Control  **Anchor Version:** 0.29+
**Counters:** EP-073 (Excessive Admin Privileges)

**Secure Pattern:**
```rust
#[account]
pub struct Config {
    pub super_admin: Pubkey,    // Can change roles
    pub operator: Pubkey,       // Can pause/unpause
    pub fee_manager: Pubkey,    // Can update fees
    pub upgrade_authority: Pubkey,
}

pub fn update_fee(ctx: Context<UpdateFee>, new_fee: u16) -> Result<()> {
    require!(new_fee <= MAX_FEE_BPS, ErrorCode::FeeTooHigh);
    ctx.accounts.config.fee_bps = new_fee;
    Ok(())
}
```
**Key Rules:**
- Separate admin roles by function (operator, fee manager, upgrader)
- Apply principle of least privilege — each role only has necessary permissions
- Validate parameter bounds in admin functions (max fee, min collateral ratio, etc.)
- Super admin should only manage role assignments, not perform operations

---

### SP-017: Two-Step Authority Transfer
**Category:** Access Control  **Anchor Version:** 0.29+
**Counters:** EP-069 (No Admin Key Rotation)

**Secure Pattern:**
```rust
pub fn propose_new_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
    ctx.accounts.config.pending_admin = Some(new_admin);
    Ok(())
}
pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(config.pending_admin == Some(ctx.accounts.new_admin.key()), ErrorCode::NotPending);
    config.admin = ctx.accounts.new_admin.key();
    config.pending_admin = None;
    Ok(())
}
```
**Key Rules:**
- Step 1: Current admin proposes new admin (sets pending_admin)
- Step 2: New admin must accept (proves they control the key)
- Prevents accidental transfer to wrong address or null key
- Consider timelock between proposal and acceptance for high-value protocols

---

### SP-018: Emergency Pause
**Category:** Access Control  **Anchor Version:** 0.29+
**Counters:** EP-072 (No Emergency Pause)

**Secure Pattern:**
```rust
#[account(constraint = !config.is_paused @ ErrorCode::ProtocolPaused)]
pub config: Account<'info, Config>,

pub fn pause(ctx: Context<OperatorOnly>) -> Result<()> {
    ctx.accounts.config.is_paused = true;
    emit!(PausedEvent { operator: ctx.accounts.operator.key() });
    Ok(())
}
```
**Key Rules:**
- Pause should be callable by operator role (not just super admin — speed matters)
- All user-facing instructions should check `!config.is_paused`
- Emit events on pause/unpause for monitoring
- Consider granular pausing (pause deposits but allow withdrawals)

---

## State Machine

### SP-019: Enum-Based State Management
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-033 (State Transition Bypass)

**Secure Pattern:**
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AuctionState { Created, Active, Ended, Settled }

pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
    require!(ctx.accounts.auction.state == AuctionState::Active, ErrorCode::InvalidState);
    // Process bid...
    Ok(())
}
```
**Key Rules:**
- Use Rust enums for state — compiler enforces exhaustive matching
- Check state at the beginning of every instruction
- State transitions should be explicit and validated
- Never allow skipping states (Created → Settled without Active → Ended)

---

### SP-020: Initialization Safety
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-075 (Double Initialization), EP-076 (Missing Initialization)

**Secure Pattern:**
```rust
#[account(init, payer = user, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
pub config: Account<'info, Config>,
// Anchor's `init` constraint: creates account, validates NOT already initialized
// The 8-byte discriminator prevents re-init of existing accounts
```
**Key Rules:**
- Use `init` constraint — handles space allocation, rent, and discriminator
- Anchor discriminator (first 8 bytes) prevents reinitialization attacks
- For upgradeable configs, use `init_if_needed` carefully with version tracking
- Never allow init to be called on an already-initialized account

---

### SP-021: Account Closure Safety
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-040 (Unsafe Account Close)

**Secure Pattern:**
```rust
#[account(
    mut,
    close = user,        // Anchor: zero data, transfer lamports, set owner to system
    has_one = authority,
)]
pub account_to_close: Account<'info, UserData>,
```
**Key Rules:**
- Use Anchor's `close` constraint — it zeros account data, transfers lamports, changes owner
- Always validate authority before closing
- Zeroed account prevents "revival attack" (reuse of closed account data)
- Be aware: closed account can be recreated in same transaction if not careful

---

### SP-022: Integer Overflow Protection
**Category:** State Machine / Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-015 (Integer Overflow), EP-091 (Custom Overflow Guard Bypass)

**Secure Pattern:**
```rust
vault.balance = vault.balance.checked_add(amount).ok_or(ErrorCode::Overflow)?;
vault.balance = vault.balance.checked_sub(amount).ok_or(ErrorCode::Underflow)?;
let product = (amount as u128).checked_mul(price as u128).ok_or(ErrorCode::Overflow)?;
```
**Key Rules:**
- Use `checked_add`, `checked_sub`, `checked_mul`, `checked_div` for ALL financial math
- Rust release builds silently wrap on overflow — `checked_*` returns `None` instead
- Widen to u128 before multiplication to prevent intermediate overflow
- For custom overflow guards, verify the guard constant is mathematically correct (Cetus lesson)

---

### SP-023: Rent Exemption Validation
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-084 (Rent-Related DoS)

**Secure Pattern:**
```rust
#[account(
    init,
    payer = user,
    space = 8 + DataAccount::INIT_SPACE,  // Anchor handles rent-exempt minimum
)]
pub data_account: Account<'info, DataAccount>,
```
**Key Rules:**
- Anchor's `init` automatically calculates and requires rent-exempt minimum
- For manual account creation, use `Rent::get()?.minimum_balance(space)`
- Never create accounts below rent-exempt threshold (they'll be garbage collected)
- Account for discriminator (8 bytes) in space calculation

---

### SP-024: Reinitialization Prevention
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-075 (Double Initialization)

**Secure Pattern:**
```rust
// Option 1: Anchor `init` constraint (prevents re-init automatically)
#[account(init, payer = user, space = 8 + Config::INIT_SPACE)]

// Option 2: Manual flag for non-init instructions
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    require!(!ctx.accounts.config.is_initialized, ErrorCode::AlreadyInitialized);
    ctx.accounts.config.is_initialized = true;
    Ok(())
}
```
**Key Rules:**
- Prefer Anchor's `init` — discriminator prevents calling init twice
- If using `init_if_needed`, track version/initialization state manually
- Never allow re-initialization to overwrite existing authority or config

---

### SP-025: Type Confusion Prevention
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-003 (Account Type Cosplay)

**Secure Pattern:**
```rust
// Anchor's 8-byte discriminator prevents type cosplay
#[account]
pub struct Vault { ... }    // Discriminator: hash("account:Vault")[:8]
#[account]
pub struct Config { ... }   // Discriminator: hash("account:Config")[:8]
// Account<'info, Vault> will reject a Config account automatically
```
**Key Rules:**
- Always use `Account<'info, T>` — Anchor validates discriminator automatically
- Never deserialize raw account data without discriminator check
- For manual deserialization, always verify first 8 bytes match expected type
- Different account types with same data layout still have different discriminators

---

### SP-026: Timestamp Validation
**Category:** State Machine  **Anchor Version:** 0.29+
**Counters:** EP-089 (Timestamp Manipulation)

**Secure Pattern:**
```rust
let clock = Clock::get()?;
require!(clock.unix_timestamp >= auction.end_time, ErrorCode::AuctionNotEnded);
require!(clock.unix_timestamp <= auction.start_time + MAX_DURATION, ErrorCode::AuctionExpired);
```
**Key Rules:**
- Use `Clock::get()?.unix_timestamp` — not an instruction parameter
- Solana timestamps can vary by ~1-2 seconds from real time
- Don't rely on exact timestamp equality — use ranges
- For critical timing, consider using slot numbers instead (monotonic)

---

## Arithmetic Safety

### SP-027: Safe Addition
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-015 (Integer Overflow)

**Secure Pattern:**
```rust
let result = a.checked_add(b).ok_or(ErrorCode::MathOverflow)?;
```

---

### SP-028: Safe Subtraction
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-015 (Integer Underflow)

**Secure Pattern:**
```rust
let result = a.checked_sub(b).ok_or(ErrorCode::MathUnderflow)?;
// Or with validation first:
require!(a >= b, ErrorCode::InsufficientFunds);
```

---

### SP-029: Safe Multiplication with Widening
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-015, EP-091 (Overflow in intermediate calculations)

**Secure Pattern:**
```rust
// Widen BEFORE multiply to prevent intermediate overflow
let result = (amount as u128)
    .checked_mul(price as u128)
    .ok_or(ErrorCode::Overflow)?;
let final_value = u64::try_from(result / PRECISION).map_err(|_| ErrorCode::Overflow)?;
```
**Key Rules:**
- Widen to u128 before multiplying two u64 values
- Check final result fits back into target type with `try_from`
- For u128 * u128, consider using u256 libraries or restructuring math

---

### SP-030: Safe Basis Point Calculations
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-016 (Precision Loss)

**Secure Pattern:**
```rust
const BPS_DENOMINATOR: u64 = 10_000;
let fee = (amount as u128)
    .checked_mul(fee_bps as u128)
    .ok_or(ErrorCode::Overflow)?
    .checked_div(BPS_DENOMINATOR as u128)
    .ok_or(ErrorCode::DivByZero)?;
// Validate: fee should be > 0 for non-zero amounts with non-zero fee_bps
```
**Key Rules:**
- Always widen before multiply-then-divide to preserve precision
- Validate numerator is non-zero to avoid silent zero fees
- Consider rounding direction (up for protocol fees, down for user payouts)

---

### SP-031: Safe Decimal Precision Scaling
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-017 (Decimal Normalization Errors)

**Secure Pattern:**
```rust
// Converting between different decimal scales (e.g., 6 decimals to 9)
fn scale_amount(amount: u64, from_decimals: u8, to_decimals: u8) -> Result<u64> {
    if from_decimals == to_decimals { return Ok(amount); }
    if to_decimals > from_decimals {
        let factor = 10u64.checked_pow((to_decimals - from_decimals) as u32)
            .ok_or(ErrorCode::Overflow)?;
        amount.checked_mul(factor).ok_or(ErrorCode::Overflow)
    } else {
        let factor = 10u64.checked_pow((from_decimals - to_decimals) as u32)
            .ok_or(ErrorCode::Overflow)?;
        Ok(amount / factor)  // Note: precision loss on scale-down
    }
}
```
**Key Rules:**
- Always account for decimal differences between tokens (USDC=6, SOL=9, etc.)
- Scale up before division to preserve precision
- Document expected precision loss on scale-down operations

---

### SP-032: Safe Price Calculations with Oracle Decimals
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-021-025 (Oracle patterns)

**Secure Pattern:**
```rust
let price = oracle_price.price;          // e.g., in 10^(-expo) units
let expo = oracle_price.expo;            // e.g., -8
let confidence = oracle_price.conf;
// Normalize to target decimals
let normalized_price = if expo < 0 {
    (price as u128).checked_mul(10u128.pow(target_decimals as u32))
        .ok_or(ErrorCode::Overflow)?
        / 10u128.pow((-expo) as u32)
} else {
    (price as u128).checked_mul(10u128.pow((expo as u32) + target_decimals as u32))
        .ok_or(ErrorCode::Overflow)?
};
```
**Key Rules:**
- Handle oracle exponent correctly (often negative, meaning divide)
- Normalize all prices to consistent decimal precision before comparison
- Check confidence interval relative to price (not just absolute)

---

### SP-033: Safe LP Token Mint Calculation
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-058-061 (Economic attack patterns)

**Secure Pattern:**
```rust
// First depositor: LP = sqrt(amount_a * amount_b) - MINIMUM_LIQUIDITY
let lp_tokens = if total_supply == 0 {
    let lp = sqrt(amount_a.checked_mul(amount_b).ok_or(ErrorCode::Overflow)?);
    require!(lp > MINIMUM_LIQUIDITY, ErrorCode::InsufficientInitialLiquidity);
    lp - MINIMUM_LIQUIDITY  // Lock minimum to prevent donation attacks
} else {
    // Subsequent: LP = min(amount_a * total / reserve_a, amount_b * total / reserve_b)
    let lp_a = amount_a.checked_mul(total_supply).ok_or(ErrorCode::Overflow)? / reserve_a;
    let lp_b = amount_b.checked_mul(total_supply).ok_or(ErrorCode::Overflow)? / reserve_b;
    std::cmp::min(lp_a, lp_b)
};
```
**Key Rules:**
- Lock MINIMUM_LIQUIDITY on first deposit to prevent first-depositor attacks
- Use `min()` of proportional calculations to prevent imbalanced deposits
- Check for zero reserves before division

---

### SP-034: Safe Interest Rate Calculation
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-058, EP-065 (Economic attacks)

**Secure Pattern:**
```rust
// Compound interest with time-step safety
let time_elapsed = clock.unix_timestamp.checked_sub(last_update).ok_or(ErrorCode::InvalidTime)?;
let periods = time_elapsed / COMPOUND_PERIOD;
// Use iterative multiplication instead of pow for safety
let mut accrued = principal;
for _ in 0..std::cmp::min(periods, MAX_COMPOUND_PERIODS) {
    accrued = accrued.checked_mul(rate_per_period + PRECISION)
        .ok_or(ErrorCode::Overflow)?
        / PRECISION;
}
```
**Key Rules:**
- Cap maximum compound periods to prevent overflow
- Use iterative calculation or Taylor expansion instead of unchecked `pow`
- Validate time elapsed is reasonable (not negative, not excessively large)

---

### SP-035: Safe Rounding Direction Control
**Category:** Arithmetic  **Anchor Version:** 0.29+
**Counters:** EP-019 (Rounding Direction Favoring User)

**Secure Pattern:**
```rust
// Round UP (favor protocol) for fees, collateral requirements:
fn div_ceil(a: u64, b: u64) -> Result<u64> {
    require!(b > 0, ErrorCode::DivByZero);
    Ok(a.checked_add(b - 1).ok_or(ErrorCode::Overflow)? / b)
}
// Round DOWN (favor protocol) for user payouts:
fn div_floor(a: u64, b: u64) -> Result<u64> {
    require!(b > 0, ErrorCode::DivByZero);
    Ok(a / b)
}
```
**Key Rules:**
- Protocol should never lose from rounding — round in protocol's favor
- Fees: round up. User payouts: round down. Collateral requirements: round up.
- Document rounding direction for every division operation

---

## Oracle Integration

### SP-036: Safe Pyth Oracle Price Reading
**Category:** Oracle  **Anchor Version:** 0.29+
**Counters:** EP-021 (Missing Confidence), EP-022 (Stale Oracle)

**Secure Pattern:**
```rust
let price_feed = load_price_feed_from_account_info(&oracle_account)?;
let price = price_feed.get_price_no_older_than(clock.unix_timestamp, MAX_STALENESS_SECONDS)
    .ok_or(ErrorCode::StaleOracle)?;
require!(price.price > 0, ErrorCode::InvalidPrice);
require!(
    (price.conf as u64) * 100 / (price.price as u64) < MAX_CONFIDENCE_PCT,
    ErrorCode::OracleConfidenceTooWide
);
```
**Key Rules:**
- Always check staleness with `get_price_no_older_than`
- Validate confidence interval is within acceptable bounds
- Validate price is positive and non-zero
- Use the oracle account address, not user-provided price data

---

### SP-037: Safe Switchboard Oracle Integration
**Category:** Oracle  **Anchor Version:** 0.29+
**Counters:** EP-021, EP-023 (Single Oracle Dependency)

**Secure Pattern:**
```rust
let feed = AggregatorAccountData::new(oracle_account)?;
let result = feed.get_result()?;
let staleness = clock.unix_timestamp - feed.latest_confirmed_round.round_open_timestamp;
require!(staleness < MAX_STALENESS, ErrorCode::StaleOracle);
require!(feed.min_oracle_results >= MIN_ORACLES, ErrorCode::InsufficientOracles);
```
**Key Rules:**
- Validate result freshness via timestamp
- Check minimum oracle responses meet threshold
- Verify aggregator configuration (min_oracles, update interval)

---

### SP-038: Oracle Price Sanity Bounds (Circuit Breakers)
**Category:** Oracle  **Anchor Version:** 0.29+
**Counters:** EP-058 (Flash Loan Manipulation), EP-096 (Exotic Collateral)

**Secure Pattern:**
```rust
// Store last known price; reject large deviations
let deviation = if new_price > last_price {
    (new_price - last_price) * 100 / last_price
} else {
    (last_price - new_price) * 100 / last_price
};
require!(deviation < MAX_PRICE_CHANGE_PCT, ErrorCode::PriceCircuitBreaker);
```
**Key Rules:**
- Set maximum per-update price change (e.g., 20% per slot)
- Store recent prices for deviation comparison
- On circuit breaker trip: pause operations or use fallback oracle
- Different asset classes need different thresholds (stablecoins tight, volatile assets wider)

---

### SP-039: Oracle Fallback and Aggregation
**Category:** Oracle  **Anchor Version:** 0.29+
**Counters:** EP-023 (Single Oracle Dependency)

**Secure Pattern:**
```rust
// Try primary oracle; fall back to secondary
let price = match get_pyth_price(&pyth_oracle) {
    Ok(p) if is_fresh(p) && is_confident(p) => p,
    _ => get_switchboard_price(&switchboard_oracle)?,
};
// Or: median of multiple oracles
let prices = [pyth_price, switchboard_price, chainlink_price];
let median = calculate_median(&prices)?;
```
**Key Rules:**
- Never depend on a single oracle source
- Use primary/fallback pattern or median aggregation
- Each oracle source must pass individual staleness/confidence checks
- Document which oracle is primary and what triggers fallback

---

### SP-040: Time-Weighted Average Price (TWAP)
**Category:** Oracle  **Anchor Version:** 0.29+
**Counters:** EP-021, EP-025 (Oracle Manipulation via thin liquidity)

**Secure Pattern:**
```rust
// TWAP from on-chain cumulative price accumulators
let time_elapsed = current_slot - twap_state.last_slot;
require!(time_elapsed >= MIN_TWAP_WINDOW, ErrorCode::TWAPWindowTooShort);
let twap_price = (current_cumulative - twap_state.last_cumulative) / time_elapsed;
// Compare spot vs TWAP for manipulation detection
require!(
    (spot_price as i128 - twap_price as i128).unsigned_abs() * 100 / twap_price as u128
        < MAX_SPOT_TWAP_DEVIATION_PCT,
    ErrorCode::SpotPriceDeviationTooHigh
);
```
**Key Rules:**
- Use TWAP for collateral valuation, not spot price
- Minimum TWAP window should be long enough to resist manipulation (e.g., 30 minutes)
- Compare spot price against TWAP to detect active manipulation
- For lending: use TWAP for collateral, spot for liquidation

---

## Token Transfer

### SP-041: Safe SPL Token Transfer via CPI
**Category:** Token Transfer  **Anchor Version:** 0.29+
**Counters:** EP-042, EP-046, EP-049 (CPI patterns)

**Secure Pattern:**
```rust
let cpi_accounts = Transfer {
    from: ctx.accounts.from.to_account_info(),
    to: ctx.accounts.to.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};
let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
token::transfer(cpi_ctx, amount)?;  // Always propagate errors
```
**Key Rules:**
- Validate token_program is `Program<'info, Token>` (not UncheckedAccount)
- Always propagate CPI errors with `?`
- Validate amount > 0 before CPI
- Validate sufficient balance before transfer

---

### SP-042: Safe Token-2022 Transfer with Extensions
**Category:** Token Transfer  **Anchor Version:** 0.29+
**Counters:** EP-051-057 (Token patterns)

**Secure Pattern:**
```rust
// Token-2022 may have transfer hooks, transfer fees, etc.
use anchor_spl::token_2022::{self, Token2022};
// Check for transfer fee extension
let mint_info = ctx.accounts.mint.to_account_info();
if let Ok(fee_config) = get_transfer_fee_config(&mint_info) {
    let fee = fee_config.calculate_fee(amount)?;
    let net_amount = amount.checked_sub(fee).ok_or(ErrorCode::Overflow)?;
    // Account for fee in business logic
}
token_2022::transfer_checked(cpi_ctx, amount, decimals)?;
```
**Key Rules:**
- Use `transfer_checked` instead of `transfer` for Token-2022
- Check for transfer fee extension and account for fees in calculations
- Test with all relevant extensions (transfer hooks, confidential transfers)
- Validate both Token and Token-2022 program IDs

---

### SP-043: Safe Associated Token Account Creation
**Category:** Token Transfer  **Anchor Version:** 0.29+
**Counters:** EP-076 (Missing Initialization)

**Secure Pattern:**
```rust
#[account(
    init_if_needed,
    payer = payer,
    associated_token::mint = mint,
    associated_token::authority = recipient,
)]
pub recipient_ata: Account<'info, TokenAccount>,
pub associated_token_program: Program<'info, AssociatedToken>,
```
**Key Rules:**
- Use `init_if_needed` for recipient ATAs (may not exist yet)
- Always validate mint and authority on ATA creation
- Include `associated_token_program` in accounts
- Payer should be the transaction signer, not the recipient

---

### SP-044: Safe Token Account Closure
**Category:** Token Transfer  **Anchor Version:** 0.29+
**Counters:** EP-040 (Unsafe Account Close)

**Secure Pattern:**
```rust
// Verify balance is zero before closing
require!(ctx.accounts.token_account.amount == 0, ErrorCode::NonZeroBalance);
// Close via Anchor constraint or CPI
#[account(mut, close = destination, constraint = token_account.amount == 0)]
pub token_account: Account<'info, TokenAccount>,
```
**Key Rules:**
- Check token balance is zero before closing (or transfer out first)
- Remaining lamports go to the specified destination
- Consider that closed accounts can be recreated in the same transaction

---

### SP-045: Safe Wrapped SOL Handling
**Category:** Token Transfer  **Anchor Version:** 0.29+
**Counters:** EP-051 (Token Account Confusion)

**Secure Pattern:**
```rust
// Wrap SOL: transfer lamports to WSOL ATA, then sync_native
let ix = system_instruction::transfer(payer.key, wsol_ata.key, amount);
invoke(&ix, &[payer.clone(), wsol_ata.clone(), system_program.clone()])?;
token::sync_native(CpiContext::new(token_program, SyncNative { account: wsol_ata }))?;

// Unwrap: close WSOL ATA to receive lamports
token::close_account(cpi_ctx)?;
```
**Key Rules:**
- WSOL mint: `So11111111111111111111111111111111111111112`
- Wrapping: transfer lamports then `sync_native` to update SPL balance
- Unwrapping: close the WSOL token account to receive lamports
- Handle WSOL specially in token-generic code paths

---

## Error Handling

### SP-046: Effective require! Macro Usage
**Category:** Error Handling  **Anchor Version:** 0.29+
**Counters:** EP-088 (Panic-Based DoS)

**Secure Pattern:**
```rust
require!(amount > 0, ErrorCode::InvalidAmount);
require!(user.balance >= amount, ErrorCode::InsufficientFunds);
require!(
    deadline >= Clock::get()?.unix_timestamp,
    ErrorCode::DeadlineExpired
);
```
**Key Rules:**
- Use `require!` with custom error codes, not `assert!` or `panic!`
- `assert!` panics and gives unhelpful error messages
- `require!` returns a proper Anchor error with error code
- Order checks cheapest first (simple comparisons before account loads)

---

### SP-047: Validation Ordering (Cheap Checks First)
**Category:** Error Handling  **Anchor Version:** 0.29+
**Counters:** EP-084-088 (Resource/DoS patterns)

**Secure Pattern:**
```rust
pub fn process(ctx: Context<Process>, amount: u64, deadline: i64) -> Result<()> {
    // 1. Parameter validation (cheapest)
    require!(amount > 0 && amount <= MAX_AMOUNT, ErrorCode::InvalidAmount);
    require!(deadline > 0, ErrorCode::InvalidDeadline);
    // 2. Simple state checks
    require!(!ctx.accounts.config.is_paused, ErrorCode::Paused);
    // 3. Time checks
    require!(Clock::get()?.unix_timestamp <= deadline, ErrorCode::Expired);
    // 4. Complex state checks (most expensive)
    require!(ctx.accounts.vault.balance >= amount, ErrorCode::InsufficientFunds);
    // 5. Execute
    Ok(())
}
```
**Key Rules:**
- Fail fast on cheapest checks to minimize compute unit waste
- Order: parameters → simple state → time → complex state → CPI
- Reduces gas cost for invalid transactions

---

### SP-048: Safe Array and Slice Access
**Category:** Error Handling  **Anchor Version:** 0.29+
**Counters:** EP-088 (Panic-Based DoS)

**Secure Pattern:**
```rust
// Use .get() instead of direct indexing
let item = items.get(index).ok_or(ErrorCode::IndexOutOfBounds)?;
// For slices:
let chunk = data.get(start..end).ok_or(ErrorCode::InvalidSlice)?;
```
**Key Rules:**
- Never use `data[index]` — panics on out-of-bounds, causing instruction failure
- Use `.get(index)` which returns `Option<T>`
- For remaining_accounts, always bounds-check before access
- Use `.iter()` and `.enumerate()` instead of index-based loops

---

### SP-049: Avoiding Panics in Instruction Handlers
**Category:** Error Handling  **Anchor Version:** 0.29+
**Counters:** EP-088 (Panic-Based DoS)

**Secure Pattern:**
```rust
// Replace unwrap/expect with proper error handling
let value = some_option.ok_or(ErrorCode::ValueNotFound)?;
let parsed = data.try_into().map_err(|_| ErrorCode::ParseError)?;
let result = operation().map_err(|_| ErrorCode::OperationFailed)?;
```
**Key Rules:**
- Never use `.unwrap()` or `.expect()` in instruction handlers
- Every `Option` and `Result` must be properly handled
- Use `.ok_or(ErrorCode::X)?` for Options, `.map_err(|_| ErrorCode::X)?` for Results
- Panics waste compute units and give poor error messages

---

## Timing & Ordering

### SP-050: Safe Clock Sysvar Usage
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-089 (Timestamp Manipulation)

**Secure Pattern:**
```rust
let clock = Clock::get()?;
let current_time = clock.unix_timestamp;
let current_slot = clock.slot;
// Use slot for ordering guarantees, timestamp for human-readable deadlines
```
**Key Rules:**
- `Clock::get()?` is the canonical way to get on-chain time
- `unix_timestamp`: approximate wall-clock time (can vary +-1-2 seconds)
- `slot`: monotonically increasing, better for ordering guarantees
- Never accept time as an instruction parameter — always read from Clock sysvar

---

### SP-051: Deadline Enforcement
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-089 (Timestamp Manipulation)

**Secure Pattern:**
```rust
pub fn swap(ctx: Context<Swap>, amount: u64, min_out: u64, deadline: i64) -> Result<()> {
    require!(Clock::get()?.unix_timestamp <= deadline, ErrorCode::TransactionExpired);
    // Execute swap with slippage protection
    require!(output_amount >= min_out, ErrorCode::SlippageExceeded);
    Ok(())
}
```
**Key Rules:**
- Accept deadline from user, validate against on-chain clock
- Combine deadline with slippage protection (`min_amount_out`)
- Deadline prevents stale transactions from executing at unfavorable prices

---

### SP-052: Cooldown Period Enforcement
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-033 (State Transition Bypass), EP-074 (No Timelock)

**Secure Pattern:**
```rust
pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
    let clock = Clock::get()?;
    let stake = &mut ctx.accounts.stake;
    require!(
        clock.unix_timestamp >= stake.last_stake_time + COOLDOWN_SECONDS,
        ErrorCode::CooldownNotMet
    );
    // Process unstake...
    Ok(())
}
```
**Key Rules:**
- Store the timestamp of the last action
- Validate cooldown has elapsed before allowing next action
- Use for: unstaking, governance proposal execution, authority changes
- Consider both minimum and maximum timelock periods

---

### SP-053: Slot vs Timestamp Trade-offs
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-089, EP-090 (Timing/Race patterns)

**Key Rules:**
- **Slot**: monotonic, ~400ms, good for ordering, may skip during outages
- **Timestamp**: ~1-2s accuracy, human-readable, better for deadlines
- Use slot for: auction ordering, priority, sequencing
- Use timestamp for: expiration, cooldowns, human-facing deadlines
- Never assume exact slot-to-time ratio (varies with network conditions)

---

### SP-054: Reentrancy Protection via CPI Guards
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-044 (CPI Privilege Propagation), EP-047 (State Before CPI)

**Secure Pattern:**
```rust
// Solana's CPI depth limit (4) provides partial protection
// But same-transaction reentrancy is still possible

// Checks-effects-interactions pattern:
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    // 1. Checks
    require!(vault.balance >= amount, ErrorCode::InsufficientFunds);
    // 2. Effects (update state BEFORE CPI)
    vault.balance = vault.balance.checked_sub(amount).ok_or(ErrorCode::Underflow)?;
    // 3. Interactions (CPI)
    transfer_tokens(ctx, amount)?;
    Ok(())
}
```
**Key Rules:**
- Always update state BEFORE making CPIs (checks-effects-interactions)
- Solana limits CPI depth to 4, but doesn't prevent same-tx reentrancy
- Use `reentrant` flag in account if additional protection needed
- Be aware that multiple instructions in one transaction share state

---

### SP-055: Per-Operation Health Checks
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-090 (Simultaneous Operation Race)

**Secure Pattern:**
```rust
pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    // Check health BEFORE operation
    require!(calculate_health_factor(&ctx.accounts.user) >= MIN_HEALTH, ErrorCode::Unhealthy);
    // Execute
    ctx.accounts.user.borrows += amount;
    // Check health AFTER operation
    require!(calculate_health_factor(&ctx.accounts.user) >= MIN_HEALTH, ErrorCode::WouldBeUnhealthy);
    Ok(())
}
```
**Key Rules:**
- Check health factor BEFORE and AFTER every position-modifying operation
- Don't batch health checks across multiple instructions
- Each operation must independently maintain protocol invariants
- This prevents "withdraw collateral" + "borrow max" in same transaction

---

### SP-056: Slippage Protection
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-060 (Missing Slippage Protection), EP-090 (MEV)

**Secure Pattern:**
```rust
pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
    let amount_out = calculate_swap(amount_in, &pool)?;
    require!(amount_out >= min_amount_out, ErrorCode::SlippageExceeded);
    // Execute swap
    Ok(())
}
```
**Key Rules:**
- Every swap/trade must accept `min_amount_out` parameter
- Every deposit must accept `min_lp_tokens` parameter
- Every withdrawal must accept `min_amount_a` and `min_amount_b`
- Set by the user/frontend — protocol should enforce but not choose the value

---

### SP-057: Flash Loan Protection
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-058, EP-061 (Flash loan economic attacks)

**Secure Pattern:**
```rust
// Option 1: Require deposit before action (time gap)
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    ctx.accounts.user.deposit_slot = Clock::get()?.slot;
    // ...
}
pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    require!(
        Clock::get()?.slot > ctx.accounts.user.deposit_slot,
        ErrorCode::SameSlotBorrow  // Can't deposit+borrow in same slot
    );
    // ...
}
// Option 2: Use TWAP instead of spot price for collateral valuation (SP-040)
```
**Key Rules:**
- Prevent deposit+action in same slot/transaction where economically sensitive
- Use TWAP-based pricing to resist flash loan price manipulation
- Consider: can someone borrow enough in one transaction to manipulate this market?
- Flash loan protection is about time gaps, not amount limits

---

### SP-058: Event Emission for Monitoring
**Category:** Timing  **Anchor Version:** 0.29+
**Counters:** EP-070 (Sensitive Data in Logs — shows the right way)

**Secure Pattern:**
```rust
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // ... process deposit ...
    emit!(DepositEvent {
        user: ctx.accounts.user.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
```
**Key Rules:**
- Emit events for all state-changing operations (deposits, withdrawals, swaps, admin actions)
- Include: who, what, when, how much
- NEVER include private keys or sensitive data in events (EP-070 lesson)
- Events enable off-chain monitoring, alerting, and incident response

---

## Cross-Reference: Secure Pattern to Exploit Pattern

| Exploit Pattern | Secure Pattern(s) |
|----------------|-------------------|
| EP-001: Missing Signer | SP-002 |
| EP-002: Missing Owner | SP-003 |
| EP-003: Type Cosplay | SP-025 |
| EP-004: PDA Collision | SP-008, SP-011 |
| EP-005: Bump Canonicalization | SP-001, SP-009 |
| EP-006: Missing Constraint Chain | SP-004, SP-007 |
| EP-015: Integer Overflow | SP-022, SP-027-029 |
| EP-021: Missing Oracle Confidence | SP-036 |
| EP-022: Stale Oracle | SP-036, SP-037 |
| EP-023: Single Oracle | SP-037, SP-039 |
| EP-024: AMM as Oracle | SP-040 |
| EP-025: No Liquidity Adjustment | SP-038, SP-040 |
| EP-026: Missing Authority | SP-015 |
| EP-033: State Transition Bypass | SP-019, SP-052 |
| EP-040: Unsafe Account Close | SP-021, SP-044 |
| EP-042: Arbitrary CPI | SP-005, SP-012 |
| EP-043: CPI Privilege Escalation | SP-010, SP-013 |
| EP-044: CPI Privilege Propagation | SP-013, SP-054 |
| EP-046: Missing Error Propagation | SP-041 |
| EP-047: State Before CPI | SP-013, SP-054 |
| EP-051-057: Token Patterns | SP-004, SP-041-045 |
| EP-058: Flash Loan Attacks | SP-038, SP-057 |
| EP-060: Missing Slippage | SP-056 |
| EP-068: Single Admin Key | SP-015, SP-016 |
| EP-069: No Key Rotation | SP-017 |
| EP-070: Sensitive Data in Logs | SP-058 |
| EP-072: No Emergency Pause | SP-018 |
| EP-073: Excessive Privileges | SP-016 |
| EP-074: No Timelock | SP-052 |
| EP-075: Double Init | SP-020, SP-024 |
| EP-084-088: Resource/DoS | SP-023, SP-046-049 |
| EP-089: Timestamp Manipulation | SP-026, SP-050, SP-053 |
| EP-090: Simultaneous Race | SP-055 |
| EP-091: Custom Overflow Guard | SP-022, SP-029 |
| EP-092: Deprecated Sysvar | SP-006 (validate sysvar address) |
| EP-093: Off-Chain TOCTOU | SP-055 (per-operation atomicity) |
| EP-094: Bonding Curve Graduation | SP-015, SP-018 |
| EP-095: Supply Chain | (operational — not a code pattern) |
| EP-096: Exotic Collateral Oracle | SP-038, SP-039, SP-040 |
| EP-097: Plaintext Key Storage | SP-058 (proper logging) |

---

## Audit Checklist Summary

### Must-Have for Every Solana Program
- [ ] All accounts use typed Anchor constraints (`Account<T>`, `Signer`, `Program<T>`)
- [ ] All PDAs use `seeds` + `bump` with canonical bump stored in account
- [ ] All authority accounts use `Signer` + `has_one`
- [ ] All arithmetic uses `checked_*` methods
- [ ] All CPI targets validated via `Program<T>` or `constraint`
- [ ] Oracle prices checked for staleness, confidence, and sanity bounds
- [ ] State updates happen BEFORE CPIs (checks-effects-interactions)
- [ ] No `.unwrap()`, `.expect()`, or `assert!` in instruction handlers
- [ ] Initialization protected by Anchor discriminator (`init` constraint)
- [ ] Account closure zeros data and transfers lamports
- [ ] Events emitted for all state-changing operations
- [ ] Emergency pause mechanism implemented

### Should-Have for DeFi Protocols
- [ ] Multi-oracle fallback or aggregation
- [ ] TWAP-based collateral valuation
- [ ] Slippage protection on all user-facing trades
- [ ] Flash loan protection (same-slot restrictions or TWAP pricing)
- [ ] Per-operation health checks (before AND after)
- [ ] Circuit breakers on price deviation
- [ ] Role-based access control with least privilege
- [ ] Two-step authority transfer
- [ ] Timelocks on governance/admin parameter changes
- [ ] Minimum liquidity lock on LP first deposit

---
<!-- END OF SECURE PATTERNS KNOWLEDGE BASE -->
<!-- Total: 58 patterns across 10 categories -->
<!-- Sources: Wave 1 research (a2-secure-patterns-1, a2-secure-patterns-2) -->
<!-- Cross-referenced with 97 exploit patterns -->
