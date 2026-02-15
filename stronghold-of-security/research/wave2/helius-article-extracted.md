# Helius: Solana Hacks, Bugs, and Exploits - Complete Extraction
<!-- Source: https://www.helius.dev/blog/solana-hacks -->
<!-- Extracted: 2026-02-06 -->
<!-- 38 incidents, March 2020 – Q1 2025 -->
<!-- Gross losses: ~$600M, Net losses: ~$131M -->

## Summary Statistics
- **Total Incidents:** 38 verified security incidents (March 2020–Q1 2025)
- **Gross Losses:** ~$600 million
- **Mitigated Losses:** ~$469 million
- **Net Losses:** ~$131 million
- **By Category:** Application Exploits (26/68.4%), Supply Chain (2/5.3%), Network-Level (4/10.5%), Core Protocol (6/15.8%)
- **Peak Year:** 2022 with 15 incidents

---

## Incident Index

| # | Incident | Date | Category | Amount Lost | Root Cause |
|---|----------|------|----------|-------------|------------|
| 1 | Solana Turbine Bug | Dec 2020 | Core Protocol | $0 | Block propagation tracked by slot not hash |
| 2 | Solend Auth Bypass | Aug 2021 | App Exploit | $16K (reimbursed) | Insecure auth check in UpdateReserveConfig |
| 3 | Wormhole Bridge | Feb 2022 | App Exploit | $326M (reimbursed) | Signature verification bypass |
| 4 | Cashio | Mar 2022 | App Exploit | $52.8M (partial) | Missing mint field validation |
| 5 | Crema Finance | Jul 2022 | App Exploit | $8.8M (net $1.6M) | Fake tick account, no owner verification |
| 6 | Audius Governance | Jul 2022 | App Exploit | $6.1M | Governance proposal validation bypass |
| 7 | Nirvana Finance | Jul 2022 | App Exploit | $3.5M | Flash loan bonding curve manipulation |
| 8 | Slope Wallet | Aug 2022 | App Exploit | $8M | Private key logging to Sentry |
| 9 | OptiFi Lockup | Aug 2022 | App Exploit | $661K | Accidental program close |
| 10 | Mango Markets | Oct 2022 | App Exploit | $116M (net $47M) | Oracle price manipulation |
| 11 | UXD Protocol | Oct 2022 | App Exploit | $19.9M (recovered) | Mango cascade - frozen deposits |
| 12 | Tulip Protocol | Oct 2022 | App Exploit | $2.5M (recovered) | Mango cascade - frozen vaults |
| 13 | Save/Solend | Nov 2022 | App Exploit | $1.26M (absorbed) | Oracle manipulation in isolated pools |
| 14 | Raydium | Dec 2022 | App Exploit | $4.4M (net ~$0.4M) | Admin key compromise (Trojan) |
| 15 | Grape Protocol IDO | Sep 2021 | Network-Level | $0 | Bot spam 400K TPS, 17hr outage |
| 16 | Candy Machine | May 2022 | Network-Level | $0 | Bot swarm 4M requests, 7hr outage |
| 17 | Durable Nonce Bug | Jun 2022 | Core Protocol | $0 | Failed tx double-processed, 4.5hr outage |
| 18 | Duplicate Block Bug | Sep-Oct 2022 | Core Protocol | $0 | Fork choice logic bug |
| 19 | Cypher Protocol | Aug 2023 | App Exploit | $1.04M + $317K insider | Margin/futures logic flaw + insider theft |
| 20 | SVT Token (Solvent) | Aug 2023 | App Exploit | $400K | Flash loan economic model exploit |
| 21 | Synthetify DAO | Oct 2023 | App Exploit | $230K | Governance attack on inactive DAO |
| 22 | Thunder Terminal | Dec 2023 | App Exploit | $240K | MongoDB connection URL compromised |
| 23 | Aurory SyncSpace | Dec 2023 | App Exploit | $830K (mitigated) | Race condition in off-chain buy endpoint |
| 24 | Turbine Failure | Feb 2023 | Core Protocol | $0 | Large block overwhelmed dedup logic, 9hr outage |
| 25 | Saga DAO | Jan 2024 | App Exploit | $60K | Multisig 1/12 threshold breach |
| 26 | Solareum | Mar 2024 | App Exploit | $520K-$1.4M | NK developer, MongoDB key compromise |
| 27 | io.net GPU Metadata | Apr 2024 | App Exploit | $0 | Spoofed 400K virtual GPUs |
| 28 | Jito DDoS | Dec 2023 | Network-Level | $0 | DDoS during JTO airdrop |
| 29 | Phantom DDoS | Feb 2024 | Network-Level | $0 | DDoS during JUP airdrop |
| 30 | Pump.fun | May 2024 | App Exploit | $1.9M (mitigated) | Insider flash loan bonding curve attack |
| 31 | Banana Gun | Sep 2024 | App Exploit | $1.4M (refunded) | Telegram message oracle interception |
| 32 | DEXX | Nov 2024 | App Exploit | $30M | Plaintext private key leak |
| 33 | NoOnes | Jan 2025 | App Exploit | $7.9M | Cross-chain bridge hot wallet exploit |
| 34 | Loopscale | Apr 2025 | App Exploit | $5.8M (recovered) | RateX PT oracle price manipulation |
| 35 | Parcl Front-End | Aug 2024 | Supply Chain | Undisclosed | DNS hijacking |
| 36 | Web3.js Supply Chain | Dec 2024 | Supply Chain | ~$130K | npm phishing, malicious package |
| 37 | JIT Cache Bug | Feb 2024 | Core Protocol | $0 | Infinite recompile loop, 5hr outage |
| 38 | ELF Alignment Vuln | Aug 2024 | Core Protocol | $0 | ELF address alignment flaw (patched preemptively) |
