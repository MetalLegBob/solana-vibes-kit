# EP-102: Registry / List Composition Attack (Omission/Duplication)
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Partial
**Historical Exploits:** Hylo (2 Critical, May 2025 — collateral ratio manipulation via LST registry omission/duplication)

**Description:** Protocol loads a registry, list, or set of items from variable-length input (e.g., `remaining_accounts`, instruction data) without enforcing canonical membership. Attacker omits unfavorable entries or duplicates favorable ones to skew calculations — collateral ratios, index compositions, voting weight, etc. The individual data may be valid, but the *composition of the set* is attacker-controlled.

**Vulnerable Pattern:**
```rust
// Registry loaded from variable-length remaining_accounts without canonical validation
pub fn calculate_collateral_ratio(ctx: Context<CalcRatio>) -> Result<u64> {
    let mut total_value = 0u64;
    for acc in ctx.remaining_accounts {
        let lst_block = LstBlock::deserialize(&acc.data.borrow())?;
        // BUG: No check for duplicates — attacker passes the same high-value LST 3x
        // BUG: No check for missing entries — attacker omits low-value LSTs
        total_value += lst_block.value;
    }
    Ok(total_value)
}
```
**Secure Pattern:**
```rust
pub fn calculate_collateral_ratio(
    ctx: Context<CalcRatio>,
    expected_mints: &[Pubkey],
) -> Result<u64> {
    let mut seen = HashSet::new();
    let mut total_value = 0u64;
    for acc in ctx.remaining_accounts {
        let lst_block = LstBlock::deserialize(&acc.data.borrow())?;
        // Prevent duplicates
        require!(!seen.contains(&lst_block.mint), ErrorCode::DuplicateEntry);
        seen.insert(lst_block.mint);
        total_value += lst_block.value;
    }
    // Verify all required entries are present
    require!(seen.len() == expected_mints.len(), ErrorCode::IncompleteRegistry);
    for mint in expected_mints {
        require!(seen.contains(mint), ErrorCode::MissingRequiredEntry);
    }
    Ok(total_value)
}
```
**Detection:** Look for functions loading variable-length registries, lists, or account sets from `remaining_accounts` or instruction data. Verify: (a) no duplicates allowed, (b) canonical/required entries enforced against on-chain state, (c) omission of entries cannot skew ratios or calculations. Applies to multi-collateral lending, index products, basket tokens, weighted voting.
