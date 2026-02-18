# Off-Chain Security Incident Timeline

A chronological timeline of major off-chain security incidents in crypto/web3, focusing on backend, API, frontend, infrastructure, and key management vulnerabilities. Used by Phase 3 (strategize) for historical precedent context.

---

## Why This Matters

Smart contract audits catch on-chain bugs. But the majority of the largest crypto thefts in history have **not** been caused by smart contract flaws — they were caused by off-chain failures: leaked private keys, compromised developer machines, DNS hijacking, supply chain attacks on npm packages, SIM swaps, and social engineering. A project with a perfectly audited protocol can lose everything because a developer committed a `.env` file, or because a third-party JavaScript library was backdoored.

Off-chain incidents demonstrate that:
- The attack surface extends far beyond the contract bytecode
- Infrastructure, key management, and human factors are primary risk vectors
- Third-party dependencies (npm, CDN providers, domain registrars) introduce systemic risk
- Even hardware wallets and multisig setups fail when the signing infrastructure is compromised
- Historical patterns repeat: private key compromise, supply chain injection, and social engineering appear across every year in this timeline

---

## Timeline

### 2026

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Jan 2026 | Step Finance (Solana) | Key Management | ~$27M | Private key compromise of multisig wallet operators allowed attackers to bypass timelocks and drain treasury. Weak access controls on governance systems were exploited. Attack vector assessed as centralized key custody without adequate MPC/HSM protection. | OC-001, OC-002, OC-017, OC-019 |
| Feb 2026 | Hong Kong Securities Firm (anon) | Infrastructure / API | ~$3.3M | UNC5174 threat actors deployed Vshell backdoors after exploiting an outdated job scheduler service. Attackers whitelisted their own wallets via a hijacked AWS API, then transferred crypto at machine speed. Stolen application credentials multiplied blast radius across environments. | OC-005, OC-009, OC-010, OC-206 |

---

### 2025

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Feb 21 2025 | Bybit | Infrastructure / Supply Chain / Social Engineering | ~$1.5B | Largest crypto theft in history. Lazarus Group compromised a Safe{Wallet} developer's machine via social engineering (likely trojanized file). The attacker injected malicious JavaScript into Safe{Wallet}'s AWS S3 bucket. The injected code changed `operation=0` to `operation=1` in transaction payloads, silently converting a routine transfer into a delegatecall that upgraded Bybit's Safe proxy to a malicious implementation. Bybit's three signers approved the transaction through the manipulated UI. 401,000 ETH drained. Linked to North Korea's Lazarus Group. | OC-111, OC-186, OC-206, OC-231, OC-286 |
| Jul 2025 | Aerodrome Finance | Frontend / DNS Hijacking | Users drained (undisclosed) | DNS hijacking attack targeting Aerodrome Finance's domain, redirecting users to a wallet drainer. Highlighted continued dependence on centralized DNS infrastructure for DeFi frontends. Prompted renewed calls for ENS-based decentralized naming. | OC-186, OC-206 |
| Sep 8 2025 | npm Ecosystem (18 packages) | Supply Chain / Phishing | Wallets drained (scope unknown) | A prolific npm maintainer (Josh Junon / "Qix") was phished via a convincing 2FA-reset email from `npmjs.help` (lookalike domain). Attacker obtained username, password, and live TOTP code, then published malicious versions of 18 widely used packages including `debug` and `chalk` — collectively ~2.6 billion weekly downloads. Injected code hijacked crypto transactions across Ethereum, Bitcoin, and Solana in users' browsers. Contained within ~2 hours by community detection. Secondary Shai-Hulud worm payload stole cloud tokens and spread to additional accounts. | OC-006, OC-231, OC-232, OC-240 |
| Nov 2025 | npm Ecosystem (Shai-Hulud 2.0) | Supply Chain | Credential theft (25,000+ repos) | Follow-on campaign widening the September 2025 attack. Over 25,000 malicious GitHub repositories across ~350 users. Stolen credentials exfiltrated to public GitHub repos. Crypto-draining payloads renamed but functionally identical. | OC-006, OC-231, OC-240 |
| Nov 26 2025 | Upbit (second breach) | Hot Wallet / Key Management | ~$37M | Upbit suffered a second major breach affecting Solana assets. Abnormal withdrawal patterns detected; platform halted withdrawals. Pattern and timing analysis indicated a compromise of the hot-wallet signing flow rather than a smart-contract bug. | OC-001, OC-017, OC-019 |

---

### 2024

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| May 30 2024 | DMM Bitcoin (Japan) | Key Management | ~$305M | 4,502.9 BTC transferred from DMM's hot wallet. Japan's second-largest crypto theft. Exchange confirmed unauthorized leak of private keys to its servers. DMM later shut down permanently. Subsequently attributed to Lazarus Group via TraderTraitor tactics (social engineering of employees). | OC-001, OC-002, OC-017 |
| Jul 2024 | Squarespace / DeFi DNS Hijack | Frontend / DNS Hijacking | Wallet drainers deployed; losses undisclosed | Squarespace's 2023 acquisition of Google Domains deactivated 2FA on thousands of migrated accounts. Attackers hijacked DNS records for 120+ DeFi protocols including Compound Finance, Pendle Finance, and Celer Network. Compromised frontends redirected users to wallet drainers. Compound and Celer's websites served malicious approval prompts. Celer detected the attempt via on-chain monitoring before major losses. | OC-186, OC-083, OC-090 |
| Oct 16 2024 | Radiant Capital | Malware / Key Management / Social Engineering | ~$50M | Attackers sent a malicious ZIP file to a Radiant developer via Telegram, posing as a known contact. The file delivered malware that compromised the devices of at least three core developers — all of whom used hardware wallets. The malware intercepted transaction approval flows: Safe{Wallet} UI displayed legitimate data while the actual payload executed a malicious ownership transfer of `LendingPoolAddressesProvider`. Signatures were silently hijacked over multiple routine signing attempts. | OC-111, OC-206, OC-286 |
| Dec 3 2024 | Solana Web3.js (@solana/web3.js) | Supply Chain | dApps/bots drained (scope limited) | A publish-access npm account for `@solana/web3.js` (~450,000 weekly downloads) was compromised via social engineering. Attacker published malicious versions 1.95.6 and 1.95.7, injecting code that exfiltrated private keys and secret material to a hardcoded address. Versions lived on npm for approximately 5 hours before removal. Primarily affected bots and dApps that handle private keys directly. CVE-2024-54134 (CVSS 8.3). | OC-001, OC-013, OC-231, OC-240 |

---

### 2023

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Jun 2 2023 | Atomic Wallet | Key Management (cause unclear) | ~$100M | Non-custodial multi-chain wallet app experienced mass wallet compromise affecting 5,000+ wallets. Root cause never publicly confirmed — suspected options include: compromised build pipeline, malicious dependency, or flawed key generation. Largest single victim lost ~$7.95M USDT. Funds laundered through Sinbad mixer and Garantex exchange, consistent with Lazarus Group TTPs. Elliptic attributed with high confidence to Lazarus. | OC-001, OC-003, OC-018, OC-231 |
| Jul 22 2023 | Alphapo | Key Management | ~$60M | Crypto payment processor for major gambling platforms (Bovada, HypeDrop, Ignition) had hot wallet private keys on Ethereum, Tron, and Bitcoin compromised. $23M initially visible; ZachXBT traced additional $37M in BTC/TRON transfers. Funds moved to Avalanche then Bitcoin Sinbad mixer. Attack pattern consistent with Lazarus Group. Related to CoinsPaid breach occurring same day. | OC-001, OC-002, OC-017 |
| Jul 22 2023 | CoinsPaid | Social Engineering / Infrastructure | ~$37.3M | Estonia-based crypto payment processor. Lazarus Group spent 6 months in recon: aggressive phishing, bribery attempts, DDoS probes. Final breach: one employee received a fake high-salary job offer, downloaded a "test assignment" application during the fake interview process. Application stole browser profiles, session tokens, and infrastructure credentials. Attackers then used a cluster vulnerability to open a backdoor and issued legitimate-looking API requests to drain funds. | OC-005, OC-009, OC-206, OC-246 |
| Nov 19 2023 | Kronos Research | API Key Compromise | ~$26M | Quantitative trading firm's API keys were stolen via unauthorized access. With the keys, attackers could issue authenticated API requests to the exchange — moving funds as if they were the firm. No smart contract interaction required. Over 12,800 ETH drained. Trading suspended during investigation. Affected liquidity at affiliated exchange Woo X, which suspended certain trading pairs due to reduced liquidity from Kronos. | OC-005, OC-009, OC-131 |
| Dec 14 2023 | Ledger Connect Kit | Supply Chain / Phishing | ~$600K | Former Ledger employee fell victim to a phishing attack; attackers gained access to the ex-employee's active npm account (offboarding failed to revoke access). Malicious versions of `ledger-connect-kit` (1.1.5, 1.1.6, 1.1.7) pushed to npm, injecting a WalletConnect-spoofing wallet drainer into every dApp using the library. Active for ~5 hours; ~40 minutes from discovery to remediation. Affected Sushi, Zapper, Revoke.cash, and hundreds of other dApps simultaneously. | OC-009, OC-231, OC-232, OC-240 |

---

### 2022

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Jan 17 2022 | Crypto.com | Authentication / Key Management | ~$34M | Attackers bypassed Crypto.com's 2FA system and made unauthorized withdrawals from 483 user accounts. Exactly how 2FA was bypassed was not fully disclosed, but the company migrated to a "completely new 2FA infrastructure" afterward. 4,836 ETH and 443 BTC stolen. Crypto.com covered all losses. | OC-021, OC-029, OC-038 |
| Aug 2022 | LastPass (Phase 1) | Infrastructure / Developer Machine | Source code + proprietary data stolen | Attacker used a compromised developer account to access LastPass's development environment for four days, stealing source code and technical information. No vault data taken in this phase. This access was used months later in Phase 2 (Dec 2022) to steal encrypted customer vaults — which were later cracked to steal tens of millions in crypto from high-value targets. | OC-006, OC-016, OC-206 |
| Nov 11 2022 | FTX | SIM Swap / Authentication | ~$400–477M | On the same night FTX filed for bankruptcy, attackers executed a SIM swap against a senior FTX employee's phone number via a fake ID at an AT&T store. With the swapped SIM, they intercepted MFA codes and gained access to FTX's wallet infrastructure, draining $400M+ in crypto before the breach was detected. Three individuals subsequently indicted in the US (Powell, Rohn, Hernandez). | OC-029, OC-038, OC-048 |

---

### 2021

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Dec 2 2021 | BadgerDAO | Frontend / API Key / Script Injection | ~$120M | Attacker exploited a Cloudflare account creation flaw: by creating an unverified Cloudflare account, they obtained an API token that appeared valid before email verification. This token was used to inject a malicious script via Cloudflare Workers into BadgerDAO's frontend. The script intercepted Web3 wallet transaction approvals, silently adding an extra `transferFrom` call to move users' tokens to the attacker's address. Running for weeks undetected. Chainalysis and Mandiant brought in post-incident. | OC-005, OC-083, OC-090, OC-091, OC-186 |

---

### 2020

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Sep 25 2020 | KuCoin | Key Management | ~$275M | Singapore-based exchange had private keys to its hot wallets (Bitcoin, ETH/ERC20, XRP, LTC, XLM, BSV, USDT) leaked or stolen. Attackers swept all hot wallet balances in one coordinated operation. $204M subsequently recovered via on-chain tracking, contract upgrades, and judicial action; remaining 16% covered by insurance fund. Lazarus Group suspected. One of the most successful post-hack recovery operations in crypto history. | OC-001, OC-002, OC-017, OC-019 |

---

### 2019

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Nov 27 2019 | Upbit (South Korea) | Hot Wallet Compromise | ~$50M (342,000 ETH) | 342,000 ETH transferred in a single transaction from Upbit's Ethereum hot wallet to an unknown address. Exchange confirmed the compromise and pledged to cover losses from corporate funds. All remaining assets moved to cold wallets. Subsequently attributed to Lazarus Group by South Korean police (2020). | OC-001, OC-017 |

---

### 2018

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Jan 26 2018 | Coincheck (Japan) | Hot Wallet / Key Management | ~$530M | 523 million NEM tokens stolen from Coincheck's hot wallet — largest theft at the time. NEM was held in a single-signature hot wallet connected to the internet, with no multisig protection. Attacker accessed the wallet via the exchange's backend. NEM Foundation implemented an automated tagging system to mark stolen funds. Two suspects arrested by Tokyo police. Exchange later acquired by Monex Group. | OC-001, OC-017, OC-019 |

---

### 2016

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Aug 2 2016 | Bitfinex | Infrastructure / Key Management | ~$72M at theft (~$4B at recovery) | Attacker (later identified as Ilya Lichtenstein) penetrated Bitfinex's network using "advanced hacking tools," then fraudulently authorized 2,072 transactions transferring 119,756 BTC to his own wallet. He then deleted access credentials and log files to cover tracks. The exchange used BitGo's multi-sig architecture but with an implementation that allowed single-party authorization under certain conditions. In Feb 2022, US authorities seized ~94,636 BTC ($3.6B) — Lichtenstein sentenced to 60 months in federal prison Nov 2024. | OC-001, OC-020, OC-206 |

---

### 2014

| Date | Project | Attack Type | Impact | Description | Related Patterns |
|------|---------|-------------|--------|-------------|-----------------|
| Feb 2014 | Mt. Gox | Key Management / Infrastructure | ~$450M (850,000 BTC) | Over several years, 650,000+ BTC was gradually stolen from Mt. Gox's hot wallets through unauthorized access to its backend infrastructure and transaction malleability exploits. The exchange's transaction management system allowed attackers to repeatedly request re-sends by claiming transactions had not confirmed. Private key management was severely inadequate — keys were stored without encryption on internet-connected servers. Discovered after years of slow bleeding only when the exchange collapsed. | OC-001, OC-017, OC-020, OC-156 |

---

## Attack Type Distribution

| Attack Type | Incidents | Estimated Total Impact | Key Examples |
|-------------|-----------|----------------------|--------------|
| Key Management / Private Key Compromise | 11 | >$1.5B | Mt. Gox, Coincheck, KuCoin, Upbit, DMM Bitcoin, Alphapo, Step Finance |
| Social Engineering / Phishing (leading to infra access) | 6 | >$1.6B | Bybit, CoinsPaid, Radiant Capital, Ledger Connect Kit, Kronos Research, Coinbase (API) |
| Supply Chain (npm / library poisoning) | 5 | >$600K + broad exposure | Ledger Connect Kit, Solana Web3.js, npm Sep 2025, Shai-Hulud 2.0, Atomic Wallet (suspected) |
| Frontend / DNS Hijacking | 4 | >$120M | BadgerDAO, Squarespace/DeFi DNS, Aerodrome Finance, Compound/Celer |
| Infrastructure Compromise (server / cloud) | 4 | >$2B | Bybit (S3 injection), LastPass, Bitfinex, HK Securities Firm |
| Authentication Bypass / SIM Swap | 3 | >$434M | FTX (SIM swap), Crypto.com (2FA bypass), Bitfinex |
| API Key Compromise | 2 | >$29M | Kronos Research, HK Securities Firm (AWS API) |
| Hot Wallet with Insufficient Isolation | 3 | >$850M | Coincheck, KuCoin, Upbit |

---

## Key Takeaways for Auditors

- **Private key management is the single largest off-chain attack surface.** More than half of the largest crypto thefts ever resulted from compromised private keys — not smart contract bugs. Any system that generates, stores, or uses private keys is a critical audit target (OC-001 through OC-020).

- **Third-party dependencies are first-party attack vectors.** The Ledger Connect Kit, Solana Web3.js, and the September 2025 npm attack all demonstrate that a single compromised maintainer account can simultaneously inject malicious code into thousands of applications. Audit npm dependency pinning, integrity verification, and the supply chain audit trail (OC-231 through OC-245).

- **Frontend infrastructure is not "out of scope."** BadgerDAO, the Squarespace DNS hijack, Bybit's S3-injected JavaScript, and Aerodrome's DNS compromise all exploited the frontend layer — not the contract. DNS registrar controls, CDN API key scopes, CSP headers, and Subresource Integrity (SRI) are auditable assets (OC-081 through OC-105, OC-186 through OC-205).

- **Multisig and hardware wallets do not protect against compromised signing environments.** Bybit had multisig. Radiant Capital's developers used hardware wallets. In both cases, the signing *infrastructure* was poisoned so that what signers saw differed from what they were actually signing. The invariant to check is whether the UI can be modified by a third-party resource loaded at runtime (OC-111, OC-113, OC-114, OC-186).

- **Social engineering targets developers, not just users.** Bybit, CoinsPaid, Radiant Capital, and Ledger Connect Kit all began with a human being deceived — a fake job interview, a Telegram file, a phishing email, a fake NPM notice. Off-chain audits should assess whether operator procedures require out-of-band verification of unexpected signing requests and whether developer machines are treated as a security boundary.

- **Offboarding failures create persistent attack surface.** The Ledger Connect Kit breach exploited the npm account of a *former* employee who had left the company. Audit whether access to signing keys, npm publish rights, CI/CD pipelines, and cloud consoles is revoked promptly on employee departure (OC-009, OC-206, OC-210).

- **Recovery is possible but rare; prevention is the only reliable strategy.** KuCoin recovered ~84% of $275M through a rapid coordinated response. Most victims recovered nothing. The incidents where recovery occurred all shared one characteristic: fast detection and immediate response before funds could be bridged and mixed. This argues for on-chain monitoring, anomaly detection on withdrawal patterns, and transaction simulation validation before execution (OC-108, OC-109, OC-246 through OC-265).

---

*Last updated: 2026-02-18. Sources include Chainalysis, Elliptic, BlockSec, Halborn, Bleeping Computer, SlowMist, ZachXBT on-chain analysis, and official post-mortems from affected projects.*
