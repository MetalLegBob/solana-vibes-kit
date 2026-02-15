# Wave 3: Incident Deep-Dives from External Databases

**Sources:** rekt.news, SlowMist Hacked, CertiK reports, De.Fi REKT database
**Date:** 2026-02-06
**Goal:** Cross-reference external hack databases against our existing KB to find gaps

---

## NEW Incidents Not In KB (or needing significant expansion)

---

### 1. Texture Finance — $2.2M (July 9, 2025)

**Chain:** Solana
**Type:** Smart Contract Vulnerability (Missing Ownership Check)
**Sources:** Halborn, Certora, QuadrigaInitiative, web3isgoinggreat

**Technical Details:**
- Texture is a Solana-based lending protocol with USDC Vaults
- The vulnerability was in the Vault contract's **rebalance function**
- When the Vault withdrew USDC and deposited it into SuperLendy pools, it received LP tokens in return
- The contract **failed to verify that the destination token account for LP tokens belonged to the Vault**
- An attacker provided their own controlled SPL Token account during a rebalance call
- LP tokens were sent to the attacker's account instead of the Vault
- Attacker redeemed LP tokens directly from SuperLendy for underlying USDC

**Root Cause:** Missing account ownership validation in CPI — the rebalance function didn't verify the token account owner matched the vault PDA

**Vulnerable Pattern (conceptual):**
```rust
// VULNERABLE: No check that lp_token_account belongs to vault
pub fn rebalance(ctx: Context<Rebalance>) -> Result<()> {
    // Withdraw from vault
    let amount = ctx.accounts.vault.withdraw()?;
    // Deposit to SuperLendy — LP tokens go to lp_token_account
    // BUT lp_token_account could be attacker-controlled!
    cpi::deposit(
        ctx.accounts.superlend_program,
        amount,
        ctx.accounts.lp_token_account, // NOT VALIDATED
    )?;
    Ok(())
}
```

**Safe Pattern:**
```rust
// SAFE: Verify LP token account owner matches vault PDA
constraint = lp_token_account.owner == vault.key() @ ErrorCode::InvalidAccountOwner
```

**Resolution:** 90% of funds returned after 10% bounty offer. Certora reviewed the fix.
**Note:** The exploited contract was NOT formally verified despite Certora having done a manual audit in Oct 2024 — the rebalance function was added after the audit.

**KB Mapping:** EP-007 (Account Relationship Not Verified), EP-050 (CPI Account Injection)

---

### 2. Marinade Finance "Slow Roasted Stake" — $5M (126 epochs, ~2024)

**Chain:** Solana
**Type:** Business Logic Flaw (Algorithm Implemented Backward)
**Sources:** rekt.news, Marinade docs, Solana Floor

**Technical Details:**
- Marinade's Stake Auction Marketplace (SAM) distributes stake to validators based on bidding
- **Intended logic:** Highest bidder wins stake; lowest bidder gets unstaked first
- **Actual implementation:** Logic was REVERSED — lowest bidders received best treatment and protection from unstaking
- **Exploitation pattern:**
  1. Validator bids high to secure stake delegation
  2. Immediately slashes bid down to minimum (1 lamport/dust)
  3. Backward logic treats low bidders as protected from unstaking
  4. Validator earns rewards on stake acquired for near-zero cost
- **85+ validators** gamed this for **126 epochs** (~50+ days)
- Estimated loss: **~$5M (37,000 SOL)** in missed rewards to legitimate mSOL holders

**Root Cause:** Business logic inversion — comparison operators pointed the wrong way in the unstaking priority algorithm

**Vulnerable Pattern (conceptual):**
```rust
// VULNERABLE: Sorting is backwards
fn get_unstake_priority(validators: &mut [Validator]) {
    // INTENDED: unstake lowest bidders first
    // ACTUAL: this sorts highest first, protecting lowest
    validators.sort_by(|a, b| b.bid.cmp(&a.bid)); // WRONG DIRECTION
}
```

**KB Mapping:** EP-034 (Missing State Transition Check), staking-attacks.md
**Note:** This is a unique "slow exploit" — not a single transaction hack but a systemic gaming of flawed algorithm over months. Important pattern for staking protocol audits.

---

### 3. LIBRA Token — $286M in trader losses (Feb 2025)

**Chain:** Solana
**Type:** Insider Liquidity Extraction / Pump-and-Dump
**Sources:** Reuters, CoinDesk, Solana Floor, De.Fi REKT

**Technical Details:**
- LIBRA memecoin launched on Solana by Kelsier Ventures (CEO Hayden Davis)
- Argentine President Javier Milei promoted it, causing market cap to surge to $4.5B
- **Kelsier Ventures executed early swap**, profiting $3.1M
- **Crucially: withdrew $85M+ in liquidity** from LIBRA pools in first 2 hours
- Liquidity withdrawal triggered 90%+ price crash
- **74,000 traders lost over $286M**
- 34 accounts made $124.6M before the crash
- Federal judge investigating

**Mechanism — Single-Sided Liquidity Extraction:**
```
1. Launch token with concentrated liquidity
2. Promote to generate buying pressure
3. "Snipe" early (buy before public announcement goes live)
4. Withdraw liquidity from AMM pools (not a "sell" — it's removing the buy-side)
5. Without liquidity, price crashes to near-zero
6. Victims can't sell at any reasonable price
```

**KB Mapping:** EP-061 (Bonding Curve Instant Arbitrage), EP-094 (Bonding Curve Graduation Exploit)
**Audit Relevance:** When auditing launchpads/bonding curves, check for:
- Can liquidity be removed by privileged accounts during or after launch?
- Is there a liquidity lock mechanism?
- Can early buyers (snipers) front-run the public launch?

---

### 4. MELANIA Token — $200M in trader losses (Jan 2025)

**Chain:** Solana
**Type:** Insider Liquidity Extraction / Pump-and-Dump
**Sources:** Solana Floor, Bubblemaps, Reuters

**Technical Details:**
- Same operator as LIBRA (Hayden Davis / Kelsier Ventures)
- Same "single-sided liquidity" extraction tactic
- Team wallets controlled **92% of MELANIA supply**
- Team quietly dumped $30M+ in tokens from community fund wallets
- One wallet bought $40K worth of MELANIA, sold for $2.6M profit hours later
- $26M in liquidity withdrawn from MELANIA pools
- Later, LIBRA and MELANIA insiders used $POPE token to launder proceeds

**Laundering Pattern:**
1. Transfer SOL to fresh address
2. Buy low-cap memecoin ($POPE) — artificially spike price 16x
3. Immediately sell at loss (staged "trading loss")
4. MEV bot sandwich attack during trade disguises flow
5. Dirty money becomes "clean" via obfuscation

**KB Mapping:** Same as LIBRA
**Audit Relevance:** Check for concentrated token ownership, vesting/lock mechanisms, liquidity lock enforcement

---

### 5. MetaWin — $4M (November 3, 2024)

**Chain:** Ethereum + Solana
**Type:** Access Control / Hot Wallet Compromise
**Sources:** Halborn, TheBlock, CoinTelegraph, SlowMist

**Technical Details:**
- MetaWin is a crypto casino platform
- Vulnerability in the platform's **"frictionless withdrawal system"**
- Attacker exploited the withdrawal mechanism to drain hot wallets on both Ethereum and Solana
- Stolen crypto moved to KuCoin and nested HitBTC service
- Investigation suggested intrusion by a **group or cybercrime organization**
- CEO covered losses with personal funds

**Root Cause:** Weak access controls in withdrawal system — the "frictionless" design prioritized UX over security

**KB Mapping:** EP-026 (Missing Authority Constraint), EP-073 (Excessive Admin Privileges)
**Note:** This is an off-chain/operational exploit, not a smart contract bug — but relevant for auditing withdrawal authorization logic

---

### 6. SolFire Finance — $4M+ (January 23, 2022)

**Chain:** Solana
**Type:** Exit Scam / Rug Pull
**Sources:** TRM Labs, Medium, CoinCodeCap, CertiK 2022 overview

**Technical Details:**
- DeFi yield protocol on Solana offering emission token and "impressive yields"
- Accumulated ~$4M TVL
- **Promoted by trusted Solana projects:** ProjectLarix, PsyOptions, Slope wallet (integrated into app + held AMA)
- **Before the steal:** Developers artificially inflated SOLFIRE token price using user deposits to buy back their own token
- **The steal:** Main SolFire wallet drained BTC, ETH, SOL, USDC, USDT + other assets
- Funds bridged to Ethereum via Sollet bridge, funded via Tornado Cash
- **Same scammer later linked to Magnate Finance ($6.4M) and Kokomo Finance rug pulls** (serial rug puller)

**KB Mapping:** Exit scam pattern — not a smart contract exploit but relevant for:
- Identifying centralized control (single admin key)
- Checking for unrestricted fund withdrawal by admin
- Token buy-back mechanisms as red flags

---

### 7. Aquabot/Aqua — $4.65M (September 8, 2025)

**Chain:** Solana
**Type:** Presale Rug Pull
**Sources:** CoinCentral, CryptoRank, Solana Floor, Binance Square

**Technical Details:**
- Solana-based Telegram trading bot
- Raised $4.65M (21,770 SOL) in presale
- **Promoted by major Solana ecosystem partners** (Meteora, Dialect — faced backlash)
- Just before Token Generation Event (TGE), funds were moved from presale wallet to exchanges
- Team vanished, deleted all social media
- Meteora and Dialect stated they would review partnership/marketing processes

**KB Mapping:** Presale fraud pattern — not a contract exploit
**Audit Relevance:** When auditing launchpad/presale contracts:
- Are presale funds locked until TGE?
- Is there a time-lock on fund withdrawal?
- Can the deployer move funds before token distribution?

---

### 8. CrediX — $4.5M (August 4, 2025)

**Chain:** Sonic (Solana SVM chain, NOT Solana mainnet)
**Type:** Admin Compromise + Possible Exit Scam
**Sources:** Halborn, CoinDesk, CryptoBriefing, CertiK

**Technical Details:**
- Decentralized lending protocol on Sonic (Solana Virtual Machine chain)
- Attacker gained **multisig admin and BRIDGE controller roles**
- Used BRIDGE role to **mint unbacked tokens**
- Drained liquidity pools — estimated $4.5M
- Stolen funds bridged from Sonic to Ethereum, split across 3 wallets
- Tornado Cash used for funding and laundering
- **Team promised fund recovery, then vanished** — deleted website, social media, Telegram
- CertiK confirmed platform went dark — suspected exit scam

**Root Cause:** Poor privilege management — BRIDGE role had authority to mint tokens without collateral backing

**KB Mapping:** EP-068 (Single Admin Key), EP-073 (Excessive Admin Privileges), EP-031 (Multi-Sig Duplicate Signer Bypass)
**Note:** While on Sonic (not Solana mainnet), the SVM architecture means identical patterns apply

---

### 9. DogWifTools — $10M (January 2025)

**Chain:** Solana (indirectly — tool for Solana memecoin operations)
**Type:** Supply Chain Attack / RAT
**Sources:** Halborn, BleepingComputer, TheDefiant, CoinMarketCap

**Technical Details:**
- DogWifTools was a Windows tool used for Solana memecoin operations (volume automation, token bundling, comment bots)
- Attackers **reverse-engineered the software** to extract a GitHub token
- Used the token to access the **private GitHub repository**
- Injected **Remote Access Trojan (RAT)** into versions 1.6.3 through 1.6.6
- RAT downloaded to AppData folder, targeted:
  - Cryptocurrency wallet private keys (hot + cold wallets)
  - Exchange login credentials (Binance, Coinbase)
  - ID photos (used to open accounts in victims' names)
- **~$10M drained** from affected users
- macOS users unaffected (Windows-only malware)
- Ironic twist: victims were predominantly memecoin scammers themselves

**KB Mapping:** EP-095 (Supply Chain / Dependency Poisoning)
**Audit Relevance:** When auditing tools/SDKs:
- Are GitHub tokens or API keys embedded in distributed binaries?
- Is the build pipeline secured against unauthorized code injection?

---

### 10. Solana-pumpfun-bot GitHub Malware (July 2025)

**Chain:** Solana (targeting Solana users)
**Type:** Supply Chain Attack / Malicious npm Package
**Sources:** SlowMist, CoinTelegraph, Binance Square

**Technical Details:**
- Fake GitHub repository named "solana-pumpfun-bot" by user "zldp2002"
- Mimicked a legitimate Solana trading bot
- Included malicious npm package **"crypto-layout-utils"** (removed from official npm, hosted on separate GitHub repo)
- Package was heavily obfuscated
- On execution: scanned local files for wallet content/private keys
- Uploaded sensitive data to attacker-controlled server
- Stolen funds traced to FixedFloat exchange
- Another malicious package: **"bs58-encrypt-utils-1.0.3"**
- Attacker controlled multiple GitHub accounts to fork projects and inflate popularity
- Malicious activity started ~June 12, 2025

**KB Mapping:** EP-095 (Supply Chain / Dependency Poisoning)

---

### 11. PyPI semantic-types Supply Chain Attack (January 2025)

**Chain:** Solana (targeting Solana developers)
**Type:** Supply Chain Attack / Python Package Poisoning
**Sources:** CybersecurityNews

**Technical Details:**
- Malicious PyPI package **"semantic-types"** (v0.1.5, introduced Jan 26, 2025)
- Distributed as dependency of 5 seemingly legitimate Solana dev packages:
  - `solana-keypair`, `solana-publickey`, `solana-mev-agent-py`, `solana-trading-bot`, `soltrade`
- Used **monkey patching** to intercept `Keypair` class from `solders` library
- Stole private keys at runtime during key generation
- Exfiltration: Keys encrypted with RSA-2048, transmitted via **Solana memo transactions** to a devnet endpoint
- Benign versions published Dec 2024, malicious payload introduced late Jan 2025

**KB Mapping:** EP-095 (Supply Chain / Dependency Poisoning)
**Note:** Unique exfiltration method — using Solana transactions themselves to exfiltrate stolen keys

---

### 12. Solana ZK ElGamal Proof Vulnerability (April 2025, patched)

**Chain:** Solana (core protocol)
**Type:** Zero-Knowledge Proof Verification Bug
**Sources:** CoinDesk, BeInCrypto, Decrypt, Solana Foundation

**Technical Details:**
- Vulnerability in the **ZK ElGamal Proof program** used for Token-2022 confidential transfers
- Could have allowed attackers to **forge invalid zero-knowledge proofs**
- If exploited, would enable:
  - **Unauthorized minting of unlimited tokens** using confidential transfer extension
  - **Unauthorized withdrawals from other accounts**
- Patches distributed privately to validators starting April 17, 2025
- Supermajority of validators adopted fix by April 18
- **No known exploitation** before patch
- Engineers from Anza, Firedancer, and Jito + third-party security firms coordinated the fix
- ZK ElGamal Proof program subsequently **disabled on mainnet/devnet** pending additional audits
- Confidential transfer features (ConfidentialTransfer, ConfidentialTransferFee, ConfidentialMint, ConfidentialBurn) all disabled

**KB Mapping:** EP-056 (Token-2022 Confidential Transfer Bypass), token-extensions.md
**Audit Relevance:**
- Any protocol using Token-2022 confidential transfers should verify the ZK ElGamal proof program status
- Custom ZK proof verification is extremely high-risk
- Even core Solana infrastructure can have critical ZK bugs

---

### 13. DEXX — $30M (November 16, 2024) [ALREADY IN KB — expanded details]

**Chain:** Solana
**Type:** Private Key Leak / Custodial Failure
**Sources:** SlowMist, CoinTelegraph, BraveNewCoin

**Expanded Details (beyond current KB):**
- DEXX was a **memecoin trading terminal** (not a DEX) — custodial platform
- **8,612 Solana addresses** linked to the hacker (identified by SlowMist)
- At least **900 individual users** affected, one lost $1M
- Initial reports: $21M → revised to **$30M** due to volatile meme token prices
- Private key vulnerability was in DEXX's system (server-side key storage)
- Stolen assets quickly converted to SOL
- DEXX offered bounty + token rewards — no response from hacker
- Second-largest exploit of November 2024 (behind only industry total)

---

### 14. Solana Wallet Owner Permission Phishing — $3M (December 2025)

**Chain:** Solana
**Type:** Phishing / Social Engineering
**Sources:** SlowMist, MEXC

**Technical Details:**
- Phishing attack tampered with victim's **Owner permissions** on their Solana wallet
- Transferred wallet control to attacker address starting with "GKJBEL"
- Similar to **"malicious multi-signature" attacks** seen on TRON
- Attacker replaces core permissions, leaving victim unable to control their own funds
- An additional $2M in DeFi protocol assets was initially inaccessible but later recovered with assistance
- Single victim lost **$3M+**

**KB Mapping:** New pattern — "Wallet Authority Replacement" via phishing
**Note:** This is a social engineering attack, not a smart contract bug, but the underlying mechanism (owner permission transfer) could be relevant when auditing account authority structures

---

### 15. M2 Exchange — $13.7M (November 2024)

**Chain:** Ethereum + BTC + Solana
**Type:** Hot Wallet Compromise
**Sources:** rekt.news, De.Fi REKT

**Technical Details:**
- Centralized exchange hot wallet breach
- Affected ETH, BTC, and SOL chains
- SOL-specific losses difficult to track separately
- Total: $13.7M across all chains

**KB Mapping:** Off-chain/operational — centralized exchange infrastructure

---

## CORRECTIONS for Existing KB

### Cetus DEX ($223M) — NOT on Solana

**Current KB references:** EP-015, EP-091, amm-dex-attacks.md, known-vulnerable-deps.md
**Issue:** Cetus DEX is on **SUI blockchain**, not Solana
**The exploit:** Overflow bug in `checked_shlw` function in `integer-mate` (Move language library)
**Recommendation:** Keep as a reference for the overflow/math pattern (it's instructive), but clearly label as "SUI — pattern applicable to Solana" rather than implying it was a Solana exploit
**Move vs Rust:** The overflow pattern concepts apply, but code examples would need to be in Rust/Anchor, not Move

---

## Summary: SlowMist Hacked Database — Complete Solana Ecosystem List

From hacked.slowmist.io/?c=Solana (26 total incidents, $538.9M total):

| Date | Target | Loss | Method | In KB? |
|------|--------|------|--------|--------|
| 2026-01-27 | Solar (X account) | - | Account Compromise | No (social) |
| 2025-12-03 | Wallet permission phishing | $3M | Phishing | NEW |
| 2025-11-20 | DMT airdrop (@dexmaxai) | $130K | Phishing | No (small) |
| 2025-10-21 | DoodiPals | $171K | Private Key Leak | No (small) |
| 2025-09-08 | Aqua/Aquabot | $4.65M | Rug Pull | NEW |
| 2025-08-04 | CrediX | $4.5M | Admin Compromise/Rug | NEW (Sonic) |
| 2025-07-09 | Texture | $2.2M | Contract Vulnerability | NEW |
| 2025-04-26 | Loopscale | $5.8M | Oracle Attack | In KB |
| 2025-02-27 | Pumpfun (X account) | - | Account Compromise | No (social) |
| 2025-02-14 | LIBRA | $286M | Rug Pull | NEW |
| 2025-01-20 | MELANIA | $200M | Rug Pull | NEW |
| 2024-11-16 | DEXX | $30M | Private Key Leak | In KB |
| 2024-11-03 | MetaWin | $4M | Hot Wallet Exploit | NEW |
| 2024-10-23 | SHARPEI | ? | ? | Unknown |
| 2024-09-08 | Various | ? | ? | Unknown |
| 2024-08-03 | Slope wallet drain | $5.3M | Private Key Leak | In KB |
| 2022-12-16 | Raydium | $4.4M | Key Compromise | In KB |
| 2022-10-11 | Mango Markets | $116M | Oracle Manipulation | In KB |
| 2022-08-01 | Slope/Phantom | $8M | Private Key Leak | In KB |
| 2022-07-02 | Crema Finance | $8.8M | Contract Exploit | In KB |
| 2022-06-xx | Nirvana Finance | $3.5M | Flash Loan | In KB |
| 2022-03-23 | Cashio | $52.8M | Infinite Mint | In KB |
| 2022-02-02 | Wormhole | $326M | Signature Bypass | In KB |
| 2022-01-23 | SolFire | $4M | Exit Scam | NEW |
| 2021-08-xx | Solend Auth Bypass | $0 | Access Control | In KB |

---

## Additional Supply Chain Incidents (2025)

| Date | Target | Loss | Method | Source |
|------|--------|------|--------|--------|
| 2025-07-02 | solana-pumpfun-bot (GitHub) | ? | Malicious npm pkg | SlowMist |
| 2025-05-30 | semantic-types (PyPI) | ? | Monkey-patching keys | CybersecurityNews |
| 2025-01-28 | DogWifTools | $10M | RAT via GitHub | Halborn/BleepingComputer |
| 2024-12-xx | web3.js supply chain | ? | npm package | In KB |

---

## De.Fi REKT Database Additional Data Points

- Q1 2025: Solana saw $486.5M in losses across 3 incidents (LIBRA, MELANIA, + 1 other)
- Q3 2025: Solana had $46.15M in losses (2 high-profile incidents)
- SwissBorg (Sep 2025): $41.5M total, ~193K SOL stolen via compromised partner API
- BigONE (Jul 2025): ~$500K in SOL stolen as part of broader hot wallet compromise

---

## CertiK 2022 Solana Overview Summary

11 significant attacks in 2022, ~$523M stolen:
- **Major Exploits:** Wormhole ($326M), Mango ($116M), Cashio ($52.8M), Solend, OptiFi
- **Private Key Compromises:** ~$13.5M (Slope wallet largest at ~$8M)
- **Exit Scams:** ~$5.3M across 4 incidents (SolFire Finance largest at $4.1M)

All major exploits already in KB. Exit scams (SolFire) are new additions.
