# EP-086: Stack Overflow
**Category:** DoS  **Severity:** MEDIUM  **Solana-Specific:** Yes (4KB stack)
**Historical Exploits:** NFT programs crash on nested metadata

**Description:** Deep recursion or CPI chains exhaust 4KB BPF stack.

**Vulnerable Pattern:**
```rust
fn process(node: &AccountInfo) { for child in children { process(&child)?; } }
```
**Secure Pattern:**
```rust
let mut stack = vec![(node, 0)]; // Heap iteration
while let Some((n, depth)) = stack.pop() { require!(depth <= MAX); }
```
**Detection:** Find recursive functions. Verify depth limits. Prefer iteration.
