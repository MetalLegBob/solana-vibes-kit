# Wave 8: Protocol-Specific Deep Research

**Date:** 2026-02-06
**Sources:** 40+ Exa searches across 6 protocol categories
**Focus:** Protocol-specific architecture, incidents, audit findings, and unique attack surfaces

---

## 1. AMM/DEX Protocols

### Raydium

**Raydium CLMM Tick Manipulation ($505K Immunefi Bounty, Jan 2024)**
- **Reporter:** @riproprip via Immunefi
- **Location:** `increase_liquidity.rs` function in CLMM program
- **Root Cause:** Failed to validate that `remaining_accounts[0]` was the correct `TickArrayBitmapExtension` account linked to the pool's state
- **Mechanism:** Attacker supplies arbitrary account as bitmap extension → manipulates tick status (flip enabled/disabled) → erroneously adds excessive liquidity → drains during swaps
- **Impact:** Could drain entire CLMM liquidity pools
- **Fix:** Added validation that `remaining_accounts[0]` matches the pool's TickArrayBitmapExtension
- **Source:** https://immunefi.com/blog/all/raydium-tick-manipulation-bugfix-review/

**Raydium CP-Swap Liquidity Drain ($505K Immunefi Bounty, Mar 2025)**
- **Reporter:** @Lastc0de via Immunefi
- **Location:** `fn deposit()` in cp-swap program, specifically `fn lp_tokens_to_trading_tokens`
- **Root Cause:** No validation for input amounts; integer arithmetic with `Ceiling` rounding direction calculated required Token 1 amount as zero when Token 0 deposit was small
- **Mechanism:** Deposit tiny amount of Token 0 → Ceiling rounding makes Token 1 required = 0 → mint LP tokens disproportionately → repeat to drain
- **Impact:** Could drain cp-swap liquidity pools
- **Fix:** Added `require` statements ensuring calculated output amounts are non-zero
- **Source:** https://immunefi.com/blog/all/raydium-liquidity-drain-bug-fix-review/

**Raydium CP-Swap Creator Fee Hijacking (Dec 2025)**
- **Reporter:** LRKTBEYK via Full Disclosure mailing list
- **Location:** CP-Swap program, Issue #3
- **Root Cause:** UncheckedAccount validation gap in creator fee collection
- **Mechanism:** Attackers steal all creator fees from pools they didn't create
- **Note:** Submitted to Immunefi (report 62070) but closed as "out of scope"
- **Also enables:** Uncapped fee rate exploitation
- **Source:** https://seclists.org/fulldisclosure/2025/Dec/24

**Raydium Admin Key Compromise ($4.4M, Dec 2022)**
- **Root Cause:** Trojan compromised Pool Owner (Admin) account private key
- **Mechanism:** Used `withdrawPNL` and `SetParams(AmmParams::SyncNeedTake)` to inflate fee balances → repeatedly withdraw from 8 constant product pools
- **Impact:** $4.4M stolen from AMM V4 pools (not CLMM)
- **Fix:** Revoked compromised account, hardware wallet, Squads multisig for admin, removed extraneous admin options
- **Source:** https://raydium.medium.com/detailed-post-mortem-and-next-steps-d6d6dd461c3e

**Raydium OtterSec CLMM Audit (Q3 2022)**
- Audited before CLMM launch
- PDF available at raydium-docs repo

### Orca

**Orca Whirlpool Neodyme Audit (May 2022)**
- **High:** Lower tick could be larger than upper tick — tick ordering not enforced, could create invalid positions
- **Medium:** Integer overflow when swapping — overflow in checked_mul_shift_right_round_up_if
- **Informational:** Additional overflow finding
- All findings resolved before launch
- **Source:** https://dev.orca.so/.audits/2022-05-05.pdf

**Orca Whirlpool Kudelski Security Audit (Jan 2022)**
- Additional pre-launch audit
- **Source:** https://dev.orca.so/.audits/2022-01-28.pdf

**Orca Bug Bounty**
- Active on Immunefi
- No public bounty payouts disclosed

### Jupiter

**Jupiter Edge Oracle (Chaos Labs)**
- Primary oracle for Jupiter Perps (launched Sep 2024)
- Chainlink and Pyth used for verification and backup
- Designed to be resilient to outliers, anomalies, liquidity and volatility distortions
- Moves away from "messenger oracles" — accountability in data sourcing
- **Source:** https://chainwire.org/2024/09/12/edge-the-new-decentralized-oracle-protocol/

**Jupiter JLP Vault — Hyperliquid-Style Attack Unlikely**
- Limited asset list (SOL, ETH, wBTC) — eliminates thin-market manipulation
- Oracle-based pricing (not internal order book) — harder to game
- Automated liquidation at oracle price — no manual intervention delays
- Losses go directly to JLP pool — no handoffs exploitable
- **Contrast:** Hyperliquid's JELLY incident exploited low-liquidity token + internal order book
- **Source:** https://blockworks.co/news/jupiter-solana-risk-vault-hyperliquid-attack

**Jupiter Limit Order V2 (Oct 2025)**
- Privacy-protected trading: orders hidden until trigger price reached
- Prevents front-running attacks
- One-Cancels-Other bundled orders
- **Source:** https://phemex.com/news/article/jupiter-exchange-unveils-limit-order-v2

**Jupiter Perpetual Audit**
- OtterSec audit: PDF at hub.jup.ag (perpetual-offside)
- No public exploit incidents

### Lifinity

- **Architecture:** Proactive market maker using Pyth oracle-based pricing + concentrated liquidity + automatic rebalancing
- **Key Feature:** Oracle adjusts prices to prevent trades against stale prices (reduces impermanent loss)
- **Status:** Shut down Dec 2025 after community vote, $43.4M distributed to $LFNTY holders
- **No known security exploits** — protocol operated 3+ years without incident
- **Source:** https://anvikakumar.medium.com/lifinity-deep-dive-the-proactive-market-maker

---

## 2. Lending Protocols

### Solend

**Solend USDH Oracle Attack ($1.26M, Nov 2022)**
- **Root Cause:** USDH price feed relied solely on Saber pool price via Switchboard oracle
- **Mechanism:**
  1. Attacker spends 100K USDC to pump USDH price on Saber
  2. Write-locks Saber account to prevent arbitrage in same slot
  3. Switchboard oracle picks up inflated price in next slot
  4. Attacker deposits USDH as collateral at inflated price
  5. Borrows $1.26M in assets against inflated collateral
- **Sophistication:** Predicted oracle update timing + prevented arbitrage via account write-locking
- **Affected pools:** Kamino USDH ($1.5M TVL), Stable ($1.67M TVL), Coin98 ($1.58M TVL)
- **Fix:** Switchboard v2 with MinTask (cap stablecoin prices at 1.01), liquidity monitoring
- **Sources:** https://ackee.xyz/blog/2022-solana-hacks-explained-solend/, https://blog.solend.fi/usdh-price-manipulation-impact-on-isolated-pools-4f79ff6af2ba

**Solend Rent Thief (Aug 2022, OtterSec)**
- Bot stealing rent from uninitialized accounts across Solana ecosystem
- Attempted attack on new permissionless pools
- Main protocol funds unaffected
- **Source:** https://osec.io/blog/2022-08-19-solend-rent-thief/

**Solend Faulty Account Validation (Aug 2021)**
- Insufficient validation in UpdateReserveConfig instruction
- Attempted theft of ~$2M, $0 actual loss
- **Source:** Helius comprehensive analysis

### MarginFi

**MarginFi Flash Loan Vulnerability ($160M at Risk, Sep 2025)**
- **Reporter:** Felix Wilhelm (Asymmetric Research) via bug bounty
- **Root Cause:** New `transfer_to_new_account` instruction failed to check if source account was in flash loan state
- **Flash loan mechanism:** Used instruction introspection via `Instructions sysvar`. `lending_account_start_flashloan` sets `ACCOUNT_IN_FLASHLOAN` flag (skips health checks). Enforces repayment by checking `lending_account_end_flashloan` exists later in transaction.
- **Exploit sequence:**
  1. `lending_account_start_flashloan` — borrow funds, skip health check
  2. `transfer_to_new_account` — zeros out old account's lending_account data, erases liabilities
  3. Old account disabled, liabilities erased, borrowed funds kept
- **Impact:** $160M in user deposits at risk
- **Fix:** Block account transfers during flash loans; prevent disabled accounts from repayment
- **Status:** Fixed before any exploit
- **Sources:** https://blog.asymmetric.re/threat-contained-marginfi-flash-loan-vulnerability/, https://blockworks.co/news/marginfi-flash-loan-bug

### Kamino

**Kamino Security Posture**
- 18 external audits + 4 formal verifications (Certora)
- 3 years live without security incident
- $1.5M maximum bug bounty on Immunefi
- **Certora audit:** Precision loss fix via formal verification
- **Source:** https://kamino.com/security, https://www.certora.com/blog/securing-kamino-lending

**Kamino USDH Exposure (Nov 2022)**
- Kamino USDH pool ($1.5M TVL) affected by Solend oracle manipulation
- Indirect victim — price feed manipulation on Saber affected Solend pools where Kamino tokens were listed

### Jet Protocol

**Jet Protocol Arbitrary Withdrawal Vulnerability ($20-25M at Risk, 2022)**
- **Root Cause:** Unvalidated input account — `deposit_note_account` in `withdraw_tokens.rs` (line 54) was an unvalidated `AccountInfo`
- **Mechanism:** `market_authority` is authority of all users' deposit accounts. Attacker supplies any user's `deposit_note_account` → burns their notes → withdraws their tokens
- **Timeline:** Vulnerability introduced Dec 15, 2021. Became exploitable Dec 21, 2021. Fixed Jan 27, 2022 (5-week window)
- **Found by:** Jayne (Solana ecosystem developer), privately disclosed
- **Sec3 analysis:** Would have been detected by sec3 X-Ray Auto Auditor easily — classic unvalidated input account
- **SlowMist analysis:** PDA and Anchor account verification design issue — Solana's account model requires explicit validation unlike Ethereum's state model
- **Sources:** https://sec3.dev/blog/on-a-20m-bug-in-jet-protocol, https://slowmist.medium.com/vulnerability-essay-discussing-pda-and-anchor-account-verification-through-the-jet-protocol-dba1e2a0f671

---

## 3. Staking/LST Protocols

### Marinade

**Security Posture**
- Multiple audits: Ackee Blockchain (Jul 2021), Kudelski Security (Nov 2021), Neodyme (Oct 2023)
- Active bug bounty on Immunefi
- Multisig governance
- No major exploits in 4+ years of operation
- **Neodyme 2023 audit:** Liquid staking program review with findings addressed
- **Source:** https://docs.marinade.finance/marinade-protocol/security

### Jito

**Jito Restaking Audit Competition ($150K, Nov 2024)**
- First-ever restaking audit competition on Immunefi
- Testing restaking protocol: flexible staking parameters, customizable slashing conditions, vault receipt tokens
- **Source:** https://immunefi.com/blog/customers/jito-launches-150-000-restaking-audit-competition-on-immunefi/

**Jito Validator Sandwich Enforcement (Oct 2025)**
- Banned 15 validators for evidence of sandwich attacks
- On-chain report exposed MEV abuse — ~6% of proposed blocks contained sandwiched transactions
- Jito responds by removing sandwich-attacking validators from JitoSOL delegation
- **Source:** https://followin.io/en/feed/20995159

**Jito MEV Architecture**
- Block-building service for Solana
- Tip-based MEV extraction (vs. transaction reordering)
- Provides bundle landing for searchers
- JitoSOL holders earn MEV rewards alongside staking yield

### Sanctum

**Architecture**
- Multi-LST liquidity pool (Infinity Pool) — enables swaps between all whitelisted LSTs
- INF token = weighted average yield of pooled LSTs + trading fees
- Uses SPL Stake Pool program (helped Solana Labs build it)
- Router for instant LST-SOL swaps
- **Source:** https://learn.sanctum.so/docs/technical-documentation/infinity

**mSOL Depeg Event (Dec 2023)**
- Even large stake pools can temporarily depeg under large selling pressure
- Highlighted need for deep LST liquidity
- Sanctum Infinity Pool designed to solve this fragmented liquidity problem

**No Known Security Exploits**
- Uses battle-tested SPL stake pool infrastructure
- No public incidents or bounty payouts

---

## 4. Bridge Protocols

### Wormhole

**Wormhole "One Key" Vulnerability ($50K Immunefi Bounty, Jan 2024)**
- **Reporter:** Marco Hextor via Immunefi
- **Target:** Wormchain (Cosmos SDK + CosmWasm)
- **Root Cause:** Guardian set expiration logic — initial sets (index 0 and 1) had `ExpirationTime = 0`, meaning they never expired. VAA verification only checked expiration if `ExpirationTime > 0`.
- **Mechanism:** Both initial guardian sets shared the same "genesis key". Since they never expired, attacker could use single genesis key to validate any VAA on Wormchain, bypassing 13-of-19 quorum.
- **Impact:** Complete governance manipulation — single key controls all cross-chain messages on Wormchain
- **Fix:** Only latest guardian set can be used if expiration time is 0. Implemented within 48 hours.
- **Note:** Variants caught on other chains previously
- **Source:** https://marcohextor.com/wormhole-one-key-vulnerability/

**Wormhole Uninitialized Implementation (2022)**
- Implementation contract was upgraded but not initialized
- $1.8B in assets at risk — hacker could have held protocol ransom
- **Source:** https://github.com/immunefi-team/wormhole-uninitialized

**Wormhole Security Architecture**
- 19 Guardian nodes validate and sign messages (13-of-19 super majority)
- Guardians run full nodes (not light nodes) of every connected blockchain
- Signed VAAs (Verified Action Approvals) as core security primitive
- If blockchain suffers consensus attack, it disconnects rather than producing invalid VAAs
- **Source:** https://wormhole.com/docs/protocol/security

**Wormhole Audit Repository**
- Public audits at github.com/wormhole-foundation/wormhole-audits
- NTT (Native Token Transfer) audit competitions ongoing

### deBridge

**Security Posture**
- Halborn audit of Solana contracts (Jan 2024)
- Security audit repo at github.com/debridge-finance/debridge-security
- No public security incidents
- DLN (Decentralized Liquidity Network) emerging as preferred liquidity bridge for Solana
- **Source:** https://www.halborn.com/audits/debridge/solana-contracts-solana-program-security-assessment

### Allbridge

**Allbridge Flash Loan Exploit ($570K, Apr 2023)**
- **Chain:** BNB Chain (not Solana)
- **Root Cause:** Price manipulation in stablecoin pools
- **Mechanism:** Flash loan to manipulate USDT/BUSD pool balances → drain ~$570K
- **Note:** Allbridge operates cross-chain including Solana; attack was on BNB side
- **Audits:** Kudelski Security, Quarkslab, Sherlock
- **Source:** https://medium.com/neptune-mutual/how-was-allbridge-exploited-956a05f3cb58

---

## 5. Governance/DAO Protocols

### Realms / SPL Governance

**No Protocol-Specific Exploits Found**
- SPL Governance is the standard DAO framework on Solana
- Realms is the primary UI for SPL Governance
- General governance attack patterns (from Wave 7) apply:
  - Token accumulation for quorum manipulation
  - Proposal parameter manipulation
  - Flash loan governance (theoretical on Solana — constrained by single-tx atomic execution)
- Key risk: governance proposals that change program upgrade authority or treasury access
- **Relevant EPs:** EP-114 (flash loan governance), existing governance-attacks.md vectors

---

## 6. NFT/Marketplace Protocols

### Metaplex

**Metaplex Token Metadata Mad Shield Audit (Dec 2023) — 3 Critical Findings**

1. **SHIELD_MTM_01 [Critical]:** Burn instruction permanently disables all pNFT operations
   - Missing validation for `token_record` account when authority is token owner
   - Attacker burns the token record → all future pNFT operations fail

2. **SHIELD_MTM_02 [Critical]:** All pNFT rules bypassed in transfer instruction
   - When transfer authority is token delegate, validation of metadata account skipped in one execution path
   - Complete bypass of creator-defined transfer rules (royalty enforcement, allowlists, etc.)

3. **SHIELD_MTM_03 [Critical]:** pNFT AllowList rule bypassed in transfer
   - Provide AllowList pubkey as owner but transfer to destination token account owned by different address
   - Violates royalty enforcement — NFT transferred to non-approved program

4. **SHIELD_MTM_04:** pNFTs can become non-transferable (severity not specified in available data)

- All findings addressed and resolved
- **Source:** https://drive.google.com/file/d/1jy3VNq2ghjZGMtioM09Jml_3erI-eZGt/edit

**Metaplex Bubblegum Creator Verification CVE (GHSA-8r76-fr72-j32w, Dec 2022)**
- **Found by:** @metamania01 (Solshield)
- **Root Cause:** Provision in Token Metadata that allows creators who have signed compressed NFTs to decompress with verified creators
- **Mechanism:** Verify a creator that did not actually sign, exploiting the decompress-with-verified-creators path
- **Impact:** Fake creator verification on compressed NFTs
- **Fix:** Patched in commit c18591a7
- **Source:** https://advisories.gitlab.com/pkg/cargo/mpl-bubblegum/GHSA-8r76-fr72-j32w

**Bubblegum V2 (May 2025)**
- Major upgrade: enhanced cNFT programmability with plugins
- 1 billion assets created on Bubblegum V1
- cNFTs stored in Merkle trees, indexed via DAS API
- **Security consideration:** Merkle proof verification, concurrent tree operations, DAS indexer trust assumptions

**pNFT Architecture (Security-Relevant)**
- Token account always frozen on SPL Token program
- Operations funneled through Token Metadata (atomic thaw-operate-refreeze)
- Rule Sets via Token Auth Rules program for transfer restrictions
- Creator-defined rules for royalty enforcement
- **Key risk:** Rule bypass through alternative execution paths (as found in Mad Shield audit)

### Magic Eden / Tensor

- **Magic Eden:** Already covered in Wave 6 (indexer bypass, Candy Machine V2 CVE)
- **Tensor:** AMM-based NFT marketplace with liquidity provision risks
  - Standard AMM risks apply (impermanent loss, MEV)
  - Compressed NFT support adds indexer trust assumptions
  - No public security incidents or bounty payouts found
- **General NFT marketplace risks:** Off-chain indexer manipulation, metadata spoofing, royalty enforcement bypass

---

## Key New Findings Summary

### New EP Candidates

1. **EP-119: Flash Loan Account Migration Bypass (MarginFi pattern)**
   - New instruction (`transfer_to_new_account`) bypasses flash loan repayment checks
   - Zeros out liabilities by disabling old account mid-flash-loan
   - $160M at risk. Generalizable to any protocol using instruction introspection for flash loan enforcement.
   - *Note: This is more detailed than EP-118 which covered a similar but different pattern*

2. **EP-120: CLMM Bitmap Extension Spoofing (Raydium pattern)**
   - `remaining_accounts` not validated as correct protocol-owned bitmap account
   - Attacker supplies arbitrary account to manipulate tick state
   - Applicable to any CLMM implementation using bitmap extensions via remaining_accounts

3. **EP-121: LP Rounding Direction Drain (Raydium CP-Swap pattern)**
   - Ceiling rounding in deposit calculations allows zero-amount token deposits
   - Mint LP tokens with asymmetric deposit (one token = tiny, other = 0)
   - Generalizable to any AMM with unsafe rounding in liquidity math

4. **EP-122: Creator Fee Account Validation Gap**
   - UncheckedAccount for fee recipient allows stealing fees from other creators' pools
   - Pattern: any instruction taking fee destination as unchecked account input

5. **EP-123: Oracle Write-Lock Price Manipulation (Solend pattern)**
   - Pump price on thin DEX → write-lock DEX accounts to prevent arbitrage → oracle captures inflated price
   - Combines economic manipulation with Solana-specific account locking
   - Applicable to any lending protocol using single DEX as oracle source

6. **EP-124: Guardian/Validator Set Expiration Bypass (Wormhole pattern)**
   - Genesis validator sets with ExpirationTime=0 never expire
   - Bypass multi-sig quorum using legacy keys
   - Applicable to any multi-sig or guardian system with legacy key sets

7. **EP-125: pNFT Rule Bypass via Delegate Path (Metaplex pattern)**
   - Token delegate execution path skips metadata validation
   - Complete bypass of creator-defined transfer rules
   - Applicable to any NFT standard with programmable transfer rules

8. **EP-126: Unvalidated Note/Receipt Token Burn (Jet Protocol pattern)**
   - Program authority can burn any user's receipt tokens (notes/LP) if account is unvalidated
   - Attacker supplies victim's note account → burn their position → withdraw their funds
   - Classic unvalidated account pattern specific to lending/vault receipt mechanisms

### Existing EP Expansions

- **EP-036 (Account Revival):** Solend rent thief — bot exploiting uninitialized accounts for rent
- **EP-095 (Supply Chain):** No new additions this wave
- **EP-112 (MEV Sandwich):** Jito banned 15 validators for sandwich attacks (Oct 2025), ~6% blocks affected

### Protocol Playbook Updates

**amm-dex-attacks.md:**
- Raydium-specific: CLMM tick bitmap spoofing, CP-Swap rounding drain, creator fee hijacking, admin key compromise
- Orca-specific: Whirlpool tick ordering, integer overflow patterns
- Jupiter-specific: Edge oracle architecture, JLP vault defenses, Limit Order V2 privacy
- Lifinity: Oracle-based proactive market making (no exploits, shut down Dec 2025)

**lending-attacks.md:**
- Solend-specific: USDH oracle write-lock, rent thief, UpdateReserveConfig bypass
- MarginFi-specific: Flash loan transfer_to_new_account bypass ($160M)
- Kamino-specific: Formal verification approach, USDH indirect exposure
- Jet-specific: Unvalidated deposit_note_account ($20-25M)

**staking-attacks.md:**
- Marinade: Audit-heavy approach (3 firms), no incidents
- Jito: MEV economics, validator enforcement, restaking audit competition
- Sanctum: Infinity Pool multi-LST design, mSOL depeg event (liquidity risk)

**bridge-attacks.md:**
- Wormhole-specific: Guardian set expiration bypass, uninitialized implementation, NTT framework
- deBridge: Clean security record, Halborn audited
- Allbridge: BNB-side flash loan exploit ($570K), multi-chain bridge risk surface

**nft-attacks.md:**
- Metaplex-specific: 3 Critical pNFT bypass findings, Bubblegum creator verification CVE
- Tensor: Compressed NFT indexer trust assumptions
- Bubblegum V2: New plugin architecture

**oracle-attacks.md:**
- Solend USDH: Write-lock + single oracle source exploitation (detailed mechanism)
- Jupiter Edge: Counter-example of strong oracle design
