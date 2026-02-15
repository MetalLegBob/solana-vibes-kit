# EP-038: Cross-Instruction State Attack
**Category:** Logic Errors  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Lending protocol multi-instruction withdraw+borrow exploit

**Description:** Multi-instruction tx modifies shared state in ix1, violating invariants in ix2.

**Vulnerable Pattern:**
```rust
// Ix1: withdraw collateral. Ix2: borrow against (withdrawn) collateral.
let collateral = get_collateral(user)?; // Stale from ix1!
```
**Secure Pattern:**
```rust
validate_invariants(user)?; // Check at start
// ... operation ...
validate_invariants(user)?; // Check at end
```
**Detection:** Identify shared state across instructions. Verify pre/post invariant checks.
