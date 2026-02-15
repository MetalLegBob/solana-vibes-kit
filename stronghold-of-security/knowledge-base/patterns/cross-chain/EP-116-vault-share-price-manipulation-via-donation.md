# EP-116: Vault Share Price Manipulation via Donation
**Category:** Economic / DeFi  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** C.R.E.A.M. Finance ($130M, Oct 2021 — donated to yUSD vault to inflate pricePerShare), Harvest Finance ($34M, Oct 2020 — manipulated Curve pool to skew vault pricing)

**Description:** Vaults that calculate share price as `total_assets / total_shares` are vulnerable when an attacker can increase `total_assets` without minting new shares (via direct token transfer/donation). This inflates the share price, allowing the attacker to borrow against inflated collateral or withdraw more than they deposited. The "sandwich the vault" variant: manipulate price down → deposit → restore price → withdraw at profit.

**Vulnerable Pattern:**
```rust
pub fn get_share_price(vault: &Vault) -> u64 {
    // BUG: Uses actual token balance — can be inflated by direct transfer
    let total_assets = token::balance(&vault.token_account)?;
    total_assets.checked_div(vault.total_shares).unwrap_or(1)
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let shares = amount * ctx.accounts.vault.total_shares / get_total_assets()?;
    // If attacker donated tokens before this, shares_minted is too low
    // Attacker deposits small amount, gets fewer shares, then withdraws donated tokens
    mint_shares(shares)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn get_share_price(vault: &Vault) -> u64 {
    // Use internally tracked assets, NOT actual balance
    vault.tracked_total_assets.checked_div(vault.total_shares).unwrap_or(1)
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Virtual reserves: add "dead shares" at initialization to prevent first-depositor attack
    let virtual_assets = vault.tracked_total_assets + VIRTUAL_ASSETS;
    let virtual_shares = vault.total_shares + VIRTUAL_SHARES;
    let shares = amount * virtual_shares / virtual_assets;
    require!(shares > 0, ErrorCode::ZeroShares);
    vault.tracked_total_assets += amount;
    mint_shares(shares)?;
    Ok(())
}
```
**Detection:** For any vault/pool contract: (a) check if share price uses actual token balance vs internal accounting, (b) check if direct token transfers affect pricing, (c) look for "dead shares" or virtual reserve patterns (absence = vulnerable), (d) verify minimum deposit amounts exist. Applies to yield vaults, LP tokens, receipt tokens, and any share-based accounting.
