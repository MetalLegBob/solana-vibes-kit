---
pack: solana
confidence: 7/10
sources_checked: 9
last_updated: "2026-02-16"
---

# What on-chain social patterns exist on Solana?

Solana's high throughput and low costs make it ideal for on-chain social applications. Unlike chains where each interaction costs dollars, Solana enables sub-cent social interactions, opening new design possibilities for decentralized identity, messaging, social graphs, and community coordination.

## Core Social Infrastructure

### Solana Name Service (SNS) - Decentralized Identity

**SNS** is the foundational identity layer for Solana, mapping human-readable `.sol` domain names to on-chain data.

#### Key Statistics (2025)
- **270,000+ domains registered**
- **150+ project integrations**
- **$SNS token**: 10B total supply (60% for community airdrops)
- **Governance transition**: FIDA → SNS token (May 2025)

#### Features

```
Domain: alice.sol
  ↓
Maps to:
  - Wallet address: 7xKXt...9j2
  - Twitter: @alice_crypto
  - Discord: alice#1234
  - Profile picture: NFT metadata
  - Website: alice.sol (decentralized hosting)
  - Social graph: Connections, followers
```

**Unified Web3 Identity**: SNS acts as a single source of truth for user identity across Solana dApps. Instead of connecting different wallets to different apps, users present their `.sol` domain as a portable identity.

#### Implementation Patterns

```typescript
// Resolve .sol domain to wallet address
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service";
import { Connection, PublicKey } from "@solana/web3.js";

async function resolveDomain(domain: string): Promise<PublicKey> {
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  // Get domain PDA
  const { pubkey } = getDomainKeySync(domain);

  // Fetch domain data
  const owner = await NameRegistryState.retrieve(connection, pubkey);

  return owner.owner;
}

// Example usage
const wallet = await resolveDomain("alice.sol");
console.log(`alice.sol resolves to: ${wallet.toBase58()}`);
```

```rust
// On-chain SNS integration in Anchor
use {
    anchor_lang::prelude::*,
    spl_name_service::state::NameRecordHeader,
};

pub fn verify_domain_owner(
    ctx: Context<VerifyDomain>,
    domain_name: String,
) -> Result<()> {
    let name_account = &ctx.accounts.name_account;

    // Deserialize SNS name record
    let name_record = NameRecordHeader::unpack_from_slice(
        &name_account.data.borrow()
    )?;

    // Verify the signer owns this domain
    require!(
        name_record.owner == ctx.accounts.user.key(),
        ErrorCode::NotDomainOwner
    );

    msg!("{} verified as owner of {}.sol", ctx.accounts.user.key(), domain_name);

    Ok(())
}
```

#### Social Profile Metadata

SNS domains can link to rich social metadata:

```typescript
// Store social profile data in SNS domain
import { createNameRegistry } from "@bonfida/spl-name-service";

const socialProfile = {
  twitter: "@alice_crypto",
  discord: "alice#1234",
  telegram: "@alice_sol",
  github: "alice-dev",
  website: "https://alice.sol",
  bio: "Building the future of DeFi on Solana",
  pfp: "https://arweave.net/...", // NFT-backed profile picture
};

// Store in SNS domain record
await updateNameRegistry(
  connection,
  domain,
  JSON.stringify(socialProfile)
);
```

#### Cross-Chain Identity (2025)

SNS is expanding cross-chain with Wormhole integration:
- Use `.sol` domains on Ethereum, Base, Arbitrum
- Unified identity across multiple blockchains
- Cross-chain messaging addressing

### Dialect - Wallet-to-Wallet Messaging

**Dialect** provides Web3-native messaging and notification infrastructure.

#### Architecture

```
On-Chain Message Threads
    ↓
Stored in Dialect PDAs (encrypted)
    ↓
Delivered via:
  - Wallet inbox (on-chain)
  - Push notifications (off-chain relay)
  - Email/SMS gateways
```

#### Core Features

1. **Wallet-to-Wallet Chat**: Direct messaging between wallet addresses
2. **dApp Notifications**: Protocols send updates directly to users' wallets
3. **SNS Integration**: Message `alice.sol` instead of `7xKXt...9j2`
4. **Thread Encryption**: End-to-end encrypted message threads

#### Implementation Example

```typescript
import { Dialect } from "@dialectlabs/sdk";

// Initialize Dialect client
const dialect = await Dialect.create({
  wallet: anchorWallet,
  connection,
});

// Send message to alice.sol
await dialect.sendMessage({
  recipient: "alice.sol", // Can use SNS domains
  message: "Hey Alice, check out this new NFT collection!",
  encrypted: true,
});

// Subscribe to incoming messages
dialect.onMessage((message) => {
  console.log(`New message from ${message.sender}: ${message.content}`);
});
```

#### dApp-to-User Notifications

```typescript
// DeFi protocol sending liquidation warning
await dialect.sendNotification({
  user: userWallet,
  title: "Liquidation Risk",
  message: "Your collateral ratio is below 120%. Add more collateral to avoid liquidation.",
  actionUrl: "https://app.protocol.com/positions",
});
```

### Cross Messaging Service (xMS) - Open Standard

**xMS** is Bonfida's open-source messaging framework enabling both on-chain and off-chain communication.

#### The Open Chat Alliance

In 2022, 19 Solana projects formed the **Open Chat Alliance** to create interoperable messaging standards:

**Key Members**:
- Notifi Network (notifications)
- Bonfida (SNS + messaging)
- Only1 (NFT social media)
- Dialect (messaging protocol)

**Goal**: Transparent, interoperable standards for crypto-based messages that work across all apps.

#### Why Multiple Messaging Protocols?

The competition between Dialect, xMS, and other messaging solutions mirrors the early days of internet messaging (AIM, MSN, ICQ). While fragmentation exists, it drives innovation in:
- Privacy models (on-chain vs. off-chain)
- Encryption standards
- Cross-chain interoperability
- Cost optimization

**Current state**: No single standard has achieved universal adoption, but SNS domain-based addressing is becoming the de facto user-facing standard.

## Social Graph Protocols

### On-Chain Followers and Social Connections

Unlike Web2 social graphs (controlled by platforms), Web3 social graphs are user-owned and portable.

#### Pattern: Follower Registry

```rust
// On-chain follower tracking
#[account]
pub struct SocialGraph {
    pub user: Pubkey,
    pub followers: Vec<Pubkey>,
    pub following: Vec<Pubkey>,
    pub follower_count: u64,
    pub following_count: u64,
}

pub fn follow_user(ctx: Context<Follow>, target: Pubkey) -> Result<()> {
    let follower_graph = &mut ctx.accounts.follower_graph;
    let target_graph = &mut ctx.accounts.target_graph;

    // Add to follower's "following" list
    follower_graph.following.push(target);
    follower_graph.following_count += 1;

    // Add to target's "followers" list
    target_graph.followers.push(ctx.accounts.follower.key());
    target_graph.follower_count += 1;

    emit!(FollowEvent {
        follower: ctx.accounts.follower.key(),
        target,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

#### Pattern: Social Graph Indexing

For large social networks, storing all connections on-chain is expensive. Hybrid approach:

```
On-Chain:
  - Follow actions (events)
  - Follower counts
  - Verification data

Off-Chain (Indexed):
  - Full follower lists
  - Activity feeds
  - Recommendation algorithms
```

**Indexers**: Shadow Drive, Arweave, or centralized indexers (subgraphs) for fast queries.

### Community Token Gating

**Pattern**: Use token ownership to gate access to content, features, or social spaces.

```rust
pub fn access_exclusive_content(ctx: Context<AccessContent>) -> Result<()> {
    let user_token_account = &ctx.accounts.user_token_account;

    // Require holding at least 100 community tokens
    require!(
        user_token_account.amount >= 100 * 10u64.pow(token_decimals),
        ErrorCode::InsufficientTokens
    );

    // Grant access
    msg!("Access granted to exclusive content for {}", ctx.accounts.user.key());

    Ok(())
}
```

#### Token-Gated Discord/Telegram

1. User proves token ownership (sign message with wallet)
2. Bot verifies on-chain balance
3. Grants Discord role or Telegram access

```typescript
// Verify token ownership for Discord role
async function verifyTokenOwnership(wallet: PublicKey, tokenMint: PublicKey): Promise<boolean> {
  const tokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    wallet
  );

  const balance = await connection.getTokenAccountBalance(tokenAccount);

  return balance.value.uiAmount >= 100; // Require 100 tokens
}
```

### Social Token Models

#### 1. Creator Tokens (Bonding Curve)

Fans buy creator-specific tokens to support and gain access:

```rust
// Bonding curve for creator token pricing
pub fn calculate_token_price(supply: u64) -> u64 {
    // Linear bonding curve: price = supply / 1000
    // Price increases as more tokens are sold
    supply / 1000
}

pub fn buy_creator_tokens(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
    let current_supply = ctx.accounts.token_mint.supply;
    let price = calculate_token_price(current_supply);
    let cost = price * amount;

    // Transfer SOL from buyer to creator
    transfer_sol(ctx.accounts.buyer, ctx.accounts.creator, cost)?;

    // Mint creator tokens to buyer
    mint_to(ctx.accounts.token_mint, ctx.accounts.buyer_token_account, amount)?;

    Ok(())
}
```

**Use cases**:
- Early access to content
- Private Discord channels
- 1-on-1 time with creator
- Voting on creator decisions

#### 2. Community DAO Tokens

Governance tokens for community-driven projects:

```rust
pub fn create_governance_proposal(
    ctx: Context<CreateProposal>,
    description: String,
) -> Result<()> {
    let proposer_balance = ctx.accounts.proposer_token_account.amount;

    // Require 10,000 tokens to create proposals
    require!(
        proposer_balance >= 10_000 * 10u64.pow(TOKEN_DECIMALS),
        ErrorCode::InsufficientTokensToPropose
    );

    let proposal = &mut ctx.accounts.proposal;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.description = description;
    proposal.votes_for = 0;
    proposal.votes_against = 0;

    Ok(())
}
```

## On-Chain Content Patterns

### Pattern: Permanent Content Storage

Content posted on-chain is censorship-resistant and permanently accessible.

```rust
#[account]
pub struct Post {
    pub author: Pubkey,
    pub content_hash: [u8; 32], // IPFS/Arweave hash
    pub timestamp: i64,
    pub likes: u64,
    pub replies: u64,
}

pub fn create_post(ctx: Context<CreatePost>, content_hash: [u8; 32]) -> Result<()> {
    let post = &mut ctx.accounts.post;
    post.author = ctx.accounts.author.key();
    post.content_hash = content_hash;
    post.timestamp = Clock::get()?.unix_timestamp;
    post.likes = 0;
    post.replies = 0;

    emit!(PostCreated {
        author: ctx.accounts.author.key(),
        content_hash,
        timestamp: post.timestamp,
    });

    Ok(())
}
```

**Storage strategy**:
- **On-chain**: Metadata, ownership, social actions (likes, comments)
- **Arweave/IPFS**: Actual content (text, images, videos)
- **Hash on-chain**: Verify content integrity

### Pattern: Content Monetization

```rust
pub fn unlock_premium_content(ctx: Context<UnlockContent>) -> Result<()> {
    let payment_amount = ctx.accounts.content.price;

    // Transfer payment to content creator
    transfer_sol(
        ctx.accounts.reader,
        ctx.accounts.creator,
        payment_amount
    )?;

    // Record purchase
    let purchase = &mut ctx.accounts.purchase_record;
    purchase.reader = ctx.accounts.reader.key();
    purchase.content = ctx.accounts.content.key();
    purchase.timestamp = Clock::get()?.unix_timestamp;

    // Emit event for off-chain indexer to grant access
    emit!(ContentUnlocked {
        reader: ctx.accounts.reader.key(),
        content_id: ctx.accounts.content.key(),
    });

    Ok(())
}
```

## Real-World Adoption Data

### SNS Integration Examples

- **Jupiter**: Swap interface shows SNS names
- **Magic Eden**: NFT marketplace profiles use `.sol` domains
- **Phantom Wallet**: Native SNS support in address book
- **Solflare**: Auto-resolve `.sol` in send interface
- **Backpack**: SNS-first user experience

### Messaging Adoption

While specific 2025 user numbers are limited, early initiatives (2022) set the foundation:
- **Dialect**: Integrated by 50+ dApps for notifications
- **Bonfida xMS**: Open-source framework for cross-platform messaging
- **Open Chat Alliance**: 19 founding projects committed to interoperability

## Challenges and Limitations

1. **Fragmentation**: No single messaging standard has achieved dominance
2. **Indexing Complexity**: Full social graphs are expensive to query on-chain
3. **Privacy Concerns**: Public blockchain = public social data (unless encrypted)
4. **Spam Prevention**: Open protocols need anti-spam mechanisms
5. **Scalability**: Storing all social interactions on-chain is cost-prohibitive at scale

## Best Practices

1. **Use SNS for addressing**: Human-readable `.sol` domains improve UX
2. **Hybrid storage**: Store metadata on-chain, content on Arweave/IPFS
3. **Event-driven indexing**: Emit events for off-chain indexers to build fast queries
4. **Token-gate thoughtfully**: Balance exclusivity with growth
5. **Implement spam protection**: Rate limits, staking requirements, or proof-of-work
6. **Privacy by default**: Encrypt sensitive messages and DMs

## Future Directions

- **AI-agent social graphs**: Autonomous agents building reputation and social connections
- **Cross-chain social identity**: `.sol` domains working on any blockchain
- **Decentralized content moderation**: Community-driven moderation without centralized control
- **Social DeFi**: Lending based on social reputation, social trading, influencer tokens

## Resources

- **SNS SDK**: https://github.com/SolanaNameService/sns-sdk
- **SNS Documentation**: https://docs.sns.id
- **Bonfida xMS**: https://www.bonfida.org/blog/xms-cross-messaging-service
- **Dialect SDK**: https://docs.dialect.to

## Sources

Research for this document included:
- [Solana-based Projects Team Up to Make Cross-Chain Messaging Standard](https://www.coindesk.com/business/2022/08/23/solana-based-projects-team-up-to-make-cross-chain-messaging-standard)
- [What Is Bonfida (FIDA) And How Does It Work?](https://coinmarketcap.com/cmc-ai/bonfida-sns/what-is/)
- [xMS: The Cross Messaging Service](https://www.bonfida.org/blog/xms-cross-messaging-service)
- [Go with Solana, go with SNS (2025 Update)](https://www.bonfida.org/blog/weekly-roundup-17-01-2025)
- [What Is Solana Name Service (SNS)?](https://coinmarketcap.com/cmc-ai/sns/what-is/)
- [$SNS Token Documentation](https://docs.sns.id/collection/tokenomics/sns-token)
- [SNS Airdrop Guide](https://blog.quicknode.com/sns-airdrop-guide-all-you-need-to-know-about-the-solana-name-service-airdrop/)
