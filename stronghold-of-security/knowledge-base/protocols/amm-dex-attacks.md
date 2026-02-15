# AMM / DEX Attack Playbook
<!-- Protocol-specific attack vectors for Automated Market Makers and Decentralized Exchanges -->
<!-- Last updated: 2026-02-06 -->

## How AMMs Work (Mental Model)

AMMs replace traditional order books with mathematical pricing formulas. Liquidity providers (LPs) deposit token pairs into pools. Traders swap against the pool, and the formula adjusts prices based on reserve ratios.

**Key components:**
- **Liquidity pools:** Hold token pair reserves (Token A + Token B)
- **Pricing formula:** Constant product (x*y=k), concentrated liquidity (CLMM), or weighted
- **LP tokens:** Represent share of pool reserves, minted on deposit, burned on withdrawal
- **Fee mechanism:** Small fee on each swap, distributed to LPs
- **Oracle integration:** Some AMMs feed price data to external protocols

---

## Common Architecture Patterns

### Constant Product (x * y = k)
- Raydium (standard pools), Orca (legacy), Jupiter routing
- `amount_out = (reserve_b * amount_in) / (reserve_a + amount_in) - fees`
- Simple but capital-inefficient

### Concentrated Liquidity (CLMM)
- Orca Whirlpools, Raydium CLMM, Cetus (SUI — pattern applicable to Solana CLMMs)
- LPs provide liquidity in specific price ranges (ticks)
- More capital-efficient but more complex attack surface
- Tick accounts, position NFTs, range orders

### Weighted Pools
- Balancer-style with configurable token weights
- Less common on Solana

---

## Known Attack Vectors

### 1. Price Manipulation via Thin Liquidity
**Severity:** CRITICAL  **EP Reference:** EP-021, EP-025, EP-058
**Historical:** Mango Markets ($116M)

**Mechanism:** Attacker trades large volume against thin-liquidity pool to manipulate spot price. If external protocols use this AMM as price oracle, the manipulated price affects collateral calculations.

**Detection:**
- Does any external protocol use this AMM's spot price as oracle?
- Are there liquidity depth checks before accepting price?
- Is TWAP used instead of spot price?

**Invariant:** `spot_price_deviation_from_twap < MAX_DEVIATION`

---

### 2. Flash Loan Pool Draining
**Severity:** CRITICAL  **EP Reference:** EP-058, EP-061
**Historical:** Nirvana ($3.5M), Pump.fun ($1.9M)

**Mechanism:** Borrow large amount via flash loan → manipulate pool reserves → extract value → repay loan in same transaction.

**Detection:**
- Can deposits + withdrawals happen in the same slot/transaction?
- Is there a same-slot restriction on deposit→action sequences?
- Are LP token minting/burning calculations flash-loan-resistant?

**Invariant:** `no_deposit_and_withdraw_in_same_slot`

---

### 3. LP Token First-Depositor Attack
**Severity:** HIGH  **EP Reference:** EP-058, EP-033
**Historical:** Multiple DeFi protocols

**Mechanism:** First depositor mints tiny LP amount, then donates tokens directly to pool. Subsequent depositors' LP minting rounds down to zero, but tokens are captured by the pool.

**Detection:**
- Is there MINIMUM_LIQUIDITY locked on first deposit?
- Can LP tokens round to zero for non-trivial deposits?

**Invariant:** `first_deposit_locks_MINIMUM_LIQUIDITY`

---

### 4. Missing Slippage Protection
**Severity:** HIGH  **EP Reference:** EP-060
**Historical:** Widespread, enables sandwich attacks

**Mechanism:** Swap instruction doesn't require `min_amount_out`. MEV bots sandwich user transactions: front-run to move price, let user swap at bad rate, back-run to profit.

**Detection:**
- Does swap instruction accept `min_amount_out` parameter?
- Does deposit accept `min_lp_tokens`?
- Does withdrawal accept `min_amount_a, min_amount_b`?

**Invariant:** `every_user_facing_swap_has_slippage_protection`

---

### 5. CLMM Tick Account / Bitmap Extension Manipulation
**Severity:** CRITICAL  **EP Reference:** EP-033, EP-049, EP-108
**Historical:** Crema Finance ($8.8M), Raydium CLMM TickArrayBitmapExtension spoofing ($505K Immunefi bounty, Jan 2024)

**Mechanism:** In CLMM, tick accounts and bitmap extensions store price range data and fee accruals. Two sub-patterns:
1. **Fake tick injection:** Tick accounts not validated (owner, PDA derivation) → attacker injects fake tick data with inflated fees (Crema)
2. **Bitmap extension spoofing (EP-108):** `remaining_accounts[0]` used as `TickArrayBitmapExtension` but NOT validated as the correct extension for the pool. Attacker supplies arbitrary account → tick status flipped in wrong bitmap → erroneous liquidity additions at extreme price boundaries → fund drainage (Raydium)

**Detection:**
- Are tick accounts PDA-derived with pool + tick_index seeds?
- Is tick account owner validated as the DEX program?
- Are `remaining_accounts` used for tick arrays/bitmap extensions? If so, are they validated against the pool's expected PDA?
- Can tick bitmap extension accounts be passed without key equality check?

**Invariant:** `all_tick_accounts_and_extensions_are_PDA_validated`

---

### 6. Integer Overflow in Liquidity Math
**Severity:** CRITICAL  **EP Reference:** EP-015, EP-091
**Historical:** Cetus DEX ($223M on SUI — overflow pattern applicable to Solana)

**Mechanism:** Custom math functions (e.g., `checked_shlw`, `get_delta_a`) use incorrect overflow guards. Values that should be rejected pass the check, overflow wraps to near-zero, enabling near-free liquidity.

**Detection:**
- Are there custom bit-shift or overflow-check functions?
- Are overflow guard constants mathematically verified?
- Are third-party math libraries (e.g., `integer-mate`) up to date?

**Invariant:** `all_overflow_guards_are_mathematically_correct`

---

### 7. Fee Calculation Bypass
**Severity:** MEDIUM  **EP Reference:** EP-016, EP-019

**Mechanism:** Fees calculated with integer division that rounds to zero for small amounts. Attacker makes many small trades, each paying zero fee, accumulating rounding profit.

**Detection:**
- Can fee calculation produce zero for non-zero trade amounts?
- Is rounding direction correct (round UP for protocol fees)?

**Invariant:** `fee > 0 for all non_zero_trades || minimum_fee_enforced`

---

## Key Invariants That Must Hold

1. `reserves_after >= reserves_before - amount_out` (no more withdrawn than available)
2. `k_after >= k_before` (constant product only increases from fees)
3. `lp_supply * price_per_lp >= total_reserves` (LP tokens always backed)
4. `fee_collected > 0` for every non-zero swap
5. `slippage_check_passes` for every user-facing operation
6. `no_single_transaction_can_drain_pool` (flash loan protection)

### 8. Liquidity Extraction by Privileged Account (Rug Pull)
**Severity:** CRITICAL  **EP Reference:** EP-101
**Historical:** LIBRA ($286M, Feb 2025 — $85M liquidity removed in 2 hours), MELANIA ($200M, Jan 2025), SolFire ($4M, Jan 2022)

**Mechanism:** Protocol deployer or admin retains the ability to withdraw LP tokens or drain pool reserves without restriction. After launch generates buying pressure, the deployer withdraws all liquidity, crashing the token price. This is the on-chain mechanism behind most memecoin rug pulls.

**The LIBRA/MELANIA Pattern:**
1. Launch token with concentrated liquidity on AMM
2. Promote to generate massive buying pressure (LIBRA reached $4.5B market cap)
3. "Snipe" early — buy before public announcement using insider wallets
4. Withdraw liquidity from AMM pools (not a "sell" — it's removing buy-side liquidity)
5. Without liquidity, price crashes 90%+; victims can't sell at reasonable price
6. 74,000 traders lost $286M on LIBRA alone

**Detection:**
- Who holds LP tokens after launch? (Concentrated ownership = rug risk)
- Can deployer/admin call `remove_liquidity` or `withdraw` without restrictions?
- Is there a liquidity lock contract with enforced timelock?
- Can LP tokens be burned or transferred before lock expires?
- Is there a "migration" or "upgrade" function that can move all funds?
- Does the launchpad enforce LP token vesting?

**Code pattern to audit:**
```rust
// DANGEROUS: No restrictions on LP withdrawal
pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    require!(ctx.accounts.authority.key() == DEPLOYER); // Only deployer check
    burn_lp_and_withdraw(ctx, amount)?;
    Ok(())
}
// SAFE: Timelock + multisig + withdrawal cap
pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    let lock = &ctx.accounts.liquidity_lock;
    require!(Clock::get()?.unix_timestamp >= lock.unlock_time);
    require!(lock.approvals >= REQUIRED_APPROVALS);
    require!(amount <= lock.max_per_period);
    burn_lp_and_withdraw(ctx, amount)?;
    Ok(())
}
```

**Invariant:** `liquidity_locked_with_timelock_after_launch`

---

### 9. LP Deposit Rounding Drain (EP-109)
**Severity:** CRITICAL  **EP Reference:** EP-109
**Historical:** Raydium cp-swap Liquidity Drain ($505K Immunefi bounty, Mar 2025)

**Mechanism:** In AMM deposit functions, conversion between LP tokens and underlying tokens uses rounding (ceiling/floor). When deposit amount is tiny, integer math with ceiling rounding produces `token_amount = 0` for one side while still minting LP tokens. Attacker deposits with only one token, receives LP tokens, then withdraws both proportionally — draining the pool one iteration at a time.

**Detection:**
- Does LP deposit use `RoundDirection::Ceiling` or `RoundDirection::Floor`?
- Can calculated token amounts round to zero for small inputs?
- Are all token amounts checked for `> 0` after rounding?
- Is `lp_amount` checked for `> 0`?

**Invariant:** `all_deposit_amounts_nonzero_after_rounding`

---

### 10. LP Token Oracle Manipulation (OtterSec)
**Severity:** HIGH  **EP Reference:** EP-024, EP-096
**Historical:** Switchboard LP token oracle manipulation ($200M at risk, OtterSec disclosure Feb 2022)

**Mechanism:** LP token price feeds that read on-chain AMM reserves can be manipulated via large swaps immediately before oracle updates. Attacker inflates LP token price → uses overvalued LP tokens as collateral in lending protocols → borrows more than collateral is worth. Price reverts after oracle update, leaving bad debt.

**Detection:**
- Are LP tokens accepted as collateral in lending/leveraged protocols?
- Is LP token pricing derived from on-chain AMM reserves (manipulable)?
- Is "fair pricing" used (trusted off-chain oracle, not AMM reserves)?

**Invariant:** `lp_token_price_not_derived_from_on_chain_reserves`

---

### 11. Validator-Level MEV Sandwich Attacks
**Severity:** INFO (protocol design concern)  **EP Reference:** EP-060, EP-112
**Historical:** DeezNode ($13M, Dec 2024), Arsc ($60M, single month), ecosystem-wide ($370M-$500M over 16 months)

**Mechanism:** Validators (especially those also operating as RPC providers) exploit their block production position to insert front-run and back-run transactions around user swaps. Even after Jito shut down its public mempool (Mar 2024), attacks adapted within one month via private mempools and "wide sandwiches" (non-consecutive transactions).

**Scale (sandwiched.me, 16-month analysis through May 2025):**
- $370M-$500M total extracted from Solana users
- Top 2 attackers = 48.69% of all MEV drains
- Top 7 attackers = 92.61%
- 25% of victims who paid for MEV protection still lost funds
- Primary targets: memecoin trades (high slippage settings)
- A single validator with 0.14% of stake responsible for 12.5% of extraction

**2025 Mitigation:**
- Marinade Finance, Jito Foundation, Solana Foundation coordinated crackdown
- Reduced sandwich profitability by 60-70%
- Delegation strategies now factor in validator MEV behavior

**Protocol Design Implications:**
- All swap instructions MUST enforce `min_amount_out` (EP-060)
- DEX aggregators should enforce transaction-level slippage protection
- Protocols using on-chain AMM price should account for MEV manipulation window
- Consider integrating Jito bundle submission for user protection
- Private transaction submission is not a complete defense

**Invariant:** `swap_instructions_enforce_user_slippage_bounds`

---

## Key Invariants That Must Hold

1. `reserves_after >= reserves_before - amount_out` (no more withdrawn than available)
2. `k_after >= k_before` (constant product only increases from fees)
3. `lp_supply * price_per_lp >= total_reserves` (LP tokens always backed)
4. `fee_collected > 0` for every non-zero swap
5. `slippage_check_passes` for every user-facing operation
6. `no_single_transaction_can_drain_pool` (flash loan protection)
7. `deployer_liquidity_locked_with_timelock` (rug pull protection)
8. `all_deposit_amounts_nonzero_after_rounding` (rounding drain protection)
9. `all_remaining_accounts_validated` (tick array/extension spoofing protection)
10. `swap_instructions_enforce_user_slippage_bounds` (MEV sandwich protection)

## Red Flags Checklist

- [ ] Missing `min_amount_out` on swap instructions
- [ ] LP token math uses unchecked arithmetic
- [ ] No MINIMUM_LIQUIDITY on first deposit
- [ ] Tick/position accounts not PDA-validated
- [ ] AMM spot price used as oracle by external protocols
- [ ] Custom math libraries without audit
- [ ] Same-slot deposit + withdrawal allowed
- [ ] Fee calculation can produce zero
- [ ] **LP deposit rounding can produce zero for one token side**
- [ ] **remaining_accounts used for tick arrays/extensions without validation**
- [ ] No price impact limits on large trades
- [ ] Admin can modify pool parameters without timelock
- [ ] **Deployer holds majority of LP tokens without lock**
- [ ] **No liquidity lock/vesting on launch**
- [ ] **Admin can call remove_liquidity without timelock or multisig**
- [ ] **Swap instruction allows `min_amount_out = 0`** (enables sandwich)
- [ ] **No MEV-aware transaction submission guidance for users**
- [ ] **Fee destination accounts not validated against pool creator** (EP-119)
- [ ] **Oracle relies on single DEX source** (potential write-lock manipulation, EP-120)

---

## Protocol-Specific Intelligence (Wave 8)

### Raydium
**Programs:** AMM V4 (constant product), CLMM (concentrated liquidity), CP-Swap
**Audits:** OtterSec (CLMM, Q3 2022), MadShield (CP-Swap)
**Bug Bounty:** Immunefi, max $505K

**Known vulnerabilities (all patched):**
- **CLMM tick bitmap extension spoofing** ($505K bounty, EP-108): `remaining_accounts[0]` not validated as correct TickArrayBitmapExtension → tick flipping → drain
- **CP-Swap rounding drain** ($505K bounty, EP-109): Ceiling rounding in `lp_tokens_to_trading_tokens` allowed zero second-token deposits → LP minting asymmetry
- **CP-Swap creator fee hijacking** (EP-119): UncheckedAccount for fee destination → steal creator fees from any pool
- **Admin key compromise** ($4.4M, Dec 2022): Trojan → compromised Pool Owner → used `withdrawPNL` + `SetParams(SyncNeedTake)` to inflate and drain fees from 8 pools
- **Post-fix:** Hardware wallet, Squads multisig for admin, removed extraneous admin options

**Key audit focus areas for Raydium forks:**
- CLMM: Validate ALL remaining_accounts (tick arrays, bitmap extensions, reward accounts)
- CP-Swap: Verify deposit/withdrawal math handles rounding correctly for both token sides
- Fee collection: Ensure fee destination is PDA-derived or constrained to pool creator
- Admin: Verify admin capabilities are minimized and behind multisig

### Orca (Whirlpools)
**Programs:** Whirlpool (CLMM-style concentrated liquidity)
**Audits:** Neodyme (May 2022), Kudelski Security (Jan 2022)
**Bug Bounty:** Immunefi (active, no public payouts)

**Known audit findings (all resolved):**
- **Lower tick > upper tick** (High, Neodyme): Tick ordering not enforced → invalid positions
- **Integer overflow in swapping** (Medium, Neodyme): Overflow in `checked_mul_shift_right_round_up_if`

**Key audit focus areas for Whirlpool forks:**
- Tick range validation (lower < upper enforced)
- Integer overflow in price/liquidity math (especially at extreme tick ranges)
- Position NFT ownership and authority validation

### Jupiter
**Programs:** Swap aggregator, Limit Orders V2, Perpetuals, JLP Vault
**Audits:** OtterSec (perpetuals)
**Oracle:** Edge by Chaos Labs (primary), Chainlink + Pyth (verification/backup)

**Security architecture (strong by design):**
- **JLP Vault:** Limited to major assets (SOL, ETH, wBTC) — eliminates thin-market manipulation
- **Oracle-based pricing:** External oracle (not internal order book) — resistant to Hyperliquid-style attacks
- **Automated liquidation:** No manual intervention delays
- **Limit Order V2:** Orders hidden until trigger price — prevents front-running
- **MEV mitigation:** Best-performing in Solana ecosystem

**Key audit focus areas for Jupiter integrations:**
- Route manipulation: Can attacker force suboptimal routes?
- Slippage enforcement: Is `min_amount_out` correctly passed through multi-hop routes?
- Oracle dependency: Edge oracle failure/staleness handling
- JLP share pricing: Resistant to manipulation via large deposits/withdrawals?

### Lifinity (Shut Down Dec 2025)
**Architecture:** Proactive market maker using Pyth oracle-based pricing + concentrated liquidity + automatic rebalancing
**Notable:** 3+ years without security incident, $150B lifetime trading volume
**Key pattern:** Oracle adjusts prices to prevent trades against stale prices (reduces impermanent loss)
**Lesson:** Oracle-based AMMs eliminate many manipulation vectors but introduce oracle dependency risk

---
<!-- Sources: Wave 1+2+6+8 research, Cetus/Crema/Mango exploits, LIBRA/MELANIA rug pulls, Zellic AMM research, Immunefi Raydium bounties (cp-swap + CLMM), OtterSec LP token oracle manipulation, sandwiched.me May 2025 analysis, DeezNode/Arsc sandwich incidents, Raydium post-mortems, Orca/Neodyme/Kudelski audits, Jupiter/Edge architecture, Lifinity deep-dive -->
