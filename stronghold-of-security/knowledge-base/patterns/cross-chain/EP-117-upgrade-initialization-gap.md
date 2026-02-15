# EP-117: Upgrade Initialization Gap
**Category:** Initialization / Upgrade  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Ronin Bridge V2 ($12M, Aug 2024 — forgot to call `initializeV3` after upgrade, left operator weight at zero)

**Description:** During a program upgrade that introduces new state fields, the initialization function for new fields is not called (or called incorrectly). New state defaults to zero/empty, which may disable security checks that depend on non-zero values. On EVM, this typically involves missing initializer calls in proxy upgrades. On Solana, upgradeable programs face similar risks when adding new state fields to existing accounts.

**Vulnerable Pattern:**
```rust
// V2 adds a new field: min_validator_weight
#[account]
pub struct BridgeConfig {
    pub guardians: Vec<Pubkey>,
    pub threshold: u8,
    pub min_validator_weight: u64, // NEW in V2 — defaults to 0 if not initialized!
}

pub fn verify_message(ctx: Context<Verify>) -> Result<()> {
    let config = &ctx.accounts.config;
    // BUG: If min_validator_weight is 0 (uninitialized), this check always passes
    require!(total_weight >= config.min_validator_weight, ErrorCode::InsufficientWeight);
    Ok(())
}
```
**Secure Pattern:**
```rust
// Migration instruction that MUST be called after upgrade
pub fn migrate_v2(ctx: Context<MigrateV2>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    // Set new fields to safe defaults
    config.min_validator_weight = DEFAULT_MIN_WEIGHT; // Non-zero!
    config.version = 2;
    Ok(())
}

pub fn verify_message(ctx: Context<Verify>) -> Result<()> {
    let config = &ctx.accounts.config;
    // Defense-in-depth: reject zero weight even if migration was missed
    require!(config.min_validator_weight > 0, ErrorCode::UninitializedConfig);
    require!(total_weight >= config.min_validator_weight, ErrorCode::InsufficientWeight);
    Ok(())
}
```
**Detection:** During upgrade reviews: (a) list all new state fields added, (b) verify a migration instruction exists that sets them to non-zero/safe values, (c) verify the migration is called in the upgrade transaction or gated behind a version check, (d) check if any security-critical logic depends on the new fields being non-zero. Flag any `require!(value >= config.new_field)` where `new_field` defaults to 0.
