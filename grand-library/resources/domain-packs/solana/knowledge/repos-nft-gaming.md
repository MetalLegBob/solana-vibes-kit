---
pack: solana
topic: "Forkable Repos — NFT & Gaming"
type: repo-catalogue
confidence: 7/10
sources_checked: 20
last_verified: "2026-02-16"
---

# NFT & Gaming — Forkable Repo Catalogue

> **Verification note:** Fields marked [VERIFY] need live confirmation. Run `gh repo view <org/repo> --json licenseInfo,stargazerCount,forkCount,updatedAt` to verify.

---

## NFT Minting

### Metaplex Candy Machine (mpl-candy-machine)

- **URL:** https://github.com/metaplex-foundation/mpl-candy-machine
- **Framework:** Anchor / Metaplex framework
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** NFT minting, collection launch, allowlist, reveal

**Trust signals:**
- Metaplex Foundation — core Solana NFT infrastructure
- Audited multiple times
- Used for thousands of NFT collection launches
- Actively maintained
- ~500+ stars [VERIFY]

**Builder notes:**
> The canonical NFT minting program on Solana. Handles: collection minting, candy guards (allowlists, mint limits, start dates, payment gates), hidden reveals, and programmable mint authority. If launching an NFT collection, start here — don't build from scratch. The "candy guard" system is modular, letting you add custom minting conditions. If forking, you'd primarily customize the guard logic. Works with both Token Metadata and the newer Core standard.

**Complexity:** Medium — well-documented, modular guard system
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Metaplex Core (mpl-core)

- **URL:** https://github.com/metaplex-foundation/mpl-core
- **Framework:** Anchor / Metaplex framework
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reusable component, Reference implementation
- **Category tags:** NFT standard, digital assets, plugins, gaming assets

**Trust signals:**
- Metaplex Foundation — the next-generation NFT standard
- Designed as successor to Token Metadata for new use cases
- Actively developed as of 2024-2025
- Plugin-based architecture for extensibility

**Builder notes:**
> Metaplex Core is the modern NFT standard for Solana — simpler than Token Metadata, lower cost, and plugin-based. Each asset is a single account (vs. Token Metadata's multi-account setup). The plugin system allows: royalty enforcement, freeze delegates, burn delegates, and custom attributes. **Best choice for new projects** especially gaming (lower account costs). If building game items, in-game assets, or any new NFT project, use Core over Token Metadata unless you need broad marketplace compatibility.

**Complexity:** Medium — cleaner architecture than Token Metadata, plugin system adds flexibility
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Metaplex Token Metadata (mpl-token-metadata)

- **URL:** https://github.com/metaplex-foundation/mpl-token-metadata
- **Framework:** Native Rust / Metaplex framework
- **License:** Apache 2.0
- **Use cases:** Reference implementation, Reusable component
- **Category tags:** NFT standard, metadata, royalties, programmable NFTs

**Trust signals:**
- The original and most widely adopted NFT standard on Solana
- Audited multiple times by major firms
- Every Solana NFT marketplace supports this standard
- ~500+ stars [VERIFY]

**Builder notes:**
> Still the most widely supported NFT standard, but Core is the recommended path for new projects. Token Metadata uses a multi-account model (mint + metadata + master edition) which is more expensive and complex. Programmable NFTs (pNFTs) added royalty enforcement through a rule set system. Study this for compatibility with existing marketplaces and understanding the NFT ecosystem's evolution. Fork only if you need deep customization of the metadata standard itself.

**Complexity:** High — large codebase, multi-account model, pNFT rule sets
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Compressed NFTs / State Compression

### Metaplex Bubblegum (mpl-bubblegum)

- **URL:** https://github.com/metaplex-foundation/mpl-bubblegum
- **Framework:** Anchor / Metaplex framework
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Compressed NFTs, cNFTs, state compression, Merkle tree

**Trust signals:**
- Metaplex Foundation — canonical compressed NFT program
- Used for DRiP, Helium migration, and other large-scale NFT distributions
- Dramatically reduces cost (~$5 for 1M NFTs vs. millions of dollars uncompressed)
- Actively maintained

**Builder notes:**
> Compressed NFTs store data off-chain in a Merkle tree with only the root on-chain. Enables massive scale at minimal cost. If distributing millions of NFTs (loyalty, gaming, social), this is the only practical approach. Uses the SPL Account Compression program under the hood. If forking, the customization points are: metadata schema, collection authority logic, and integration with DAS (Digital Asset Standard) API for indexing. Requires a DAS-compatible indexer (Helius, Triton) for reads.

**Complexity:** High — Merkle tree proofs, concurrent trees, DAS integration required
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Gaming

### Magicblock Bolt (ECS Framework)

- **URL:** https://github.com/magicblock-labs/bolt
- **Framework:** Anchor + ECS (Entity Component System)
- **License:** [VERIFY] — likely MIT or Apache 2.0
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Gaming, ECS, on-chain game framework, real-time

**Trust signals:**
- Magicblock Labs — dedicated Solana gaming infrastructure team
- ECS pattern is the gold standard for game development
- Active development through 2024-2025
- Backed by Solana ecosystem grants [VERIFY]

**Builder notes:**
> The most complete on-chain gaming framework for Solana. Uses Entity Component System (ECS) pattern — entities are accounts, components are data attached to entities, systems are programs that operate on components. If building an on-chain game, start here rather than designing your own account architecture. Handles: entity creation, component attachment, system registration, and world state management. The ECS pattern maps well to Solana's account model. If forking, customize the component schemas for your game's specific data needs.

**Complexity:** Medium-High — ECS concepts + Solana account model integration
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### SOAR (Solana On-chain Achievements & Rankings)

- **URL:** https://github.com/magicblock-labs/SOAR
- **Framework:** Anchor
- **License:** [VERIFY] — likely MIT or Apache 2.0
- **Use cases:** Reusable component, Fork candidate
- **Category tags:** Gaming, leaderboards, achievements, on-chain rankings

**Trust signals:**
- Also by Magicblock Labs
- Purpose-built for on-chain game achievements and leaderboards
- Actively maintained alongside Bolt

**Builder notes:**
> On-chain leaderboards and achievement tracking for Solana games. If your game needs verifiable rankings, achievement NFTs, or competitive scoring, use this rather than building custom. Integrates with Bolt ECS. Clean Anchor code. If forking, customize: scoring algorithms, achievement criteria, and reward distribution (e.g., mint achievement NFTs via Metaplex Core).

**Complexity:** Medium — focused scope, clean API
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## On-Chain Randomness

### ORAO VRF

- **URL:** https://github.com/orao-network/solana-vrf
- **Framework:** Anchor
- **License:** [VERIFY] — likely MIT or Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** Randomness, VRF, gaming, lotteries

**Trust signals:**
- ORAO Network — dedicated VRF provider
- Simpler integration than Switchboard
- Production use for gaming and lottery applications

**Builder notes:**
> The simplest VRF integration on Solana. If you need on-chain randomness (games, lotteries, random NFT traits), ORAO has the lowest integration overhead. Single CPI call to request randomness. Tradeoff vs Switchboard: ORAO is simpler but smaller network. For games where "good enough" randomness is fine, ORAO is the path of least resistance. For DeFi or high-stakes applications requiring maximum decentralization, consider Switchboard.

**Complexity:** Low — simple CPI integration
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Switchboard V2 (VRF + Oracle)

- **URL:** https://github.com/switchboard-xyz/switchboard-v2
- **Framework:** Anchor
- **License:** MIT [VERIFY]
- **Use cases:** Reusable component, Reference implementation
- **Category tags:** Randomness, VRF, oracle, data feeds

**Trust signals:**
- Switchboard — major Solana oracle provider alongside Pyth
- Large validator network for VRF
- Actively maintained, well-funded
- Used by many DeFi and gaming protocols

**Builder notes:**
> More complex than ORAO but backed by a larger oracle network. VRF is one feature of the broader Switchboard oracle platform. If you also need price feeds or custom data feeds alongside randomness, Switchboard gives you one integration for multiple needs. The integration requires more setup (queue, oracle assignment) compared to ORAO's single CPI call. Study the VRF examples in their SDK.

**Complexity:** Medium-High — full oracle platform, VRF is one feature
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Marketplaces

### Metaplex Auction House / Auctioneer

- **URL:** https://github.com/metaplex-foundation/mpl-auction-house
- **Framework:** Anchor / Metaplex framework
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Marketplace, auction, NFT trading, escrow

**Trust signals:**
- Metaplex Foundation — used by multiple NFT marketplaces
- Audited
- [VERIFY] current maintenance status — may be superseded by newer Metaplex marketplace programs

**Builder notes:**
> Decentralized marketplace protocol for NFT trading. Handles: listings, bids, sales, auction mechanics, and escrow. If building an NFT marketplace, study this architecture. The auctioneer extension adds time-based auction support. **Check current status** — Metaplex has been evolving their marketplace programs and this may be in maintenance mode. For new marketplaces, verify whether there's a newer Metaplex marketplace primitive.

**Complexity:** Medium-High — marketplace state machine, escrow management, auction logic
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**If you're launching an NFT collection:**
Use Candy Machine with Core (not Token Metadata for new projects). Study the candy guard system for custom minting conditions.

**If you need millions of NFTs cheaply:**
Use Bubblegum (compressed NFTs). Requires a DAS-compatible indexer.

**If you're building an on-chain game:**
Start with Magicblock Bolt (ECS) + SOAR (leaderboards) + Core (game items) + ORAO VRF (randomness).

**If you're building an NFT marketplace:**
Study Metaplex Auction House architecture, verify current status, and check for newer Metaplex marketplace programs.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | All Metaplex repos (Candy Machine, Core, Token Metadata, Bubblegum, Auction House) | **Yes** |
| MIT / VERIFY | Magicblock (Bolt, SOAR), ORAO VRF, Switchboard | **Likely yes** — verify each |
