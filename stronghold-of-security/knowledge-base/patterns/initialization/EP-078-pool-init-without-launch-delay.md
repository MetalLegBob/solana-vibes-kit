# EP-078: Pool Init Without Launch Delay
**Category:** Initialization  **Severity:** LOW  **Solana-Specific:** No
**Historical Exploits:** Meme coin sniping on Raydium/Orca

**Description:** New pool immediately tradeable. Bots snipe initial liquidity.

**Vulnerable Pattern:**
```rust
pool.is_active = true; // Tradeable instantly!
```
**Secure Pattern:**
```rust
pool.is_active = false;
pool.launch_slot = clock.slot + DELAY;
pool.max_buy = initial_reserve / 100; // 1% cap initially
```
**Detection:** Check pool init. Verify launch delay and fair launch.
