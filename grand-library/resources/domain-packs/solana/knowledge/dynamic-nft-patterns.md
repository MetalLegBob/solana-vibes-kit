---
pack: solana
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Dynamic NFT Patterns on Solana

How do I build NFTs that change over time on Solana?

## Overview

Dynamic NFTs (dNFTs) on Solana are digital assets whose metadata, appearance, or behavior changes based on on-chain state, external data, or user interactions. Unlike static NFTs with immutable metadata pointing to frozen JSON files, dynamic NFTs enable evolving traits, game character progression, condition-based rendering, and programmable behavior.

Solana offers three primary approaches for building dynamic NFTs:

1. **Metaplex Core with Attributes Plugin** — Modern single-account standard with on-chain mutable attributes
2. **Token Extensions (Token-2022) with Metadata Extensions** — Native on-chain key-value metadata storage
3. **Metaplex Token Metadata with Mutable Flag** — Legacy approach updating off-chain URI references

## Pattern 1: Metaplex Core + Attributes Plugin (Recommended)

**Best for:** Gaming NFTs, evolving collectibles, stats-driven assets, production applications

Metaplex Core is Solana's next-generation NFT standard with a single-account design (vs. multiple accounts in Token Metadata). The **Attributes Plugin** stores mutable on-chain key-value pairs that programs can read and update via CPI.

### Implementation Pattern

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, addPlugin, updatePlugin } from '@metaplex-foundation/mpl-core';
import { mplCore } from '@metaplex-foundation/mpl-core';

const umi = createUmi('https://api.mainnet-beta.solana.com').use(mplCore());

// Create NFT with Attributes Plugin at mint time
await create(umi, {
  name: 'Game Character #1',
  uri: 'https://arweave.net/base-metadata.json',
  plugins: [
    {
      type: 'Attributes',
      attributeList: [
        { key: 'level', value: '1' },
        { key: 'health', value: '100' },
        { key: 'xp', value: '0' },
        { key: 'class', value: 'warrior' },
      ],
    },
  ],
}).sendAndConfirm(umi);

// Update attributes as player progresses (requires update authority)
await updatePlugin(umi, {
  asset: assetAddress,
  plugin: {
    type: 'Attributes',
    attributeList: [
      { key: 'level', value: '5' },
      { key: 'health', value: '150' },
      { key: 'xp', value: '2500' },
      { key: 'class', value: 'warrior' },
    ],
  },
}).sendAndConfirm(umi);
```

### On-Chain Program Access

```rust
use mpl_core::{
    instructions::UpdatePluginV1Builder,
    types::{Attribute, Attributes, Plugin, PluginAuthority},
};

// Read attributes from on-chain program
let asset = Asset::from_account_info(asset_info)?;
if let Some(Plugin::Attributes(attrs)) = asset.plugin_list.attributes {
    for attr in attrs.attribute_list {
        msg!("Key: {}, Value: {}", attr.key, attr.value);
    }
}

// Update attributes via CPI (program must be update authority)
let new_attributes = vec![
    Attribute { key: "level".to_string(), value: "6".to_string() },
    Attribute { key: "health".to_string(), value: "175".to_string() },
];

UpdatePluginV1Builder::new()
    .asset(asset_info.key)
    .plugin(Plugin::Attributes(Attributes {
        attribute_list: new_attributes,
    }))
    .invoke()?;
```

### Key Characteristics

- **Single Account Design**: All data (mint, metadata, plugins) in one account = lower cost and complexity
- **DAS Indexing**: Attributes automatically indexed by RPC providers supporting Digital Asset Standard (DAS)
- **CPI-Readable**: On-chain programs can read/write attributes via Cross-Program Invocation
- **Authority-Managed**: Update authority can modify attributes; authority auto-revokes on transfer
- **Rent Cost**: ~0.001 SOL base + additional rent proportional to attribute data size

### Common Use Cases

| Use Case | Attribute Keys Example |
|----------|------------------------|
| Game character stats | `level`, `health`, `xp`, `mana`, `class`, `weapon` |
| Evolving art traits | `generation`, `mutation_count`, `rarity_tier` |
| Staking state | `staked`, `stake_start`, `rewards_earned` |
| Access control | `tier`, `access_level`, `expires_at` |
| Achievement tracking | `badges`, `quests_completed`, `rank` |

### Advantages

✅ Native on-chain storage — no off-chain updates needed
✅ Programs can enforce game logic based on attributes
✅ Cheaper and simpler than Token Metadata (single account)
✅ Automatic DAS indexing for easy queries
✅ Collection-level operations (freeze/update entire collections in one tx)

### Limitations

❌ Authority-managed (only update authority can modify by default)
❌ Not ideal if you need owner-initiated updates without authority
❌ Storage costs scale with attribute data size

## Pattern 2: Token Extensions (Token-2022) with Metadata Extensions

**Best for:** Games needing maximum on-chain composability, custom token logic, new projects

Token Extensions (aka Token-2022, SPL Token-2022) is Solana's extended token program. The **Metadata Pointer** and **Token Metadata Interface** extensions enable on-chain key-value metadata storage directly on the mint account.

### Implementation Pattern

```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{spl_token_2022, Token2022},
    associated_token::AssociatedToken,
};
use spl_token_metadata_interface::instruction as metadata_instruction;

#[derive(Accounts)]
pub struct MintDynamicNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub mint: Signer<'info>,

    /// CHECK: PDA authority for metadata updates
    #[account(
        seeds = [b"nft_authority"],
        bump
    )]
    pub nft_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn mint_dynamic_nft(ctx: Context<MintDynamicNFT>) -> Result<()> {
    // 1. Calculate space for mint with metadata pointer extension
    let space = ExtensionType::try_calculate_account_len::<Mint>(&[
        ExtensionType::MetadataPointer
    ])?;

    // 2. Create mint account
    system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.mint.to_account_info(),
            },
        ),
        rent_lamports,
        space as u64,
        &spl_token_2022::id(),
    )?;

    // 3. Initialize metadata pointer
    invoke(
        &spl_token_2022::extension::metadata_pointer::instruction::initialize(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            Some(*ctx.accounts.nft_authority.key),
            Some(*ctx.accounts.mint.key), // Metadata stored in mint account
        )?,
        &[ctx.accounts.mint.to_account_info()],
    )?;

    // 4. Initialize mint
    invoke(
        &spl_token_2022::instruction::initialize_mint(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.key,
            None, // No freeze authority
            0, // 0 decimals = NFT
        )?,
        &[ctx.accounts.mint.to_account_info()],
    )?;

    // 5. Initialize metadata with base fields
    invoke_signed(
        &metadata_instruction::initialize(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.key,
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.key,
            "Game Character".to_string(),
            "CHAR".to_string(),
            "https://arweave.net/base-image.json".to_string(),
        ),
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.nft_authority.to_account_info(),
        ],
        &[&[b"nft_authority", &[ctx.bumps.nft_authority]]],
    )?;

    // 6. Add custom metadata fields (dynamic attributes)
    invoke_signed(
        &metadata_instruction::update_field(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.key,
            spl_token_metadata_interface::state::Field::Key("level".to_string()),
            "1".to_string(),
        ),
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.nft_authority.to_account_info(),
        ],
        &[&[b"nft_authority", &[ctx.bumps.nft_authority]]],
    )?;

    invoke_signed(
        &metadata_instruction::update_field(
            &spl_token_2022::id(),
            ctx.accounts.mint.key,
            ctx.accounts.nft_authority.key,
            spl_token_metadata_interface::state::Field::Key("health".to_string()),
            "100".to_string(),
        ),
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.nft_authority.to_account_info(),
        ],
        &[&[b"nft_authority", &[ctx.bumps.nft_authority]]],
    )?;

    Ok(())
}
```

### Client-Side Minting (JavaScript)

```typescript
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getInitializeAccountInstruction,
  getInitializeMintInstruction,
  getInitializeMetadataPointerInstruction,
  getMintSize,
  TOKEN_2022_PROGRAM_ADDRESS
} from "@solana/spl-token-2022";

// Create transaction to mint dynamic NFT
const mint = generateKeyPairSigner();
const space = getMintSize([ExtensionType.MetadataPointer]);

const transaction = pipe(
  createTransaction(),
  tx => appendTransactionInstructions(
    [
      // Create mint account
      getCreateAccountInstruction({
        payer: payer.address,
        newAccount: mint.address,
        lamports: await getMinimumBalanceForRentExemption(space),
        space,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
      // Initialize metadata pointer
      getInitializeMetadataPointerInstruction({
        mint: mint.address,
        authority: updateAuthority.address,
        metadataAddress: mint.address, // Store in mint account
      }),
      // Initialize mint
      getInitializeMintInstruction({
        mint: mint.address,
        decimals: 0,
        mintAuthority: mintAuthority.address,
      }),
    ],
    tx,
  ),
);
```

### Key Characteristics

- **On-Chain Metadata**: All metadata lives directly on the mint account (no separate metadata account)
- **Key-Value Store**: Add unlimited custom fields via `Field::Key("field_name")`
- **Lower Complexity**: No separate metadata program — just Token-2022
- **Anchor-Friendly**: Easy integration with Anchor programs
- **Metadata Authority**: Updates require signature from metadata update authority (can be a PDA)

### Gaming Use Cases

- **Character Stats**: Level, XP, health, mana stored on-chain
- **Inventory Items**: Weapon type, durability, enchantments
- **Quest Progress**: Current quest, completion status
- **Dynamic Traits**: Mutation count, evolution stage
- **Rental/Lending**: Track rental periods, borrower info in metadata

### Advantages

✅ True on-chain storage in mint account
✅ Programs can read/modify via CPI
✅ No dependency on Metaplex programs
✅ Native Token Extensions integration (transfer hooks, etc.)

### Limitations

❌ Less ecosystem tooling than Metaplex Core
❌ Not all wallets/marketplaces support Token-2022 metadata yet
❌ Storage costs scale with metadata size (stored in mint account)
❌ Must plan extensions at mint creation time (can't add later)

## Pattern 3: Metaplex Token Metadata (Mutable URI)

**Best for:** Legacy compatibility, off-chain rendering requirements, existing projects

The original Metaplex Token Metadata standard stores metadata in a separate account with a `uri` field pointing to off-chain JSON (IPFS, Arweave). When minted with `isMutable: true`, the update authority can change the URI to point to new metadata.

### Implementation Pattern

```typescript
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet));

// Mint with mutable flag
const { nft } = await metaplex.nfts().create({
  uri: "https://arweave.net/metadata-v1.json",
  name: "Evolving Character",
  sellerFeeBasisPoints: 500,
  isMutable: true, // CRITICAL: Must be true for updates
});

// Later: Update URI to new metadata
await metaplex.nfts().update({
  nftOrSft: nft,
  uri: "https://arweave.net/metadata-v2.json", // New JSON with updated traits
});
```

### Off-Chain Metadata JSON Evolution

```json
// metadata-v1.json (initial state)
{
  "name": "Character #1",
  "image": "https://arweave.net/base-image.png",
  "attributes": [
    { "trait_type": "Level", "value": 1 },
    { "trait_type": "Health", "value": 100 }
  ]
}

// metadata-v2.json (after leveling up)
{
  "name": "Character #1",
  "image": "https://arweave.net/evolved-image.png", // Different image!
  "attributes": [
    { "trait_type": "Level", "value": 5 },
    { "trait_type": "Health", "value": 150 }
  ]
}
```

### Key Characteristics

- **Off-Chain Storage**: Actual metadata lives on Arweave/IPFS
- **On-Chain Pointer**: Only the `uri` field is on-chain
- **URI Swapping**: Update authority changes URI to point to new JSON
- **Image Changes**: Can change the rendered image entirely by updating JSON
- **Mutable Flag**: Must set `isMutable: true` at mint time (can't change later)

### Advantages

✅ Widely supported by all wallets and marketplaces
✅ Can change entire image/appearance (not just attributes)
✅ Established standard with mature tooling

### Limitations

❌ On-chain programs can't read attributes (only URI string)
❌ Requires off-chain upload for every metadata change
❌ Multiple accounts (mint, metadata, edition, token account)
❌ Higher minting costs vs. Core
❌ Update authority centralization (only authority can update)

## Advanced: Generative On-Chain Rendering

For NFTs that render dynamically based on on-chain state without changing metadata at all:

### Oracle-Driven Rendering

Store a hash or seed on-chain and let off-chain renderers interpret it:

```rust
// Store seed in Attributes Plugin
await addPlugin(umi, {
  asset: assetAddress,
  plugin: {
    type: 'Attributes',
    attributeList: [
      { key: 'render_seed', value: '0x8a3f...' },
      { key: 'background_type', value: '3' },
      { key: 'mood', value: 'happy' },
    ],
  },
});

// Off-chain renderer reads attributes and generates SVG/image deterministically
// URI points to dynamic endpoint: https://api.example.com/render/{mint_address}
```

### Chainlink/Pyth Oracle Integration

Use oracles to update NFT state based on external events:

```rust
// Example: Sports card NFT updates when player scores
#[account]
pub struct DynamicSportsCard {
    pub player_id: Pubkey,
    pub mint: Pubkey,
    pub games_played: u32,
    pub total_points: u32,
}

// Oracle callback updates stats, program updates Attributes Plugin
pub fn oracle_update(ctx: Context<OracleUpdate>, new_points: u32) -> Result<()> {
    let card = &mut ctx.accounts.card;
    card.total_points += new_points;

    // Update NFT attributes
    UpdatePluginV1Builder::new()
        .asset(&card.mint)
        .plugin(Plugin::Attributes(Attributes {
            attribute_list: vec![
                Attribute {
                    key: "total_points".to_string(),
                    value: card.total_points.to_string()
                },
            ],
        }))
        .invoke()?;

    Ok(())
}
```

## Comparison Matrix

| Pattern | On-Chain Reads | Update Cost | Ecosystem Support | Best For |
|---------|---------------|-------------|-------------------|----------|
| **Core + Attributes** | ✅ CPI | ~0.001 SOL | Growing (wallets/markets) | Gaming, stats, new projects |
| **Token-2022 Metadata** | ✅ CPI | ~0.0005 SOL | Limited (early adoption) | Custom token logic, games |
| **Mutable Token Metadata** | ❌ URI only | Upload + tx fee | ✅ Universal | Legacy, appearance changes |

## Best Practices

1. **Plan Mutability at Mint**: Can't enable mutability after creation in any standard
2. **Use PDAs for Update Authority**: Let programs control updates, not wallet keys
3. **Index via DAS**: Core attributes auto-index; Token-2022 needs RPC support
4. **Minimize Update Frequency**: Each update costs rent/fees; batch when possible
5. **Document Attribute Schema**: Define which keys your game/app expects
6. **Consider Collection-Level Plugins**: Core lets you update entire collections at once
7. **Validate State Transitions**: Programs should enforce valid attribute changes (e.g., level only increases)

## Anti-Patterns to Avoid

❌ **Updating on every interaction**: Batch state changes to save fees
❌ **Storing large blobs in attributes**: Use hashes/refs to off-chain data
❌ **Wallet as update authority**: Use program PDAs to enforce game logic
❌ **Ignoring authority revocation**: Core auto-revokes authority on transfer; plan for this
❌ **Mixing standards**: Don't try to use Core + Token Metadata for same NFT

## Migration Path: Token Metadata → Core

If you have existing Token Metadata NFTs and want dynamic behavior:

1. **Can't convert existing**: Token Metadata NFTs can't become Core NFTs
2. **Options**:
   - Continue with mutable Token Metadata (update URI)
   - Mint new Core NFTs and allow holders to "upgrade" (burn old, mint new)
   - Use Token Metadata for legacy, Core for new drops

## Resources

- [Metaplex Core Documentation](https://developers.metaplex.com/core)
- [Token Extensions Guide](https://solana.com/developers/guides/token-extensions/dynamic-meta-data-nft)
- [Core Attributes Plugin](https://developers.metaplex.com/core/plugins/attribute)
- [Token Metadata Interface](https://spl.solana.com/token-2022/extensions#metadata-extension)
- [Solana Games Preset (Token-2022 Example)](https://github.com/solana-developers/solana-game-preset)

## When to Use Each Approach

**Choose Metaplex Core** if:
- Building new game/app with evolving NFTs
- Need on-chain programs to read/write attributes
- Want lowest minting costs and single-account simplicity
- Ecosystem support for Core is sufficient for your use case

**Choose Token-2022** if:
- Need custom token logic (transfer hooks, etc.)
- Prefer SPL-native approach without Metaplex dependency
- Building new project and can handle limited ecosystem support
- Want maximum on-chain composability

**Choose Mutable Token Metadata** if:
- Maintaining existing Token Metadata collections
- Need universal wallet/marketplace compatibility TODAY
- Want to change visual appearance (not just stats)
- Primarily care about off-chain metadata updates

The future is **Metaplex Core** for NFTs and **Token-2022** for custom token mechanics. Start there unless you have legacy constraints.
