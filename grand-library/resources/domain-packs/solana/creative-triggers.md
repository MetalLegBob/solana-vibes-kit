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

---

## Fork Opportunity Triggers

Signals that the builder is describing functionality with existing open source precedent. When detected, offer to show matching repos from the catalogue before continuing the interview.

**Interviewer behavior:** When a signal below is detected, pause and say:
> "There are battle-tested open source repos you could fork instead of building from scratch. Want me to show you the options before we continue designing?"

If yes, load the matching `repos-*.md` catalogue file, run a live research check (recent commits, vulnerabilities), and present options with trade-offs. If no, continue the interview as normal.

| Signal Detected | Catalogue File | Example Triggers |
|----------------|---------------|-----------------|
| AMM or DEX design | repos-defi-primitives | "Building a bonding curve", "constant-product swap", "concentrated liquidity" |
| Lending or borrowing | repos-defi-primitives | "Users deposit collateral", "interest rate model", "liquidation" |
| Escrow or conditional release | repos-defi-primitives | "Funds held until conditions met", "two-party exchange" |
| Vault or strategy fund | repos-defi-primitives | "Users deposit into a vault", "managed fund", "auto-compound" |
| Token launch or launchpad | repos-token-infrastructure | "Fair launch", "bonding curve mint", "token generation event" |
| Vesting or streaming payments | repos-token-infrastructure | "Token unlock schedule", "cliff then linear", "team vesting" |
| Airdrop or token distribution | repos-token-infrastructure | "Merkle airdrop", "claim-based distribution" |
| Staking or liquid staking | repos-token-infrastructure | "Stake to earn", "LST", "stake pool" |
| Token-2022 extensions | repos-token-infrastructure | "Transfer hook", "transfer fee", "non-transferable token" |
| Multisig or multi-approval | repos-governance | "Multisig controls", "requires N-of-M signatures" |
| DAO or governance voting | repos-governance | "Token-weighted voting", "proposal system", "DAO" |
| veToken or vote-escrow | repos-governance | "Lock tokens for voting power", "ve-model" |
| NFT collection launch | repos-nft-gaming | "Minting NFT collection", "candy machine", "allowlist" |
| Compressed NFTs at scale | repos-nft-gaming | "Millions of NFTs cheaply", "compressed NFTs", "cNFTs" |
| On-chain game | repos-nft-gaming | "Game items on-chain", "leaderboard", "ECS", "game state" |
| On-chain randomness | repos-nft-gaming | "VRF", "random outcome", "lottery" |
| NFT marketplace | repos-nft-gaming | "Buy/sell NFTs", "auction", "marketplace" |
| Wallet connection UI | repos-client-frontend | "Connect wallet button", "wallet adapter" |
| Solana dApp scaffold | repos-client-frontend | "Starting a new dApp", "Next.js + Solana" |
| Mobile Solana app | repos-client-frontend | "Mobile dApp", "React Native + Solana" |
| Payment integration | repos-client-frontend | "Solana Pay", "QR code payment", "point of sale" |
| Custom indexing | repos-infrastructure | "Index on-chain data", "Geyser plugin", "real-time streaming" |
| Transaction submission infra | repos-infrastructure | "Reliable landing", "bundle submission", "MEV protection" |
| Scheduled automation | repos-infrastructure | "Cron job on-chain", "automated execution", "keeper bot" |
