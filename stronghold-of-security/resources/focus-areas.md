# Focus Areas for Phase 1 Context Building

Each focus area represents a distinct security lens through which to analyze the entire codebase.
Auditors should apply the `audit-context-building` methodology (micro-first, 5 Whys, 5 Hows, First Principles) to their specific focus.

**New in this version:** Each focus area now includes Priority Grep Patterns (from Phase 0.5 HOT_SPOTS), Knowledge Base Priority (which EPs and KB files to study first), Mandatory Output Sections (beyond the base template), Cross-Reference Handoffs (specific items to flag for other agents), and Common False Positives (to reduce noise).

---

## 1. Access Control & Authorization

**What to analyze:**
- Who can call each instruction/function?
- What authority checks exist (signers, owners, admins)?
- What privileges does each role have?
- Are there privilege escalation paths?

**Key questions:**
- Can unauthorized users execute privileged operations?
- Are all admin functions properly gated?
- Can an attacker become an authority they shouldn't be?
- Are authority transfers secure?
- Are multisig thresholds sufficient? Can signers be added without timelock?

**Solana/Anchor specifics:**
- `Signer<'info>` usage and validation
- `has_one` constraints on authority fields
- Admin/owner pattern implementations
- Multi-sig or governance patterns
- `SetAuthority` instruction usage

**Output should include:**
- Complete role/permission matrix
- All authority check locations
- Any missing or weak checks
- Trust assumptions about authorities

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PD-001** (`Signer<`) — Map all signers across all instructions
- **PD-002** (`has_one`) — Map Anchor authority constraints
- **PD-004** (`pub authority|pub admin|pub owner`) — Find all authority fields
- **PD-005** (`#[access_control`) — Access control decorators
- **PD-006** (`require_keys_eq!`) — Explicit key equality checks
- **PC-001** (`UncheckedAccount`) — Unchecked accounts that bypass validation
- **PG-001/002/003** (hardcoded pubkeys) — Verify correctness of all hardcoded keys

Cross-check: Instructions that appear in the codebase but do NOT have PD-001 hits = potential missing signer checks.

**Knowledge Base Priority:**
- **Primary EPs:** EP-026–032 (Access Control category), EP-068–074 (Key Management), EP-126 (multisig ACL role escalation)
- **Secondary EPs:** EP-094 (bonding curve admin drainage), EP-098 (fee destination manipulation), EP-119 (fee destination hijacking)
- **KB files:** `exploit-patterns-core.md` (Cat 4: Access Control), `exploit-patterns-advanced.md` (Cat 9: Key Management), `exploit-patterns-recent.md` (EP-126)
- **Secure patterns:** `secure-patterns.md` — Admin/upgrade safety patterns, Multi-sig patterns
- **Protocol-specific:** Check relevant protocol playbook for protocol-specific authority patterns

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Complete Role Matrix** — Table with columns: Role | Who | What Instructions | What Accounts | Trust Level (FULL/LIMITED/NONE)
2. **Authority Transfer Analysis** — How each authority/admin role can be transferred. Is it one-step or two-step? Is there a timelock?
3. **Missing Check Inventory** — Every instruction that modifies state but has no signer check, or where the signer isn't validated against an authority field
4. **Key Management Assessment** — How are keys stored? Single key or multisig? Hot wallet or cold?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ CPI Agent:** Any instruction that performs CPI using signer authority (the CPI agent needs to check what privileges are passed)
- **→ Upgrade/Admin Agent:** All admin-only instructions and their access patterns
- **→ Token/Economic Agent:** Who controls fee parameters, reward rates, or mint/burn authority
- **→ State Machine Agent:** Authority-gated state transitions (e.g., only admin can pause/unpause)

**Common False Positives:**
- `Signer<'info>` for fee_payer that only pays transaction fees (not a security signer) — LOW risk
- `has_one = authority` on an account that is itself a PDA (the "authority" is derived, not a raw key) — typically safe
- Programs with a single `upgrade_authority` that is the deployer's key — this is standard Solana, not necessarily a vulnerability (but note centralization risk)
- `access_control` attribute that calls a function already checked by Anchor constraints — redundant but not vulnerable

---

## 2. Arithmetic & Math Safety

**What to analyze:**
- All mathematical operations
- Type conversions and casts
- Precision handling (decimals, basis points)
- Rounding behavior

**Key questions:**
- Are there overflow/underflow risks?
- Is checked math used consistently?
- Are there precision loss issues in calculations?
- Can rounding be exploited (especially in share/token calculations)?
- Are there bit-shift operations that could overflow?

**Solana/Anchor specifics:**
- Use of `checked_add`, `checked_sub`, `checked_mul`, `checked_div`
- `u64` vs `u128` usage for intermediate calculations
- Decimal handling with different token decimals
- Basis point calculations (should use 10000 base)
- Custom math libraries vs standard operations

**Output should include:**
- All arithmetic operations with risk assessment
- Any unchecked operations
- Precision/rounding analysis
- Recommended mitigations

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PA-001–005** (`as u64`, `as u128`, `as i64`, `as u32`, `as u16/u8`) — All type casts, sorted by truncation risk
- **PA-006** (`try_into().unwrap()`) — Unchecked type conversions
- **PB-001** (`.unwrap()`) — Specifically in arithmetic contexts (e.g., `checked_add().unwrap()` is still a panic)

Cross-check: Files with HIGH cast density (5+ casts in a single file) deserve deep analysis. Look for `as u64` immediately following multiplication — classic overflow-then-truncate pattern.

**Knowledge Base Priority:**
- **Primary EPs:** EP-015–020 (Arithmetic category), EP-091 (bit-shift overflow — Cetus $223M)
- **Secondary EPs:** EP-058–067 (Economic/DeFi patterns where math errors enable economic attacks), EP-109 (rounding direction manipulation)
- **KB files:** `exploit-patterns-core.md` (Cat 2: Arithmetic, Cat 8: Economic), `exploit-patterns-advanced.md` (EP-091)
- **Secure patterns:** `secure-patterns.md` — Safe arithmetic patterns, scaling patterns, rounding best practices
- **Key incident:** EP-091 (Cetus $223M — bit-shift overflow bypassed price range check). Study this pattern in detail.

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Arithmetic Operations Inventory** — Table: Location | Operation | Operand Types | Checked? | Intermediate Width | Risk
2. **Cast Analysis** — Every type cast with: source type → target type, can it truncate?, what happens if max value?
3. **Precision Model** — For each token/value type: what decimal precision? what rounding direction? are there precision loss paths?
4. **Rounding Direction Analysis** — For deposit/withdraw/swap: does rounding favor the protocol or the user? Can this be exploited?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Token/Economic Agent:** Every calculation result that feeds into a token transfer (amount calculations, fee calculations, reward calculations)
- **→ Oracle Agent:** Arithmetic operations involving price data (price * amount calculations, collateral ratio math)
- **→ Error Handling Agent:** Locations where `checked_*` returns `None` — how is the error handled? Is it a silent skip or a revert?
- **→ State Machine Agent:** Counter/index arithmetic that determines state transitions

**Common False Positives:**
- `as u64` on a value that is demonstrably bounded (e.g., converting a `u8` enum variant to `u64`) — safe
- `as u128` widening cast — always safe (no truncation possible)
- `checked_add().ok_or(Error)?` — this IS the safe pattern, not a vulnerability
- Arithmetic in test modules (`#[cfg(test)]`) — not production code
- `saturating_*` operations in fee calculations — intentional cap, not a bug (but note: attacker could grief to the cap)
- Basis point math with `u64` where the maximum product is bounded below `u64::MAX` — verify bounds explicitly

---

## 3. State Machine & Transitions

**What to analyze:**
- What states can the system be in?
- What transitions are allowed?
- Are there ordering dependencies?
- Can states be corrupted or skipped?

**Key questions:**
- Can an attacker force invalid state transitions?
- Are there race conditions between state changes?
- Can the system get stuck in an invalid state?
- Are all state transitions atomic?
- Can accounts be resurrected after closing?

**Solana/Anchor specifics:**
- Enum-based state fields
- Epoch/phase tracking
- Initialization → Active → Closed lifecycle
- Cross-instruction state consistency
- Account close and revival patterns

**Output should include:**
- Complete state diagram
- All valid transitions
- Invalid transition prevention
- State invariants

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PK-002** (`enum.*State|Status|Phase`) — Find all state enums
- **PK-001** (`close =`) — Anchor close constraints (account lifecycle end)
- **PK-003** (`is_paused|paused|frozen|emergency`) — Emergency/pause mechanisms
- **PK-004** (`realloc`) — Account reallocation (size changes during lifecycle)
- **PE-001** (`init_if_needed`) — Conditional init (can re-enter init state)
- **PE-002** (`init,`) — Standard init patterns
- **PE-003** (`is_initialized|initialized`) — Manual init tracking

Cross-check: State enums (PK-002) against instruction handlers — can every handler be called in every state? Are there guards per state?

**Knowledge Base Priority:**
- **Primary EPs:** EP-033–041 (Logic/State Machine category), EP-075–078 (Initialization category)
- **Secondary EPs:** EP-036 (account close/revival), EP-040 (close without zero-lamport), EP-110 (multi-TX init front-running)
- **KB files:** `exploit-patterns-core.md` (Cat 5: Logic/State Machine), `exploit-patterns-advanced.md` (Cat 10: Initialization)
- **Secure patterns:** `secure-patterns.md` — Correct state machine patterns, initialization safety
- **Key incident:** EP-034 (Friktion $1M — accessing vault in wrong epoch state)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **State Diagram** — ASCII/markdown diagram showing all states and transitions with guard conditions
2. **Transition Matrix** — Table: From State | To State | Which Instruction | Guard Condition | Can Attacker Trigger?
3. **Account Lifecycle Map** — For each account type: creation → modification(s) → close. What happens at each stage? Can it be reopened?
4. **Invariant Registry** — List every state invariant the protocol assumes (e.g., "vault cannot be withdrawn from while locked") and where it's enforced

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Access Control Agent:** State transitions gated by authority (e.g., only admin can move from Paused → Active)
- **→ Timing Agent:** State transitions that depend on time (epoch boundaries, deadlines, cooldown periods)
- **→ Token/Economic Agent:** State changes that affect token flows (e.g., transitioning to "closed" should release all funds)
- **→ Error Handling Agent:** What state does the system enter on error? Can a failed TX leave partial state?
- **→ Account Validation Agent:** Closed accounts that could be revived (EP-036 pattern)

**Common False Positives:**
- Enum variants that exist but are never used (dead code, not exploitable)
- `init_if_needed` with a discriminator check in the instruction body — the double-check makes reinit safe
- Programs with a linear lifecycle (init → active → closed) where backwards transitions are structurally impossible (no instruction exists)
- Close constraints that transfer lamports to a fixed system account — safe pattern

---

## 4. CPI & External Calls

**What to analyze:**
- All cross-program invocations
- What programs are being called?
- What accounts/privileges are passed?
- Are program IDs validated?

**Key questions:**
- Can an attacker substitute a malicious program?
- Are CPI targets hardcoded or validated?
- What privileges are passed to external programs?
- Can the called program manipulate shared state?
- Does the CPI chain create re-entrancy-like conditions?

**Solana/Anchor specifics:**
- `Program<'info, T>` vs `UncheckedAccount`
- `invoke` vs `invoke_signed` usage
- PDA signer seeds in CPI
- Token program CPI patterns
- CPI depth limits (4 in legacy, 8 in Agave 3.0)

**Output should include:**
- All CPI call sites
- Program validation status
- Privilege passing analysis
- Trust assumptions about external programs

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PF-001** (`invoke(`) — Raw CPI calls (highest risk — no Anchor type safety)
- **PF-002** (`invoke_signed(`) — PDA-signed CPI (signer seeds grant authority)
- **PF-003** (`Program<`) — Anchor program type validation (the safe pattern)
- **PF-004** (`CpiContext`) — Anchor CPI contexts
- **PF-005** (`remaining_accounts`) — Dynamic accounts passed to CPI (untyped, unvalidated)

Cross-check: Every `invoke(` or `invoke_signed(` call WITHOUT a corresponding `Program<'info, T>` in the accounts struct = potential arbitrary CPI. Compare PF-001/002 locations against PF-003 locations.

**Knowledge Base Priority:**
- **Primary EPs:** EP-042–050 (CPI category), EP-108 (remaining_accounts arbitrary CPI — Raydium bounty)
- **Secondary EPs:** EP-092 (instruction sysvar manipulation — Wormhole), EP-123 (Ed25519 offset bypass)
- **KB files:** `exploit-patterns-core.md` (Cat 6: CPI), `exploit-patterns-incidents.md` (EP-108)
- **Secure patterns:** `secure-patterns.md` — Safe CPI patterns, Program ID validation
- **Key incidents:** EP-042/043 (arbitrary CPI basics), EP-108 ($505K Raydium bounty — remaining_accounts CPI)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **CPI Call Map** — Table: Location | Target Program | Method | Uses invoke/invoke_signed/CpiContext | Program ID Validated? | PDA Seeds (if signed)
2. **Privilege Flow Analysis** — For each CPI: what accounts are passed? What can the target program do with them? Are any accounts mutable that shouldn't be?
3. **Return Data Analysis** — Does any CPI use `get_return_data()`? Is the returned program ID checked against the expected program?
4. **remaining_accounts Audit** — Every use of `ctx.remaining_accounts`: how are they validated? Owner check? Key check? Type check?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Access Control Agent:** CPI calls that pass signer authority to external programs
- **→ Account Validation Agent:** Accounts in CPI contexts that are `UncheckedAccount` or `AccountInfo`
- **→ Token/Economic Agent:** All token transfer CPIs (SPL Token, Token-2022) — amounts, authorities, destinations
- **→ Oracle Agent:** CPI to oracle programs (Pyth, Switchboard) — data freshness post-CPI
- **→ Error Handling Agent:** CPI calls where the return value is discarded (`let _ = invoke(...)`)

**Common False Positives:**
- `CpiContext::new(token_program.to_account_info(), ...)` with `Program<'info, Token>` — Anchor validates the token program ID automatically
- `invoke_signed` with hardcoded SPL Token program ID — safe if the constant is correct
- Multiple CPIs in sequence to the same validated program — each CPI is independent, not a compounding risk
- `remaining_accounts` used for variable-length token account lists where each is validated via `Account::try_from()` in a loop — safe pattern

---

## 5. Token & Economic Logic

**What to analyze:**
- All token transfer logic
- Fee calculations and distributions
- Reward/yield calculations
- Economic incentive structures
- Flash loan interactions

**Key questions:**
- Can an attacker drain tokens?
- Are fees calculated correctly?
- Can rewards be gamed or exploited?
- Are there arbitrage opportunities?
- Can flash loans break economic invariants?
- Are there value extraction points?

**Solana/Anchor specifics:**
- SPL Token / Token-2022 transfers
- Associated token account handling
- Mint/burn authority usage
- Transfer hook implications
- Permanent delegate risks

**Output should include:**
- Complete token flow diagram
- Fee calculation analysis
- Economic attack surface
- Value extraction points

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PI-001–006** (Token-2022 patterns) — If Token-2022 is used, transfer hooks and fees change all token math
- **PJ-001–003** (oracle/price patterns) — Price feeds that drive economic calculations
- **PL-003** (`slippage|min_amount|max_amount`) — Slippage protections
- **PA-001** (`as u64`) — Token amount calculations with casts (truncation risk)
- **PK-001** (`close =`) — Token account closure (remaining balance handling)

Cross-check: Every token transfer instruction — verify the amount calculation doesn't overflow, fees are deducted correctly, and slippage is enforced.

**Knowledge Base Priority:**
- **Primary EPs:** EP-051–057 (Token/SPL category), EP-058–067 (Economic/DeFi category), EP-098–105 (audit-derived patterns)
- **Secondary EPs:** EP-101 (rug pull LP drainage), EP-109 (rounding direction — Raydium bounty), EP-115 (donation solvency bypass), EP-116 (vault share donation), EP-118 (flash loan migration bypass), EP-119 (fee destination hijacking)
- **KB files:** `exploit-patterns-core.md` (Cat 7: Token, Cat 8: Economic), `exploit-patterns-incidents.md` (Cat 15-18)
- **Protocol playbooks:** Load the relevant protocol playbook (amm-dex, lending, staking, etc.) for protocol-specific economic attacks
- **Secure patterns:** `secure-patterns.md` — Safe token transfer patterns, fee patterns
- **Key incidents:** EP-058 (Mango Markets $116M — oracle manipulation for economic extraction), EP-115 (Euler $197M — donation to manipulate solvency), EP-116 (first-depositor vault share attack)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Token Flow Diagram** — ASCII/markdown showing every instruction that moves tokens: source → destination, with amounts and conditions
2. **Fee Analysis** — For each fee: calculation formula, rounding direction, who receives it, can destination be changed, can fee rate be changed
3. **Economic Invariant List** — What must always be true? (e.g., "total deposits >= total shares * share_price", "fees collected <= fees accrued")
4. **Flash Loan Impact Analysis** — For each economic operation: what happens if an attacker has infinite capital for one transaction? Can any invariant be broken?
5. **Value Extraction Matrix** — All paths where value leaves the protocol: legitimate (fees, withdrawals) vs potential attack (drainage, manipulation)

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Arithmetic Agent:** Every token amount calculation (the Arithmetic agent checks for overflow, this agent checks for economic correctness)
- **→ Oracle Agent:** Price-dependent economic operations (swaps, liquidations, collateral valuation)
- **→ Access Control Agent:** Who controls fee parameters, mint authority, reward rates
- **→ Timing Agent:** Economic operations sensitive to ordering (sandwich attacks, front-running liquidations)
- **→ State Machine Agent:** Economic state changes (e.g., pool state after swap, vault state after deposit)

**Common False Positives:**
- Token transfers in test/example code — not production
- Fee calculations that round down in the protocol's favor — intentional design, not a vulnerability (but note: consistent rounding down on deposits + rounding up on withdrawals = user-hostile)
- `transfer` CPI with hardcoded SPL Token program and validated source/destination — safe pattern
- Token accounts with `close` constraint that checks balance is zero — safe pattern
- Slippage parameter of 0 in admin-only maintenance transactions — acceptable if admin is trusted

---

## 6. Account Validation

**What to analyze:**
- How are accounts validated?
- PDA derivation and validation
- Account ownership checks
- Type discrimination

**Key questions:**
- Can an attacker pass a fake account?
- Are all PDAs validated with correct seeds?
- Is account ownership verified?
- Can account types be confused?
- Are discriminators checked for all deserialized accounts?

**Solana/Anchor specifics:**
- Anchor account constraints (`#[account(...)]`)
- PDA seeds and bump validation
- `owner = program_id` checks
- Discriminator validation
- `Account<'info, T>` vs `UncheckedAccount<'info>` vs `AccountInfo<'info>`

**Output should include:**
- All account validation logic
- PDA derivation patterns
- Missing validation gaps
- Type cosplay risks

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PC-001** (`UncheckedAccount`) — All unchecked accounts (highest priority)
- **PC-002** (`AccountInfo<'info>`) — Raw account info without Anchor safety
- **PC-003** (`/// CHECK:`) — Safety comments (review each justification)
- **PD-002** (`has_one`) — Ownership relationship constraints
- **PD-003** (`constraint =`) — Custom constraints
- **PE-001–003** (init patterns) — Initialization validation
- **PF-005** (`remaining_accounts`) — Dynamically passed unvalidated accounts

Cross-check: Every `UncheckedAccount` and `AccountInfo` MUST have a `/// CHECK:` comment. Missing comments = immediate finding. Also: every PDA should validate seeds AND bump.

**Knowledge Base Priority:**
- **Primary EPs:** EP-001–014 (Account Validation category — all 14 patterns)
- **Secondary EPs:** EP-091–097 (Advanced Bypass — many are account validation bypasses), EP-102 (unvalidated registry accounts), EP-108 (remaining_accounts)
- **KB files:** `exploit-patterns-core.md` (Cat 1: Account Validation — this is the largest category)
- **Secure patterns:** `secure-patterns.md` — Canonical Anchor account validation, PDA patterns
- **False positives:** `common-false-positives.md` — Many false positives involve account validation
- **Key incidents:** EP-001 (Wormhole — missing signer validation), EP-006 (Cashio $52.8M — missing mint authority validation), EP-009 (Saber — type confusion)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Account Validation Matrix** — Table: Account Name | Type | Owner Checked? | Discriminator Checked? | PDA Seeds | Constraints | Risk
2. **PDA Derivation Catalog** — Every PDA: seeds used, bump handling (canonical bump or stored bump?), can seeds be predicted/manipulated?
3. **UncheckedAccount Audit** — For each UncheckedAccount/AccountInfo: what's the `/// CHECK:` justification? Is it actually safe? What validation IS done manually?
4. **Type Cosplay Risk Assessment** — Can any account be substituted with a different account type that has the same discriminator or size?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ CPI Agent:** Accounts passed to CPI that are UncheckedAccount (target program gets unvalidated data)
- **→ State Machine Agent:** Account init/close lifecycle — can an account be substituted between creation and first use?
- **→ Access Control Agent:** Accounts with `has_one` authority constraints — is the authority itself validated?
- **→ Token/Economic Agent:** Token accounts and mint accounts — are they validated against the expected mint?

**Common False Positives:**
- `UncheckedAccount` with `/// CHECK: This account is validated in the instruction body` — legitimate if the instruction actually does validate (trace the code path)
- `AccountInfo` for system program, rent sysvar, or clock sysvar — these are well-known program IDs, Anchor often validates automatically
- `UncheckedAccount` for the fee payer — only used for transaction fees, not protocol logic
- Anchor `Account<'info, T>` already validates discriminator and owner — no manual check needed
- Missing `mut` constraint on an account that's not modified — Anchor correctly prevents writes

---

## 7. Oracle & External Data

**What to analyze:**
- Where does external data come from?
- How is it validated?
- What trust assumptions exist?
- Can data be manipulated?

**Key questions:**
- Can price oracles be manipulated?
- Is external data validated before use?
- What happens if external data is stale/wrong?
- Are there flash loan attack vectors on oracle prices?
- Is there a single oracle or multiple sources?

**Solana/Anchor specifics:**
- Pyth/Switchboard oracle integration
- Price feed staleness checks
- Confidence interval validation
- VRF/randomness sources
- On-chain vs off-chain oracle patterns

**Output should include:**
- All external data sources
- Validation mechanisms
- Trust assumptions
- Manipulation vectors

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PJ-001** (`pyth|Pyth|PriceAccount|PriceFeed`) — Pyth oracle usage
- **PJ-002** (`switchboard|Switchboard|AggregatorAccountData`) — Switchboard oracle
- **PJ-003** (`price|oracle`) — General price/oracle references
- **PJ-004** (`staleness|stale|max_age|confidence`) — Freshness and confidence checks

Cross-check: Oracle usage (PJ-001/002/003) WITHOUT staleness checks (PJ-004) = stale price vulnerability. This is one of the highest-value cross-checks.

**Knowledge Base Priority:**
- **Primary EPs:** EP-021–025 (Oracle category), EP-120 (oracle write-lock — Solend $1.26M)
- **Secondary EPs:** EP-058 (Mango Markets — oracle manipulation enabling economic extraction), EP-096 (oracle-mediated liquidation spirals)
- **KB files:** `exploit-patterns-core.md` (Cat 3: Oracle), `exploit-patterns-recent.md` (EP-120)
- **Protocol playbook:** `oracle-attacks.md` — Comprehensive oracle attack taxonomy and defenses
- **Secure patterns:** `secure-patterns.md` — Correct oracle integration patterns
- **Key incidents:** EP-021/023 (Mango Markets $116M — oracle price manipulation), EP-120 (Solend USDH $1.26M — single-source oracle write-lock)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Oracle Dependency Map** — Table: Data Point | Oracle Source | Feed Address/ID | Staleness Check? | Confidence Check? | Fallback?
2. **Price Manipulation Analysis** — For each oracle: what would it cost to manipulate the price by 10%? By 50%? Is it a TWAP or spot price?
3. **Staleness Window Assessment** — What's the maximum staleness allowed? What happens if the oracle goes offline for that duration?
4. **Multi-Source Analysis** — Is there a single oracle or multiple? If single: what happens when it fails? If multiple: how are they aggregated?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Token/Economic Agent:** All price-dependent calculations (swap amounts, collateral valuations, liquidation thresholds)
- **→ Arithmetic Agent:** Oracle price arithmetic (multiplication with token amounts, division for ratios) — precision matters
- **→ Timing Agent:** Oracle update frequency vs protocol operation frequency — can stale data be exploited in the window?
- **→ CPI Agent:** CPI calls to oracle programs — is the oracle program ID validated?
- **→ Access Control Agent:** Who can update oracle configuration (change feeds, change staleness thresholds)?

**Common False Positives:**
- Pyth price with confidence check AND staleness check — this is the correct pattern
- `max_age` of 30 seconds on Pyth — standard value, acceptable for most protocols
- Reading oracle prices in view-only (non-state-changing) instructions — can't be exploited even if stale
- Oracle accounts validated with `Account<'info, PriceAccount>` where the Pyth SDK handles owner validation — safe
- Protocols that use their own internal price (e.g., AMM pool price) for non-critical calculations — different from depending on external oracle

---

## 8. Upgrade & Admin Patterns

**What to analyze:**
- Can the program be upgraded?
- What admin functions exist?
- Are there emergency controls?
- What can admins change?

**Key questions:**
- Can admins steal user funds?
- Is there a timelock on critical changes?
- Can upgrades introduce vulnerabilities?
- Are emergency pauses implemented safely?
- Is there a governance process for changes?

**Solana/Anchor specifics:**
- Program upgrade authority
- Config account modifications
- Fee/parameter changes
- Emergency pause patterns
- Governance program integration (SPL Governance, Squads)

**Output should include:**
- All admin capabilities
- Upgrade mechanism analysis
- Centralization risks
- Governance patterns

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PK-003** (`is_paused|paused|frozen|emergency`) — Emergency/pause mechanisms
- **PD-004** (`pub authority|pub admin|pub owner`) — Authority field declarations
- **PG-001–003** (hardcoded pubkeys) — Fixed admin keys
- **PG-004** (`const.*: u64 =`) — Protocol parameters that could be admin-changeable
- **PD-002** (`has_one`) — Authority constraints on config accounts

Cross-check: Find all config/parameter accounts and trace who can modify them. Look for instructions that change protocol parameters without timelock.

**Knowledge Base Priority:**
- **Primary EPs:** EP-079–083 (Upgrade/Governance category), EP-117 (upgrade init gap), EP-126 (multisig ACL role escalation)
- **Secondary EPs:** EP-068–074 (Key Management — overlaps with admin key security), EP-094 (admin key compromise for drainage), EP-114 (flash loan governance — Beanstalk)
- **KB files:** `exploit-patterns-advanced.md` (Cat 11: Upgrade/Governance), `exploit-patterns-incidents.md` (EP-114, EP-117), `exploit-patterns-recent.md` (EP-126)
- **Protocol playbook:** `governance-attacks.md` — DAO/governance attack patterns
- **Secure patterns:** `secure-patterns.md` — Admin/upgrade safety patterns
- **Key incidents:** EP-079 (Solend governance controversy), EP-117 (Ronin V2 $12M — uninitialized upgrade), EP-126 (CrediX $4.5M — ACL escalation)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Admin Capability Inventory** — Table: Instruction | What It Changes | Who Can Call | Timelock? | Impact if Malicious
2. **Centralization Risk Assessment** — Single points of failure, key person risk, admin rug-pull capability
3. **Upgrade Analysis** — Is the program upgradeable? Who holds the upgrade authority? Is it a multisig? What's the process?
4. **Parameter Change Impact** — For each changeable parameter: what's the range? What's the worst-case if set to extreme values?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Access Control Agent:** All admin-only instruction patterns and their authorization mechanisms
- **→ Token/Economic Agent:** Admin-controllable parameters that affect economic calculations (fees, rates, caps)
- **→ State Machine Agent:** Admin-triggered state transitions (pause, unpause, migrate, upgrade)
- **→ Error Handling Agent:** Emergency controls — what happens when pause is activated? Is it atomic?

**Common False Positives:**
- Standard `upgrade_authority` on a deployer key for testnet/devnet — normal for development (but flag for mainnet)
- Admin-only parameter changes with reasonable bounds validation — intentional design flexibility
- Governance-controlled upgrades through SPL Governance with timelock — this IS the safe pattern
- `freeze_authority` on SPL Token mints held by protocol admin — standard for regulated tokens
- Config accounts with `has_one = authority` where authority is a PDA controlled by governance — decentralized control

---

## 9. Error Handling & Edge Cases

**What to analyze:**
- How are errors handled?
- What edge cases exist?
- Are failure modes safe?
- What happens in unexpected conditions?

**Key questions:**
- Can errors leave the system in an inconsistent state?
- Are edge cases (zero amounts, empty lists) handled?
- Do errors leak sensitive information?
- Can an attacker trigger denial of service?
- Can compute exhaustion be weaponized?

**Solana/Anchor specifics:**
- Error enum definitions
- `require!` and `require_keys_eq!` usage
- Transaction failure atomicity
- Compute limit handling
- Stack/heap pressure

**Output should include:**
- Error handling patterns
- Edge case coverage
- DoS attack surface
- Error information leakage

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PB-001** (`.unwrap()`) — Panic on None/Err (DoS vector)
- **PB-002** (`.expect(`) — Panic with message
- **PB-003** (array indexing) — Out-of-bounds panic risk
- **PH-001–005** (unsafe patterns) — Memory safety violations
- **PK-004** (`realloc`) — Account reallocation (size/compute issues)

Cross-check: Count total `.unwrap()` calls — protocols with 20+ unwraps in instruction handlers have systemic error handling issues. Focus on unwraps in code paths reachable by untrusted users.

**Knowledge Base Priority:**
- **Primary EPs:** EP-084–088 (Resource/DoS category), EP-106 (secp256r1 lamport theft), EP-107 (realloc OOB)
- **Secondary EPs:** EP-091 (overflow leading to DoS), EP-110 (rent thief — multi-TX init front-running)
- **KB files:** `exploit-patterns-advanced.md` (Cat 12: Resource/DoS), `exploit-patterns-incidents.md` (EP-106, EP-107, EP-110)
- **Secure patterns:** `secure-patterns.md` — Error handling best practices
- **Solana-specific:** `solana-runtime-quirks.md` — Compute unit limits, stack/heap constraints
- **Key incidents:** EP-084/085 (vector length DoS), EP-088 (unbounded iteration compute exhaustion)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Error Handling Audit** — Table: Location | Error Type | Handling Method (unwrap/expect/match/?) | User-Triggerable? | Risk
2. **Edge Case Inventory** — What happens with: zero amounts, max values, empty collections, already-closed accounts, self-referencing accounts?
3. **Compute Budget Analysis** — Which instructions are compute-heavy? Can an attacker trigger worst-case compute? Are there unbounded loops?
4. **DoS Attack Surface** — All paths where an attacker can cause transaction failure for legitimate users

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Arithmetic Agent:** Locations where `checked_*` returns `None` — what happens? Graceful error or panic?
- **→ State Machine Agent:** Error paths that could leave state partially modified (Solana TX atomicity should prevent this, but CPI chains may not)
- **→ Token/Economic Agent:** Economic DoS — can an attacker make a protocol unusable by manipulating state?
- **→ CPI Agent:** CPI calls where return value errors are ignored (`let _ =`)
- **→ Compute/Resource supplementary:** Unbounded iterations, recursive calls, large account deserialization

**Common False Positives:**
- `.unwrap()` on `Pubkey::create_program_address()` with known-valid seeds — guaranteed to succeed
- `.unwrap()` in `#[cfg(test)]` code — test-only, not production
- `require!` with a clear error message — this IS proper error handling (not a vulnerability)
- `msg!` logging that includes account keys — these are already public on-chain (not information leakage)
- Anchor-generated error codes — automatic, not a gap
- `expect("always valid")` on deserialization of program-owned accounts — if the program wrote it, it should be valid (but note: upgrade could break this)

---

## 10. Timing & Ordering

**What to analyze:**
- Are there timing dependencies?
- Can transaction ordering be exploited?
- What happens with concurrent operations?
- Are there front-running opportunities?

**Key questions:**
- Can an attacker front-run transactions?
- Are there sandwich attack opportunities?
- Can operations be reordered maliciously?
- Are there time-based vulnerabilities?
- Can simulation differ from execution?

**Solana/Anchor specifics:**
- Slot/epoch timing usage
- Clock sysvar usage
- Cross-transaction atomicity
- MEV/bundle considerations
- Jito bundle attack surface

**Output should include:**
- Timing-sensitive operations
- Ordering dependencies
- Front-running risks
- MEV attack surface

**Priority Grep Patterns (from HOT_SPOTS):**
Focus on these Phase 0.5 pattern IDs first:
- **PL-001** (`Clock::get|clock.unix_timestamp|clock.slot|clock.epoch`) — All time-dependent operations
- **PL-002** (`deadline|expir|timeout`) — Time-bound operations
- **PL-003** (`slippage|min_amount|max_amount|min_out`) — Slippage protections (presence or absence)
- **PK-003** (`is_paused|paused|frozen|emergency`) — Emergency mechanisms (timing of activation)

Cross-check: Operations that read `Clock` AND move tokens are prime MEV targets. Operations WITHOUT slippage protection (`PL-003` absent near token transfers) are sandwich-vulnerable.

**Knowledge Base Priority:**
- **Primary EPs:** EP-089–090 (Race Conditions/MEV category), EP-111 (TOCTOU simulation evasion), EP-112 (validator MEV sandwich)
- **Secondary EPs:** EP-060 (missing slippage protection), EP-093 (off-chain timing exploit — Aurory), EP-110 (multi-TX init front-running)
- **KB files:** `exploit-patterns-advanced.md` (Cat 13: Race Conditions/MEV), `exploit-patterns-incidents.md` (EP-111, EP-112)
- **Protocol playbooks:** `amm-dex-attacks.md` (sandwich/MEV section), `oracle-attacks.md` (timing-dependent oracle manipulation)
- **Key incidents:** EP-089 (Synthetify — timestamp manipulation), EP-090 (Cyclos/Hubble — MEV sandwich), EP-111 (TOCTOU — simulation returns different result than execution), EP-112 (DeezNode $13M/month sandwich)

**Mandatory Output Sections:**
Beyond the base template, this focus MUST produce:
1. **Time-Dependent Operations Map** — Table: Instruction | Uses Clock? | Time-Sensitive Calculation | What Happens If Clock Manipulated (±slot)?
2. **MEV Attack Surface** — For each state-changing instruction involving tokens: Can it be sandwiched? Does it have slippage protection? What's the maximum extractable value?
3. **Front-Running Risk Assessment** — Instructions where seeing the TX in mempool gives an advantage: what information is revealed? What action can a front-runner take?
4. **Ordering Dependency Analysis** — Operations that MUST happen in sequence — what if they're reordered? What if another TX inserts between them?

**Cross-Reference Handoffs:**
Flag these for other agents:
- **→ Token/Economic Agent:** All swap/trade/liquidation operations (prime MEV targets)
- **→ Oracle Agent:** Oracle price updates vs protocol operation timing — can stale data be exploited in the update window?
- **→ State Machine Agent:** State transitions with timing requirements (cooldowns, deadlines, epochs)
- **→ Access Control Agent:** Time-locked admin operations — is the timelock enforced on-chain?
- **→ Error Handling Agent:** What happens when time-bounded operations expire mid-execution?

**Common False Positives:**
- `Clock::get()?.unix_timestamp` used only for event logging/display — no security impact
- Slippage parameter of 0 in admin-only maintenance operations — acceptable if admin is trusted
- `slot` used for seeding randomness in non-security-critical contexts (e.g., cosmetic features)
- Epoch checks for staking reward distribution — standard Solana pattern, timing is validator-determined
- Operations with slippage protection AND deadline — already well-protected

---

## 11. Compute & Resource Limits

**Note:** This is a supplementary focus — covered by the Error Handling agent but listed here for completeness. Not spawned as a separate Phase 1 agent.

**What to analyze:**
- Compute unit usage of each instruction
- Account data size allocations
- Loop bounds and iteration limits
- Recursive call depths
- Memory/heap usage patterns

**Key questions:**
- Can an attacker cause compute exhaustion (DoS)?
- Are there unbounded loops or iterations?
- Can account reallocation be exploited?
- Are there stack overflow risks?
- Can transaction size limits be weaponized?

**Solana/Anchor specifics:**
- 200K compute units per instruction (1.4M with `set_compute_unit_limit`)
- 10KB transaction size limit
- Account data size limits (10MB max)
- `realloc` constraints and costs
- Stack frame limits (4KB per frame)
- Heap size limits (32KB default)

**Common patterns to check:**
```rust
// DANGEROUS: Unbounded loop
for item in user_provided_vec.iter() {
    // Could exhaust compute
}

// DANGEROUS: Recursive without depth limit
fn process_tree(node: &Node) {
    for child in node.children.iter() {
        process_tree(child);  // Stack overflow risk
    }
}

// SAFE: Bounded iteration
let max_items = 100;
for item in user_vec.iter().take(max_items) {
    // Bounded
}
```

**Output should include:**
- Compute-heavy operations inventory
- Unbounded iteration risks
- Stack/heap pressure points
- DoS attack vectors
- Recommended compute budgets

---

## 12. Rust-Specific Footguns (for Solana/Anchor)

**Note:** This is a supplementary focus — partially covered by Arithmetic and Error Handling agents. Not spawned as a separate Phase 1 agent.

**What to analyze:**
- Integer overflow behavior (debug vs release)
- `unsafe` block usage
- Panic conditions (`unwrap`, `expect`, array indexing)
- Memory management patterns

**Key questions:**
- Are there unchecked arithmetic operations?
- Do `unsafe` blocks have proper safety comments?
- Can panics cause denial of service?
- Are there timing-safe comparison issues?

**Critical patterns:**
```rust
// DANGEROUS: Wraps in release, panics in debug
let result = a + b;

// SAFE: Explicit handling
let result = a.checked_add(b).ok_or(ErrorCode::Overflow)?;

// DANGEROUS: Panic on failure
let value = option.unwrap();

// SAFE: Error propagation
let value = option.ok_or(ErrorCode::ValueNotFound)?;

// DANGEROUS: Timing-vulnerable comparison
if computed_mac == expected_mac { ... }

// SAFE: Constant-time comparison
if constant_time_eq(&computed_mac, &expected_mac) { ... }
```

**Output should include:**
- All unchecked arithmetic locations
- All `unsafe` blocks with safety analysis
- All panic-possible code paths
- Timing-vulnerable comparisons
- Type confusion risks

---

## Cross-Focus Considerations

Auditors should note when their focus intersects with others:

| Your Focus | Watch For Intersections With |
|------------|------------------------------|
| Access Control | Upgrade/Admin, CPI, Token/Economic (authority over funds) |
| Arithmetic | Token/Economic, Oracle, Rust Footguns, Error Handling |
| State Machine | Timing, Error Handling, Account Validation (lifecycle), Access Control |
| CPI | Access Control, Account Validation, Token/Economic, Error Handling |
| Token/Economic | Arithmetic, Oracle, Timing, Access Control, CPI |
| Account Validation | CPI, State Machine, Access Control, Error Handling |
| Oracle | Arithmetic, Timing, Token/Economic, CPI |
| Upgrade/Admin | Access Control, State Machine, Token/Economic |
| Error Handling | All (errors can affect any area), Compute/Resource, Rust Footguns |
| Timing | State Machine, Token/Economic, Oracle, Access Control |
| Compute/Resource | Arithmetic, Error Handling, CPI |
| Rust Footguns | Arithmetic, Error Handling, Compute |

Document these intersections for the synthesis phase.
