# Wave 4 Compiled Analysis: Audit Firm Mining
<!-- Compiled: 2026-02-06 -->
<!-- Source: w4-audit-firm-exa-results.md (6 firms) -->
<!-- Purpose: Extract actionable findings not already in KB (101 EPs, 58 SPs, 17 KB files) -->

---

## 1. Unique Vulnerability Patterns Not in Current KB

After cross-referencing the Wave 4 audit findings against all 101 existing exploit patterns (EP-001 through EP-101), the following are NEW patterns or significant refinements worth adding.

### EP-CANDIDATE-1: Collateral Registry Block Omission/Duplication
**Source:** OtterSec / Hylo (OS-HYL-ADV-00, Critical, May 2025)
**What:** `LstRegistry::load` allowed callers to omit or duplicate LST (Liquid Staking Token) blocks when constructing the registry, artificially altering the collateral ratio. The registry did not enforce a canonical set of entries.
**Why it's new:** Our KB covers oracle manipulation (EP-021-025, EP-096) and missing account validation (EP-001-014), but this is a distinct pattern: a **data structure integrity** vulnerability where the composition of a registry/list is attacker-controlled. The oracle price may be correct, but the set of collateral items being priced is wrong.
**Solana pattern:**
```rust
// VULNERABLE: Registry loaded from variable-length input without canonical validation
pub fn load_registry(accounts: &[AccountInfo]) -> Result<LstRegistry> {
    let mut registry = LstRegistry::new();
    for acc in accounts {
        let lst_block = LstBlock::deserialize(&acc.data.borrow())?;
        registry.add(lst_block); // No check for duplicates or missing required entries!
    }
    Ok(registry)
}
```
```rust
// SECURE: Validate canonical set
pub fn load_registry(accounts: &[AccountInfo], expected_mints: &[Pubkey]) -> Result<LstRegistry> {
    let mut seen = HashSet::new();
    let mut registry = LstRegistry::new();
    for acc in accounts {
        let lst_block = LstBlock::deserialize(&acc.data.borrow())?;
        require!(!seen.contains(&lst_block.mint), ErrorCode::DuplicateEntry);
        seen.insert(lst_block.mint);
        registry.add(lst_block);
    }
    require!(seen.len() == expected_mints.len(), ErrorCode::IncompleteRegistry);
    for mint in expected_mints {
        require!(seen.contains(mint), ErrorCode::MissingRequiredEntry);
    }
    Ok(registry)
}
```
**Detection:** Look for functions that load variable-length registries, lists, or account sets from `remaining_accounts` or instruction data. Verify: (a) no duplicates allowed, (b) canonical/required entries enforced, (c) omission of entries cannot skew ratios or calculations.
**Maps to:** Lending protocols, multi-collateral systems, index/basket products.
**Existing EP overlap:** Partial overlap with EP-014 (remaining_accounts abuse) but distinct mechanism -- this is about data composition integrity, not just account injection.

---

### EP-CANDIDATE-2: Non-ATA Deposit Breaking Migration/Claim Functions
**Source:** Zellic / Cytonic Network (Medium, Jul 2024)
**What:** Protocol assumed users would deposit to Associated Token Accounts (ATAs). When users deposited to non-ATA token accounts, the `migrate` function broke because it could not derive the correct token account address.
**Why it's new:** Our KB covers ATA-related patterns tangentially (token-extensions.md mentions `Interface<TokenInterface>`) but does not have a specific pattern for **ATA assumption failures**. This is a common Solana-specific gotcha: many programs derive ATAs for users but don't handle the case where tokens arrive from non-ATA accounts.
**Solana pattern:**
```rust
// VULNERABLE: Assumes user's tokens are always in their ATA
pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
    let user_ata = get_associated_token_address(&ctx.accounts.user.key(), &old_mint);
    let balance = get_token_balance(&user_ata)?; // Returns 0 if user used a non-ATA!
    // User's actual tokens are in a different account -- migration skips them
    transfer_to_new_mint(user_ata, balance)?;
    Ok(())
}
```
```rust
// SECURE: Accept explicit source account, validate ownership
pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
    // User provides their actual token account (ATA or otherwise)
    let source = &ctx.accounts.user_token_account;
    require!(source.owner == ctx.accounts.user.key(), ErrorCode::InvalidOwner);
    require!(source.mint == old_mint, ErrorCode::InvalidMint);
    transfer_to_new_mint(source, source.amount)?;
    Ok(())
}
```
**Detection:** Search for `get_associated_token_address` used to derive source accounts for migration, claim, or refund operations. Verify that the protocol either (a) enforces ATA-only deposits or (b) accepts user-specified source accounts with proper validation.

---

### EP-CANDIDATE-3: Cross-Chain Failed Message Replay Lock
**Source:** OtterSec / Olympus DAO OFT (High, Mar 2023)
**What:** Failed cross-chain messages (LayerZero OFT) could not be replayed. Tokens were locked on the source chain with no recovery path.
**Why it's new:** Our bridge-attacks.md covers guardian compromise, VAA replay, and finality issues, but does not address **failed message non-recoverability** as a distinct pattern. This is a liveness/fund-safety issue rather than a theft issue.
**Pattern:**
```rust
// VULNERABLE: No retry mechanism for failed cross-chain messages
pub fn send_cross_chain(ctx: Context<Send>, amount: u64, dst_chain: u16) -> Result<()> {
    burn_tokens(ctx.accounts.source, amount)?; // Tokens burned immediately
    send_lz_message(dst_chain, payload)?; // If this fails on destination...
    // Tokens are gone. No stored state to enable retry.
    Ok(())
}
```
```rust
// SECURE: Store pending transfer, allow retry or refund
pub fn send_cross_chain(ctx: Context<Send>, amount: u64, dst_chain: u16) -> Result<()> {
    let transfer = &mut ctx.accounts.pending_transfer;
    transfer.amount = amount;
    transfer.dst_chain = dst_chain;
    transfer.status = TransferStatus::Pending;
    transfer.created_at = Clock::get()?.unix_timestamp;

    escrow_tokens(ctx.accounts.source, ctx.accounts.escrow, amount)?;
    send_lz_message(dst_chain, payload)?;
    // On destination confirmation: mark complete, burn escrowed tokens
    // On failure/timeout: allow user to reclaim escrowed tokens
    Ok(())
}
```
**Detection:** In bridge/cross-chain programs, verify: (a) tokens are escrowed, not burned, until destination confirmation, (b) failed messages can be retried, (c) timeout/refund mechanism exists for permanently failed messages.

---

### EP-CANDIDATE-4: Fee Routing Inversion
**Source:** Halborn / Vaultka (Critical, Jul-Aug 2024)
**What:** Withdraw fee was transferred to the user instead of the fee vault. A simple destination account mix-up in the fee transfer CPI.
**Why it's new:** While EP-098 covers CPI destination injection (attacker-controlled), this is subtler: a **developer error** where the fee destination is wrong in the code itself, not injected by an attacker. The protocol functions "normally" but fees accumulate in the wrong place (users get rebated instead of protocol collecting).
**Detection:** For every fee transfer instruction, verify: (a) fee destination matches the protocol's fee vault/treasury, not the user, (b) fee amount is deducted from user proceeds, not added to them. Trace the actual token flow in fee-related CPIs.
**Note:** This is arguably a sub-pattern of EP-099 (business logic inversion) but specific to fee routing. Consider adding as a detection checklist item under EP-099 rather than a standalone EP.

---

### EP-CANDIDATE-5: Pool Accounting Excluding Platform Fees
**Source:** Halborn / Blockstreet (Critical, Aug-Sep 2025)
**What:** Platform fees were excluded from pool accounting calculations. The pool's internal bookkeeping did not track fees, leading to accounting drift between actual token balances and recorded state.
**Why it's new:** EP-058-067 cover economic/DeFi exploits, and EP-020 covers precision loss, but none specifically address **fee exclusion from accounting invariants**. This is a protocol-level bookkeeping error where the pool's `total_deposits - total_withdrawals` invariant breaks because fees are a "leak" not tracked in the equation.
**Detection:**
```
# Check for accounting invariants
Verify: total_deposited == total_withdrawn + total_fees + current_balance
Look for fee collection that doesn't update pool state tracking variables
Check if pool.total_value_locked accounts for accumulated fees
```

---

### EP-CANDIDATE-6: Validator Client Behavioral Mismatch (DoS)
**Source:** Neodyme / Firedancer v0.1 (2 High, Jul 2024)
**What:** Firedancer (Jump's C validator) had behavioral mismatches with Agave (Rust validator) that could be exploited for remote crash or denial of service. Different validators interpreting the same transactions differently creates consensus-level risks.
**Why it's new:** This is an infrastructure-level vulnerability class not covered by any current EP. Our KB focuses on smart contract/program-level patterns. Validator-level divergence is relevant for Stronghold of Security only when auditing infrastructure-adjacent code (validator plugins, custom RPC handlers, consensus-sensitive operations).
**Relevance to SOS:** Low priority for standard program audits, but worth noting. If a program relies on specific validator behavior that differs between Agave and Firedancer, it could have inconsistent results across the network.
**Detection:** Flag any program logic that depends on: validator-specific compute metering, transaction ordering assumptions, or edge-case runtime behavior that might differ between implementations.

---

## 2. Blog Post Insights

### OtterSec: "The Hidden Dangers of Lamport Transfers" (May 2025)
**Topic:** Edge cases when transferring SOL via direct lamport manipulation vs. system program transfer.
**Likely content (based on title + OtterSec's style):**
- Direct lamport manipulation (`**account.lamports.borrow_mut() -= amount`) bypasses system program checks
- Can drain accounts below rent-exempt minimum (EP-011 covers this)
- Can interact unexpectedly with accounts being closed in the same transaction
- May not trigger expected CPI events that downstream programs depend on
**KB gap:** Our EP-011 covers rent-exemption violations from lamport withdrawal, and our runtime-quirks.md mentions realloc/rent issues, but we lack a comprehensive treatment of **direct lamport manipulation vs. system_program::transfer** safety differences.
**Action:** Deep-dive this blog post in Wave 5. Potential new EP or enhancement to EP-011.

### Neodyme: "SPL Token-2022: Don't Shoot Yourself in the Foot with Extensions" (Sep 2024)
**Topic:** Extension security footguns for integrating protocols.
**Likely coverage:**
- Transfer fee miscalculation (already in our token-extensions.md)
- Permanent delegate risks (already covered)
- Close authority / MintCloseAuthority risks (already covered)
- Interest-bearing token accounting issues (partially covered)
- Default account state interactions (partially covered)
**KB gap:** Our token-extensions.md is fairly comprehensive (8.7KB). The blog likely has concrete code examples and edge cases we could add. Priority: medium -- mostly validation of existing coverage.
**Action:** Deep-dive in Wave 5 for any uncovered extension interactions.

### Neodyme: "Why Auditing the Code is Not Enough: Solana Upgrade Authorities" (Jun 2022)
**Topic:** The upgrade authority is as critical as the code itself. Three models:
1. **Hot wallet** -- fast upgrades but single point of failure
2. **Multisig** (e.g., Squads) -- slower but more secure
3. **DAO governance** -- most decentralized but slowest
**KB gap:** Our EP-079 covers upgrade authority risks and our secure-patterns.md mentions timelocks, but we don't have a structured decision framework for evaluating upgrade authority configurations. This is especially relevant because a perfectly audited program can be replaced by a malicious one if the upgrade authority is compromised.
**Action:** Enhance the "Upgrade / Governance" section (EP-079 to EP-083) with an upgrade authority evaluation checklist:
- [ ] Is upgrade authority a multisig? (what threshold?)
- [ ] Is there a timelock on upgrades?
- [ ] Can the authority be transferred to a DAO?
- [ ] Is the program marked immutable (authority revoked)?
- [ ] If mutable, what's the notification process before upgrades?

### OtterSec: "Rust, Realloc, and References" (Dec 2022)
**Topic:** Subtle Solana SDK bug involving `realloc` and Rust borrow semantics.
**KB gap:** EP-012 covers realloc basics (zero flag, rent). This blog likely covers a deeper issue where Rust references to account data become invalid after realloc due to the underlying buffer being moved. This is a memory safety issue specific to Solana's AccountInfo model.
**Action:** Deep-dive in Wave 5. Could enhance EP-012 with Rust reference invalidation details.

### OtterSec: "The Story of the Curious Rent Thief" (Aug 2022)
**Topic:** Rent exploitation on Solana.
**KB gap:** EP-011 covers rent-exemption violations. This blog likely describes a specific exploit pattern where an attacker strategically drains lamports to just below rent-exempt threshold to trigger garbage collection of victim accounts.
**Action:** Validate against EP-011 in Wave 5.

### OtterSec: "Jumping Around in the VM" (Dec 2023)
**Topic:** VM-level security -- exploitation at the BPF/SBF level.
**KB gap:** Our entire KB is at the Rust/Anchor abstraction layer. We have zero coverage of VM-level exploitation (jump target manipulation, BPF verifier bypasses, etc.). This is a niche but critical area for infrastructure-level audits.
**Action:** Low priority for standard program audits. Consider adding a "VM/Runtime Level" category if SOS expands scope.

---

## 3. Tool Landscape

### Sec3 X-ray
- **50+ vulnerability types** via SVE (Solana Vulnerabilities and Exposures) classification
- GitHub CI integration with SARIF output
- Free plan for Solana ecosystem
- Works for both Anchor and non-Anchor programs
- **SOS integration:** Reference SVE IDs in our exploit patterns where they overlap. When SOS finds an issue, cross-reference with X-ray's classification. Example mapping:
  - SVE-MissingSignerCheck -> EP-001
  - SVE-MissingOwnerCheck -> EP-002
  - SVE-IntegerOverflow -> EP-015/016
  - SVE-ArbitraryCPI -> EP-042
  - SVE-AccountConfusion -> EP-006
- **Gap indicator:** If X-ray detects 50+ vuln types and our KB has 101 EPs, there's likely significant overlap but also categories we may be defining differently. Worth obtaining the full SVE list for mapping.

### Neodyme Riverguard
- **Free automated vulnerability scanner** for deployed Solana programs
- Supported by Solana Foundation
- Uses **mutation-based testing**: simulates mutated (malicious) transactions against deployed programs
- Does NOT execute attacks; reports findings to developers
- **SOS integration:** Complementary approach. SOS does static code analysis; Riverguard does dynamic mutation testing. Recommendation in audit reports: "Run Riverguard against deployed program to validate findings."
- **Novel approach:** Mutation rules (May 2025 blog) describe specific transaction mutations that expose vulnerabilities. This is the inverse of our EP patterns -- instead of "what does the code look like," it's "what transactions break it."

### OtterSec Verify (otter-verify)
- On-chain program verification service
- Verifies that deployed bytecode matches published source code
- **SOS integration:** Before auditing, verify the program's source matches what's deployed. If verification fails, flag as critical risk -- the code being audited may not be what's running.
- **Detection step to add:** "Step 0: Verify program source matches deployed bytecode via OtterSec Verify or Solana Verified Programs API."

### Sec3 IDL Guesser (Apr 2025)
- Recovers instruction definitions from closed-source Solana program binaries
- Useful for auditing programs without source code
- **SOS integration:** When auditing protocols that CPI into closed-source programs, use IDL Guesser to understand the target program's interface. Important for validating CPI safety (EP-042 to EP-050).

### Neodyme solana-poc-framework
- Framework for creating Proofs of Concept for Solana exploits
- **SOS integration:** Recommend in audit reports for PoC creation. When SOS identifies a vulnerability, the auditor can use this framework to build a concrete exploit demonstration.

### Other Notable Tools
- **Neodyme solana-ctf** -- CTF challenges for training
- **Neodyme solana-security-txt** -- Standard for embedding security contact info in on-chain programs. SOS could check for its presence as a best-practice item.

---

## 4. Gap Assessment

### Gaps in Our KB Based on Audit Firm Activity

**HIGH PRIORITY GAPS:**

1. **Data Structure Integrity / Registry Composition Attacks**
   - The Hylo finding (EP-CANDIDATE-1) reveals a pattern class we don't cover: attacks on the composition of dynamic data sets (registries, lists, indexes) where omission or duplication of entries skews calculations.
   - Relevant to: multi-collateral lending, index products, basket tokens, any protocol with configurable asset lists.

2. **Lamport Transfer Edge Cases**
   - OtterSec's dedicated blog post suggests this is a richer attack surface than our EP-011 covers.
   - Need: comprehensive comparison of direct lamport manipulation vs. system_program::transfer, including interaction with rent, account closure, and CPI event expectations.

3. **ATA Assumption Failures**
   - The Cytonic finding shows protocols breaking when users don't use ATAs. This is common in migration/claim scenarios.
   - Need: EP covering ATA-assumption vulnerabilities in migration, airdrop, and claim functions.

4. **Cross-Chain Message Failure Recovery**
   - The Olympus finding reveals fund-locking risk when cross-chain messages fail without retry/refund mechanisms.
   - Need: Enhancement to bridge-attacks.md with message failure recovery patterns.

5. **Full SVE Mapping**
   - Sec3's 50+ vulnerability types likely include categories we haven't explicitly named. Obtaining and mapping the full SVE list would reveal blind spots.

**MEDIUM PRIORITY GAPS:**

6. **Upgrade Authority Evaluation Framework**
   - We mention upgrade authority risks but lack a structured checklist for evaluating upgrade authority configurations across different security models.

7. **Fee Accounting Integrity**
   - Multiple audit findings (Vaultka fee routing, Blockstreet fee exclusion) point to fee-related accounting as a distinct vulnerability class beyond simple arithmetic errors.

8. **Validator Behavioral Divergence**
   - With Firedancer entering production, programs may behave differently across validator implementations. Edge case for now, but growing relevance.

**LOW PRIORITY GAPS:**

9. **VM-Level Exploitation**
   - BPF/SBF-level attacks are niche and mostly relevant for validator/runtime audits, not application-level program audits.

10. **Formal Verification Integration**
    - OtterSec's "Formal Verification Case Study" and Trail of Bits' verification capabilities suggest an emerging audit methodology we could reference but not replicate.

---

## 5. Recommended Actions

### For Immediate KB Updates (Can do now)
- [ ] Add EP-CANDIDATE-1 (Registry composition attack) as EP-102
- [ ] Add EP-CANDIDATE-2 (ATA assumption failure) as EP-103
- [ ] Add EP-CANDIDATE-3 (Cross-chain message non-recoverability) as EP-104
- [ ] Merge EP-CANDIDATE-4 (Fee routing inversion) into EP-099 as a sub-pattern
- [ ] Add EP-CANDIDATE-5 (Fee exclusion from pool accounting) as EP-105 or sub-pattern of economic category
- [ ] Add upgrade authority evaluation checklist to secure-patterns.md
- [ ] Add "Step 0: Source verification" to the SOS audit workflow
- [ ] Update audit-firm-findings.md with new findings from this wave

### For Wave 5 Deep-Dives (Need Exa fetches)
- [ ] OtterSec "Hidden Dangers of Lamport Transfers" -- full blog content
- [ ] OtterSec "Rust, Realloc, and References" -- full blog content
- [ ] Neodyme "Token-2022 Footguns" -- full blog content (validate our coverage)
- [ ] Neodyme "Riverguard Mutation Rules" -- extract mutation rule patterns
- [ ] Sec3 full SVE category list -- map to our EPs
- [ ] OtterSec "Jumping Around in the VM" -- assess relevance

### For Architecture Improvements
- [ ] Add SVE cross-reference field to EP format
- [ ] Add "Complementary Tools" section to SOS output (reference X-ray, Riverguard, Verify)
- [ ] Consider adding `security.txt` presence check as informational finding

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| New EP candidates identified | 6 |
| Blog posts flagged for deep-dive | 6 |
| Tools catalogued | 6 |
| High-priority KB gaps identified | 5 |
| Medium-priority KB gaps identified | 3 |
| Existing EPs validated/reinforced | EP-011, EP-012, EP-014, EP-042, EP-079, EP-096, EP-098, EP-099 |
| Audit firms with Solana-specific blog content worth mining | 3 (OtterSec, Neodyme, Sec3) |
