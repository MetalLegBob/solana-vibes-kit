# EP-031: Multi-Sig Duplicate Signer Bypass
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Treasury multi-sigs bypassed with duplicate signers

**Description:** Custom multi-sig doesn't deduplicate signers. One signer counts multiple times.

**Vulnerable Pattern:**
```rust
for signer in signers { if valid(signer) { count += 1; } } // No dedup!
```
**Secure Pattern:**
```rust
let mut seen = HashSet::new();
for signer in signers {
    if !seen.insert(signer.key()) { return Err(ErrorCode::Duplicate); }
}
```
**Detection:** Find custom multi-sig. Verify deduplication of signers.
