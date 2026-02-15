# EP-120: Oracle Write-Lock Arbitrage Prevention (Solana-Specific)
**Category:** Oracle  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Solend USDH ($1.26M, Nov 2022 — attacker pumped USDH on Saber, write-locked Saber accounts to prevent arbitrage, Switchboard oracle captured inflated price)

**Description:** Solana's account model requires write-locks on accounts being modified. An attacker pumps a token's price on a thin-liquidity DEX, then spams transactions that write-lock the DEX pool accounts, preventing arbitrageurs from correcting the price in the same slot. The oracle samples the inflated price before arbitrage can occur.

**Attack Sequence:**
1. Pump target token price on thin DEX (e.g., spend 100K USDC)
2. Immediately spam transactions write-locking the DEX pool accounts (Saber's swap account)
3. Arbitrageurs cannot access locked accounts — price stays inflated
4. Oracle (Switchboard/Pyth) samples inflated price in next slot
5. Use inflated collateral to borrow on lending protocol

**Vulnerable Pattern:**
```rust
// Lending protocol using single DEX as oracle source
pub fn get_token_price(oracle_account: &AccountInfo) -> Result<u64> {
    let oracle_data = SwitchboardV2::load(oracle_account)?;
    // Switchboard pulls from single Saber pool
    // Attacker can manipulate Saber + prevent arbitrage
    Ok(oracle_data.latest_confirmed_round.result)
}
```
**Secure Pattern:**
```rust
pub fn get_token_price(
    primary_oracle: &AccountInfo,
    secondary_oracle: &AccountInfo,
) -> Result<u64> {
    let primary = load_oracle(primary_oracle)?;
    let secondary = load_oracle(secondary_oracle)?;

    // Dual-source validation
    require!(primary.is_fresh(MAX_STALENESS), ErrorCode::StaleOracle);
    require!(secondary.is_fresh(MAX_STALENESS), ErrorCode::StaleOracle);

    let deviation = price_deviation(primary.price, secondary.price);
    require!(deviation < MAX_DEVIATION_BPS, ErrorCode::OracleDeviation);

    // Cap stablecoins near peg
    let price = std::cmp::min(primary.price, MAX_STABLE_PRICE); // e.g., 1.01
    Ok(price)
}
```
**Detection:** Check if protocol uses single oracle source for any collateral. Check if oracle source is a thin-liquidity DEX pool. Verify dual-oracle or TWAP patterns. For stablecoins, check for price caps near peg. Look for `SwitchboardV2` or `Pyth` with single feed per asset.
