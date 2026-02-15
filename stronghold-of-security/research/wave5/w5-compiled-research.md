# Wave 5: Bug Bounty & Disclosure Mining + Blog Deep-Dives

**Date:** 2026-02-06
**Sources:** Immunefi, GitHub Security Advisories, Solana Foundation, OtterSec Blog, Neodyme Blog, Anatomist Security
**Searches:** 20+ Exa deep searches across all source types

---

## Section 1: Immunefi Bug Bounty Disclosures (Solana)

### 1.1 Raydium Liquidity Drain — cp-swap Deposit Rounding ($505K)

**Source:** https://immunefi.com/blog/all/raydium-liquidity-drain-bug-fix-review/
**Reported:** March 10, 2025 | **Bounty:** $505,000 USDC | **Reporter:** @Lastc0de

**Vulnerability:** Critical flaw in `cp-swap` program's `fn deposit()` function. The `fn lp_tokens_to_trading_tokens()` calculation using `RoundDirection::Ceiling` allowed an attacker to deposit a tiny amount of one token (e.g., 2 Token0) while the ceiling rounding produced `token_1_amount = 0`. This minted LP tokens without requiring both token types, enabling a drain loop:

1. Deposit tiny Token0 amount → receive LP tokens (Token1 contribution rounds to 0)
2. Withdraw LP tokens → receive proportional share of BOTH tokens
3. Repeat → drain pool

**Fix:** Added `require!()` checks ensuring `amount_out_less_fee != 0`, `token_0_amount != 0`, `token_1_amount != 0`, and `lp_token_amount != 0`.

**EP Candidate:** EP-109 (LP Deposit Rounding Drain) — generalizable to any AMM with ceiling/floor rounding in deposit calculations.

---

### 1.2 Raydium Tick Manipulation — CLMM TickArrayBitmapExtension Spoofing ($505K)

**Source:** https://immunefi.com/blog/bug-fix-reviews/raydium-tick-manipulation-bugfix-review/
**Reported:** January 10, 2024 | **Bounty:** $505,000 RAY | **Reporter:** @riproprip

**Vulnerability:** In `increase_liquidity.rs`, the function failed to verify that `remaining_accounts[0]` was the correct `TickArrayBitmapExtension` account for the pool. Attacker could supply an arbitrary account, manipulating tick status in the bitmap (flipping ticks between initialized/uninitialized). This allowed erroneous liquidity additions at extreme price boundaries, leading to fund drainage.

**Fix:** Added validation: `remaining_accounts[0]` must match `TickArrayBitmapExtension::key(pool_state_loader.key())`.

**EP Candidate:** EP-108 (Remaining Account Spoofing in Extension Patterns) — generalizable to any program using `remaining_accounts` for auxiliary/extension accounts without validation.

---

### 1.3 Wormhole Single-Key VAA Bypass ($50K)

**Source:** https://marcohextor.com/wormhole-one-key-vulnerability/
**Reported:** January 15, 2024 | **Bounty:** $50,000 USDC | **Published:** February 12, 2025

**Vulnerability:** Wormchain (Cosmos SDK) VAA verification allowed a single, never-expired genesis Guardian set key to validate any VAA, bypassing the required 13-of-19 Guardian quorum. The genesis Guardian set had no expiration, so it could still authorize actions.

**Fix:** Ensured only the latest Guardian set can validate VAAs unless its expiration time has passed. Fixed within 48 hours.

**KB Update:** Expand bridge-attacks.md — add guardian set expiration as a vector.

---

### 1.4 Raydium Total Bounty Payouts

Raydium has paid $1.6M total through Immunefi. Two public writeups exist (above). Other payouts may exist but are not publicly disclosed.

---

## Section 2: GitHub Security Advisories (CVEs)

### 2.1 solana_rbpf CVEs

**CVE-2021-46102** — Integer overflow in `relocate` function (solana_rbpf 0.2.14-0.2.17)
- `_value` read from ELF without bounds check → overflow when calculating `addr`
- CVSS 7.5 (High), Availability impact
- Patched in 0.2.17

**CVE-2022-23066** — Incorrect `sdiv` calculation (solana_rbpf 0.2.26-0.2.27)
- Improper implementation of signed division
- Patched in 0.2.28

**CVE-2022-31264** — Integer overflow from ELF headers (solana_rbpf < 0.2.29)
- Invalid ELF program headers cause panic
- Patched in 0.2.29

**KB Update:** Add to known-vulnerable-deps.md

### 2.2 solana-pay CVE

**CVE-2022-35917** — Weakness in Transfer Validation Logic (@solana/pay <= 0.2.0)
- `validateTransfer()` with a reference key could validate multiple transfers instead of just one
- Moderate severity
- Patched in 0.2.1

### 2.3 @solana/web3.js Supply Chain (Already EP-095)

**CVE-2024-54134** — Already covered as EP-095 (Supply Chain / Dependency Poisoning)

### 2.4 SPL token-swap Unsound Instruction Unpack

**GitHub Issue #5243** — `instruction::unpack` casts `u8` with arbitrary bit patterns to any target type
- Can break validity invariants (e.g., casting 0x03 to bool = UB)
- Can break alignment requirements (casting u8 array to u16 = misaligned pointer)
- Closed as "not planned" — low exploitability on BPF

### 2.5 Anchor / Agave Security Notes

- **Anchor:** No published CVEs or security advisories through GitHub. Security.txt integration proposed (issue #1731).
- **Agave (anza-xyz):** Private security reporting only. Bug bounties denominated in SOL since Feb 2024. Bounty categories: Loss of Funds, Consensus/Safety Violations, DoS Attacks.
- **SPL:** Repository archived. Programs moved to separate repos under `solana-program` org. Past audits tracked in `anza-xyz/security-audits`.

---

## Section 3: Solana Foundation Security Advisories

### 3.1 ZK ElGamal Proof Bug #1 (April 2025) — Already EP-098/EP-100

Fiat-Shamir Transformation missing unhashed algebraic components. Could forge proofs for unlimited minting. Patched by validators in 2 days. No exploitation.

### 3.2 ZK ElGamal Proof Bug #2 (June 2025) — NEW

**Source:** https://solana.com/news/post-mortem-june-25-2025
**Reported:** June 10, 2025 | **Reporter:** zksecurityXYZ

**A separate, second Fiat-Shamir Transformation bug** in the ZK ElGamal Proof program. Same class of vulnerability (component not included in hash), same potential impact (forge proofs, unlimited minting, drain confidential balances).

**Response:** Confidential transfers disabled in Token-2022 on June 11. ZK ElGamal proof program disabled via feature activation on June 19 (epoch 805).

**KB Update:** Expand EP-100 with this second instance. Pattern: ZK proof systems are extremely fragile — same bug class found twice in 2 months.

### 3.3 Sandwich Attack Validator Removal (June 2024)

Solana Foundation removed malicious validators from SFDP for running sandwich attacks. Validators modified client software to enable front-running despite Solana lacking a mempool. SFDP removal = loss of staking subsidies, not network removal.

---

## Section 4: Blog Deep-Dives

### 4.1 OtterSec: The Hidden Dangers of Lamport Transfers

**Source:** https://osec.io/blog/2025-05-14-king-of-the-sol/

Three critical pitfalls when transferring lamports to arbitrary accounts:

**Danger 1: The Rent-Exemption Trap**
- Transferring lamports FROM an account can drop it below rent-exempt threshold
- Account becomes subject to garbage collection / uninitialization
- Must verify source account remains rent-exempt after transfer

**Danger 2: Writable But Untouchable (Executable Accounts)**
- Executable accounts (holding program code) cannot have their lamport balance changed
- Even if marked `mut` / writable in transaction, the write silently fails
- Programs relying on transferring lamports TO executable accounts will break

**Danger 3: The Write-Demotion Trap (Reserved Accounts)**
- Accounts on the "reserved account list" (built-in programs, sysvars) are silently downgraded from writable to read-only during message sanitization
- Anchor's `#[account(mut)]` constraint passes at compile time but the runtime silently demotes the account
- Real-world example: `secp256r1_program` became reserved after a feature flag activated, turning it into an "eternal king" in a King-of-the-Hill game (permanently occupying a slot that could never be reclaimed)

**Recommended Fix:** Never transfer lamports to arbitrary accounts. Use a PDA vault owned by the program to store refunds, letting users claim later.

**EP Candidate:** EP-106 (Lamport Transfer to Reserved/Executable Accounts)
**KB Updates:** solana-runtime-quirks.md — add reserved account list and write-demotion behavior

---

### 4.2 OtterSec: Rust, Realloc, and References

**Source:** https://osec.io/blog/2022-12-09-rust-realloc-and-references/

Deep dive into a subtle Solana SDK bug in `AccountInfo::realloc`:

**Bug 1: Out-of-Bounds Write (On-Chain)**
- `realloc` writes new length to serialized buffer (8 bytes before data pointer) and updates local slice reference length
- NO bounds check on new size during execution — BPF loader only validates AFTER contract finishes
- Attacker can call `realloc` with huge size → writes past allocated buffer into adjacent account data/lamports
- If attacker can revert size back to valid before program exits, corruption persists
- Adjacent accounts in serialized buffer: other accounts' lamports, data, owner

**Bug 2: Heap Corruption (Off-Chain / Testing)**
- Constructing `AccountInfo` manually (e.g., via client SDK's `Account`) and calling `realloc` writes length to wrong memory location
- The function assumes BPF loader's serialized buffer layout, which doesn't exist for heap-allocated `Vec<u8>`
- Potential RCE via heap corruption

**Fix:** Bounds check using `original_data_len()` to retrieve padded section size. The `unsafe` function `original_data_len()` was introduced but NOT marked unsafe in older versions for API compatibility (hidden safety debt).

**EP Candidate:** EP-107 (AccountInfo::realloc OOB Memory Corruption) — more severe than our existing EP-012 which only covers "not zeroing new space"
**KB Updates:** Expand EP-012, add OOB write as sub-pattern

---

### 4.3 OtterSec: The Story of the Curious Rent Thief

**Source:** https://osec.io/blog/2022-08-19-solend-rent-thief/

**Exploit:** Bot targets the gap between account creation (tx1) and initialization (tx2) in multi-transaction patterns:

1. Solend's `init_reserve` requires 6 new accounts
2. Due to transaction size limits, creation and initialization are split into 2 transactions
3. In the ~40-second gap, accounts have rent money but no program owner
4. Rent thief bot takes ownership, drains rent (~0.0082 SOL), closes accounts
5. Impact: Low monetary ($0.28/attack) but causes transaction failures

**Fix:** Solend implemented atomic account creation within a single on-chain program call.

**EP Candidate:** EP-110 (Inter-Transaction Account Hijack) — generalizable to any multi-transaction initialization pattern
**KB Updates:** Add to initialization patterns section

---

### 4.4 OtterSec: Pre-Funding DoS

**Source:** https://taichiaudit.com/blog/solana-security-series-1

**Attack:** Pre-fund a predictable PDA address with lamports before the legitimate program tries to initialize it:

1. `create_account` checks if destination has non-zero lamports
2. If `lamports > 0`, instruction fails with `AccountAlreadyInUse` — permanently
3. Attacker pre-funds with minimum rent-exempt amount
4. Legitimate initialization permanently blocked

**Mitigation:** Use `transfer` + `allocate` + `assign` flow instead of `create_account`. Anchor handles this automatically (`init` constraint checks balance and falls back to safe flow).

**EP Candidate:** Merge into EP-076 (Front-Runnable Init) as sub-pattern

---

### 4.5 Neodyme: Token-2022 Footguns

**Source:** https://neodyme.io/en/blog/token-2022

Comprehensive coverage of extension-specific pitfalls:

**CPIGuard:** Prevents accounts from being used in CPIs unless delegation flow is followed. Programs that transfer on behalf of users must use `approve` + `transfer_checked` instead of direct CPI.

**DefaultAccountState (Frozen Vaults):** If mint has `DefaultAccountState::Frozen`, all new token accounts start frozen. Programs creating vault/escrow accounts will malfunction if they don't thaw the account first.

**MintCloseAuthority (Reinitialization Attack):**
- Mint can be closed when supply = 0
- If mint is reinitialized with DIFFERENT extensions, orphan token accounts from old mint may become incompatible
- Example: Old mint had KYC transfer hook. New mint doesn't. Old token accounts bypass KYC.
- Example: Old mint had transfer fees. New mint doesn't. Orphan accounts have fee-exempt tokens.

**PermanentDelegate (Fund Loss):**
- Authority has unlimited access to transfer/burn ANY tokens from ANY account for the mint
- Users must trust the delegate implicitly
- If delegate key is compromised, ALL tokens for that mint can be stolen

**TransferHook (Verification Requirements):**
- Programs must verify: (1) mint is correct, (2) program is in transferring state, (3) token account's mint matches
- Missing any check allows malicious hooks or hook bypass

**TransferFees (Calculation Pitfall):**
- Fees deducted from RECIPIENT's received amount, not sender's sent amount
- Programs that assume `amount_sent == amount_received` will have accounting errors
- Must use `TransferCheckedWithFee` or precalculate with `calculate_inverse_fee`

**Confidential Transfers (ZK Complexity):**
- ElGamal encryption for balances
- Requires Proof programs for verification
- Two separate Fiat-Shamir bugs found in 2025 (April and June)

**KB Updates:** Expand token-extensions.md with MintCloseAuthority reinitialization, DefaultAccountState frozen vault, PermanentDelegate comprehensive coverage

---

### 4.6 Anatomist Security: Pwning Solana — Direct Mapping Validator RCE

**Source:** https://anatomi.st/blog/2025_06_27_pwning_solana_for_fun_and_profit

**Vulnerability:** Critical bug in Solana's "Direct Mapping" optimization (v1.16+) that maps host account data buffers directly into VM memory for CPI performance:

- Legacy model: serialize/deserialize account data (safe but slow)
- Direct Mapping: multiple `MemoryRegion`s point directly to host buffers (fast but dangerous)
- Introduced `Cow(u64)` (Copy-on-Write) state for permission management
- **Bug:** Inadequate permission validation on memory access allowed OOB writes
- **Impact:** Validator RCE — compromise entire node, mint tokens, exfiltrate keys
- **Scale:** >$9B TVL at risk

**EP Candidate:** Reference only (validator-level, not contract-level). Note in known-vulnerable-deps.md.

---

### 4.7 Metaplex Exploits (Andy Kutruff) — Already in NFT Attacks KB

**Token Entangler:** Non-canonical PDA bump causes permanent token lockup. Already covered in nft-attacks.md.
**Auction House:** PDA bump=0 trick + preventing account closure. Already covered in nft-attacks.md.

---

## Section 5: New EP Candidates Summary

| EP# | Name | Source | Severity |
|-----|------|--------|----------|
| EP-106 | Lamport Transfer Write-Demotion Trap | OtterSec blog | HIGH |
| EP-107 | AccountInfo::realloc OOB Memory Corruption | OtterSec blog | CRITICAL |
| EP-108 | Remaining Account Spoofing (Extension Pattern) | Raydium/Immunefi | CRITICAL |
| EP-109 | LP Deposit Rounding Drain | Raydium/Immunefi | CRITICAL |
| EP-110 | Inter-Transaction Account Hijack | Solend/OtterSec | MEDIUM |

**Expansions to existing EPs:**
- EP-012: Add OOB write sub-pattern (from EP-107 research)
- EP-076: Add pre-funding DoS sub-pattern
- EP-100: Add second ZK ElGamal bug (June 2025)

---

## Section 6: KB File Updates Needed

| File | Update |
|------|--------|
| exploit-patterns.md | Add EP-106 through EP-110 |
| solana-runtime-quirks.md | Add reserved account list, write-demotion, lamport transfer dangers |
| token-extensions.md | Add MintCloseAuthority reinitialization, DefaultAccountState frozen vaults, PermanentDelegate |
| known-vulnerable-deps.md | Add solana_rbpf CVEs, Direct Mapping validator bug |
| amm-dex-attacks.md | Add Raydium tick manipulation and liquidity drain |
| bridge-attacks.md | Add guardian set expiration vector |
| bug-bounty-findings.md | Add all Immunefi disclosures, paywalled source list |
| audit-firm-findings.md | Add OtterSec lamport/realloc blogs, Anatomist RCE |

---

## Section 7: Paywalled / Restricted Sources for Future Expansion

### Sources We Cannot Access (Document for Future Funding)

1. **Immunefi Private Disclosures** — Vast majority of bug bounty reports are NOT publicly disclosed. Programs with Category 3 (Approval Required) like Firedancer require explicit approval for any public information. Estimated 90%+ of findings are private.

2. **Anza/Agave Private Security Reports** — All validator-level vulnerabilities reported through private GitHub security reporting. No public CVEs published. Bounties paid in SOL but findings not disclosed.

3. **Anchor Private Security** — No public security advisory process. Vulnerabilities reported directly to maintainers.

4. **Audit Reports Under NDA** — Many audit firms (OtterSec, Neodyme, Zellic, etc.) have private reports that are never published. Only a fraction of audits become public.

5. **HackerOne / Bugcrowd** — Not used by Solana ecosystem (Immunefi dominates). No Solana-specific disclosures found.

6. **Solana Foundation Internal Security** — Vulnerabilities in validator client patched quietly before disclosure. Two ZK ElGamal bugs patched with minimal public detail. Detailed technical analysis often not published.

### Recommended Actions with Funding
- Partner with Immunefi for access to anonymized vulnerability pattern data
- Negotiate with audit firms for access to redacted findings databases
- Subscribe to Anza security mailing list (if available)
- Engage with Solana security researchers for private disclosure sharing
- Monitor Solana validator upgrade changelogs for security-related changes
