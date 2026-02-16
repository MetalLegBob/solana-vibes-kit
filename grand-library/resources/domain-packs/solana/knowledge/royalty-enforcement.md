---
pack: solana
confidence: 9/10
sources_checked: 18
last_updated: "2026-02-16"
---

# NFT Royalty Enforcement on Solana

How do I enforce royalties on Solana NFTs?

## The Uncomfortable Truth

**There is no perfect royalty enforcement on Solana (or any blockchain).** You can make it expensive, inconvenient, or socially unacceptable to bypass royalties, but you cannot make it impossible without sacrificing composability. This guide covers the real options available in 2026, the history of why enforcement is hard, and the tradeoffs of each approach.

## The Royalty Wars: What Happened

### 2021-2022: The Honeymoon Period

Early Solana NFT marketplaces (Magic Eden, Solanart, OpenSea) **voluntarily** honored creator royalties encoded in Metaplex Token Metadata. Royalties were purely social convention—marketplaces read the `sellerFeeBasisPoints` field and paid creators. No enforcement existed because the SPL Token program (which NFTs used under the hood) allowed direct wallet-to-wallet transfers that bypassed Token Metadata entirely.

**The problem:** Anyone could transfer an NFT using `spl-token transfer` and ignore royalties completely. Most users didn't know how, but sophisticated traders did.

### Late 2022: The Race to Zero

New marketplaces emerged offering **zero royalty fees** to win market share:

1. **SudoSwap** (Ethereum) proved optional royalties could capture liquidity
2. **Yawww** launched on Solana with 0% royalties
3. **Magic Eden** (October 2022) made royalties optional to compete, triggering community backlash
4. **OpenSea** followed suit, abandoning mandatory royalties

**Result:** Creator royalties on Solana collapsed from ~5% average to ~0.5% in Q4 2022. Many creators lost their primary revenue source.

### Early 2023: The Fight Back

The Solana ecosystem responded with technical solutions:

- **February 2023:** Metaplex launched **Programmable NFTs (pNFTs)** with rule sets to enforce royalties
- **February 2023:** Solana NFT Projects coalition created **Creator Standard** (whitelist approach)
- **November 2023:** Magic Eden launched **Open Creator Protocol (OCP)** for opt-in enforcement
- **2024:** Metaplex Core introduced **Royalties Plugin** with built-in enforcement

### 2024-2026: The Current State

Today, enforcement is **fragmented** but improving:

- **Metaplex Core** has best-in-class enforcement via Royalties Plugin + marketplace compliance
- **pNFTs** (Programmable NFTs) enforce via rule sets but have ecosystem friction
- **Token-2022 Transfer Hooks** offer custom logic but limited adoption
- **Legacy Token Metadata** relies entirely on marketplace goodwill (no enforcement)

Most major marketplaces (Magic Eden, Tensor, Coral Cube) now support enforced royalties for **Core** and **pNFTs**, but bypass is still possible for legacy NFTs and on-chain programs that ignore rules.

## Current Enforcement Options (2026)

### Option 1: Metaplex Core + Royalties Plugin (Best)

**Status:** Production-ready, best ecosystem support

Metaplex Core's Royalties Plugin hooks into the lifecycle of every transfer, burn, and delegate operation. When combined with compliant marketplaces, it provides the strongest enforcement on Solana today.

#### Implementation

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, ruleSet } from '@metaplex-foundation/mpl-core';
import { publicKey } from '@metaplex-foundation/umi';

const umi = createUmi('https://api.mainnet-beta.solana.com').use(mplCore());

// Create NFT with Royalties Plugin
await create(umi, {
  name: 'My NFT',
  uri: 'https://arweave.net/metadata.json',
  plugins: [
    {
      type: 'Royalties',
      basisPoints: 500, // 5%
      creators: [
        {
          address: publicKey('Creator1...'),
          percentage: 60,
        },
        {
          address: publicKey('Creator2...'),
          percentage: 40,
        },
      ],
      ruleSet: ruleSet('ProgramAllowList', [
        // Whitelist allowed programs (marketplaces, escrows, etc.)
        publicKey('MagicEdenProgramId...'),
        publicKey('TensorProgramId...'),
      ]),
    },
  ],
}).sendAndConfirm(umi);
```

#### How It Works

1. **Plugin Lifecycle Hooks**: Every `transfer`, `burn`, or `delegate` instruction checks the Royalties Plugin
2. **Rule Set Enforcement**: The plugin defines a `ruleSet` that specifies:
   - `None`: No restrictions (wallet-to-wallet OK, marketplaces must honor royalties)
   - `ProgramAllowList`: Only whitelisted programs can transfer (strictest)
   - `ProgramDenyList`: Block specific programs, allow others
3. **Marketplace Integration**: Compliant marketplaces check the plugin and automatically deduct royalties before transferring NFT
4. **Collection-Level Royalties**: Set plugin on Collection; all child assets inherit (updatable in one transaction)

#### Rule Set Options Explained

```typescript
// Option A: Allow wallet-to-wallet, trust marketplaces (most permissive)
ruleSet: ruleSet('None')

// Option B: Only allow specific programs to transfer (strictest)
ruleSet: ruleSet('ProgramAllowList', [
  publicKey('MagicEden...'),
  publicKey('Tensor...'),
  publicKey('YourCustomEscrow...'),
])

// Option C: Block specific programs, allow everything else
ruleSet: ruleSet('ProgramDenyList', [
  publicKey('ShadyMarketplace...'),
])
```

#### Collection-Level Royalties (Powerful Feature)

```typescript
import { addCollectionPlugin, updateCollectionPlugin } from '@metaplex-foundation/mpl-core';

// Add royalties to entire collection
await addCollectionPlugin(umi, {
  collection: collectionAddress,
  plugin: {
    type: 'Royalties',
    basisPoints: 750, // 7.5%
    creators: [{ address: creator, percentage: 100 }],
    ruleSet: ruleSet('None'),
  },
}).sendAndConfirm(umi);

// Update royalties for entire collection in ONE transaction
await updateCollectionPlugin(umi, {
  collection: collectionAddress,
  plugin: {
    type: 'Royalties',
    basisPoints: 500, // Changed to 5%
    creators: [{ address: creator, percentage: 100 }],
    ruleSet: ruleSet('None'),
  },
}).sendAndConfirm(umi);
```

**Core advantage:** In January 2026, Metaplex added **collection-level plugin operations**. You can now freeze, update royalties, or modify plugins for 10,000+ assets in a **single transaction**. This is impossible with pNFTs.

#### Marketplace Support (2026)

| Marketplace | Core Royalties Support | Auto-Deduction |
|------------|----------------------|----------------|
| **Magic Eden** | ✅ Full | ✅ Yes |
| **Tensor** | ✅ Full | ✅ Yes |
| **Coral Cube** | ✅ Full | ✅ Yes |
| **Metaplex Genesis** | ✅ Full | ✅ Yes |
| **OpenSea** | ⚠️ Limited | ⚠️ Partial |

#### Strengths

✅ **Best ecosystem support**: Major marketplaces auto-enforce
✅ **Single account design**: Lower cost, simpler architecture
✅ **Collection-level updates**: Change royalties for entire collection in one tx
✅ **DAS indexing**: Royalty data auto-indexed by RPC providers
✅ **Multiple rule sets**: Flexible enforcement levels

#### Limitations

❌ **Not retroactive**: Only works for newly minted Core NFTs, can't convert legacy Token Metadata
❌ **Allowlist maintenance**: If using `ProgramAllowList`, must update when new marketplaces launch
❌ **On-chain bypass still possible**: Advanced users can write custom programs to transfer without checks (but marketplaces won't accept them)

#### When to Use

- **New NFT projects** launching in 2024+
- **Creators who want strong enforcement** with minimal ongoing management
- **Collections needing flexibility** to update royalties later

### Option 2: Programmable NFTs (pNFTs) with Rule Sets

**Status:** Mature but complex; being superseded by Core for new projects

pNFTs were Metaplex's first attempt at enforceable royalties (Feb 2023). They use **Token Metadata v1.11+** with a `TokenStandard::ProgrammableNonFungible` type and **Rule Sets** from the `mpl-token-auth-rules` program.

#### Implementation

```typescript
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { createMintWithAssociatedToken } from "@metaplex-foundation/mpl-token-metadata";

const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));

// Create pNFT with royalty enforcement
const { nft } = await metaplex.nfts().create({
  uri: "https://arweave.net/metadata.json",
  name: "My pNFT",
  sellerFeeBasisPoints: 500, // 5% royalty
  tokenStandard: 4, // ProgrammableNonFungible
  ruleSet: await metaplex.rulesets().create({
    // Default rule set enforces royalties
    operations: {
      "Transfer:Owner": { All: { of: ["Amount:Exact", "RoyaltyPaid"] } },
      "Transfer:TransferDelegate": { All: { of: ["RoyaltyPaid"] } },
    },
  }),
});
```

#### How It Works

1. **Token Delegates**: pNFTs introduce granular delegation:
   - **Sale Delegate**: Can list NFT for sale
   - **Transfer Delegate**: Can move NFT (temporary)
   - **Utility Delegate**: Can use NFT in programs
   - **Staking Delegate**: Can lock NFT
2. **Rule Set Validation**: Every operation checks the rule set program (CPI call)
3. **Royalty Rules**: Rules specify conditions like:
   - `RoyaltyPaid`: Sale must include royalty payment
   - `Amount:Exact`: Transfer amount must match exactly
   - `ProgramAllowed`: Only whitelisted programs can interact
4. **Marketplace Integration**: Marketplaces use `Transfer:SaleDelegate` instruction with royalty payment

#### Rule Set Examples

```rust
// Strict: Only allow transfers with royalty payment
{
  "Transfer:Owner": {
    "All": {
      "of": [
        "Amount:Exact",
        "RoyaltyPaid" // MUST include royalty
      ]
    }
  }
}

// Permissive: Allow wallet-to-wallet, enforce on marketplace sales
{
  "Transfer:Owner": "Pass", // Allow owner transfers
  "Transfer:SaleDelegate": {
    "All": { "of": ["RoyaltyPaid"] } // Enforce on sales
  }
}
```

#### Three Upgrade Paths (Legacy → pNFT)

When pNFTs launched (Feb 2023), creators could upgrade existing NFTs using three profiles:

1. **Maximum Compatibility**: Allow most ecosystem programs, light enforcement
2. **Balanced**: Block known bypass tools, allow major marketplaces
3. **Maximum Enforcement**: Strict allowlist, only approved programs

```typescript
// Upgrade existing NFT to pNFT
await metaplex.nfts().migrateToSized({
  nft: existingNft,
  ruleSet: defaultRuleSet, // or custom rule set
});
```

#### Strengths

✅ **Granular delegation**: Separate authorities for sale, transfer, utility, staking
✅ **Proven track record**: Used by major projects since 2023
✅ **Upgrade path**: Could convert legacy NFTs to pNFTs (one-way)

#### Limitations

❌ **Complexity**: Multiple account dependencies (metadata, edition, token record, rule set)
❌ **Higher costs**: More accounts = higher rent and transaction fees
❌ **Delegation friction**: Some wallets/programs don't support pNFT delegation model
❌ **No collection-level updates**: Must update each pNFT individually (expensive for 10k collections)
❌ **Being superseded by Core**: Metaplex now recommends Core for new projects

#### When to Use

- **Legacy projects** that already upgraded to pNFTs
- **Existing collections** that need enforcement and can't migrate to Core
- **Projects needing granular delegation** (rare use case)

**Note:** Metaplex recommends **Core** for all new projects. pNFTs are maintained but not actively developed.

### Option 3: Token-2022 Transfer Hook

**Status:** Experimental; powerful but limited ecosystem adoption

Token Extensions (Token-2022) includes a **Transfer Hook** extension that executes custom program logic on every token transfer. You can use this to enforce royalty payments.

#### Implementation

```rust
use anchor_lang::prelude::*;
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

#[program]
pub mod royalty_hook {
    pub fn initialize_hook(ctx: Context<InitializeHook>, royalty_bps: u16) -> Result<()> {
        let config = &mut ctx.accounts.hook_config;
        config.royalty_bps = royalty_bps;
        config.creator = ctx.accounts.creator.key();
        Ok(())
    }

    // This instruction is invoked on EVERY transfer
    pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.hook_config;

        // Calculate royalty (only on sales, not wallet-to-wallet)
        if ctx.accounts.is_sale {
            let royalty_amount = (amount as u128)
                .checked_mul(config.royalty_bps as u128)
                .unwrap()
                .checked_div(10000)
                .unwrap() as u64;

            // Verify royalty payment instruction exists in transaction
            require!(
                verify_royalty_payment(&ctx.accounts, royalty_amount),
                ErrorCode::RoyaltyNotPaid
            );
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ExecuteHook<'info> {
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    #[account(seeds = [b"hook_config"], bump)]
    pub hook_config: Account<'info, HookConfig>,
}
```

#### How It Works

1. **Extension at Mint**: Transfer hook extension added when creating mint
2. **Hook Program ID**: Mint specifies which program to call on transfers
3. **Mandatory Execution**: Token-2022 automatically CPIs to hook program before transfer completes
4. **Custom Logic**: Hook program can:
   - Verify royalty payment accounts exist
   - Check allowlists/denylists
   - Update state (track transfers, stats, etc.)
   - Reject transfer if conditions not met

#### Mint Creation with Transfer Hook

```rust
// Initialize mint with transfer hook
invoke(
    &spl_token_2022::extension::transfer_hook::instruction::initialize(
        &spl_token_2022::id(),
        &mint.key(),
        Some(authority.key()),
        Some(hook_program_id), // Your custom hook program
    )?,
    &[mint_info],
)?;
```

#### Strengths

✅ **Fully programmable**: Write any enforcement logic you want
✅ **Native token integration**: Uses SPL Token-2022 (no Metaplex dependency)
✅ **Always executes**: Can't bypass hook without bypassing Token-2022 entirely
✅ **Flexible use cases**: Royalties, blacklists, tracking, custom fees, etc.

#### Limitations

❌ **Minimal ecosystem support**: Few marketplaces support Token-2022 NFTs
❌ **Complex implementation**: Must write and audit custom hook program
❌ **Must plan at mint**: Can't add transfer hook after mint creation
❌ **Gas costs**: Every transfer pays compute for hook execution
❌ **No wallet UI**: Most wallets don't show transfer hook details to users

#### When to Use

- **Experimental projects** exploring cutting-edge enforcement
- **Custom token mechanics** beyond standard NFTs
- **Projects that need on-chain transfer tracking** (e.g., soulbound tokens, licenses)
- **Long-term bets** on Token-2022 ecosystem growth

**Reality check:** As of Feb 2026, very few NFT projects use Transfer Hooks because marketplace/wallet support is limited. This may change as Token-2022 matures.

### Option 4: Legacy Token Metadata (No Enforcement)

**Status:** Deprecated for new projects; relies on marketplace goodwill

The original Metaplex Token Metadata standard has **zero enforcement**. The `sellerFeeBasisPoints` field is purely informational. Marketplaces can choose to honor it or not.

#### Implementation

```typescript
const { nft } = await metaplex.nfts().create({
  uri: "https://arweave.net/metadata.json",
  name: "My NFT",
  sellerFeeBasisPoints: 500, // 5% - PLEASE pay this (no enforcement)
  creators: [
    { address: creator1.publicKey, share: 60 },
    { address: creator2.publicKey, share: 40 },
  ],
});
```

#### How It "Works"

1. **Marketplace reads metadata**: On listing, marketplace fetches NFT metadata
2. **Marketplace decides**: Voluntarily deduct royalties from sale proceeds
3. **User can bypass**: List on 0% royalty marketplace or transfer via SPL Token directly

#### Strengths

✅ **Universal compatibility**: Every wallet/marketplace supports it
✅ **Simple**: No complex rule sets or hooks
✅ **Cheap**: Lowest minting cost (fewest accounts)

#### Limitations

❌ **Zero enforcement**: Completely voluntary
❌ **Race to zero**: Marketplaces compete by dropping royalties
❌ **Direct transfers**: Users can send via `spl-token transfer` and bypass entirely

#### When to Use

- **Existing legacy collections** that can't migrate
- **Projects prioritizing compatibility** over enforcement
- **Free/CC0 projects** that don't care about royalties

**Recommendation:** Do NOT use for new projects. Use Core or pNFTs instead.

## The Bypass Problem: Why Perfect Enforcement Is Impossible

All enforcement methods on Solana (and Ethereum, for that matter) share a fundamental vulnerability:

### Smart Users Can Always Write Custom Programs

```rust
// Hypothetical bypass program (simplified)
#[program]
pub mod royalty_bypass {
    pub fn sneaky_transfer(ctx: Context<SneakyTransfer>) -> Result<()> {
        // Direct SPL Token transfer, ignoring Core/pNFT logic
        spl_token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                spl_token::Transfer {
                    from: ctx.accounts.from_ata.to_account_info(),
                    to: ctx.accounts.to_ata.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            1,
        )?;
        Ok(())
    }
}
```

**Why this works:** Core and pNFT enforcement happens in the **Metaplex Core program** or **Token Metadata program**, not the underlying **SPL Token program**. If you interact with SPL Token directly, you bypass Metaplex logic.

**Why it doesn't matter:** Marketplaces won't accept NFTs transferred this way because:
1. They check royalty payment history (DAS indexing shows "suspicious" transfer)
2. They explicitly call Core/pNFT transfer instructions (not SPL Token)
3. NFTs transferred via bypass lose metadata validity in indexes

**Bottom line:** You can make bypass socially/technically expensive, but not impossible. The goal is making it harder to bypass than the royalty cost.

## Marketplace Compliance: The Real Enforcement Mechanism

Technical enforcement is only half the battle. **Marketplace adoption** is what actually works:

### How Compliant Marketplaces Enforce

1. **Instruction Validation**: Only accept sales via Core/pNFT transfer instructions (not raw SPL)
2. **Automatic Royalty Deduction**: Calculate royalty from sale price, send to creators before transferring NFT
3. **Index Checking**: Flag NFTs with suspicious transfer history (bypassed royalties)
4. **UI Transparency**: Show buyers that royalties are enforced (builds trust)

### Current Marketplace Landscape (Feb 2026)

| Marketplace | Core Royalties | pNFT Royalties | Token-2022 | Notes |
|------------|---------------|----------------|------------|-------|
| **Magic Eden** | ✅ Enforced | ✅ Enforced | ❌ No | Largest Solana marketplace |
| **Tensor** | ✅ Enforced | ✅ Enforced | ❌ No | Pro trader focus, full support |
| **Coral Cube** | ✅ Enforced | ✅ Enforced | ❌ No | Community-focused |
| **OpenSea** | ⚠️ Partial | ⚠️ Partial | ❌ No | Cross-chain, inconsistent |
| **Metaplex Genesis** | ✅ Enforced | N/A | ❌ No | Launchpad, native Core |

### The Magic Eden OCP Experiment

In November 2023, Magic Eden launched **Open Creator Protocol (OCP)**, a custom enforcement tool:

- Creators opt-in by adding OCP metadata to their collection
- OCP program validates transfers, similar to pNFT rule sets
- Magic Eden marketplace auto-enforces for OCP collections

**Result:** OCP had limited adoption. Most creators chose Core or pNFTs instead because OCP is Magic Eden-specific (no cross-marketplace support).

## Enforcement Comparison Matrix

| Method | Enforcement Strength | Ecosystem Support | Migration Path | Recommended |
|--------|---------------------|-------------------|----------------|-------------|
| **Metaplex Core** | 🟢 Strong | 🟢 Growing | ❌ New only | ✅ Yes (new) |
| **pNFTs** | 🟢 Strong | 🟡 Mature | ✅ Upgrade | ⚠️ Legacy only |
| **Token-2022 Hook** | 🟢 Strongest | 🔴 Minimal | ❌ New only | ❌ Not yet |
| **Token Metadata** | 🔴 None | 🟢 Universal | N/A | ❌ No |

## Best Practices for Creators

### For New Projects (Launching 2024+)

1. **Use Metaplex Core** with Royalties Plugin
2. **Choose the right rule set**:
   - `None`: Trust marketplaces, allow wallet-to-wallet (most compatible)
   - `ProgramAllowList`: Strict control, allowlist trusted programs (most secure)
3. **Set collection-level royalties**: Update entire collection in one tx
4. **Communicate to community**: Explain why royalties matter for project sustainability

### For Existing Token Metadata Collections

You have three options:

1. **Do nothing**: Accept voluntary royalties (0.5-2% effective rate)
2. **Upgrade to pNFTs**: One-way migration, better enforcement but complexity
3. **Launch v2 as Core**: Airdrop new Core NFTs to holders, deprecate old collection

**Migration example:**

```typescript
// Airdrop Core NFTs to existing holders
const holders = await getTokenLargestAccounts(connection, oldMintAddress);

for (const holder of holders) {
  await create(umi, {
    name: `${collectionName} v2`,
    uri: updatedMetadataUri,
    owner: holder.address,
    plugins: [
      {
        type: 'Royalties',
        basisPoints: 500,
        creators: [...],
        ruleSet: ruleSet('None'),
      },
    ],
  }).sendAndConfirm(umi);
}
```

### Setting Realistic Royalty Rates

**Data from 2025:**
- **5-7.5%**: Industry standard for PFP/art projects
- **2.5-5%**: Common for gaming/utility NFTs
- **10%+**: Rare, often met with community pushback

**Tip:** Lower royalties = higher compliance. A 3% enforced royalty earns more than a 10% bypassed royalty.

## Anti-Patterns to Avoid

❌ **Setting royalties too high** (>10%): Incentivizes bypass
❌ **Using legacy Token Metadata for new projects**: No enforcement at all
❌ **Not communicating enforcement method**: Community doesn't understand why they can't use certain marketplaces
❌ **Overly restrictive allowlists**: Kills composability (can't use new marketplaces/tools)
❌ **Ignoring collection-level updates**: Don't mint 10k individual NFTs with individual royalty plugins; use collections

## The Philosophy: Enforcement vs. Composability

There's a fundamental tradeoff:

**Maximum Enforcement (Program Allowlist)**
- ✅ Royalties nearly impossible to bypass
- ❌ NFTs can't interact with new programs/marketplaces without update
- ❌ Feels like Web2 permissioning

**Maximum Composability (No Rule Set)**
- ✅ NFTs work everywhere, true digital ownership
- ❌ Marketplaces can choose to bypass royalties
- ❌ Creators depend on marketplace goodwill

**Recommended balance:** Use Core with `ruleSet: ruleSet('None')` and rely on marketplace compliance. Most major marketplaces enforce Core royalties by default, and you preserve composability.

## Future Outlook

### What's Coming

- **More Core adoption**: As of Jan 2026, Core mints grew 26% MoM (highest since Aug 2025)
- **Token-2022 maturation**: Transfer hooks will become viable as wallets/marketplaces add support
- **Cross-chain standards**: Solana may converge with EVM chains on royalty approaches (unlikely but possible)

### What Won't Change

- **Perfect enforcement is impossible**: Blockchain = permissionless, someone can always build a bypass
- **Marketplaces control reality**: Technical enforcement means nothing if marketplaces don't integrate
- **Social consensus matters**: Communities that value creator sustainability enforce royalties culturally

## Resources

- [Metaplex Core Royalties Plugin](https://developers.metaplex.com/core/plugins/royalties)
- [pNFT Documentation](https://developers.metaplex.com/token-metadata/pnfts)
- [Token-2022 Transfer Hooks](https://solana.com/developers/guides/token-extensions/transfer-hook)
- [Magic Eden OCP](https://docs.magiceden.io/open-creator-protocol)
- [Creator Standard (2023)](https://github.com/solana-nft-programs/creator-standard)

## Decision Tree

```
Are you launching a NEW project?
├─ Yes → Use Metaplex Core
│  └─ Need strict control? → ProgramAllowList rule set
│  └─ Want composability? → None rule set (trust marketplaces)
│
└─ No → Do you have existing NFTs?
   ├─ Token Metadata → Can you migrate community?
   │  ├─ Yes → Launch v2 as Core, airdrop to holders
   │  └─ No → Consider pNFT upgrade (one-way, complex)
   │
   └─ Already pNFT → Keep it, or migrate future drops to Core
```

## The Bottom Line

**For new projects in 2026:** Use **Metaplex Core** with the **Royalties Plugin** and `ruleSet('None')`. This gives you strong enforcement via marketplace compliance while preserving composability. Set royalties at 5% or below to minimize bypass incentives.

**For existing projects:** If you have Token Metadata NFTs, consider launching a v2 collection as Core and airdropping to holders. Upgrading to pNFTs is complex and being deprecated in favor of Core.

**The hard truth:** No solution is perfect. You're choosing between enforcement strength and ecosystem compatibility. Core strikes the best balance in 2026, but the real enforcement comes from marketplace adoption, not code. Build community, communicate your sustainability model, and work with marketplaces that respect creators.

Royalties are a social problem with technical guardrails, not a technical problem with a perfect solution.
