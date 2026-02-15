# EP-107: AccountInfo::realloc Out-of-Bounds Memory Corruption
**Category:** Account Validation / Memory Safety  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** OtterSec disclosure (Dec 2022 — SDK bug in AccountInfo::realloc)

**Description:** `AccountInfo::realloc()` uses `unsafe` code to write the new length to the serialized buffer (8 bytes before the data pointer) and update the local slice reference. There are NO bounds checks during execution — BPF loader only validates AFTER contract finishes. An attacker can call `realloc` with an excessively large size, writing past the allocated buffer into adjacent accounts' data and lamports in the serialized buffer. If the size is reverted to valid before program exit, the corruption persists while passing post-execution validation.

This is distinct from EP-012 (which covers not zeroing new space). EP-107 is about exploiting realloc as a memory corruption primitive.

**Vulnerable Pattern:**
```rust
// Program allows user-controlled realloc size
pub fn resize(ctx: Context<Resize>, new_size: u64) -> Result<()> {
    let account = &ctx.accounts.data_account;
    // BUG: No bounds check — can write past buffer into adjacent accounts
    account.realloc(new_size as usize, false)?;

    // Attacker writes to out-of-bounds area (adjacent account's lamports/data)
    // Then reverts size to pass BPF loader post-execution check
    account.realloc(original_size as usize, false)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn resize(ctx: Context<Resize>, new_size: u64) -> Result<()> {
    let account = &ctx.accounts.data_account;
    let original_len = account.data_len(); // Or use original_data_len()

    // Bound check: max 10KB growth per instruction (runtime limit)
    require!(new_size as usize <= original_len + 10240, ErrorCode::SizeTooLarge);
    // Additional bound: don't exceed max account size
    require!(new_size <= 10_000_000, ErrorCode::SizeTooLarge);

    account.realloc(new_size as usize, true)?; // zero_init = true
    Ok(())
}
```
**Detection:** Find `realloc()` calls. Check if new size is user-controlled or unbounded. Verify bounds checking against `original_data_len()`. Flag any realloc where size comes from instruction data without validation. Also flag realloc followed by a second realloc (potential corrupt-then-revert pattern).
