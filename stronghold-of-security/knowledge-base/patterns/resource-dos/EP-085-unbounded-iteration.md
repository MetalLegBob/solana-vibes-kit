# EP-085: Unbounded Iteration
**Category:** DoS  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Airdrop DoS via max user registration

**Description:** Iteration over unbounded Vec or remaining_accounts exhausts compute.

**Vulnerable Pattern:**
```rust
pub users: Vec<Pubkey>, // Unbounded!
for user in users { update(user)?; }
```
**Secure Pattern:**
```rust
pub users: [Pubkey; MAX], // Fixed
pub fn update_batch(start: u32, count: u32) { require!(count <= MAX_BATCH); }
```
**Detection:** Find loops over Vec or remaining_accounts. Verify batch limits.
