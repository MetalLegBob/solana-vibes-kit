# Wave 7: Cross-Chain Lessons for Solana

**Date:** 2026-02-06
**Goal:** Extract exploit patterns from EVM/cross-chain incidents that teach lessons applicable to Solana
**Sources:** 50+ Exa deep searches across bridge exploits, flash loans, oracle manipulation, governance attacks, reentrancy, lending exploits

---

## Section 1: Bridge Exploit Patterns

### 1.1 Ronin Bridge — $625M (March 2022)
**Category:** Validator key compromise / insufficient multisig threshold
**Root Cause:** Attacker compromised 5 of 9 validator private keys (4 Sky Mavis + 1 Axie DAO)
**Mechanism:**
- Ronin sidechain required 5/9 validator signatures for withdrawals
- Sky Mavis asked Axie DAO to sign on its behalf during high load (Nov 2021)
- Axie DAO granted an allowlist; practice was discontinued in Dec 2021 but **allowlist was never revoked**
- Attacker accessed Sky Mavis systems, used gas-free RPC node to obtain Axie DAO validator signature
- With 5 keys, forged fake withdrawal transactions for 173,600 ETH + 25.5M USDC
- Hack went undetected for 6 days (discovered Mar 29, occurred Mar 23)
- Attributed to North Korea's Lazarus Group (social engineering vector)

**Solana Lesson:** Wormhole guardians, deBridge validators, and any bridge relying on multisig/threshold signatures face identical risk. Stale permissions (allowlists never revoked) are a universal vulnerability. Rate limits saved Ronin from worse damage in the 2024 re-hack ($12M vs potential $84M).

**Second Ronin Hack — $12M (August 2024):**
- During contract upgrade v2→v4, team **forgot to call `initializeV3`**
- Left `_totalOperatorWeight` uninitialized (defaulted to 0)
- Disabled `minimumVoteWeight` check entirely
- MEV bot detected and exploited within minutes
- Daily withdrawal limit of $12M prevented $72M additional loss
- **Solana Lesson:** Uninitialized state after upgrades is a universal pattern (see EP-038). Rate limits as defense-in-depth work.

### 1.2 Nomad Bridge — $190M (August 2022)
**Category:** Message verification bypass / initialization bug
**Root Cause:** During upgrade, `committedRoot` was initialized to `0x00`, which matched the default for unproven messages
**Mechanism:**
- Replica contract's `acceptableRoot()` checked `confirmAt[_root]`
- When `_root = bytes32(0)` (default for unproven messages), `confirmAt[bytes32(0)]` was set to `1` during init
- `block.timestamp >= 1` always returned true → **every message was auto-proven**
- Anyone could call `process()` with arbitrary messages, replacing destination address
- 300+ addresses copied the exploit transaction, creating a "mob attack"
- No advanced technical knowledge needed — just copy-paste the calldata with your address

**Solana Lesson:** Default/zero values in verification logic are extremely dangerous. Any bridge verification that uses `0` or `None` as a sentinel must ensure these can't match uninitialized or default states. The "copy-paste" nature means one exploit becomes a free-for-all.

### 1.3 Poly Network — $611M (August 2021) + $10M (July 2023)
**Category:** Cross-chain message authorization bypass / function selector collision
**Root Cause (2021):** `EthCrossChainManager` could call any public method on any contract if function signature matched `(bytes,bytes,uint64)`
**Mechanism:**
- Attacker found that by brute-forcing a method name, they could generate a function selector (`0x41973cd9`) that matched `putCurEpochConPubKeyBytes` on the privileged `EthCrossChainData` contract
- This allowed replacing legitimate Keeper public keys with attacker's keys
- With control of Keeper keys, attacker authorized withdrawals across Ethereum, BSC, and Polygon
- All $611M was returned (attacker claimed it was to expose vulnerabilities)

**2023 Re-hack ($10M):**
- Trojan virus implanted in consensus node compilation environment
- Stole consensus private keys → forged cross-chain block headers
- $43B in tokens minted but only $10M extractable due to low liquidity

**Solana Lesson:** CPI target program validation is the Solana equivalent — never allow arbitrary program invocation. Function selector collisions are EVM-specific but the pattern of "unrestricted method dispatch" applies to any system that routes calls by identifier. Supply chain attacks on build environments (2023 hack) apply universally.

### 1.4 Harmony Horizon Bridge — $100M (June 2022)
**Category:** Insufficient multisig threshold / key management
**Root Cause:** Bridge only required 2-of-5 signatures; attacker compromised 2 private keys
**Mechanism:**
- Private keys suspected stored in plaintext on hot wallet servers
- Attacker compromised 2 servers, obtained 2 keys
- Called `confirmTransaction()` directly to authorize fake withdrawals
- $100M drained across Ethereum and BNB Chain
- Post-hack: threshold raised to 4-of-5

**Solana Lesson:** 2-of-N thresholds are always dangerous. Community members warned about this exact risk months before the hack. This pattern applies to any Solana program using multisig governance with low thresholds.

### 1.5 Multichain Bridge — $130M (July 2023)
**Category:** Single point of failure / key centralization
**Root Cause:** CEO (Zhaojun) was sole custodian of MPC keys; arrested by Chinese police in May 2023
**Mechanism:**
- CEO's computers, phones, hardware wallets, and mnemonic phrases confiscated
- Bridge relied on MPC (multi-party computation) keys controlled by CEO
- $130M drained across Fantom ($130M), Moonriver ($6.8M), Dogechain ($600K)
- Chainalysis suggested possible inside job or key access by authorities

**Solana Lesson:** Single points of failure in key management are catastrophic. Any Solana bridge or protocol where one person controls upgrade authority, treasury keys, or operational keys faces identical risk. This is the extreme case of EP-058 (centralized admin risks).

### Bridge Exploit Taxonomy (from academic research)
**Source:** "SoK: Cross-Chain Bridging Architectural Design Flaws" (2024) — analyzed 60 bridges, 34 exploits

**Key vulnerability categories:**
1. **Signature Verification Failures** — $1.2B lost (Ronin, Harmony)
2. **Smart Contract Vulnerabilities** — $847M lost (Wormhole, Nomad)
3. **Oracle Manipulation** — $423M lost (BNB Bridge, Multichain)
4. **Validator Collusion** — $298M lost (various smaller bridges)
5. **Private Key Compromise** — Most common root cause across all categories

**Seven Key Vulnerabilities (Chainlink research):**
1. Unsecure private key management
2. Unaudited smart contracts
3. Insufficient validator decentralization
4. Lack of rate limiting / circuit breakers
5. Missing emergency pause mechanisms
6. Inadequate monitoring / slow detection
7. Centralization of operational control

---

## Section 2: Flash Loan Attack Patterns

### 2.1 bZx Attacks — $355K + $600K (February 2020)
**Category:** First-ever flash loan attacks / oracle + leverage manipulation
**Attack 1:**
- Flash loaned 10,000 ETH from dYdX
- Deposited 5,500 ETH in Compound → borrowed 112 WBTC
- Used bZx margin trading to short ETH → massively pumped WBTC price on Uniswap (3x)
- Sold 112 WBTC at inflated price → ~6,871 ETH
- Repaid flash loan → 1,271 ETH profit ($355K)
- Root cause: bZx collateral check logic bug

**Attack 2:**
- Flash loaned from bZx itself
- Distorted ETH/sUSD price on Kyber by consuming liquidity
- Used distorted price to execute undercollateralized borrow

**Solana Lesson:** Flash loans amplify any pricing or collateral calculation weakness. Solana's flash loans (via instruction introspection) enable identical patterns. Any protocol using spot DEX prices for collateral valuation is vulnerable.

### 2.2 PancakeBunny — $45M (May 2021)
**Category:** Flawed LP price calculation / reward minting exploit
**Mechanism:**
- Flash loaned from PancakeSwap + ForTube Bank
- Flooded WBNB-BUNNY LP pool with BNB to manipulate LP price ratio
- `PriceCalculatorBSCV1` contract used manipulable spot LP price for reward calculation
- Tricked `BunnyMinterV2` into minting 7M BUNNY tokens
- Dumped minted tokens → $45M profit

**Solana Lesson:** Any Solana protocol that uses LP token prices or pool ratios for reward calculation, collateral valuation, or minting logic must use TWAP or external oracles, not spot pool state. This applies directly to yield aggregators on Solana (Tulip, Francium, etc.).

### 2.3 C.R.E.A.M. Finance — $130M+ (October 2021)
**Category:** Oracle manipulation via donation / self-referential pricing
**Mechanism:**
- Flash borrowed DAI from MakerDAO
- Created yUSD tokens, then manipulated `pricePerShare` by donating yCrv directly to yUSD contract
- This doubled the perceived collateral value
- Borrowed massive amounts against inflated collateral
- Root cause: Oracle relied on internal `pricePerShare` which could be manipulated via direct transfers

**Solana Lesson:** Self-referential pricing (where the price depends on the contract's own balance or internal state) is exploitable whenever an attacker can donate/transfer tokens to manipulate that state. This is directly relevant to Solana vault share pricing — any vault using `total_assets / total_shares` is vulnerable to donation attacks.

### 2.4 Euler Finance — $197M (March 2023)
**Category:** Missing solvency check in donation function / liquidation exploit
**Mechanism:**
- Flash loaned $30M DAI from Aave
- Deposited into Euler → got eDAI, leveraged up to 19x
- Called `donateToReserves()` — burned eDAI without burning corresponding dDAI
- This drove position's health factor below 100%, creating intentional bad debt
- Triggered soft liquidation at favorable discount → extracted $197M
- Root cause: `donateToReserves()` lacked insolvency/health check after execution

**Solana Lesson:** Any function that modifies collateral or debt positions MUST verify solvency/health factor afterward. This applies to any Solana lending protocol with "donate" or "contribute" type functions. The pattern: find any function that reduces collateral without checking solvency afterward. Sherlock (auditor) missed this and paid $4.5M in claims.

### 2.5 MarginFi Flash Loan Bug (September 2025) — $160M at risk, no loss
**Category:** Flash loan repayment bypass via account migration
**Mechanism:**
- New `transfer_to_new_account` instruction allowed migrating a MarginfiAccount mid-flash-loan
- Migration zeroed out old account balances and disabled it
- Attacker could: start flash loan → borrow → migrate to new account → end flash loan on old (empty) account
- Health check passed because liability was transferred away
- $160M at risk, privately disclosed by Asymmetric Research, patched before exploit

**Solana-Specific Lesson:** Flash loans on Solana use instruction introspection (not callback patterns). Any instruction that can move or reset account state mid-transaction can bypass repayment checks. Account migration/transfer instructions MUST be blocked during active flash loans.

### 2.6 Solend Oracle Manipulation — $1.26M (November 2022)
**Category:** Single-source oracle manipulation on Solana
**Mechanism:**
- Attacker pumped USDH price on Saber by spending USDC
- Spammed Saber account to prevent arbitrage in same slot
- Switchboard oracle picked up inflated price
- Borrowed $1.26M against inflated USDH collateral
- Root cause: Solend relied solely on Switchboard from a single low-liquidity Saber pool

**Solana-Specific Lesson:** Single-source oracles from low-liquidity pools are trivially manipulable. Multiple oracle sources + TWAP + minimum liquidity requirements are essential.

### 2.7 Jupiter Flash Loan Attack — $50M (August 2025)
**Noted:** Flash loan attack on Jupiter DEX on Solana, $50M lost. Details sparse in search results but confirms that Solana flash loan attacks are real and growing.

---

## Section 3: Oracle Manipulation Patterns

### 3.1 Mango Markets — $116M (October 2022) — Already in KB as EP-006
**Category:** Spot market price manipulation → inflated collateral
**Mechanism:**
- Two accounts: one long MNGO-PERP, one short
- Whale-traded MNGO on Serum DEX → 13x price spike
- Oracle (averaging FTX + AscendEX + Serum) picked up inflated price
- Long position showed $120M+ unrealized profit → borrowed against it
- Root cause: Oracle averaged spot prices from manipulable venues

### 3.2 Harvest Finance — $34M (October 2020)
**Category:** Flash loan → pool ratio manipulation → vault share mispricing
**Mechanism:**
- Flash loaned USDC from Uniswap
- Traded to manipulate USDC/USDT ratio in Curve pool
- Deposited into Harvest vault at manipulated (low) share price
- Reversed the manipulation → share price returned to normal
- Withdrew at higher share price → profit
- Repeated multiple times in one transaction

**Solana Lesson:** Vault deposit/withdrawal pricing based on DEX pool ratios is vulnerable. The "sandwich the vault" pattern: manipulate price down → deposit → restore price → withdraw at profit. Any Solana vault that prices shares using spot pool state is vulnerable.

### 3.3 Common Oracle Manipulation Taxonomy
**From Cyfrin research:** Over $403.2M stolen via oracle manipulation in a single year

**Categories:**
1. **Spot price manipulation** — Trade on DEX to move price, use as collateral/oracle
2. **Self-referential pricing** — Protocol's own token/pool state used as oracle
3. **Single-source dependency** — Relying on one DEX/feed with manipulable liquidity
4. **Stale price exploitation** — Using old/delayed prices for time-sensitive operations
5. **LP token mispricing** — Calculating LP value from manipulable reserves
6. **Cross-venue arbitrage timing** — Price discrepancies between venues during manipulation

**Solana-specific defenses:**
- Use Pyth TWAP (not just spot), require minimum confidence intervals
- Use Switchboard + Pyth dual-oracle pattern
- Implement circuit breakers for price deviation > X%
- Require minimum liquidity thresholds for oracle sources
- Account for transfer fees (Token-2022) in price calculations

---

## Section 4: Governance Attack Patterns

### 4.1 Beanstalk — $182M (April 2022)
**Category:** Flash loan governance takeover / no execution delay
**Root Cause:** No timelock between vote and execution; voting power = token holdings
**Mechanism:**
- Flash loaned $1B from Aave, Uniswap, SushiSwap
- Converted to BEAN3CRV-f LP tokens → gained Stalk (governance token)
- Achieved 67%+ voting power (>2/3 threshold)
- Called `emergencyCommit()` to execute malicious BIP-18 proposal
- BIP-18 used `delegatecall` to drain entire treasury
- Also submitted BIP-19 (decoy: $250K to Ukraine donation)
- Total time including flash loan repayment: <13 seconds
- Developers had dismissed governance attack concerns raised months earlier

**Solana Lesson:** Realms/SPL Governance on Solana has similar risks if:
1. Governance tokens are liquid and flash-loanable
2. No timelock between proposal creation and execution
3. Emergency execution functions exist with low thresholds
4. Voting power is purely token-weighted without time-locking
5. No snapshot of voting power at proposal creation time

### 4.2 Build Finance DAO — $470K (February 2022)
**Category:** Hostile governance takeover / token accumulation
**Root Cause:** No defense against governance token accumulation attack
**Mechanism:**
- Attacker accumulated enough BUILD tokens to pass a proposal
- First attempt failed (insufficient tokens), second succeeded
- Gained control of governance contract, minting keys, and treasury
- Minted 1.1M BUILD tokens, drained Balancer + Uniswap liquidity
- Took 130,000 METRIC tokens from treasury, minted 1B more BUILD
- Disabled gitbooks and proposal bot to hide evidence
- Sent ~160 ETH ($500K) to Tornado Cash

**Solana Lesson:** Small DAOs with low-liquidity governance tokens are vulnerable to token accumulation attacks. No flash loan needed — just patient buying. Defenses: quorum requirements, timelock delays, veto mechanisms, snapshot-based voting.

### 4.3 Compound Governance Issues (2021-2024)
**Category:** Governance proposal bugs / whale manipulation
**Proposal 62 Bug (2021):**
- Introduced new COMP distribution logic with `>` instead of `>=` bug
- $80-90M in COMP at risk of being misdistributed
- No admin controls to stop — any fix required 7-day governance process
- Lesson: Governance-gated fixes are dangerously slow for active exploits

**Proposal 289 / Humpy Attack (2024):**
- Whale "Humpy" accumulated COMP, proposed investing $24M into vault they controlled
- Security researchers flagged governance attack risk
- Resolved by compromise (30% of reserves to COMP stakers)
- Lesson: Token-weighted governance is vulnerable to whale capture

**Solana Lesson:** SPL Governance proposals that modify protocol parameters (fees, distributions, treasury) need careful review. Timelock + veto mechanisms are essential. The Compound Proposal 62 bug shows that even legitimate governance changes can introduce critical bugs.

---

## Section 5: Reentrancy and CPI Patterns

### 5.1 Curve Finance / Vyper Reentrancy — $52-59M (July 2023)
**Category:** Compiler bug broke reentrancy guards / cross-function reentrancy
**Root Cause:** Vyper compiler v0.2.15-0.3.0 created separate storage slots for `@nonreentrant` locks per function instead of sharing one
**Mechanism:**
- `add_liquidity` and `remove_liquidity` each had their own reentrancy lock
- Attacker called `remove_liquidity` → received ETH → fallback triggered
- Re-entered via `add_liquidity` (different lock, so allowed)
- Pool state (`total_supply`) was inconsistent during reentrancy
- Attacker received far more LP tokens than deserved
- Affected: CRV/ETH, alETH/ETH, msETH/ETH, pETH/ETH pools

**Solana Lesson:** While Solana's runtime prevents classic cross-program reentrancy (Program B can't call back into Program A), the **conceptual pattern** of cross-function state inconsistency applies:
- **Stale data after CPI:** If instruction A calls CPI to modify shared state, then instruction B reads that state without reloading, it operates on stale data (Anchor's "missing reload" pitfall)
- **Self-reentrancy:** Solana allows a program to call itself via CPI — this CAN create reentrancy-like state confusion
- **Read-only reentrancy analog:** If a Solana program reads price/state from another program mid-transaction while that program's state is in flux, it gets inconsistent data

### 5.2 Solana CPI Security vs EVM Reentrancy
**Sources:** Asymmetric Research, Solana StackExchange, Solana docs

**Why classic reentrancy doesn't apply to Solana:**
1. Programs are stateless; state is in separate accounts explicitly passed
2. If Program A calls Program B, Program B CANNOT call back to A
3. No fallback/receive functions — token transfers are state changes by SPL Token Program
4. CPI call depth limited to 4 (vs EVM's 1024)

**What DOES apply to Solana:**
1. **Arbitrary CPI** — calling unverified program IDs (attacker controls target)
2. **Stale data after CPI** — operating on pre-CPI account data without reload
3. **Signer privilege escalation** — signer status passed through CPI chain
4. **Account ownership changes via CPI** — `assign` instruction can change owner
5. **Self-reentrancy** — program calling itself, used legitimately for events but exploitable
6. **CPI Guard bypass** — Token-2022 CPI Guard prevents unauthorized CPI transfers

---

## Section 6: Cross-Chain Lessons Summary for Solana KB

### New EP Candidates

**EP-114: Flash Loan Governance Takeover**
- Pattern: Borrow governance tokens via flash loan → vote → execute → repay
- Solana relevance: SPL Governance / Realms DAOs with liquid governance tokens
- Detection: Check if governance allows same-block vote+execute, check for flash loan integration
- Defense: Timelock, snapshot voting, flash loan detection in governance

**EP-115: Donation/Reserve Solvency Bypass**
- Pattern: Euler's `donateToReserves` — functions that modify collateral/debt without solvency check
- Solana relevance: Any lending protocol with donate/contribute/add-to-reserve functions
- Detection: Find functions that decrease collateral or increase debt without health check
- Defense: Mandatory health factor check after any position-modifying operation

**EP-116: Vault Share Price Manipulation via Donation**
- Pattern: C.R.E.A.M./Harvest — donate tokens to vault to inflate `pricePerShare`
- Solana relevance: Any vault using `total_assets / total_shares` pricing
- Detection: Check if direct token transfers to vault affect share pricing
- Defense: Virtual reserves (dead shares), separate accounting from actual balance, minimum deposit amounts

**EP-117: Upgrade Initialization Gap**
- Pattern: Ronin 2024 — missing initialization call after contract upgrade leaves state zeroed
- Solana relevance: Upgradeable programs that add new state fields in upgrades
- Detection: Check upgrade procedures for missing initialization of new fields
- Defense: Upgrade scripts that verify all new state is initialized, test upgrades on devnet

**EP-118: Flash Loan Account State Migration**
- Pattern: MarginFi — account migration during active flash loan bypasses repayment
- Solana relevance: Any program with both flash loan and account migration/transfer instructions
- Detection: Check if account transfer/migration is blocked during flash loan state
- Defense: Flag accounts in flash loan state, block all migration/transfer during flash loan

### Existing EPs to Expand

**EP-006 (Oracle Price Manipulation):** Add Harvest Finance "sandwich the vault" pattern, C.R.E.A.M. donation attack, cross-venue timing exploitation
**EP-058 (Centralized Admin Risks):** Add Multichain CEO single-key failure, Ronin stale allowlist
**EP-036 (Account Revival):** Note Nomad's zero-value default as parallel pattern
**EP-038 (Uninitialized State):** Add Ronin 2024 upgrade initialization gap as cross-chain case study

### Playbook Updates

**bridge-attacks.md:** Add Ronin 2024 (initialization gap), Nomad (zero-value bypass), Poly Network (function selector collision), Harmony (2-of-5 threshold), Multichain (single custodian), bridge vulnerability taxonomy
**governance-attacks.md:** Add Beanstalk (flash loan governance), Build Finance (accumulation attack), Compound (proposal bugs, whale capture)
**lending-attacks.md:** Add Euler (donate solvency bypass), C.R.E.A.M. (donation price manipulation), MarginFi flash loan bypass
**oracle-attacks.md:** Add oracle manipulation taxonomy, Harvest "sandwich the vault" pattern, single-source oracle risks
**amm-dex-attacks.md:** Add Curve/Vyper reentrancy as cross-chain lesson, bZx leverage manipulation pattern

---

## Sources

1. Ronin Bridge: roninchain.com, bankless.com, elliptic.co, coincodecap.com, solidityscan.com
2. Nomad Bridge: blog.nomad.xyz, certik.com, cloud.google.com, coinbase.com, zerion.io
3. Poly Network: polynetwork.medium.com, blog.kraken.com, kudelskisecurity.com, halborn.com
4. Harmony: beosin.com, merklescience.com, techcrunch.com
5. Multichain: coindesk.com, blockworks.co, halborn.com
6. bZx: palkeo.com, peckshield.medium.com
7. PancakeBunny: merklescience.com, dn.institute
8. C.R.E.A.M. Finance: cream-finance medium.com
9. Euler Finance: blocksec.com, chainalysis.com, solidityscan.com, beosin.com
10. Beanstalk: immunefi.com, certik.com, halborn.com, theverge.com
11. Build Finance: theblock.co, cryptoslate.com, beosin.com
12. Compound: thedefiant.io, theblock.co, eattheblocks.com
13. Curve/Vyper: verichains.io, halborn.com, cointelegraph.com
14. MarginFi: blog.asymmetric.re, blockworks.co
15. Solend: ackee.xyz, theblock.co
16. Jupiter: binance.com (flash loan attack noted, $50M)
17. Solana CPI: blog.asymmetric.re, solana.com, solana.stackexchange.com
18. Academic: arxiv.org (SoK paper), dl.acm.org, blog.chain.link
19. General: cyfrin.io, halborn.com, hacken.io, cloudlogic.dev
