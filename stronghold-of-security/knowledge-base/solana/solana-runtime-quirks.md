# Solana Runtime Quirks & Edge Cases
<!-- Security-relevant runtime behaviors that affect program correctness -->
<!-- Last updated: 2026-02-06 -->
<!-- Sources: Solana docs, Helius, Asymmetric Research, audit findings -->

## Compute & Execution Limits

### Compute Budget
- Default: **200,000 CU** per instruction
- Max per transaction: **1,400,000 CU** (with `SetComputeUnitLimit`)
- Exceeding budget = transaction failure
- **Audit impact:** Complex operations may hit compute limits. DoS possible by forcing expensive paths.
- Programs can request more CU but not exceed the transaction max.

### Call Stack Depth
- Max: **64 frames** (Rust function calls)
- Exceeding = `CallDepthExceeded` error
- **Audit impact:** Deeply recursive algorithms may fail. Not a security issue per se, but can cause DoS.

### CPI Depth
- Max: **4 levels** of cross-program invocation
- Exceeding = `CallDepth` error
- **Audit impact:** Limits reentrancy (can't recurse infinitely). But does NOT prevent same-transaction reentrancy via multiple instructions. Self-CPI is allowed (used for event emission).

### No Reentrancy (Almost)
- A program cannot be re-entered during a CPI (runtime prevents it)
- **Exception:** Self-CPI is allowed for event emission
- **BUT:** Multiple instructions in one transaction CAN modify shared state sequentially
- **Audit impact:** Checks-effects-interactions pattern is still important for same-transaction composability

---

## Transaction Limits

### Transaction Size
- Hard limit: **1,232 bytes** (MTU constraint)
- Includes: message header, account keys, recent blockhash, instructions, signatures
- Each account key: 32 bytes, each signature: 64 bytes
- Legacy transactions: ~**35 accounts** max
- v0 transactions with ALTs: **64 accounts** max (up to 256 in lookup table)
- **Audit impact:** Complex protocols may need to split operations across transactions, introducing atomicity risks.

### Address Lookup Tables (ALTs)
- Store up to **256 addresses** per table
- Entries become usable after **one slot** (warm-up period)
- ALTs are append-only, can be deactivated and closed after cooldown
- **Audit impact:**
  - ALT warm-up means newly added addresses can't be used immediately
  - Deactivated ALTs reject all lookups — can cause transaction failures
  - ALT owner can modify the table — verify trust assumptions

### Versioned Transactions
- Legacy (v0) and Versioned (v0) coexist
- Only v0 transactions can use ALTs
- Signer keys MUST appear in `account_keys` (cannot be in ALT only)
- **Audit impact:** Programs must support versioned transactions for ALT compatibility.

---

## Account Model Edge Cases

### Account Size
- Max: **10 MiB** (10,485,760 bytes)
- Account must be rent-exempt (minimum balance based on size)
- **Audit impact:** Very large accounts are expensive and may affect realloc behavior.

### Rent Exemption
- Since Solana 1.17+: all new accounts MUST be rent-exempt
- Rent-exempt minimum = `Rent::get()?.minimum_balance(space)`
- Accounts below rent-exempt threshold are garbage collected by runtime
- **Audit impact:** Draining lamports below rent-exempt can destroy accounts. Anchor `init` handles this automatically.

### Account Reallocation
- `AccountInfo::realloc(new_len, zero_init)` can resize accounts
- **Gotchas:**
  - `zero_init = false` may expose stale data
  - Realloc can only be done by the account owner
  - Realloc doesn't change rent-exempt minimum automatically — must transfer additional lamports
  - Max size increase per instruction: **10 KiB**
  - Size can increase across instructions in same transaction
- **Audit impact:** Check `zero_init` parameter. Ensure rent is topped up after realloc. Verify stale data can't be read.

### Account Closure
- Draining all lamports (= 0) + zeroing data + setting owner to System Program
- Anchor `close` constraint handles all three
- **Gotcha:** Closed account can be "revived" in same transaction if lamports are sent back before transaction ends
- **Audit impact:** Verify accounts can't be reopened in same transaction. Check for revival attacks.

### Account Data Layout
- First 8 bytes: Anchor discriminator (if Anchor program)
- Remaining bytes: account data (Borsh serialized)
- **Audit impact:** Manual deserialization must check discriminator. Different account types may have same data layout but different discriminators.

---

## Arithmetic & Types

### Integer Overflow in Release Mode
**This is the #1 most important Solana runtime quirk.**
- Debug builds: Rust panics on overflow
- **Release builds (used on-chain): Rust wraps silently** (two's complement)
- `100u8 + 200u8 = 44` (not a panic!)
- **Audit impact:** CRITICAL. All financial arithmetic MUST use `checked_*` methods.

### Float Support
- Limited float support via LLVM software emulation
- Floats consume more compute units than integer operations
- No hardware float support
- **Audit impact:** Avoid floats for financial calculations. Use fixed-point arithmetic (scaled integers).

### Type Casting
- `as u64`, `as u32` truncates silently (no error)
- `try_from()` returns Result — safe
- **Audit impact:** Search for `as uX` casts on financial values.

---

## Time & Ordering

### Clock Sysvar
- `Clock::get()?.unix_timestamp` — approximate wall-clock time
- `Clock::get()?.slot` — monotonically increasing slot number
- Timestamps can vary **1-2 seconds** from real time
- Slot time: **~400ms** average, but varies with network load
- **Audit impact:** Don't rely on exact timestamp equality. Use ranges. For ordering guarantees, prefer slot over timestamp.

### Blockhash Expiry
- Recent blockhash expires after **~150 slots (~60 seconds)**
- Transactions with expired blockhash are rejected
- **Prevents replay attacks** by default
- **Audit impact:** Durable nonces bypass this — check nonce advancement.

### Durable Nonces
- Allow transactions to be signed offline and submitted later
- Nonce must be advanced (consumed) atomically with the transaction
- **Gotcha:** If nonce is not advanced, the transaction can be replayed
- **Audit impact:** Verify nonce advancement in nonce-based transactions. Check nonce authority.

### Slot Skipping
- Validators may skip slots during outages or high load
- Slot numbers are NOT guaranteed to be continuous
- **Audit impact:** Don't assume `slot + 1` exists. Use slot ranges, not exact slot comparisons.

---

## CPI-Specific Quirks

### Account Reloading After CPI
CPI can modify account data, but Anchor deserialized structs are NOT automatically refreshed.
```rust
// DANGEROUS: State may be stale after CPI
let balance_before = ctx.accounts.vault.balance;
cpi_call()?;  // May modify vault.balance on-chain
let balance_after = ctx.accounts.vault.balance;  // Still shows old value!

// SAFE: Reload after CPI
ctx.accounts.vault.reload()?;
let balance_after = ctx.accounts.vault.balance;  // Now current
```
**Audit impact:** Any account read after a CPI must be reloaded. This is a common source of bugs.

### CPI Signer Privilege Forwarding
- Signers from the outer instruction are automatically forwarded to CPIs
- This means a malicious CPI target can use the forwarded signer
- **Audit impact:** Never forward user signers to untrusted programs. Validate CPI targets.

### CPI Return Data
- CPI return data is stored in a buffer, readable via `get_return_data()`
- Only the LAST CPI's return data is available (previous ones are overwritten)
- Return data is limited to **1024 bytes**
- **Audit impact:** Verify return data comes from the expected program (check program_id in return).

---

## Lamport Transfer Dangers (EP-106)

### Reserved Account List & Write-Demotion
The Solana runtime maintains a **reserved account list** containing built-in programs and sysvars. During message sanitization, accounts on this list are **silently downgraded from writable to read-only**, even if marked `mut` in the transaction.

**Implications:**
- Programs that transfer lamports to arbitrary user-provided accounts may silently fail
- Anchor's `#[account(mut)]` passes at compile time but runtime silently demotes
- No error is raised — the write simply doesn't happen
- Reserved list changes over time as feature flags activate (e.g., `secp256r1_program` became reserved)

### Executable Account Write Restriction
Accounts with the `executable` flag set (program accounts) cannot have their lamport balance modified. Even if passed as `writable`, `set_lamports` will fail.

### Rent-Exemption Trap
Transferring lamports FROM an account can drop its balance below the rent-exempt threshold. The account then becomes eligible for garbage collection, effectively destroying it.

### Safe Lamport Transfer Pattern
```rust
// UNSAFE: transferring to arbitrary account
**arbitrary_account.lamports.borrow_mut() += refund;
**source.lamports.borrow_mut() -= refund;

// SAFE: use PDA vault, let users claim
refund_vault.pending_refund += refund;
refund_vault.recipient = user.key();
// User calls claim() instruction to retrieve from PDA
```

**Audit impact:** Flag any pattern that transfers lamports to user-provided `AccountInfo`. Verify the recipient is validated as (1) not executable, (2) not on the reserved account list, (3) will remain rent-exempt after transfer. Safest approach: use PDA vaults for refunds.

---

## Rust/Solana Library Constraints

### Unavailable Standard Library
On-chain programs cannot use:
- `std::fs`, `std::net`, `std::thread`, `std::sync`, `std::time`
- `std::future`, `std::process`
- `rand` crate
- `println!`, `print!` (use `msg!` instead)
- **Audit impact:** Programs that need randomness must use on-chain sources (Switchboard VRF, etc.). Pseudo-random from hashing is deterministic and predictable.

### Bincode
- "Extremely computationally expensive" — avoid for on-chain use
- Use Borsh serialization instead
- **Audit impact:** Programs using Bincode may hit compute limits.

### String Formatting
- Computationally expensive
- Avoid `format!` in hot paths
- **Audit impact:** Excessive logging/formatting can waste compute budget.

---

## Quick Reference Table

| Quirk | Value | Security Impact |
|-------|-------|----------------|
| Max CU per tx | 1,400,000 | DoS via expensive paths |
| CPI depth | **4 → 8 (Agave 3.0)** | Limits reentrancy; **doubled in Agave 3.0** (EP-124) |
| Call stack depth | 64 | Deep recursion fails |
| Tx size | 1,232 bytes | Limits accounts per tx |
| Max accounts (legacy) | ~35 | Forces tx splitting |
| Max accounts (v0+ALT) | 64 | |
| ALT entries | 256 | |
| Account max size | 10 MiB | |
| Realloc max per ix | 10 KiB | |
| Blockhash expiry | ~150 slots (~60s) | Prevents replay |
| Single-account CU limit | **40% of block CUs (Agave 3.0)** | Larger programs per account |
| Overflow behavior | Silent wrap | CRITICAL — use checked_* |
| Float support | Software emulated | Expensive, imprecise |
| `as uX` cast | Silent truncation | Use try_from |
| CPI return data | 1024 bytes max | Last CPI only |

### Agave 3.0 Changes Affecting Security (Oct 2025)
- **CPI nesting depth: 4 → 8** — Programs hardcoded to assume max depth of 4 may have new attack surface. Nested CPI exploits have twice the depth to work with.
- **Single-account compute limit: 40% of block CUs** — Larger computations possible per account, but also larger attack surface per transaction.
- **Cache overhaul:** 30-40% faster transaction processing — changes timing characteristics.
- **Relax entry constraints:** Simplifies scheduling — may affect transaction ordering assumptions.
- **Multi-client world:** Agave and Firedancer may interpret edge cases differently (EP-125). Differential fuzzing between implementations is the key detection technique.

### Validator-Level Vulnerabilities (EP-124)
- **Agave rBPF (Aug 2024):** Crafted input could crash leaders sequentially, halting network. Patched with 67%+ stake in 3 days.
- **Agave v3.0.14 (Jan 2026):** Validator crash + vote spam. Only 18% upgraded promptly. Solana Foundation linked stake delegation to software compliance.
- **Audit implication:** Protocol liveness assumptions should account for potential multi-hour network halts. Oracle staleness bounds, liquidation windows, and time-dependent logic must be resilient.

---
<!-- Sources: Solana docs (Limitations, Accounts, Compute Budget), Asymmetric Research CPI post, Helius Program Security guide, OtterSec "Hidden Dangers of Lamport Transfers", Helius Agave 3.0 guide, Anza rBPF post-mortem, Agave v3.0.14 patch notes -->
