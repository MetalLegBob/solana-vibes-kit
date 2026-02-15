# EP-024: AMM Spot Price as Oracle
**Category:** Oracle  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Nirvana ($3.5M, Jul 2022), multiple flash loan attacks

**Description:** AMM reserve ratio used as price oracle. Trivially manipulable via flash loans.

**Vulnerable Pattern:**
```rust
let price = pool.reserve_b * PRECISION / pool.reserve_a; // Manipulable!
```
**Secure Pattern:**
```rust
let price = oracle.get_twap(TWAP_WINDOW)?; // External oracle TWAP
```
**Detection:** Find price from pool reserves. Flag `reserve_a / reserve_b` patterns.
