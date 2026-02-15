# EP-110: Inter-Transaction Account Hijack (Rent Thief)
**Category:** Initialization / Race Condition  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Solend Rent Thief (Aug 2022 — OtterSec disclosure, ~0.0082 SOL/attack but caused tx failures)

**Description:** When account creation requires multiple transactions (due to tx size limits), there's a window between creation (tx1) and initialization (tx2) where accounts have rent money but no program owner. An attacker bot can seize ownership, drain rent, and close accounts in this gap, causing the legitimate initialization to fail.

**Vulnerable Pattern:**
```rust
// Transaction 1: Create accounts (system program)
// Creates 6 accounts with enough SOL for rent-exemption
// Accounts are owned by System Program at this point

// ... 40+ second gap where attacker can act ...

// Transaction 2: Initialize accounts (program)
// BUG: Accounts may no longer exist or have different owner
pub fn init_reserve(ctx: Context<InitReserve>) -> Result<()> {
    // If attacker took ownership and closed accounts, this fails
    Ok(())
}
```
**Secure Pattern:**
```rust
// Atomic: Create AND initialize in same transaction or same CPI chain
pub fn init_reserve_atomic(ctx: Context<InitReserveAtomic>) -> Result<()> {
    // Use a program-owned instruction to create all accounts via CPI
    // and initialize them in the same transaction
    for account_info in accounts_to_create {
        system_program::create_account(/* ... */)?; // Create
        initialize_account(account_info)?;           // Init immediately
    }
    Ok(())
}
// Or use Anchor's init constraint which does both atomically
```
**Detection:** Look for multi-transaction initialization patterns. Check if account creation and initialization happen in separate transactions. Flag any pattern where accounts are created in one tx and initialized in another. Also flag programs that check account existence by lamport balance (`lamports > 0`) instead of proper state/discriminator checks.
