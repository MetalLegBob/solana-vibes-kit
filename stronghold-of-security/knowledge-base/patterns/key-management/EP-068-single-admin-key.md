# EP-068: Single Admin Key
**Category:** Key Management  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Raydium ($4.4M, Dec 2022), MonkeyBall ($250K, Feb 2022)

**Description:** Critical ops controlled by single private key. Compromise = full control.

**Vulnerable Pattern:**
```rust
#[account(constraint = pool.admin == admin.key())]
pub admin: Signer<'info>, // Single key!
```
**Secure Pattern:**
```rust
pub admin_multisig: Signer<'info>, // Squads multisig
// + withdrawal limits + rate limiting + events
```
**Detection:** Check admin is multisig. Verify timelocks on critical ops.
