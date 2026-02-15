# EP-004: PDA Seed Collision
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Protocol treasury impersonation via username manipulation

**Description:** Insufficient PDA seeds allow different inputs to produce same address.

**Vulnerable Pattern:**
```rust
seeds = [b"vault"], bump // No user-specific seed
```
**Secure Pattern:**
```rust
seeds = [b"vault", user.key().as_ref()], bump // User-specific
```
**Detection:** Review all PDA seeds for uniqueness. Include user pubkey, mint, or counter.
