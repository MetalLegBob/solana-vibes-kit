# EP-084: Compute Unit Exhaustion
**Category:** DoS  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** NFT verification DoS, airdrop registration DoS

**Description:** Unbounded computation exhausts 1.4M compute unit budget.

**Vulnerable Pattern:**
```rust
for sig in signatures { ed25519_verify(&sig)?; } // No limit on count!
```
**Secure Pattern:**
```rust
require!(signatures.len() <= MAX_SIGS);
```
**Detection:** Find unbounded loops. Verify input size validation before expensive ops.
