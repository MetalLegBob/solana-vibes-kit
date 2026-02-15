# EP-044: CPI Privilege Propagation
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Strategy contracts stealing via deep CPI chains

**Description:** In A->B->C chains, signer privileges propagate to C. C inherits A's PDA authority.

**Vulnerable Pattern:**
```rust
// A signs for vault, calls B. B calls C. C has vault's signer authority!
```
**Secure Pattern:**
```rust
// Each program validates caller and uses its own PDA, not propagated signers
require!(AUTHORIZED_CALLERS.contains(&caller.key()));
```
**Detection:** Map CPI chains. Verify signer scope per program.
