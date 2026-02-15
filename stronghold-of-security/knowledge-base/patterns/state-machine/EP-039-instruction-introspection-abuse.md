# EP-039: Instruction Introspection Abuse
**Category:** Logic Errors  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Flash loan repayment bypass via fake instructions

**Description:** Auth decisions based on other instructions in tx. Attacker crafts fake instructions.

**Vulnerable Pattern:**
```rust
if check_for_admin_instruction(&ix_sysvar)? { execute_privileged()?; }
```
**Secure Pattern:**
```rust
require!(authority.key() == ADMIN_KEY); // Direct auth, not introspection
```
**Detection:** Find `Sysvar::<Instructions>`. Auth must not depend on other instructions.
