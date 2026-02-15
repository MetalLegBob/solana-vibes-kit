# EP-087: Heap Exhaustion
**Category:** DoS  **Severity:** MEDIUM  **Solana-Specific:** Yes (32KB heap)
**Historical Exploits:** Metadata programs failing on large blobs

**Description:** User-controlled input causes large heap allocations, exhausting 32KB.

**Vulnerable Pattern:**
```rust
let mut buf = Vec::with_capacity(data.len() * 2); // Could be huge!
```
**Secure Pattern:**
```rust
require!(data.len() <= MAX_SIZE);
// Use fixed-size buffers or zero_copy accounts
```
**Detection:** Find `Vec::with_capacity()`. Verify size validation before allocation.
