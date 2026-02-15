# Lending Protocol Attack Playbook
<!-- Protocol-specific attack vectors for Lending/Borrowing protocols -->
<!-- Last updated: 2026-02-06 -->

## How Lending Protocols Work (Mental Model)

Lending protocols allow users to deposit assets (earning interest) and borrow against their collateral. A health factor determines if a position is safe or should be liquidated.

**Key components:**
- **Reserves/pools:** Hold deposited assets, track utilization rates
- **Collateral factor / LTV:** Maximum borrowable value as % of collateral
- **Health factor:** `collateral_value * LTV / borrow_value` — liquidation below 1.0
- **Interest rates:** Usually algorithmic based on utilization (supply/demand)
- **Oracles:** Price feeds for collateral and borrowed asset valuation
- **Liquidation engine:** Allows third parties to repay unhealthy borrows at a discount

---

## Common Architecture Patterns

### Pool-Based Lending (Aave-style)
- Solend/Save, MarginFi, Kamino Lend
- Shared liquidity pools, variable interest rates
- cTokens/receipt tokens represent deposits

### Isolated Lending
- Each market is independent, limiting contagion
- Higher risk assets in isolated pools
- Solend isolated pools (exploited Nov 2022)

### Peer-to-Peer Lending
- Loopscale, direct lender-borrower matching
- Custom collateral types (including exotic tokens)

---

## Known Attack Vectors

### 1. Oracle Price Manipulation
**Severity:** CRITICAL  **EP Reference:** EP-021 to EP-025, EP-096
**Historical:** Mango Markets ($116M), Solend ($1.26M), Loopscale ($5.8M)

**Mechanism:** Manipulate oracle price of collateral token (via thin liquidity, AMM manipulation, or custom pricing function). Borrow against inflated collateral value. Withdraw borrowed funds. Collateral reverts to true value, leaving bad debt.

**Detection:**
- Which oracle is used? (Pyth, Switchboard, custom)
- Is oracle staleness checked?
- Is oracle confidence interval validated?
- Is TWAP used for collateral valuation?
- Can collateral price be manipulated by a single actor?
- Are there circuit breakers on price deviation?

**Invariant:** `collateral_value_uses_TWAP_not_spot`

---

### 2. Unrealized PnL as Collateral
**Severity:** CRITICAL  **EP Reference:** EP-058
**Historical:** Mango Markets ($116M)

**Mechanism:** Open large perpetual futures position. Pump the underlying token price. Unrealized PnL is treated as equity. Borrow against the unrealized gains. Withdraw before price reverts.

**Detection:**
- Can users borrow against unrealized PnL?
- Is there a cap on borrowable equity from unrealized positions?
- Are position sizes limited relative to market liquidity?

**Invariant:** `borrowable_equity <= realized_equity_only`

---

### 3. Flash Loan Collateral Manipulation
**Severity:** HIGH  **EP Reference:** EP-058, EP-061
**Historical:** Multiple DeFi protocols

**Mechanism:** Flash loan large amount → deposit as collateral → borrow max → withdraw collateral (or repay flash loan leaving bad debt).

**Detection:**
- Is there same-slot deposit → borrow restriction?
- Can deposits and borrows happen in the same transaction?
- Is collateral value checked with TWAP (resistant to flash manipulation)?

**Invariant:** `deposit_slot < borrow_slot` (or TWAP-based pricing)

---

### 4. Cascading Liquidation / Mango Cascade
**Severity:** HIGH  **EP Reference:** EP-058
**Historical:** UXD Protocol ($19.9M), Tulip Protocol ($2.5M) — Mango cascade

**Mechanism:** Major exploit in one protocol (e.g., Mango) causes cascading failures in protocols with exposure. Frozen deposits, forced liquidations, bad debt propagation.

**Detection:**
- Does the lending protocol have exposure to other protocols?
- Can vault tokens from external protocols be used as collateral?
- Is there a contagion risk assessment?

**Invariant:** `protocol_can_survive_any_single_collateral_going_to_zero`

---

### 5. Liquidation Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-058, EP-065
**Historical:** Various DeFi protocols

**Mechanism:** Attacker manipulates price just enough to trigger liquidation, buys collateral at discount, then allows price to recover.

**Detection:**
- Is there a liquidation threshold buffer (distance from LTV to liquidation)?
- Is there a grace period before liquidation?
- Can liquidation be partial (reducing impact)?
- Is liquidation bonus/penalty reasonable?

**Invariant:** `liquidation_threshold > LTV + safety_buffer`

---

### 6. Interest Rate Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-065
**Historical:** Various DeFi protocols

**Mechanism:** Deposit large amount to reduce utilization → interest rate drops → borrow cheaply → withdraw deposit to spike rate for existing borrowers.

**Detection:**
- Can utilization rate be manipulated significantly in one transaction?
- Is interest rate calculated per-block or per-epoch?
- Are there rate caps to prevent extreme spikes?

---

### 7. Exotic Collateral Pricing Vulnerabilities
**Severity:** HIGH  **EP Reference:** EP-096
**Historical:** Loopscale ($5.8M — RateX PT tokens)

**Mechanism:** Protocol accepts novel token types (LP tokens, yield-bearing tokens, principal tokens) as collateral. Custom pricing functions for these tokens can be manipulated because they don't have robust oracle support.

**Detection:**
- Does the protocol accept non-standard collateral types?
- Is there a custom pricing function for exotic collateral?
- Can the pricing function be manipulated by a single actor?
- Is there a circuit breaker on collateral value changes?

**Invariant:** `exotic_collateral_has_independent_price_verification`

---

### 8. Donation/Reserve Solvency Bypass
**Severity:** CRITICAL  **EP Reference:** EP-115
**Historical:** Euler Finance ($197M, Mar 2023 — `donateToReserves` bypassed solvency check)

**Mechanism:** Protocol has a function that reduces a user's collateral (donate to reserves, forfeit, burn tokens) without checking if the resulting position is still solvent. Attacker leverages up (borrow max), then calls the donation function to intentionally create bad debt. The self-liquidation mechanism lets the attacker extract value at a favorable discount.

**Euler Deep-Dive (Wave 7):** Attacker flash loaned $30M DAI from Aave → deposited into Euler → received eDAI → leveraged up to 19x → called `donateToReserves()` which burned eDAI WITHOUT burning corresponding dDAI → position health dropped below 100% → triggered soft liquidation (75% of collateral at discount) → extracted $197M. Sherlock (auditor) missed the bug and paid $4.5M in claims. Attacker later returned all funds.

**Detection:**
- Does the protocol have donate/forfeit/contribute functions?
- Do they check health factor AFTER execution?
- Can a user create intentional bad debt?
- Is self-liquidation possible (and at what discount)?

**Code pattern to audit:**
```rust
// DANGEROUS: Missing health check after collateral reduction
pub fn donate_to_reserve(ctx: Context<Donate>, amount: u64) -> Result<()> {
    user_position.collateral -= amount;
    reserve.total += amount;
    // No health check! Position may be insolvent now.
    Ok(())
}
// SAFE: Always check health after any position modification
pub fn donate_to_reserve(ctx: Context<Donate>, amount: u64) -> Result<()> {
    user_position.collateral -= amount;
    reserve.total += amount;
    let health = calculate_health(user_position, oracle)?;
    require!(health >= MIN_HEALTH, ErrorCode::Insolvent);
    Ok(())
}
```

**Invariant:** `health_factor_checked_after_every_position_modifying_operation`

---

### 9. Vault Share Donation Attack (Inflation Attack)
**Severity:** HIGH  **EP Reference:** EP-116
**Historical:** C.R.E.A.M. Finance ($130M, Oct 2021), Harvest Finance ($34M, Oct 2020)

**Mechanism:** Vaults pricing shares via `total_assets / total_shares` are vulnerable to two variants:

**(a) Direct donation:** Transfer tokens directly to vault → inflates `total_assets` without minting shares → share price spikes → attacker borrows against inflated collateral (C.R.E.A.M.)

**(b) Sandwich the vault:** Manipulate the price source (e.g., Curve pool) → vault deposits at wrong price → restore price → vault withdraws at correct price → profit extracted from vault depositors (Harvest)

**Detection:**
- Does vault pricing use `token::balance()` (actual balance) or internal tracking?
- Can direct token transfers to vault affect share price?
- Are there "dead shares" / virtual reserves to prevent first-depositor attacks?
- Is there a minimum deposit amount?
- Is vault deposit/withdrawal pricing based on spot DEX state?

**Code pattern to audit:**
```rust
// DANGEROUS: Uses actual balance — inflatable via donation
pub fn share_price(vault: &Vault) -> u64 {
    let total = token::balance(&vault.token_account)?;
    total / vault.total_shares
}
// SAFE: Internal tracking + virtual reserves
pub fn share_price(vault: &Vault) -> u64 {
    let virtual_assets = vault.tracked_assets + VIRTUAL_ASSETS;
    let virtual_shares = vault.total_shares + VIRTUAL_SHARES;
    virtual_assets / virtual_shares
}
```

**Invariant:** `vault_pricing_uses_internal_tracking_not_actual_balance`

---

### 10. Flash Loan Account Migration Bypass
**Severity:** CRITICAL  **EP Reference:** EP-118
**Historical:** MarginFi ($160M at risk, Sep 2025 — account transfer during flash loan bypassed repayment)

**Mechanism:** Lending protocol supports both flash loans and account migration/transfer. During an active flash loan, the user's account is in a temporary state (borrowed but not repaid). If account migration zeroes out the old account and moves state to a new one, the flash loan end-check operates on the zeroed account (no liability) → repayment bypassed.

**MarginFi Deep-Dive (Wave 7):** `transfer_to_new_account` instruction migrated MarginfiAccount to new account, zeroing old account and disabling it. Flash loan flow: start → borrow → transfer_to_new_account → end flash loan on old (empty) account → health check passes → borrowed funds kept without repayment. Asymmetric Research disclosed privately, patched before exploit. $160M in deposits at risk.

**Detection:**
- Does the protocol have flash loans AND account migration/transfer?
- Is there a `flash_loan_active` flag that blocks other state-modifying instructions?
- Can account delegation, closing, authority transfer, or position splitting occur during flash loan?

**Invariant:** `no_state_migration_during_active_flash_loan`

---

## Key Invariants That Must Hold

1. `total_borrows <= total_deposits * max_utilization` (protocol solvency)
2. `health_factor >= 1.0` for all positions after any operation
3. `collateral_value >= borrow_value * (1 / LTV)` per position
4. `oracle_price is fresh AND confident` at time of any borrow/liquidation
5. `no_deposit_and_borrow_in_same_slot` (flash loan protection)
6. `health_checked_before_AND_after_each_operation` (EP-090 protection)
7. `bad_debt_is_socialized_or_insured` (protocol has a plan for insolvency)
8. `every_collateral_reducing_function_checks_solvency` (EP-115)
9. `vault_pricing_uses_internal_tracking_not_balance` (EP-116)
10. `no_state_migration_during_active_flash_loan` (EP-118)

## Red Flags Checklist

- [ ] Single oracle source for collateral pricing
- [ ] No staleness check on oracle prices
- [ ] No confidence interval check
- [ ] Spot price used instead of TWAP for collateral valuation
- [ ] Borrowing against unrealized PnL allowed
- [ ] No same-slot restriction on deposit → borrow
- [ ] Health factor only checked after batch (not per-operation)
- [ ] Exotic collateral types without robust oracle
- [ ] No circuit breaker on collateral value changes
- [ ] Liquidation bonus too high (incentivizes manipulation)
- [ ] No bad debt handling mechanism
- [ ] Single admin key can modify interest rates or LTV ratios
- [ ] Donate/forfeit/contribute function without post-operation health check
- [ ] Self-liquidation possible at favorable discount after intentional bad debt
- [ ] Vault share price based on actual token balance (donatable)
- [ ] No virtual reserves / dead shares for vault initialization
- [ ] Account migration/transfer possible during active flash loan
- [ ] Flash loan flag not checked in all state-modifying instructions
- [ ] Single DEX pool as oracle source for any collateral (EP-120 write-lock risk)
- [ ] Unvalidated deposit note/receipt account in withdrawal instructions (EP-002, Jet pattern)

---

## Protocol-Specific Intelligence (Wave 8)

### Solend (now Save)
**Programs:** Lending pool with isolated markets
**Audits:** Multiple (Kudelski Security, others)

**Known incidents:**
- **USDH Oracle Attack** ($1.26M, Nov 2022, EP-021/EP-023/EP-120): Attacker pumped USDH on Saber → write-locked Saber accounts → prevented arbitrage in same slot → Switchboard oracle captured $15 price → borrowed $1.26M against inflated collateral. Affected: Kamino USDH ($1.5M TVL), Stable ($1.67M TVL), Coin98 ($1.58M TVL)
- **UpdateReserveConfig bypass** (Aug 2021, $0 loss): Insufficient validation in reserve config update — attempted $2M theft blocked
- **Rent thief** (Aug 2022, OtterSec): Bot exploiting uninitialized accounts for rent across ecosystem

**Post-exploit fixes:** Switchboard v2 with MinTask (stablecoin cap at 1.01), liquidity monitoring, isolated pool architecture

**Key audit focus areas:**
- Oracle diversity: Multiple oracle sources per asset (not single DEX)
- Stablecoin price caps near peg
- Account initialization race conditions
- Isolated pool contagion risk

### MarginFi
**Programs:** mrgnlend (lending/borrowing with flash loans)
**Audits:** Multiple (double audited, code-verified)

**Known incidents:**
- **Flash loan migration bypass** ($160M at risk, Sep 2025, EP-118): New `transfer_to_new_account` instruction failed to check `ACCOUNT_IN_FLASHLOAN` flag. Exploit: start flash loan → borrow → `transfer_to_new_account` (zeros old account, erases liabilities) → keep funds. Found by Felix Wilhelm (Asymmetric Research), patched before exploit.
- **Flash loan mechanism:** Uses instruction introspection via `Instructions sysvar` to enforce repayment

**Key audit focus areas:**
- Flash loan: Verify ALL state-modifying instructions check for active flash loan
- Account migration: Block all account transfers during flash loans
- Instruction introspection: Verify `lending_account_end_flashloan` detection is robust
- EMA pricing: Borrowing limits use EMA price, not spot

### Kamino (KLend)
**Programs:** Kamino Lend V1/V2
**Audits:** 18 external audits + 4 formal verifications (Certora)
**Bug Bounty:** Immunefi, max $1.5M
**Status:** 3 years live without security incident

**Known exposures:**
- **USDH indirect exposure** (Nov 2022): Kamino USDH pool listed on Solend affected by oracle attack

**Security posture (gold standard for Solana lending):**
- Formal verification (Certora) — precision loss fix caught
- Layered security: code audits + formal verification + monitoring + stress testing
- V2 architecture: improved isolation, scalability, security

**Key audit focus areas for Kamino forks:**
- Precision loss in share calculations (formal verification catches these)
- Token-2022 integration edge cases
- RWA market integration (OnRe, Huma) — new risk surface

### Jet Protocol
**Programs:** Jet V1 lending (legacy)
**Audits:** Internal review, community disclosure

**Known incidents:**
- **Arbitrary withdrawal vulnerability** ($20-25M at risk, Dec 2021-Jan 2022, EP-002): `deposit_note_account` in `withdraw_tokens.rs` was unvalidated `AccountInfo`. `market_authority` (PDA) is authority of ALL users' deposit accounts → attacker supplies any user's note account → burns their notes → withdraws their tokens. Exploitable for 5 weeks before patch.
- **Sec3 analysis:** Classic unvalidated input account — would be detected by automated scanners
- **SlowMist analysis:** PDA and Anchor account verification design issue

**Key audit focus areas for receipt-token lending:**
- Receipt/note token account validation: Must verify note belongs to calling user
- Program authority over user positions: PDA authority must be scoped correctly
- Burn operations: Validate token account belongs to signer, not just any user

---
<!-- Sources: Waves 1-2+7+8 research, Mango/Solend/Loopscale/Euler/C.R.E.A.M./Harvest/MarginFi/Jet exploits, Asymmetric Research, Sec3 ecosystem review, Ackee Blockchain Solend analysis, SlowMist Jet analysis, Certora Kamino audit -->
