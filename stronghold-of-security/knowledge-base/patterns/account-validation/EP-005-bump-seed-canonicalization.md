# EP-005: Bump Seed Canonicalization
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Non-canonical bumps causing duplicate vault instances

**Description:** Non-canonical bump seed accepted, allowing multiple PDAs for same logical seeds.

**Vulnerable Pattern:**
```rust
Pubkey::create_program_address(&[b"vault", &[user_bump]])?; // User-provided bump
```
**Secure Pattern:**
```rust
#[account(seeds = [b"vault", user.key().as_ref()], bump)] // Canonical bump enforced
```
**Detection:** Find `create_program_address`. Should use `find_program_address` or Anchor `bump`.
