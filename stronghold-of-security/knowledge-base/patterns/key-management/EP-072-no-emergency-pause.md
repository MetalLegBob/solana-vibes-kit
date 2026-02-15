# EP-072: No Emergency Pause
**Category:** Key Management  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Protocols unable to halt during active exploits

**Description:** No way to pause operations during exploit. Drainage continues during fix.

**Vulnerable Pattern:**
```rust
pub fn deposit(ctx: ...) { /* always executable */ }
```
**Secure Pattern:**
```rust
require!(!config.paused, ErrorCode::Paused);
// Authority can toggle config.paused
```
**Detection:** Check for pause mechanism on critical operations.
