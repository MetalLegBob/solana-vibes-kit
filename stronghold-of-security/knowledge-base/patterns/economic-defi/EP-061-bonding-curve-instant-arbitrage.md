# EP-061: Bonding Curve Instant Arbitrage
**Category:** Economic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Nirvana ($3.5M, Jul 2022)

**Description:** Bonding curve mint-then-burn profitable in same tx with flash loans.

**Vulnerable Pattern:**
```rust
pub fn mint(amount: u64) { supply += amount; /* price goes up */ }
pub fn burn(amount: u64) { /* redeem at 90% of new higher price */ }
```
**Secure Pattern:**
```rust
// Add vesting: minted tokens locked for minimum duration
position.unlock_slot = clock.slot + VESTING_SLOTS; // e.g., 24h
// Plus: per-tx caps, TWAP pricing, redemption fees
```
**Detection:** Find bonding curves. Check if mint-burn is profitable in single tx.
