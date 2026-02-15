# EP-062: Reward Calculation Gaming
**Category:** Economic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Multiple staking protocols gamed via deposit-before-reward

**Description:** Rewards based on current share, not time-weighted. Deposit before distribution, claim, withdraw.

**Vulnerable Pattern:**
```rust
let rewards = total_rewards * user.shares / pool.total_shares; // No time weight!
```
**Secure Pattern:**
```rust
// Accumulator pattern: acc_reward_per_share += reward_rate * elapsed / total
let pending = user.shares * pool.acc_reward_per_share - user.reward_debt;
```
**Detection:** Review reward mechanisms. Verify time-weighted or accumulator pattern.
