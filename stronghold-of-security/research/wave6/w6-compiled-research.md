# Wave 6: Niche Exploits, Gaming/NFT, Timing, MEV, Wallet Attacks

**Date:** 2026-02-06
**Sources:** 30+ Exa deep searches, 50+ articles analyzed
**Focus:** Long-tail exploits, gaming, NFT, memecoins, timing attacks, MEV, wallet/frontend

---

## 1. Gaming/P2E Exploits

### 1.1 Aurory SyncSpace Bridge Exploit (Dec 2023) — $830K

**Incident:** Race condition on off-chain marketplace buy endpoint
**Mechanism:** Attacker sent multiple simultaneous buy requests to the SyncSpace marketplace. The off-chain system processed them concurrently, resulting in the seller receiving double payment while being charged only once. This inflated the attacker's AURY balance in SyncSpace.
**Impact:** ~600,000 AURY tokens stolen (~$830K), 80% liquidity drop in AURY-USDC pool on Camelot (Arbitrum)
**Resolution:** SyncSpace bridge disabled, team bought back all stolen AURY. No user funds/NFTs affected (team wallet was source).
**Key Pattern:** Off-chain/on-chain race condition in hybrid game systems. The on-chain contracts were fine — the vulnerability was in the off-chain marketplace logic that didn't handle concurrent requests atomically.

**Sources:**
- https://thedefiant.io/news/defi/hacker-steals-usd830-000-from-cross-chain-bridge-of-solana-game-aurory
- https://insidebitcoins.com/news/exploits-in-solana-game-aurory-and-floor-protocol
- https://decrypt.co/210153/solana-game-aurory-suffers-830k-exploit-disables-arbitrum-bridge

### 1.2 The Heist ($NANA) — Early Exploit (Date Unknown)

**Incident:** An early exploit caused $NANA token price to drop, later stabilized
**Game:** Risk-based idle game on Solana — Chimps vs Gorillas competing for $NANA tokens
**Details:** Confirmed by skribr.io project review: "the price of the $NANA token experienced a price drop due to an early exploit." No technical details found in public records.
**Status:** Still no public technical writeup found. Possible timing/game-theory exploit in the staking/heist mechanic. User (mlbob) recalls it as a timing exploit.

**Sources:**
- https://skribr.io/app/project/the-heist/ (confirms exploit existed)
- https://the-heist.gitbook.io/the-heist-return-to-peel-city (game docs, no exploit details)

### 1.3 Star Atlas — Freeze Authority Governance Concern (Feb 2023)

**Incident:** Not a hack. Developer Automata froze Star Atlas NFT assets in two wallets accused of distributing stolen assets.
**Pattern:** Demonstrates the governance risk of mint/freeze authority on Solana NFTs — unilateral asset freezing by developers raises due process concerns.
**Relevance:** Not an exploit, but a design pattern to be aware of (centralized freeze authority).

### 1.4 ChainLight P2E Security Research (General Patterns)

**Source:** https://blog.chainlight.io/security-challenges-in-web3-p2e-games-8e4e23000f4d

Key P2E game vulnerability patterns:
1. **Item duplication via off-chain bugs** (MIR4 Global — duplicated Darksteel boxes → cashable tokens)
2. **Missing fee/score verification** (Manarium — could claim prizes without paying participation fee)
3. **Bridge validator compromise** (Axie/Ronin — 4/9 validators controlled by one entity)
4. **Hybrid on-chain/off-chain trust boundary** — most P2E games have both Web2 and Web3 components; security of the bridge between them is critical

### 1.5 Halborn P2E Security Framework (General)

**Source:** https://www.halborn.com/blog/post/security-challenges-in-web3-gaming-and-gamefi

On-chain risks: smart contract vulns, DAO governance manipulation, cross-chain bridge vulns
Off-chain risks: centralized server dependencies, social engineering, rug pulls in P2E economics

---

## 2. NFT Marketplace Exploits

### 2.1 Magic Eden Fake NFT Exploit (Jan 2023) — ~$15K

**Incident:** Bug in activity indexer for Snappy Marketplace and Pro Trade tools allowed unverified NFTs to appear as verified collections.
**Mechanism:** A new feature deployment introduced a UI-level bug that bypassed creator address verification. Attackers listed fake NFTs mimicking popular collections (ABC, y00ts).
**Impact:** 25 fraudulent NFTs sold across 4 collections (~1,100 SOL / ~$15K)
**Resolution:** Magic Eden disabled affected tools, added verification step, refunded all affected users.
**Key Pattern:** Frontend/indexer verification bypass — smart contracts were secure, vulnerability was in the marketplace UI layer.

**Sources:**
- https://cointelegraph.com/news/magic-eden-to-refund-users-after-25-fake-nfts-sold-due-to-exploit
- https://coingeek.com/scammers-exploit-nft-marketplace-magic-eden-to-sell-fake-nfts

### 2.2 Magic Eden Image Hijack (Jan 2023)

**Incident:** Third-party image hosting service was hijacked, causing suspicious/pornographic images to display instead of actual NFTs.
**Pattern:** CDN/third-party service dependency attack — NFT metadata relies on external image URLs.

### 2.3 Candy Machine V2 — set_collection_during_mint Bypass (CVE GHSA-9v25-r5q2-2p6w)

**Incident:** Missing check in `set_collection_during_mint` instruction allowed minting NFTs to arbitrary collections.
**Mechanism:** First instruction passes checks (hits bot tax), second instruction with `set_collection_during_mint` CPI incorrectly validates against previous instruction. Could work even if Candy Machine was out of NFTs or closed.
**Impact:** Arbitrary NFTs could be added to any collection.
**Fixed in:** Candy Machine V3 (not affected).

**Source:** https://advisories.gitlab.com/pkg/cargo/mpl-candy-machine/GHSA-9v25-r5q2-2p6w

### 2.4 Candy Machine Bot Swarm → Solana Outage (Apr 2022)

**Incident:** Bots swarming Candy Machine NFT mints generated 4 million tx requests and 100 Gbps of data, causing a 7-hour Solana network outage.
**Resolution:** Metaplex deployed 0.01 SOL "botting penalty" for failed transactions.
**Pattern:** DoS via mint botting — excessive transaction load from automated minting tools.

**Source:** https://www.coindesk.com/tech/2022/05/01/solana-goes-dark-for-7-hours-as-bots-swarm-candy-machine-nft-minting-tool

### 2.5 Metaplex Anti-Bot Best Practices (Reference)

From https://developers.metaplex.com/core-candy-machine/anti-bot-protection-best-practices:
- Avoid predictable/incremental metadata URIs (bots pre-fetch traits)
- Use transaction ID-based URIs for unpredictability
- Placeholder metadata + secure reveal mapping
- Config Lines over Hidden Settings for randomized mint order

---

## 3. Memecoin/Launchpad Exploits

### 3.1 Pump.fun Flash Loan + Insider Exploit (May 2024) — $2M

**Incident:** Former employee (pseudonym "STACCOverflow") used compromised service account private key + flash loans to drain bonding curve liquidity.
**Mechanism:**
1. Borrowed SOL via MarginFi flash loan
2. Used compromised cosigner key to withdraw liquidity intended for Raydium migration
3. Flash loan repaid, remainder airdropped to random holders
4. Bonding curves showed 100% filled but tokens couldn't migrate to Raydium
**Impact:** ~12,300 SOL (~$2M) stolen
**Resolution:** Contracts upgraded, trading paused, LP pools seeded for affected tokens.
**Key Pattern:** Insider threat + flash loan amplification. Private key compromise of service account was the root cause; flash loans just amplified the impact.

**Sources:**
- https://thedefiant.io/news/hacks/attacker-abuses-flashloans-to-exploit-pump-fun
- https://beincrypto.com/pump-fun-solana-exploitation-former-employee/

### 3.2 Pump.fun Rug Pull Patterns (Ongoing)

**Statistics:** 98.6% of tokens launched on pump.fun fail to complete bonding curve
**Scam Pattern:**
1. Create coin with faked trading activity
2. Use other DEX services to obscure wallet connections (bypasses Bubblemaps analysis)
3. Generate fake organic-looking comments under listing
4. Dump tokens when price peaks, crashing to zero and draining SOL pool
**Mitigation:** Pump.fun added $80 incentive for completing bonding curve, auto-locked LP on graduation, creator can't pre-assign tokens.

### 3.3 Tuna Launchpad Anti-Dump Design (2025)

New Solana launchpad implementing bonding curve with anti-dump mechanisms to prevent the rapid rug patterns common in memecoins.

---

## 4. Timing/Race Condition Exploits

### 4.1 TOCTOU Simulation Evasion (Wallet Drainers) — Critical New Pattern

**Source:** https://blockaid.io/blog/dissecting-toctou-attacks-how-wallet-drainers-exploit-solanas-transaction-timing

**Mechanism:** Time-of-Check-Time-of-Use attack exploiting gap between wallet simulation and on-chain execution.

**Attack Flow:**
1. Attacker deploys malicious program designed to pass simulation checks
2. During simulation: program behaves benignly (transfers small amount, looks normal)
3. User signs transaction based on simulation preview
4. Between signing and execution: attacker changes on-chain state (e.g., modifies a lookup table, updates program data)
5. During execution: same program now drains user's wallet because the state it reads has changed

**Why Solana is Vulnerable:**
- Signing a transaction grants ALL programs in the transaction write access to writable accounts
- Wallet simulations are point-in-time snapshots — state can change between simulation and execution
- Solana's fast block times (400ms) make the window tight but exploitable via validator collusion or strategic timing

**Detection Challenges:**
- Transaction looks safe during simulation
- Malicious behavior only manifests during actual execution
- Programs can check `Clock::get()` or read mutable state to branch between "safe mode" (simulation) and "drain mode" (execution)

**Relevance to Smart Contract Audits:**
- Programs that rely on mutable external state for access control decisions
- Programs that use lookup tables or other updateable references
- Any program where the behavior changes based on state that can be modified between simulation and execution

### 4.2 Account Revival Attack — Well-Documented Pattern

**Sources:**
- https://fuzzinglabs.com/revival-attacks-solana-programs/
- https://github.com/Ackee-Blockchain/solana-common-attack-vectors

**Mechanism:** Prevent account garbage collection by refunding lamports in same transaction.

**Attack Flow:**
1. Program closes account (transfers all lamports out)
2. In same transaction, another instruction transfers lamports BACK into the account
3. Account remains rent-exempt → not garbage collected at transaction end
4. Attacker reuses the "closed" account (e.g., claim rewards again)
5. Repeat to drain pool

**Three Defenses Required:**
1. Zero out all account data
2. Set closed account discriminator (and check it on all instructions)
3. Transfer ownership to system program (Anchor `close` constraint does this)

**Historical Context:**
- Anchor `close` constraint (pre-0.25) used to write `[255,...,255]` discriminator + transfer lamports
- Current Anchor `close` changes ownership to system program, which is stronger
- Older programs without proper `close` may still be vulnerable

### 4.3 Anchor CPI Missing Reload (Stale Data)

**Source:** https://blog.asymmetric.re/invocation-security-navigating-vulnerabilities-in-solana-cpis/

**Pattern:** After a CPI modifies an account, the calling program may operate on stale data if it doesn't reload the account.
- Anchor's `reload()` method must be called after CPI to get updated state
- Without reload, program uses pre-CPI values for post-CPI logic
- Can lead to double-counting, incorrect balances, or bypassed checks

---

## 5. MEV/Sandwich Attacks

### 5.1 Scale of the Problem — $370M-$500M Extracted

**Source:** https://sandwiched.me/research/state-of-solana-mev-may-2025-analysis

**Key Statistics (16-month analysis, through May 2025):**
- 8.5 billion trades analyzed, $1 trillion+ DEX volume
- Sandwich bots extracted **$370M-$500M** total
- Peak extraction: November 2024 (Trump/Melania token launches drove volume)
- Top 2 attackers = ~48.69% of all MEV drains
- Top 7 attackers = 92.61% of all MEV drains

**Evolution:**
- March 2024: Jito shuts down public mempool to prevent sandwich attacks
- April 2024: Attacks adapted and returned within ONE MONTH
- Shift from "tight sandwiches" (bundled via Jito) to "wide sandwiches" (non-consecutive transactions)
- Validators and RPC providers use private mempools to continue extraction
- Anti-sandwich mechanisms like `jitodontfront` partially effective

### 5.2 DeezNode Validator — $13M in One Month (Dec 2024)

**Incident:** Single validator extracted $13M+ via sandwich attacks
**Mechanism:** DeezNode operated as both validator AND RPC provider. Executed 1.55M sandwich transactions in December 2024, profiting 65,880 SOL ($13M+).
**Annualized potential:** ~$163.4M if sustained
**Key insight:** Dual role (validator + RPC) gives perfect positioning for sandwich attacks.

**Sources:**
- https://cryptonews.net/news/security/30712979/
- https://finbold.com/this-solana-validator-extracted-over-13m-from-users-in-one-month-using-sandwich-attacks/

### 5.3 Arsc Validator — $60M in One Month

**Incident:** Even larger-scale extraction by validator "Arsc"
**Source:** https://cryptonews.net/news/security/30213223/

### 5.4 MEV Protection Ineffectiveness

**Source:** https://medium.com/@mejordev/solana-mev-sandwich-report-bcc2fcff94ee (Apr 2025, 10-day analysis)

- 25% of victims paid for MEV protection but still lost funds
- A single validator with only 0.14% of stake was responsible for 12.5% of all extraction
- Attackers paid ~2.8% of extracted value as tips to protection services
- Primary targets: meme coins (users set high slippage)

### 5.5 2025 Crackdown

Marinade Finance, Jito Foundation, and Solana Foundation coordinated response:
- Reduced sandwich attack profitability by 60-70% in 2025
- 75% of SOL now staked (415M SOL) by end of 2025
- Delegation strategies now factor in validator MEV behavior

---

## 6. Wallet/Frontend Exploits

### 6.1 CLINKSINK Drainer-as-a-Service ($900K+, Dec 2023 - Jan 2024)

**Source:** https://www.mandiant.com/resources/blog/solana-cryptocurrency-stolen-clinksink-drainer-campaigns

**Mechanism:** Drainer-as-a-Service (DaaS) targeting Solana specifically
**Distribution:** Phishing pages via X (Twitter) and Discord
**Lures:** Fake airdrop claims (Phantom, DappRadar, BONK token)
**Flow:**
1. Victim sees airdrop claim link on social media
2. Connects wallet to phishing site
3. Signs fraudulent transaction → drainer siphons SOL and tokens
4. Stolen funds split between operator and affiliates
**Notable:** Mandiant's own X account was hijacked (Jan 3, 2024) and used to distribute CLINKSINK links
**Impact:** $900K+ stolen

### 6.2 Solana Drainer Source Code Leak (2025)

**Source:** https://cyble.com/blog/solana-drainers-source-code-saga-tracing-its-lineage-to-the-developers-of-ms-drainer/

- Solana Drainer source code leaked on cybercrime forum
- Traced to developers of MS Drainer ($59M stolen in 2023 via Google/Twitter ads)
- Enables creation of new variants by less sophisticated attackers
- Drainer tools now commoditized and sold on dark web

### 6.3 Parcl Frontend DNS Hijack (Aug 2024)

**Source:** https://www.theblockbeats.info/en/flash/260403

**Incident:** Parcl DeFi protocol frontend attacked on August 20, 2024
**Mechanism:** DNS hijack redirected users to malicious frontend
**Impact:** Designed to extract tokens from users' Solana wallets, displayed false transaction results in Phantom
**Detection:** Identified by Web3 security company Pocket Universe
**Resolution:** Parcl resumed operations, implemented domain protection measures

### 6.4 PyPI Solana Malware Campaign (May 2025)

**Source:** https://socket.dev/blog/2025-blockchain-and-cryptocurrency-threat-report

- 11 malicious Python packages published to PyPI (May 4-24, 2025)
- Evolved through 4 iterations, culminating in `solana-live`
- Targeted Solana dev environments: `~/.config/solana/` keypair files
- Final version exfiltrated Jupyter Notebook execution history and source code
- Data exfiltrated to Russian-hosted IP addresses

### 6.5 DNS Hijacking Technique (General)

**Source:** https://medium.com/codex/the-dns-hijacking-technique-that-steals-cryptocurrency-silently-40877d270d6b

- Intercepts requests before reaching legitimate site
- URL and SSL certificate can appear correct
- Thousands of victims in 2024
- Particularly dangerous because traditional security indicators (HTTPS, correct URL) don't protect

### 6.6 web3.js Supply Chain (Dec 2024) — Already in KB as EP-095

Covered in previous waves. Versions 1.95.6/1.95.7 compromised via spear phishing of npm maintainer.

---

## EP Candidate Analysis

### New EP Candidates:

**EP-111: TOCTOU Simulation Evasion**
- Category: Client-Side
- Severity: CRITICAL (wallet draining)
- Mechanism: Malicious program behaves differently during simulation vs execution
- Solana-specific: signing grants write access to all writable accounts
- Detection: Programs that branch on mutable external state, clock-gated behavior

**EP-112: Account Revival via Same-Transaction Refund**
- Category: Account Lifecycle
- Severity: HIGH (reward draining, state corruption)
- Mechanism: Close account + refund lamports in same tx prevents garbage collection
- Detection: Close instructions without data zeroing, discriminator check, ownership transfer
- Note: Check if this overlaps with existing EP-110 (inter-tx hijack)

**EP-113: Off-Chain/On-Chain Race Condition in Hybrid Systems**
- Category: Application Logic
- Severity: HIGH (fund extraction)
- Mechanism: Off-chain endpoints don't handle concurrent requests atomically
- Example: Aurory marketplace buy endpoint race condition
- Detection: Audit off-chain components that interface with on-chain state

**EP-114: Bonding Curve Flash Loan Drain**
- Category: DeFi / Launchpad
- Severity: CRITICAL (fund theft)
- Mechanism: Flash loan to fill bonding curve + insider key to redirect migration liquidity
- Example: Pump.fun ($2M)
- Detection: Check bonding curve migration logic, service account permissions

**EP-115: NFT Collection Verification Bypass**
- Category: NFT / Marketplace
- Severity: MEDIUM (fraud, not fund theft from protocol)
- Mechanism: Indexer/UI bugs allow unverified NFTs to appear in verified collections
- Example: Magic Eden (25 fake NFTs), Candy Machine set_collection_during_mint
- Detection: Check collection verification at contract level, not just UI

**EP-116: Validator-Level MEV Sandwich Extraction**
- Category: Protocol / Infrastructure
- Severity: INFO for smart contract auditors (not a contract vuln)
- Mechanism: Validators use block production position to front-run/back-run trades
- Scale: $370M-$500M extracted over 16 months
- Relevance: Protocols should consider MEV resistance in design

### Existing EP Updates:

- **EP-095 (Supply Chain):** Add CLINKSINK DaaS, PyPI solana-live malware, Solana Drainer leak
- **EP-110 (Inter-TX Account Hijack):** Cross-reference with account revival attack (same-tx variant is distinct)
- **Stale data after CPI:** Check if covered in existing EPs; Anchor missing reload is a known gotcha

### Playbook Updates:

- **nft-attacks.md:** Add Magic Eden indexer bypass, Candy Machine V2 set_collection bug, bot swarm DoS, anti-bot best practices
- **amm-dex-attacks.md:** Add MEV sandwich attack economics section, Jito bundle exploitation
- **governance-attacks.md:** Add freeze authority governance concern (Star Atlas)
- **New consideration:** Should we add a `gaming-attacks.md` playbook? Or fold into nft-attacks.md?

---

## Sources Summary

| # | Source | Type | Key Finding |
|---|--------|------|-------------|
| 1 | Blockaid TOCTOU blog | Technical analysis | Simulation evasion attack vector |
| 2 | FuzzingLabs revival attack | Technical analysis | Account revival in same transaction |
| 3 | Ackee-Blockchain GitHub | Reference | Common attack vectors including revival |
| 4 | sandwiched.me May 2025 | Data analysis | $370M-$500M MEV extraction |
| 5 | CryptoNews DeezNode | Incident report | $13M single-validator extraction |
| 6 | CryptoNews Arsc | Incident report | $60M single-validator extraction |
| 7 | Mandiant CLINKSINK | Threat intelligence | DaaS drainer targeting Solana |
| 8 | Cyble Solana Drainer | Threat intelligence | Source code leak and lineage |
| 9 | Socket.dev threat report | Threat intelligence | PyPI malware targeting Solana devs |
| 10 | Aurory multiple sources | Incident reports | $830K P2E race condition exploit |
| 11 | Pump.fun multiple sources | Incident reports | $2M bonding curve + insider exploit |
| 12 | Magic Eden multiple sources | Incident reports | Fake NFT verification bypass |
| 13 | Candy Machine CVE | Advisory | set_collection_during_mint bypass |
| 14 | CoinDesk bot swarm | Incident report | 7hr Solana outage from mint bots |
| 15 | Asymmetric Research CPI | Technical analysis | Missing reload after CPI |
| 16 | ChainLight P2E | Research | P2E security challenge taxonomy |
| 17 | Parcl DNS hijack | Incident report | Frontend DNS attack on Solana DeFi |
| 18 | skribr.io The Heist | Project review | Confirms early exploit existed |
| 19 | Metaplex anti-bot guide | Reference | Best practices for NFT launches |
| 20 | MEV sandwich report Apr 2025 | Data analysis | MEV protection ineffectiveness |
