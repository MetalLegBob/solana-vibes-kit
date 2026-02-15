# EP-121: Legacy Keyset / Guardian Set Expiration Bypass
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Wormhole Wormchain ($50K bounty, Jan 2024 — guardian sets with ExpirationTime=0 never expired, bypassing 13/19 quorum with single genesis key)

**Description:** Multi-signature or guardian systems that rotate keysets may leave legacy sets unexpired. If the verification logic only checks expiration when `expiration_time > 0`, sets with `expiration_time == 0` (default/genesis) are treated as valid forever, even after rotation.

**Vulnerable Pattern:**
```rust
pub fn verify_signatures(
    guardian_set: &GuardianSet,
    signatures: &[Signature],
) -> Result<()> {
    // Only check expiration if set has one
    if guardian_set.expiration_time > 0 {
        require!(
            Clock::get()?.unix_timestamp < guardian_set.expiration_time,
            ErrorCode::ExpiredGuardianSet
        );
    }
    // BUG: Genesis set (expiration_time = 0) NEVER expires
    // Genesis set may have weaker keys or single key
    verify_quorum(guardian_set, signatures)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn verify_signatures(
    guardian_set: &GuardianSet,
    current_set_index: u32,
    signatures: &[Signature],
) -> Result<()> {
    // SECURE: Only accept latest set, or recently-rotated sets within grace period
    if guardian_set.index < current_set_index {
        // Old set — must have valid expiration and not be expired
        require!(guardian_set.expiration_time > 0, ErrorCode::LegacySetNotAllowed);
        require!(
            Clock::get()?.unix_timestamp < guardian_set.expiration_time,
            ErrorCode::ExpiredGuardianSet
        );
    }
    verify_quorum(guardian_set, signatures)?;
    Ok(())
}
```
**Detection:** For multi-sig/guardian systems: check if legacy/genesis keysets can still be used. Verify expiration logic handles `expiration_time == 0` correctly (does it mean "never expires" or "no expiration set"?). Check that rotated-out sets are explicitly invalidated. Look for `if expiration > 0` conditional guards.
