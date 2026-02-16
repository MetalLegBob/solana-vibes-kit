# Solana Creative Doc Triggers

Domain-specific signals that suggest additional documents during the interview phase.

| Signal Detected | Suggest Document | Rationale |
|----------------|-----------------|-----------|
| Multiple on-chain programs | CPI Interface Contract | Programs that interact need explicit interface definitions |
| Token with custom transfer logic | Token Economics Model | Transfer hooks/taxes need rigorous economic analysis |
| AMM or liquidity pool | Liquidity & Slippage Analysis | Pool mechanics need edge case documentation |
| Upgrade authority retained | Program Upgrade Runbook | Upgrade procedures need step-by-step documentation |
| PDA-heavy architecture | Account Layout Reference | Complex PDA trees need visual documentation |
| External oracle dependency | Oracle Failure Playbook | What happens when price feeds go stale or wrong |
| Multi-sig or governance | Governance Procedures | Admin actions need documented approval flows |
| Cross-chain bridge interaction | Bridge Security Model | Bridge interactions are historically high-risk |
| Airdrop or token distribution | Distribution Mechanics | Token distribution has complex edge cases |
| Staking or delegation | Staking Economics Analysis | Reward math and edge cases need formal spec |
| MEV exposure identified | MEV Mitigation Strategy | Transaction ordering risks need documented mitigations |
| Compressed NFTs or state | Compression Architecture | Merkle tree design decisions need documentation |
| Permissioned instructions | Access Control Matrix | Role-based access needs explicit documentation |
| Multiple token types | Token Interaction Matrix | How different tokens interact within the system |
| Time-dependent logic | Clock & Slot Dependency Analysis | Solana clock quirks need documented assumptions |
