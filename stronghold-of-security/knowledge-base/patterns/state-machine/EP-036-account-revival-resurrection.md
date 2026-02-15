# EP-036: Account Revival / Resurrection
**Category:** Logic Errors  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Accounts revived with stale authority/balance data; Metaplex Auction House persistent sale agreement

**Description:** Closed account data not zeroed. Re-funding revives it with old state. Account garbage collection only happens AFTER a transaction completes, so an attacker can close an account and refund it within the same transaction.

**Same-Transaction Revival Technique (FuzzingLabs):**
1. Instruction 1: Close account (transfer all lamports out)
2. Instruction 2: Transfer lamports BACK into the closed account (same tx)
3. Account remains rent-exempt → not garbage collected
4. Attacker reuses the "closed" account (e.g., claim staking rewards again, replay old listing)

**Vulnerable Pattern:**
```rust
**vault.lamports.borrow_mut() = 0; // Data NOT zeroed, ownership not changed!
// Attacker sends lamports back in next instruction → account persists with old state
```
**Secure Pattern (Three Defenses Required):**
```rust
// Anchor's close constraint does all three:
#[account(mut, close = user)] // 1. Zeros data, 2. Sets discriminator, 3. Transfers ownership
pub vault: Account<'info, Vault>,

// Manual equivalent (all three steps needed):
// 1. Zero all account data
vault.data.borrow_mut().fill(0);
// 2. Set closed account discriminator
vault.data.borrow_mut()[..8].copy_from_slice(&CLOSED_ACCOUNT_DISCRIMINATOR);
// 3. Transfer ownership to system program (prevents revival with old program ownership)
vault.assign(&system_program::ID);
**vault.lamports.borrow_mut() = 0;
```
**Detection:** Review closure ops. Verify ALL THREE defenses: data zeroed, discriminator set, ownership transferred to system program. Flag programs using pre-0.25 Anchor close patterns (discriminator-only, no ownership transfer). Check if any instruction in the program can send lamports to arbitrary accounts (could be used for revival).

**Sources:** FuzzingLabs (Dec 2024), Ackee-Blockchain common attack vectors, RareSkills Solana close account guide
