---
pack: solana
topic: "NFT Standard Comparison"
decision: "Which NFT standard should I use on Solana?"
confidence: 9/10
sources_checked: 34
last_updated: "2026-02-16"
---

# Which NFT standard should I use on Solana?

Solana offers four primary NFT standards, each optimized for different use cases. This guide compares their costs, features, and when to use each.

## Quick Decision Matrix

| Use Case | Recommended Standard | Why |
|----------|---------------------|-----|
| New NFT projects (general) | **Metaplex Core** | Lowest cost (0.0029 SOL), single account, plugin system, full marketplace support |
| Large-scale minting (>10k assets) | **Bubblegum v2 (cNFTs)** | 1000x cheaper than regular NFTs, perfect for gaming/mass distribution |
| Dynamic on-chain metadata | **Token-2022** | Native metadata extensions, key-value store on mint account |
| Legacy/existing collections | **Token Metadata** | Established standard, but higher costs (0.022 SOL) |
| Royalty enforcement critical | **Core or Bubblegum v2** | Built-in on-chain royalty enforcement |

## Standard Comparison

### 1. Metaplex Core (Recommended for Most Projects)

**Status:** Current generation standard (launched April 2024)

**Architecture:** Single account design, no SPL Token dependency

**Minting Cost:**
- 0.0029 SOL per NFT (~$0.15-0.30)
- Protocol fee: 0.0015 SOL create + 0.00004872 SOL execute
- **83% cheaper** than Token Metadata (0.022 SOL)
- **37% cheaper** than Token-2022 (0.0046 SOL)

**Account Structure:**
- Single Core Asset account (all data in one place)
- No associated token accounts needed
- Dramatically reduced on-chain footprint

**Key Features:**
- **Plugin System:** Modular features (freeze, burn, transfer delegates, royalties, attributes, editions, etc.)
- **Collection Management:** First-class collection support with inherited plugins
- **Low Compute:** Smaller CU footprint = more transactions per block
- **Royalty Enforcement:** On-chain royalties via plugins
- **Soulbound Support:** Via Permanent Freeze Delegate or Oracle plugins
- **Edition Support:** Master Edition and Edition plugins

**Marketplace Support (Complete):**
- Tensor (first to adopt, April 2024)
- Magic Eden
- OKX
- Sniper
- Mallow

**Wallet Support:**
- Phantom
- Solflare
- Backpack

**When to Use:**
- New NFT collections (art, PFPs, collectibles)
- Projects requiring custom behavior via plugins
- Cost-sensitive projects
- Collections needing on-chain royalty enforcement
- Any project starting fresh in 2024+

**When NOT to Use:**
- You have an existing Token Metadata collection (no migration path exists yet)
- You need interoperability with legacy-only systems

**Example Cost at Scale:**
- 1,000 NFTs: 2.9 SOL (~$150-300)
- 10,000 NFTs: 29 SOL (~$1,500-3,000)

### 2. Token Metadata (Legacy Standard)

**Status:** Legacy standard (2021-2024), still widely used but being superseded

**Architecture:** Built on SPL Token, multi-account design

**Minting Cost:**
- 0.022 SOL per NFT (~$1.10-2.20)
- Requires: Mint account + Metadata account + Master Edition account + Associated Token Account
- **6x more expensive** than Core

**Account Structure:**
- Mint account (SPL Token)
- Token account (ATA)
- Metadata account
- Master Edition account (for NFTs)

**Key Features:**
- Programmable NFTs (pNFTs) with royalty enforcement
- Collection verification
- Uses verification
- Creator verification and royalties (marketplace-dependent)
- Established ecosystem compatibility

**When to Use:**
- Maintaining existing Token Metadata collections
- Projects requiring compatibility with legacy-only tools
- Updating/managing existing NFTs

**When NOT to Use:**
- Starting a new project (use Core instead)
- Cost is a major concern
- Need advanced programmability (use Core plugins)

**Migration:** No direct migration path from Token Metadata to Core exists. Collections must mint new Core assets or maintain Token Metadata.

### 3. Bubblegum v2 (Compressed NFTs / cNFTs)

**Status:** Next-generation compression (launched May 2025)

**Architecture:** Merkle tree-based compression, ledger storage

**Minting Cost:**
- ~0.00011 SOL per cNFT (for large trees)
- **~260x cheaper** than Core
- **~200x cheaper** than Token Metadata
- Example: 1 million NFTs costs ~500 SOL vs 12 million SOL uncompressed

**How It Works:**
- NFT data stored in Merkle tree (on-chain root hash)
- Leaf data stored in Solana ledger (off-chain but consensus-verified)
- Requires indexer (Helius, Quicknode, Triton, etc.) to query NFT data
- Can decompress to Token Metadata (v1 only) or use with Core Collections (v2)

**Bubblegum v2 New Features:**
- **MPL-Core Collections Integration:** cNFTs can be added to Core collections
- **Freeze/Thaw Functionality:** Project control for vesting, events
- **Soulbound Support:** Prevent transfers via plugins
- **Royalty Enforcement:** On-chain royalty plugins
- **Permissioned Plugins:** Admin control over asset lifecycle

**Merkle Tree Size Considerations:**
- Tree depth determines max NFTs per tree
- Larger trees = better cost efficiency
- Must choose tree size upfront (cannot change)

**When to Use:**
- Large-scale projects (100k+ NFTs)
- Gaming inventories/items
- Proof-of-engagement/attendance (POAPs)
- Loyalty programs
- Mass airdrops
- Any cost-sensitive high-volume use case

**When NOT to Use:**
- Small collections (<1,000 NFTs) - overhead not worth it
- Need full on-chain data without indexer dependency
- Marketplace doesn't support cNFTs (most major ones do now)

**Indexer Dependency:**
- Requires RPC with Digital Asset Standard (DAS) API
- Helius, Quicknode, Triton, Shyft all support
- Without indexer, cannot easily query NFT data

**Example Cost at Scale:**
- 100,000 NFTs: ~11 SOL (~$550-1,100)
- 1,000,000 NFTs: ~500 SOL (~$25,000-50,000)
- Compare to Core: 1M NFTs = 2,900 SOL (~$150,000-300,000)

### 4. Token-2022 (Token Extensions)

**Status:** Modern SPL Token replacement with extensions (2023+)

**Architecture:** Enhanced SPL Token with extensible metadata

**Minting Cost:**
- 0.0046 SOL per NFT
- **37% more expensive** than Core
- **79% cheaper** than Token Metadata

**Key Features:**
- **Metadata Pointer Extension:** Points to metadata account location
- **Token Metadata Extension:** On-chain key-value metadata store
- **Dynamic Metadata:** Update metadata fields on-chain (e.g., game character stats)
- **Transfer Hooks:** Custom logic on transfers
- **Permanent Delegate:** For soulbound tokens
- Native metadata without external programs

**Metadata Flexibility:**
- Can store metadata directly on mint account
- Or point to external metadata account
- Key-value store allows custom fields
- Perfect for evolving/dynamic NFT data

**When to Use:**
- Gaming NFTs with changing stats/attributes
- Dynamic NFTs requiring frequent metadata updates
- Projects wanting native SPL Token compatibility
- On-chain metadata storage without external programs

**When NOT to Use:**
- Static NFTs (Core is cheaper)
- Large-scale projects (use cNFTs)
- Don't need dynamic metadata features

**Unique Use Cases:**
- Character progression in games
- Reputation/achievement NFTs with evolving stats
- Any NFT where metadata changes frequently

### 5. Comparison Table: Core Features

| Feature | Core | Token Metadata | Bubblegum v2 | Token-2022 |
|---------|------|----------------|--------------|------------|
| Mint Cost | 0.0029 SOL | 0.022 SOL | ~0.00011 SOL | 0.0046 SOL |
| Account Structure | Single account | 4 accounts | Merkle tree | 2+ accounts |
| Royalty Enforcement | On-chain (plugin) | Marketplace-dependent | On-chain (plugin) | Transfer hooks |
| Collections | First-class | Supported | Core/TM collections | Not native |
| Plugins/Extensions | Yes (flexible) | Limited | Yes (v2) | Yes (different system) |
| Soulbound | Yes (plugins) | Via freeze | Yes (plugins) | Yes (permanent delegate) |
| Editions | Yes (plugins) | Yes (master edition) | No | No |
| Dynamic Metadata | Limited | No | No | Yes (key-value) |
| Indexer Required | No | No | Yes (critical) | No |
| Marketplace Support | Excellent | Universal | Good (growing) | Limited |
| Compute Units | Very low | High | Medium | Medium |

### 6. Cost Comparison at Scale

| Collection Size | Core | Token Metadata | Bubblegum v2 | Token-2022 |
|-----------------|------|----------------|--------------|------------|
| 100 NFTs | 0.29 SOL | 2.2 SOL | ~0.011 SOL | 0.46 SOL |
| 1,000 NFTs | 2.9 SOL | 22 SOL | ~0.11 SOL | 4.6 SOL |
| 10,000 NFTs | 29 SOL | 220 SOL | ~1.1 SOL | 46 SOL |
| 100,000 NFTs | 290 SOL | 2,200 SOL | ~11 SOL | 460 SOL |
| 1,000,000 NFTs | 2,900 SOL | 22,000 SOL | ~500 SOL | 4,600 SOL |

*Note: Prices in SOL. USD value varies with SOL price ($50-100 range = $2.50-10 per NFT for Core)*

### 7. Migration Paths

**Token Metadata → Core:**
- No official migration path exists
- Must mint new Core assets
- Can maintain both collections
- Some projects do "snapshot and remint" for holders

**Bubblegum v1 → Bubblegum v2:**
- v1 continues to work
- New projects should use v2
- v2 adds Core collection integration + plugins

**Bubblegum → Decompressed NFT:**
- v1: Can decompress to Token Metadata NFT
- v2: Works with Core collections
- One-way process (cannot re-compress)

**Token-2022 ↔️ Other Standards:**
- Separate standard, no direct migration
- Choose upfront based on use case

### 8. Developer Experience

**Ease of Development:**
1. **Core** - Simplest (single account, clean SDK)
2. **Bubblegum v2** - Moderate (Merkle tree setup, indexer integration)
3. **Token-2022** - Moderate (extension configuration)
4. **Token Metadata** - Complex (multi-account coordination)

**SDK/Tooling:**
- All standards supported by Metaplex Umi (JavaScript/TypeScript)
- Rust SDKs available for on-chain programs
- Core has best documentation (newest standard)
- Token Metadata has most examples (oldest, most content)

### 9. Real-World Adoption (Q4 2024 Data)

**Daily Average Mints:**
- Core: 12,000/day (peak, up 244% QoQ)
- Bubblegum: 500,000/day → 2,250,000/day (+350% QoQ)
- Token Metadata: Still dominant for fungible tokens (39,200/day)

**Trend:** Rapid adoption of Core for new NFT projects, Bubblegum for mass-scale applications.

### 10. Common Questions

**Q: Can I use Core plugins with cNFTs?**
A: Yes, Bubblegum v2 supports plugins and integrates with Core collections.

**Q: Do I pay rent for NFTs?**
A: Yes, all standards require rent (SOL locked for storage). Core requires least rent due to single account. cNFTs require minimal rent (Merkle tree shared across all NFTs).

**Q: Which standard for 10k PFP project?**
A: Metaplex Core. Lower cost than Token Metadata, full marketplace support, easier management.

**Q: Which standard for 1M gaming items?**
A: Bubblegum v2 (cNFTs). Cost difference is massive (500 SOL vs 2,900 SOL for Core).

**Q: Can I change standards after minting?**
A: No easy migration path. Choose carefully upfront. You can mint new collection in different standard.

**Q: Are royalties enforceable?**
A: Core and Bubblegum v2 support on-chain royalty enforcement via plugins. Token Metadata relies on marketplace cooperation (many marketplaces now ignore creator royalties).

**Q: What about interoperability?**
A: Core and Token Metadata have excellent wallet/marketplace support. Bubblegum v2 requires DAS-compatible indexer. Token-2022 has growing but limited NFT ecosystem support.

## Decision Framework

Ask yourself:

1. **Scale:** How many NFTs?
   - <10k: Core
   - >100k: Bubblegum v2
   - Medium (10-100k): Either works, consider other factors

2. **Dynamic metadata:** Need on-chain updates?
   - Yes: Token-2022 or Core with attributes plugin
   - No: Core or Bubblegum v2

3. **Budget:** Cost critical?
   - Mass scale: Bubblegum v2 (cheapest)
   - Normal scale: Core (good balance)
   - Legacy: Token Metadata (expensive)

4. **Existing collection:** Already have NFTs?
   - Token Metadata: Stay or snapshot/remint to Core
   - Fresh start: Core

5. **Custom behavior:** Need special transfer logic, staking, etc?
   - Yes: Core plugins or Token-2022 transfer hooks
   - No: Any standard works

6. **Royalties:** Must enforce on-chain?
   - Yes: Core or Bubblegum v2
   - No: Any standard

## Recommended Approach for New Projects

**Default choice: Metaplex Core**
- Best cost/feature balance
- Future-proof (newest standard)
- Full ecosystem support
- Flexible plugin system

**Scale up to Bubblegum v2 if:**
- Collection size >100,000 NFTs
- Cost is paramount concern
- You can integrate indexer for queries

**Consider Token-2022 if:**
- Need dynamic on-chain metadata (gaming, evolving NFTs)
- Want native SPL Token compatibility
- Metadata changes frequently

**Stick with Token Metadata only if:**
- Maintaining existing collection
- Absolutely require legacy-only compatibility

## Summary

The Solana NFT landscape has evolved significantly. **Metaplex Core** is the clear choice for most new NFT projects in 2024-2025, offering the best combination of cost, features, and ecosystem support. For massive scale (gaming, POAPs, mass distribution), **Bubblegum v2 compressed NFTs** provide unmatched cost efficiency. **Token-2022** serves niche use cases requiring dynamic on-chain metadata. **Token Metadata** remains relevant only for legacy collections and maintaining existing projects.

Choose based on your specific needs, but when in doubt: **start with Core**.

## References

- Metaplex Core Documentation: https://developers.metaplex.com/core
- Bubblegum v2 Announcement: https://www.metaplex.com/blog (May 2025)
- Token Extensions Guide: https://solana.com/developers/guides/token-extensions
- Messari State of Metaplex Q4 2024: Cost and adoption data
- Ecosystem Support Matrix: https://developers.metaplex.com/core/ecosystem-support
- Core vs Token Metadata: https://developers.metaplex.com/core/tm-differences
