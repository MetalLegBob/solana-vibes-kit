# EP-127: Perpetual DEX Attack Patterns
**Category:** Economic / DeFi  **Severity:** HIGH-CRITICAL  **Solana-Specific:** No (but Jupiter Perps, Drift Protocol are major Solana perp DEXes)
**Historical Exploits:** No major Solana perp exploit yet, but EVM perp exploits include Mango-style oracle manipulation applied to perp mark prices, and multiple position size / leverage gaming incidents on dYdX, GMX, Gains Network.

**Description:** Perpetual DEX protocols (Jupiter Perps, Drift, Zeta Markets, Flash Trade on Solana) introduce unique attack surfaces beyond standard AMM/swap protocols: mark price manipulation, funding rate gaming, liquidation cascade triggering, and position limit circumvention.

**Sub-Pattern PP-1: Mark Price Oracle Deviation Attack**
```rust
// Perp DEX uses mark price from oracle + internal TWAP
// If mark price deviates from index price, attacker profits
pub fn open_position(ctx: Context<OpenPosition>, size: u64, leverage: u8) -> Result<()> {
    let mark_price = ctx.accounts.pool.get_mark_price()?; // Internal TWAP
    let index_price = ctx.accounts.oracle.get_price()?;   // External oracle
    // BUG: No deviation check — attacker manipulates pool to skew mark price
    // Then takes leveraged position on the deviation
    let entry_price = mark_price;
    // ...
}
```

**Sub-Pattern PP-2: Funding Rate Manipulation**
```rust
// Funding rate = (mark_price - index_price) * funding_period
// Attacker skews open interest to one side → forces large funding payments
// On low-liquidity perps, a single large position can dominate OI
// Attack: Open huge long → collect funding from all shorts → close position
```

**Sub-Pattern PP-3: Liquidation Cascade Triggering**
```rust
// Attacker identifies cluster of positions near liquidation threshold
// Pushes price just past threshold (via oracle manipulation or large trade)
// Liquidations cascade: each liquidation pushes price further → more liquidations
// Attacker profits from: liquidation penalties, discounted position acquisition,
//   or short position during the cascade
```

**Sub-Pattern PP-4: Position Limit Circumvention**
```rust
// Protocol limits max position size per account
// Attacker uses multiple accounts (Sybil) to exceed aggregate limits
// Or splits across long/short to appear delta-neutral while gaming funding
pub fn check_position_limit(account: &Pubkey, size: u64) -> Result<()> {
    require!(size <= MAX_POSITION_SIZE, ErrorCode::PositionTooLarge);
    // BUG: Only checks per-account, not aggregate across related accounts
}
```

**Secure Patterns:**
- Enforce mark price deviation bands (halt trading if mark/index diverge beyond threshold)
- Cap funding rate per period to limit manipulation incentive
- Implement aggregate position limits with identity/collateral linking
- Use gradual liquidation (partial liquidation) to prevent cascades
- Monitor OI concentration — flag when single entity controls >X% of one side
- Implement price bands / circuit breakers for extreme moves
- Cross-reference oracle prices with multiple independent sources

**Detection:** For perp DEX audits: (a) verify mark price calculation cannot be manipulated by pool activity alone, (b) check funding rate caps exist, (c) verify liquidation logic uses gradual/partial liquidation, (d) check position limits are enforced globally not just per-account, (e) verify price impact calculations for large orders, (f) check that liquidation penalties don't create perverse incentives.
