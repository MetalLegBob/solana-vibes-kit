# Token-2022 Extensions Attack Surface
<!-- Security implications of each Token Extension -->
<!-- Last updated: 2026-02-06 -->
<!-- Sources: Halborn Token-2022 audit, Neodyme blog, Solana docs, Helius -->

## Overview

Token-2022 (Token Extensions) is a superset of SPL Token at address `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`. Extensions add features to mints and token accounts but introduce new attack surface.

**Key principle:** Extensions are set at initialization and (mostly) cannot be changed afterward. Programs integrating Token-2022 tokens MUST check which extensions are enabled and handle them correctly.

---

## Mint Extensions

### Transfer Fee Config
**What:** Mint authority can charge a fee on every transfer. Fee is deducted from the transferred amount.
**Attack surface:**
- **(Neodyme) Fee deduction location:** Fees are deducted from the RECIPIENT's received amount, not the sender's sent amount. If a program sends 100 tokens with 5% fee, the sender loses 100 tokens but the recipient only receives 95. The 5 tokens are held as withheld fees in the recipient's token account.
- Programs that assume `amount_sent == amount_received` will have accounting errors
- Escrow/vault programs may credit users more than actually received
- Fee can be changed by mint authority (check max fee). Fee config updates take effect after 2 epochs.
- Must use `TransferCheckedWithFee` or precalculate with `calculate_inverse_fee` for exact amounts
- `calculate_fee(amount)` gives the fee for sending `amount`. `calculate_inverse_fee(amount)` gives the amount to send so recipient gets exactly `amount`.
**Detection:** Check for `TransferFeeConfig` extension on mints. Verify protocol calculates net amounts after fees. Flag any `transfer` that doesn't use `transfer_checked_with_fee`.
**Mitigation:** Use `transfer_checked_with_fee` and explicitly handle fee calculations. Always calculate net received amount.

### Confidential Transfer
**What:** Encrypts transfer amounts using homomorphic encryption and ZK proofs.
**Known vulnerabilities:**
1. **(Halborn audit, fixed)** **Transfer fee bypass:** Deposit/withdraw instructions didn't validate source/destination were the same account. Users could deposit to confidential balance from one account and withdraw to another, bypassing transfer fees.
2. **(Halborn audit, fixed)** **Non-transferable bypass:** Confidential transfer didn't check `NonTransferable` extension. Users could deposit non-transferable tokens into confidential balance and transfer them.
3. **(Apr 2025, CRITICAL, patched)** **ZK ElGamal Proof Forgery #1 (EP-100):** Vulnerability in the ZK ElGamal Proof program — unhashed algebraic components in Fiat-Shamir Transformation. Could forge proofs for unlimited minting. Reported by LonelySloth. Patched in 2 days by validators.
4. **(Jun 2025, CRITICAL, patched)** **ZK ElGamal Proof Forgery #2 (EP-100):** A SECOND, separate Fiat-Shamir Transformation bug in the same program. Reported by zksecurityXYZ. Confidential transfers disabled Jun 11, ZK ElGamal program disabled via feature activation epoch 805 (Jun 19). **Same vulnerability class found TWICE in 2 months — ZK proof systems are extremely fragile.**
**Attack surface:**
- Programs cannot read confidential balances — impacts collateral/lending protocols
- Auditor key may not be set, making compliance monitoring impossible
- **ZK proof verification has had critical bugs — even core Solana programs are not immune**
- ZK ElGamal Proof program may be disabled — check status before relying on confidential features
- **(Aug-Sep 2025) Code4rena Solana Foundation competitive audit:** $203.5K audit of fixed Token-2022/ZK ElGamal code found **NO High or Medium severity issues** — 7 Low only. Suggests post-fix code is solid, but original bugs were found by solo researchers, not auditors.
**Detection:** Check if program handles `ConfidentialTransferMint` extension. Verify protocol doesn't rely on reading token amounts for confidential tokens. **Verify ZK ElGamal Proof program is enabled and at latest version.** Check for any custom ZK proof verification logic (extremely high risk).

### Non-Transferable
**What:** Tokens cannot be transferred between accounts. Intended for soulbound tokens.
**Attack surface:**
- Can be bypassed via confidential transfers (fixed in newer versions)
- Programs that mint non-transferable tokens should verify the extension is still enforced
**Detection:** Verify `NonTransferable` extension is checked in all transfer paths.

### Permanent Delegate
**What:** A delegate with unlimited authority to transfer or burn tokens from ANY account holding that mint.
**Attack surface:**
- **Fund drain:** Permanent delegate can transfer all tokens from any holder at any time
- Swap pools, lending protocols, and escrows holding tokens with permanent delegate are at risk
- Users may not realize their deposited tokens can be seized
**Detection:** Check for `PermanentDelegate` extension on ALL mints a protocol accepts. Flag as HIGH risk if present on tokens held in protocol vaults.
**Mitigation:** Protocols should whitelist accepted mints and reject those with `PermanentDelegate` unless explicitly intended.

### Mint Close Authority
**What:** Allows closing mint accounts (reclaiming rent). Standard mints cannot be closed.
**Attack surface:**
- **Reinitialization attack (Neodyme):** Mint can be closed (when supply=0) and reinitialized at same address with DIFFERENT extensions. Orphan token accounts from the old mint may become incompatible:
  - Old mint had KYC transfer hook → new mint doesn't → orphan accounts bypass KYC
  - Old mint had transfer fees → new mint doesn't → orphan accounts have fee-exempt tokens
  - Old mint was non-transferable → new mint is transferable → soulbound tokens become tradeable
- Protocol that validated mint at time T may face a completely different mint at time T+1
- Any protocol caching mint properties at account creation time is vulnerable
**Detection:** Check for `MintCloseAuthority`. Verify protocol validates mint state at time of use, not just at initialization. Check if protocol stores mint extension data in its own accounts (stale after reinitialization).
**Mitigation:** Validate mint properties in EVERY transaction, not just once. Consider rejecting mints with `MintCloseAuthority` for high-security protocols.

### Transfer Hook
**What:** Every transfer invokes a CPI to a program specified by the mint authority.
**Attack surface:**
- **Malicious hook programs** can:
  - Revert transfers (DoS)
  - Read all transfer data (privacy leak)
  - Execute arbitrary logic on every transfer
- **Missing verification in hook programs:**
  - Hook must verify the calling mint matches expected mint
  - Hook must verify caller is Token-2022 program
  - Hook must verify token account mints match the hook's mint
- **Reentrancy via hook:** Transfer hook is a CPI from Token-2022, adding CPI depth
**Detection:** Check for `TransferHook` extension. If present, audit the hook program. Verify hook program validates mint, caller, and token accounts.
**Mitigation in hook programs:**
```rust
fn assert_is_transferring(ctx: &Context<TransferHook>) -> Result<()> {
    // Verify caller is Token-2022
    let caller = ctx.accounts.caller_program.key();
    require!(caller == spl_token_2022::ID, ErrorCode::UnauthorizedCaller);
    Ok(())
}
```

### Interest-Bearing
**What:** Tokens accrue interest over time (display-level only, not actual minting).
**Attack surface:**
- Interest is cosmetic (UI amount) — actual balance doesn't change
- Programs using UI amount instead of raw amount will miscalculate
**Detection:** Check for `InterestBearingConfig`. Verify protocol uses raw amounts, not UI amounts.

### Default Account State
**What:** New token accounts are created in a specified state (e.g., frozen by default).
**Attack surface:**
- **(Neodyme) Frozen vault DoS:** If mint has `DefaultAccountState::Frozen`, all new token accounts start frozen — including program vault/escrow accounts. Programs that create vault accounts for user deposits will malfunction because the vault is immediately frozen and cannot receive transfers until thawed by the freeze authority.
- Programs must explicitly thaw accounts after creation, which requires cooperation with the freeze authority
- If the freeze authority is external (mint owner), the program has no way to thaw its own vaults
**Detection:** Check for `DefaultAccountState` on mints. Verify protocol handles frozen accounts by checking `FrozenAccount` state and thawing if needed. Flag protocols that create vault accounts for mints with `DefaultAccountState::Frozen` without a thaw step.

### Scaled UI Amount (0.32+)
**What:** Applies a multiplier to display amounts without changing on-chain balances.
**Attack surface:** Similar to interest-bearing — UI vs raw amount confusion.

### Pausable (0.32+)
**What:** Mint authority can pause all transfers.
**Attack surface:** Protocol funds can be frozen by mint authority at any time.

---

## Account Extensions

### CPI Guard
**What:** Prevents token account from being used within CPIs. Delegates CAN still act.
**Attack surface:**
- CPI Guard can be enabled/disabled by the account owner at will
- Delegates are NOT restricted — they can still act in CPI context
- Programs relying on CPI Guard for security should not assume it's always enabled
**Detection:** Check if protocol relies on CPI Guard. Verify delegate handling.

### Immutable Owner
**What:** Token account owner cannot be changed.
**Attack surface:** None directly — this is a security feature. Prevents account owner reassignment attacks.
**Note:** All ATAs created by Token-2022 have Immutable Owner by default.

### Memo Transfer
**What:** Requires a memo on incoming transfers.
**Attack surface:**
- Programs that don't include memo instructions will fail when transferring to these accounts
- Can be used for compliance but may break composability
**Detection:** Check for `MemoTransfer` on recipient accounts. Ensure protocol includes memo CPI.

---

## Extension Incompatibilities

Some extensions cannot be combined:
| Extension A | Extension B | Why Incompatible |
|-------------|-------------|-----------------|
| NonTransferable | TransferHook | Can't transfer, so hook is meaningless |
| ConfidentialTransfer | TransferHook | Encrypted amounts not readable by hooks |
| ConfidentialTransfer | TransferFeeConfig | Fee calculation needs visible amounts |
| ConfidentialTransfer | PermanentDelegate | Conflicting access models |

---

## Audit Checklist for Token-2022 Integration

### Protocol-Level Checks
- [ ] Does the protocol accept Token-2022 tokens? If so, which extensions?
- [ ] Is there a mint whitelist? (If not, any extension could be active)
- [ ] Does the protocol use `InterfaceAccount`/`Interface` types? (Required for Token-2022)
- [ ] Are transfer fees accounted for in all amount calculations?
- [ ] Is `transfer_checked` used instead of `transfer`?

### Per-Mint Checks
- [ ] Check for `PermanentDelegate` — can mint authority drain protocol vaults?
- [ ] Check for `MintCloseAuthority` — can mint be reinitialized?
- [ ] Check for `TransferHook` — is the hook program trusted?
- [ ] Check for `TransferFeeConfig` — are fees deducted from protocol calculations?
- [ ] Check for `DefaultAccountState` — will new accounts be frozen?
- [ ] Check for `NonTransferable` — can tokens be moved as expected?

### Code-Level Checks
- [ ] `Program<'info, Token>` only accepts SPL Token, not Token-2022. Use `Interface<'info, TokenInterface>` for both.
- [ ] `Account<'info, TokenAccount>` vs `InterfaceAccount<'info, TokenAccount>` — latter supports both programs
- [ ] Verify `token::token_program` constraint is set in Anchor 0.30+
- [ ] Check that close account handles Token-2022 extensions correctly

---
<!-- Sources: Halborn Token-2022 audit, Neodyme "Token-2022: Don't shoot yourself in the foot", Offside Labs Token-2022 Part 2, Solana Token Extensions docs, Helius "Confidential Balances", Solana Foundation post-mortems (Apr+Jun 2025) -->
