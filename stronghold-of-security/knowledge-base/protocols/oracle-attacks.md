# Oracle Attack Playbook
<!-- Protocol-specific attack vectors for Oracle integrations -->
<!-- Last updated: 2026-02-06 -->

## How Oracles Work (Mental Model)

Oracles bridge off-chain data (prices, randomness, events) to on-chain programs. On Solana, the main oracle providers are Pyth Network and Switchboard. Programs read oracle accounts to get price data for financial calculations.

**Key components:**
- **Price feeds:** On-chain accounts updated by off-chain publishers
- **Confidence interval:** How certain the oracle is about the price
- **Staleness:** How recent the last update is
- **TWAP:** Time-weighted average price, resistant to flash manipulation
- **Aggregation:** Multiple data sources combined into one price

---

## Oracle Providers on Solana

### Pyth Network
- Push-based: publishers push prices on-chain
- Provides: price, confidence interval, exponent, timestamp
- High-frequency updates (sub-second)
- API: `get_price_no_older_than(clock, max_staleness)`

### Switchboard
- Pull-based: on-chain aggregators collect from multiple oracles
- Provides: result, timestamp, min_oracle_results
- API: `AggregatorAccountData::new(account)?.get_result()?`

### On-Chain AMM (Dangerous)
- Using AMM spot price as oracle
- Trivially manipulable in same transaction
- **Should never be used directly for financial decisions**

---

## Known Attack Vectors

### 1. Oracle Price Manipulation via Thin Liquidity
**Severity:** CRITICAL  **EP Reference:** EP-021, EP-025
**Historical:** Mango Markets ($116M), Solend ($1.26M)

**Mechanism:** Token has thin liquidity on source exchanges. Attacker buys/sells to move spot price. Oracle picks up manipulated price. Protocol uses manipulated price for collateral/lending decisions.

**Detection:**
- What tokens does the protocol accept as collateral?
- What is the liquidity depth on source exchanges for each token?
- Is there a TWAP vs. spot comparison to detect manipulation?
- Are there position size limits relative to token liquidity?

**Code pattern to audit:**
```rust
// DANGEROUS: No liquidity/TWAP checks
let price = pyth_oracle.get_price()?;
let collateral_value = user.balance * price;
// SAFE: Multiple layers of protection
let price = pyth_oracle.get_price_no_older_than(clock, MAX_STALENESS)?;
require!(price.conf * 100 / price.price < MAX_CONF_PCT);
require!((price.price - twap_price).abs() * 100 / twap_price < MAX_DEVIATION_PCT);
let discounted_value = user.balance * price * liquidity_discount(user.balance, market_depth);
```

---

### 2. Stale Oracle Price
**Severity:** HIGH  **EP Reference:** EP-022
**Historical:** Multiple DeFi incidents during network congestion

**Mechanism:** Oracle price feed stops updating (network congestion, oracle downtime, publisher issues). Protocol uses stale price that no longer reflects market reality. Users borrow at stale prices, creating bad debt.

**Detection:**
- Is `get_price_no_older_than` used (Pyth)?
- Is timestamp checked against `Clock::get()?.unix_timestamp` (Switchboard)?
- What happens when oracle is stale? (Pause? Fallback? Continue with old price?)

**Code pattern to audit:**
```rust
// DANGEROUS: No staleness check
let price = load_price_feed(&oracle)?;
// SAFE: Explicit staleness check
let price = price_feed.get_price_no_older_than(clock.unix_timestamp, 60)?
    .ok_or(ErrorCode::StaleOracle)?;
```

---

### 3. Missing Confidence Interval Check
**Severity:** HIGH  **EP Reference:** EP-021
**Historical:** Various DeFi protocols

**Mechanism:** Oracle reports price with very wide confidence interval (e.g., $100 +/- $50). Protocol uses the point estimate without checking confidence. Attacker exploits the uncertainty.

**Detection:**
- Is `price.conf` (Pyth) checked against threshold?
- Is `conf / price` ratio validated (e.g., < 2%)?

**Code pattern to audit:**
```rust
// DANGEROUS: Ignores confidence
let value = amount * price.price;
// SAFE: Validates confidence
require!(
    price.conf * 100 / price.price.unsigned_abs() < MAX_CONFIDENCE_PCT,
    ErrorCode::OracleConfidenceTooWide
);
```

---

### 4. Single Oracle Dependency
**Severity:** HIGH  **EP Reference:** EP-023
**Historical:** Protocol failures during Pyth/Switchboard outages

**Mechanism:** Protocol depends on a single oracle provider. If that oracle goes down, experiences a bug, or is compromised, the protocol has no fallback.

**Detection:**
- How many oracle sources does the protocol use?
- Is there a fallback oracle?
- Is there a mechanism to pause when all oracles fail?

**Code pattern to audit:**
```rust
// DANGEROUS: Single oracle, no fallback
let price = get_pyth_price(&oracle)?;
// SAFE: Primary + fallback
let price = match get_pyth_price(&pyth_oracle) {
    Ok(p) if is_fresh(p) && is_confident(p) => p,
    _ => get_switchboard_price(&switchboard_oracle)?,
};
```

---

### 5. AMM Spot Price as Oracle
**Severity:** CRITICAL  **EP Reference:** EP-024
**Historical:** Many DeFi exploits

**Mechanism:** Protocol reads price directly from an AMM pool's reserve ratio. Attacker swaps a large amount to move the AMM price, executes action at manipulated price, swaps back. All in one transaction.

**Detection:**
- Does the protocol read reserves from an AMM pool?
- Is the price derived from `reserve_a / reserve_b`?
- Can this be manipulated in the same transaction?

**Invariant:** `never_use_amm_spot_price_for_financial_decisions`

---

### 6. Oracle Account Substitution
**Severity:** CRITICAL  **EP Reference:** EP-002, EP-092
**Historical:** Wormhole ($326M — fake sysvar, similar principle)

**Mechanism:** Protocol accepts oracle account as input but doesn't validate it's the correct oracle feed. Attacker passes a fake account with fabricated price data.

**Detection:**
- Is the oracle account address hardcoded or validated via PDA?
- Is the oracle account owner checked (Pyth/Switchboard program)?
- Can the user pass any account as the oracle?

**Code pattern to audit:**
```rust
// DANGEROUS: Unvalidated oracle account
pub oracle: AccountInfo<'info>,  // Could be ANY account!
// SAFE: Address constraint
#[account(address = KNOWN_PYTH_SOL_USD_FEED)]
pub oracle: AccountInfo<'info>,
// SAFE: Owner + seed validation
#[account(owner = pyth_program::ID)]
pub oracle: AccountInfo<'info>,
```

---

### 7. Decimal/Exponent Mismatch
**Severity:** HIGH  **EP Reference:** EP-017
**Historical:** Various DeFi protocols

**Mechanism:** Oracle price has a specific exponent (e.g., -8 for Pyth). Protocol doesn't normalize correctly between oracle decimals, token decimals (USDC=6, SOL=9), and internal precision.

**Detection:**
- How does the protocol handle `price.expo`?
- Are token decimals accounted for in value calculations?
- Is there a normalization function?

---

### 8. TWAP Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-025
**Historical:** Theoretical, but feasible for on-chain TWAPs

**Mechanism:** On-chain TWAP accumulator can be manipulated if the window is too short or if an attacker can consistently push prices over multiple blocks.

**Detection:**
- What is the TWAP window? (Should be >= 30 minutes)
- Is TWAP based on on-chain accumulators or oracle-provided?
- Can an attacker maintain price manipulation for the full TWAP window?

---

### 9. Self-Referential / Donation-Based Price Inflation
**Severity:** CRITICAL  **EP Reference:** EP-116
**Historical:** C.R.E.A.M. Finance ($130M, Oct 2021 — donated yCrv to inflate yUSD pricePerShare), Harvest Finance ($34M, Oct 2020)

**Mechanism:** Oracle or pricing function depends on the protocol's own state (vault share price, LP token ratio, internal exchange rate). Attacker manipulates this state via donation (direct token transfer that inflates balance without minting shares) or via pool ratio manipulation. The inflated price is then used for collateral valuation, reward minting, or liquidation decisions.

**Detection:**
- Does any oracle/pricing depend on `token::balance()` of a vault or pool?
- Can the pricing input be manipulated by direct token transfers?
- Is `pricePerShare` or `exchange_rate` used as a price oracle?
- Does the pricing rely on a single DEX pool's reserve ratio?

**Code pattern to audit:**
```rust
// DANGEROUS: Price depends on actual balance (donatable)
let price_per_share = token::balance(&vault) / vault.total_shares;
let collateral_value = user_shares * price_per_share;
// SAFE: Price depends on tracked state + external oracle
let price_per_share = vault.tracked_assets / vault.total_shares;
let external_price = pyth_oracle.get_price_no_older_than(clock, MAX_STALENESS)?;
let collateral_value = user_shares * min(price_per_share, external_price);
```

**Invariant:** `pricing_must_not_depend_on_manipulable_internal_state`

---

### 10. "Sandwich the Vault" Pattern
**Severity:** HIGH  **EP Reference:** EP-116
**Historical:** Harvest Finance ($34M — manipulated Curve pool to skew vault deposit/withdrawal pricing)

**Mechanism:** Variant of oracle manipulation targeting vaults that price deposits using spot DEX state:
1. Flash loan large amount
2. Swap to manipulate pool price DOWN
3. Deposit into vault at deflated share price → get more shares than deserved
4. Swap back to restore pool price
5. Withdraw from vault at correct share price → extract profit
6. Repay flash loan

The vault's internal pricing tracks the manipulated pool state, creating an arbitrage window during the manipulation.

**Detection:**
- Does vault deposit/withdrawal pricing reference a DEX pool?
- Can the referenced pool be manipulated via large swaps?
- Is there a TWAP or time-delay on vault pricing?
- Can deposit and withdrawal happen in the same transaction?

**On Solana:** Applies to any yield vault (Tulip, Francium, Kamino, etc.) that prices deposits/withdrawals using spot pool reserves from Raydium, Orca, or other AMMs.

**Invariant:** `vault_pricing_resistant_to_single_tx_manipulation`

---

### Oracle Manipulation Taxonomy (Cross-Chain Lessons)

**From Wave 7 research across 15+ EVM incidents:**

| Category | Example | Solana Analog | Severity |
|----------|---------|---------------|----------|
| Spot price manipulation | Mango, Solend | Pump token on Raydium → borrow | CRITICAL |
| Self-referential pricing | C.R.E.A.M., Harvest | Vault share price as collateral oracle | CRITICAL |
| Single-source dependency | Solend (Switchboard only) | Any single oracle | HIGH |
| Stale price exploitation | Network congestion | Pyth/Switchboard staleness | HIGH |
| LP token mispricing | PancakeBunny | LP-as-collateral calculations | HIGH |
| Cross-venue timing | bZx | Raydium vs Orca price gaps | MEDIUM |
| Donation inflation | C.R.E.A.M. yUSD | Direct transfer to vault | CRITICAL |
| Write-lock arbitrage prevention | Solend USDH | Lock DEX accounts post-pump | CRITICAL |

**Solana-specific defenses (comprehensive):**
1. Use Pyth TWAP, not just spot — require minimum confidence intervals
2. Use dual-oracle pattern (Pyth + Switchboard) with fallback
3. Circuit breakers for price deviation > X% from TWAP
4. Minimum liquidity thresholds for oracle sources
5. Account for Token-2022 transfer fees in price calculations
6. Virtual reserves / dead shares for vault pricing (EP-116)
7. Internal accounting separate from actual token balances
8. Time-delayed pricing for vault deposits (>1 slot delay)

---

## Key Invariants That Must Hold

1. `oracle_price_is_fresh` — within MAX_STALENESS of current time
2. `oracle_confidence_is_narrow` — conf/price ratio below threshold
3. `oracle_price_matches_twap` — spot-TWAP deviation within bounds
4. `oracle_account_is_authentic` — validated address or owner
5. `decimal_normalization_is_correct` — consistent precision throughout
6. `fallback_oracle_exists` — protocol doesn't depend on single source
7. `circuit_breaker_exists` — extreme price changes trigger pause
8. `pricing_not_dependent_on_manipulable_internal_state` — EP-116
9. `vault_pricing_resistant_to_single_tx_manipulation` — EP-116
10. `no_self_referential_pricing_without_external_verification`

## Red Flags Checklist

- [ ] Oracle account passed without address/owner validation
- [ ] `load_price_feed` without staleness check
- [ ] Price confidence interval not checked
- [ ] Single oracle source, no fallback
- [ ] AMM reserve ratio used as price feed
- [ ] Missing decimal/exponent normalization
- [ ] No TWAP comparison for critical operations (lending, liquidation)
- [ ] No circuit breaker on extreme price movements
- [ ] Oracle price used directly without sanity bounds
- [ ] Protocol continues operating when oracle is stale (no pause)
- [ ] Exotic tokens without established oracle feeds accepted as collateral
- [ ] Vault/pool share price depends on actual token balance (donatable)
- [ ] `pricePerShare` or `exchange_rate` used as collateral oracle without external verification
- [ ] Vault deposit/withdrawal pricing uses spot DEX pool state
- [ ] No time delay between deposit pricing and actual deposit
- [ ] LP token pricing uses `reserve_a * price_a + reserve_b * price_b` without manipulation protection
- [ ] **Single DEX pool as price source (write-lock manipulation risk, EP-120)**
- [ ] **No stablecoin price cap near peg** (e.g., allow oracle to report $15 for stablecoin)
- [ ] **No liquidity depth check on oracle source DEX**

---

## Protocol-Specific Oracle Intelligence (Wave 8)

### Jupiter Edge Oracle (Chaos Labs) — Strong Design Example
- Designed for leveraged perp markets where "any pricing inaccuracy becomes a potential exploit vector"
- Resilient to outliers and anomalies, accounts for liquidity and volatility
- Chainlink and Pyth as verification/backup oracles
- **Lesson:** Oracle systems for perps need higher accuracy than spot markets

### Solend USDH Write-Lock Attack (Nov 2022) — Detailed Mechanism
The most sophisticated oracle manipulation on Solana, combining economic attack with Solana-specific account locking:

**Attack sequence (EP-120):**
1. Spend 100K USDC to pump USDH price on Saber (thin liquidity pool)
2. In same slot: spam transactions that write-lock Saber pool accounts
3. Arbitrageurs cannot access locked accounts — cannot correct the price
4. In next slot: Switchboard oracle samples the inflated USDH price (~$15)
5. Repeat pump-lock-sample cycle to sustain inflated price
6. Deposit USDH as collateral on Solend at inflated value
7. Borrow $1.26M in other assets against inflated collateral

**Why it worked:**
- Solend used single Switchboard feed sourced from single Saber pool
- No stablecoin price cap (oracle could report $15 for a stablecoin)
- Account write-locking is inherent to Solana's parallel execution model
- Attacker predicted oracle sampling timing

**Defense (comprehensive):**
- Dual-oracle pattern (Pyth + Switchboard with cross-validation)
- Stablecoin price cap (MinTask: cap at 1.01 for stablecoins)
- Minimum liquidity depth requirements for oracle source pools
- Multiple DEX sources (Saber + Orca + Raydium) for same-asset pricing
- Time-weighted average to smooth single-slot manipulation

### Pyth vs Switchboard Comparison (Audit Relevance)
| Feature | Pyth | Switchboard |
|---------|------|-------------|
| Architecture | Publisher network | Oracle queues |
| Update frequency | Per-slot (400ms) | Configurable |
| Confidence intervals | Yes (native) | Via aggregator |
| TWAP | Available | Via custom jobs |
| Solana-native | Yes | Yes |
| Staleness risk | Low (frequent updates) | Medium (configurable) |
| Manipulation risk | Harder (multiple publishers) | Medium (depends on data sources) |

---
<!-- Sources: Waves 1-2+7+8 research, Mango/Solend/Loopscale/C.R.E.A.M./Harvest/bZx/PancakeBunny exploits, Cyfrin research, Pyth/Switchboard documentation, Ackee Blockchain Solend analysis, Solend post-mortem, Jupiter Edge/Chaos Labs, Kamino oracle design -->
