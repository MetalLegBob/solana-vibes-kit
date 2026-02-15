# EP-048: Missing CPI Guard
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Authority changes via CPI from malicious programs

**Description:** Sensitive instruction callable via CPI, enabling attack chains.

**Vulnerable Pattern:**
```rust
pub fn change_authority(ctx: ...) { vault.authority = new.key(); } // CPI-callable!
```
**Secure Pattern:**
```rust
let ix = get_instruction_relative(0, &ctx.accounts.ix_sysvar)?;
require!(ix.program_id == crate::ID, ErrorCode::CpiNotAllowed);
```
**Detection:** Identify sensitive instructions. Verify CPI protection.
