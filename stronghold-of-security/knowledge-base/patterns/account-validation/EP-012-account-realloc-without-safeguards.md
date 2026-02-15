# EP-012: Account Realloc Without Safeguards
**Category:** Account Validation  **Severity:** MEDIUM-HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Token program exposing private keys in extended data; OtterSec SDK disclosure (Dec 2022 — OOB write via realloc)

**Description:** Reallocation without zeroing new space (data leak) or checking rent sufficiency. In the worst case, `realloc()` with an excessively large size can write out-of-bounds past the account's allocated buffer into adjacent accounts' data/lamports in the serialized buffer (see EP-107 for the full memory corruption variant).

**Sub-patterns:**
1. **Data leak:** `zero_init=false` leaks previous data in expanded space
2. **Rent shortfall:** Realloc increases size but no lamport top-up for rent-exemption
3. **OOB write (EP-107):** Unbounded size allows writing past buffer boundary into adjacent accounts

**Vulnerable Pattern:**
```rust
vault.to_account_info().realloc(new_size, false)?; // zero=false, no bounds!
```
**Secure Pattern:**
```rust
require!(new_size <= MAX_SIZE);
require!(new_size <= original_data_len + 10_240); // Max 10KB per ix
vault.to_account_info().realloc(new_size, true)?; // zero=true
// Top up rent after realloc
let rent = Rent::get()?;
let min_balance = rent.minimum_balance(new_size);
// ... transfer additional lamports if needed
```
**Detection:** Find `realloc()`. Verify zero flag true, size bounded, rent sufficient. Check if new size is user-controlled. See EP-107 for the memory corruption variant.
