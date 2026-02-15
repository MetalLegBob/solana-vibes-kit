# EP-069: No Admin Key Rotation
**Category:** Key Management  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Protocols with permanently compromised admin

**Description:** Authority set at init with no update function. Compromise is permanent.

**Vulnerable Pattern:**
```rust
pub fn initialize(ctx: ...) { config.authority = auth.key(); }
// No update_authority function!
```
**Secure Pattern:**
```rust
pub fn transfer_authority(ctx: ...) { config.pending = Some(new); }
pub fn accept_authority(ctx: ...) { config.authority = new.key(); config.pending = None; }
```
**Detection:** Verify authority update with two-step transfer pattern exists.
