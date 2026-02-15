# Severity Calibration Guide
<!-- Compiled from Sec3 2025 ecosystem review, Sherlock, Beosin CVSS, OtterSec/Neodyme patterns -->
<!-- Last updated: 2026-02-06 -->

## Severity Framework

### Impact x Likelihood Matrix (Beosin/CVSS 3.1 adapted)

| Impact \ Likelihood | Probable | Possible | Unlikely | Rare |
|---------------------|----------|----------|----------|------|
| **Severe** | CRITICAL | HIGH | MEDIUM | LOW |
| **High** | HIGH | MEDIUM | MEDIUM | LOW |
| **Medium** | MEDIUM | MEDIUM | LOW | INFO |
| **Low** | LOW | LOW | INFO | INFO |

### Severity Definitions

**CRITICAL** — Complete compromise of funds or system control
- Direct loss of user or protocol funds with no preconditions
- Arbitrary minting, burning, or transfer of tokens
- Full admin takeover with immediate exploitability
- Example: Missing signer check on withdraw (EP-001)
- Example: Integer overflow enabling unlimited minting (EP-015)
- Typical CVSS: 9.0-10.0

**HIGH** — Major loss or disruption requiring urgent attention
- Fund loss requiring specific but achievable preconditions
- Permanent freezing of significant funds
- Oracle manipulation with thin-liquidity dependency
- Admin key compromise enabling fund extraction
- Example: Oracle manipulation via low-liquidity token (EP-021)
- Example: Flash loan economic attack (EP-058)
- Typical CVSS: 7.0-8.9

**MEDIUM** — Limited or situational risk affecting part of the system
- Fund loss requiring complex multi-step attack
- Temporary freezing of funds (recoverable)
- Precision loss draining small amounts over time
- Governance manipulation with high execution barrier
- Example: Rounding direction favoring user on small amounts (EP-019)
- Example: Missing slippage protection (EP-060)
- Typical CVSS: 4.0-6.9

**LOW** — Minor inefficiencies or best-practice improvements
- No direct fund impact
- Gas waste or suboptimal patterns
- Missing events or logging
- Cosmetic issues or code quality
- Example: Using `find_program_address` instead of stored bump (SP-009)
- Example: Missing events on state changes (SP-058)
- Typical CVSS: 0.1-3.9

**INFORMATIONAL** — Observations and recommendations
- Code style suggestions
- Documentation gaps
- Potential future concerns
- Gas optimization opportunities

---

## Industry Benchmarks (Sec3 2025 Ecosystem Review)

Based on analysis of **163 Solana security audits**, **1,733 findings**:

### Severity Distribution
| Severity | % of Findings | Per Review Avg |
|----------|--------------|----------------|
| Critical | 5.3% | 0.5 |
| High | 8.4% | 0.9 |
| Medium | 20.2% | 2.1 |
| Low | 32.2% | 3.3 |
| Informational | 33.9% | 3.5 |
| **Total** | **100%** | **10.3** |

### Key Stats
- 99.4% of audits found at least one vulnerability
- 76% had at least one Medium+ issue
- 51% had at least one High+ issue
- 23% had at least one Critical issue
- Average: 1.4 High/Critical per review
- Range: 1 to 112 findings per review

### Vulnerability Category Distribution (High + Critical only)
| Category | % of Severe Findings |
|----------|---------------------|
| Business Logic | 36.9% |
| Input Validation & Data Hygiene | 27.9% |
| Access Control & Authorization | 20.7% |
| Data Integrity & Arithmetic | 8.9% |
| Denial of Service & Liveness | 5.6% |

**Insight:** Top 3 categories account for **85.5%** of all severe findings. Business logic, validation, and access control dominate — not low-level arithmetic or DoS.

---

## Solana-Specific Calibration Rules

### Always CRITICAL
These patterns are CRITICAL regardless of context on Solana:

| Pattern | Why Always Critical | EP Reference |
|---------|-------------------|--------------|
| Missing signer check on authority | Anyone can call admin functions | EP-001 |
| Missing owner check on data accounts | Attacker injects fabricated data | EP-002 |
| Unchecked arithmetic on financial values | Silent overflow in release builds | EP-015 |
| Arbitrary CPI with user-provided program | Attacker substitutes malicious program | EP-042 |
| Plaintext private key storage/logging | Full wallet compromise on breach | EP-097 |

### Context-Dependent Severity

| Pattern | CRITICAL when... | HIGH when... | MEDIUM when... |
|---------|-----------------|--------------|----------------|
| Oracle staleness | Used for lending collateral | Used for trade pricing | Used for display only |
| Missing slippage | AMM with MEV exposure | Limit order system | Internal rebalancing |
| PDA seed collision | Shared vault across users | Per-user account overlap | Config account only |
| Integer precision loss | Compounds over iterations | One-time calculation | Capped by max bounds |
| Missing `has_one` | Guards fund withdrawal | Guards config update | Guards view function |
| Account not closed properly | Holds user funds | Holds protocol data | Empty/zeroed account |
| Single admin key | Controls fund movement | Controls protocol params | Controls UI metadata |
| No emergency pause | Lending/bridge protocol | DEX with liquidity pools | Read-only protocol |

### Solana-Specific Severity Adjustments

**Upgrade to severity when on Solana:**
- Integer overflow: MEDIUM (other chains) -> CRITICAL (Solana) — Rust release builds wrap silently
- Missing signer: MEDIUM (other chains with msg.sender) -> CRITICAL (Solana) — explicit signer model
- Account type confusion: LOW (EVM, single storage) -> HIGH (Solana) — account model enables injection

**Downgrade when Anchor protects:**
- Account type confusion: HIGH (native) -> LOW (Anchor) — discriminator auto-validated
- Missing owner check: CRITICAL (native) -> LOW (Anchor `Account<T>`) — auto-validated
- Reinitialization: HIGH (native) -> LOW (Anchor `init`) — discriminator prevents re-init
- Note: Downgrades only apply if Anchor constraints are correctly used

---

## Calibration Examples

### Example 1: Missing signer check
```rust
// Vulnerable: authority is AccountInfo, not Signer
pub authority: AccountInfo<'info>,
```
- **Impact:** Severe — anyone can impersonate authority
- **Likelihood:** Probable — trivially exploitable
- **Verdict: CRITICAL**
- Historical: Wormhole ($326M)

### Example 2: Unchecked oracle confidence
```rust
let price = oracle.get_price()?.price; // No confidence check
```
- For lending protocol with real collateral: **Impact:** High, **Likelihood:** Possible → **HIGH**
- For display-only price feed: **Impact:** Low, **Likelihood:** Unlikely → **INFO**

### Example 3: Using `+` instead of `checked_add`
```rust
vault.balance = vault.balance + deposit_amount;
```
- On financial balance: **Impact:** Severe, **Likelihood:** Possible → **CRITICAL**
- On non-financial counter (e.g., view count): **Impact:** Low, **Likelihood:** Rare → **INFO**

### Example 4: Missing slippage on swap
```rust
pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    // No min_amount_out parameter
```
- Public-facing AMM swap: **Impact:** High, **Likelihood:** Probable → **HIGH**
- Internal protocol rebalancing (no user funds): **Impact:** Medium, **Likelihood:** Unlikely → **LOW**

### Example 5: PDA without user key in seeds
```rust
seeds = [b"vault"], bump // All users share one PDA
```
- If PDA holds user funds: **Impact:** Severe, **Likelihood:** Probable → **CRITICAL**
- If PDA is global config (one expected): **Impact:** None, this is correct → **Not a finding**

### Example 6: `init_if_needed` without reinitialization guard
```rust
#[account(init_if_needed, payer = user, space = 8 + Data::INIT_SPACE)]
pub data: Account<'info, Data>,
```
- If data includes authority field that could be overwritten: **Impact:** High → **HIGH**
- If data is idempotent (same result regardless of re-init): **Impact:** Low → **LOW**

---

## Report Writing Guidelines

### Finding Format
```
## [SEV-XXX] Title: Concise description of the issue

**Severity:** CRITICAL | HIGH | MEDIUM | LOW
**Category:** [from Sec3 categories]
**Location:** file_path:line_number
**Status:** Open | Acknowledged | Fixed | Won't Fix

### Description
What the vulnerability is and how it works.

### Impact
What an attacker can achieve. Quantify if possible (e.g., "drain all pool funds").

### Proof of Concept
Step-by-step attack scenario. Code if applicable.

### Recommendation
Specific fix with code example. Reference secure pattern (SP-XXX).

### References
- EP-XXX from exploit-patterns-*.md (see exploit-patterns-index.md for lookup)
- Real-world exploit if applicable
```

### Severity Justification Checklist
When assigning severity, document:
- [ ] What is the impact? (fund loss, freeze, DoS, info leak)
- [ ] What is the likelihood? (trivially exploitable, requires preconditions, theoretical)
- [ ] Are there existing mitigations? (Anchor protections, admin controls, monitoring)
- [ ] Is the impact bounded? (max loss, affected users, time window)
- [ ] What is the real-world precedent? (has this pattern been exploited before?)

### Common Overrating Pitfalls
- Rating missing events as MEDIUM (should be LOW/INFO)
- Rating redundant checks as HIGH (Anchor may already protect)
- Rating theoretical DoS as HIGH when compute limits bound it
- Rating precision loss as CRITICAL without demonstrating extractable value
- Rating admin key issues as CRITICAL when admin is a multisig with timelock

### Common Underrating Pitfalls
- Rating missing signer as MEDIUM because "admin would notice" (should be CRITICAL)
- Rating integer overflow as MEDIUM because "values are usually small" (should be CRITICAL on Solana)
- Rating oracle issues as LOW when thin liquidity makes manipulation feasible (should be HIGH)
- Rating CPI issues as MEDIUM when program ID is user-controlled (should be CRITICAL)

---
<!-- END OF SEVERITY CALIBRATION GUIDE -->
<!-- Sources: Sec3 2025 Solana Security Ecosystem Review, Sherlock severity framework, Beosin CVSS matrix, Zellic/Neodyme audit patterns -->
