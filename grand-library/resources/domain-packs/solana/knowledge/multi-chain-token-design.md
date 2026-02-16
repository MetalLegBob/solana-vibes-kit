---
pack: solana
question: "How do I design tokens that work across chains?"
confidence: 8/10
sources_checked: 14
last_updated: "2026-02-16"
---

# Multi-Chain Token Design for Solana

## Overview

Multi-chain tokens enable assets to exist and function across multiple blockchain networks while maintaining unified supply, consistent branding, and seamless user experience. Proper design prevents liquidity fragmentation, security vulnerabilities, and user confusion. This guide covers architectural patterns, implementation approaches, and real-world examples for deploying tokens that work on Solana and other chains.

## Core Design Decision: Canonical vs. Wrapped Tokens

### Canonical Tokens

**Definition:** The officially recognized, most trust-minimized representation of a token on a specific blockchain.

**Characteristics:**
- Issued directly by the token creator or protocol team
- Maintains official branding and contract address
- Unified liquidity across all instances on that chain
- Full control over token behavior and upgrades

**Example: Native USDC on Solana**
- Issued by Circle (the canonical issuer)
- SPL mint address: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Supports Circle's mint/redeem APIs
- Only version of USDC that can be withdrawn to fiat via Circle

### Wrapped Tokens

**Definition:** Representations of tokens created by third-party bridge protocols.

**Characteristics:**
- Created by bridge protocols (Wormhole, Allbridge, etc.)
- Backed 1:1 by tokens locked on source chain
- Multiple wrapped versions can exist for same token
- Trust depends on bridge security model

**Example: Multiple Wrapped ETH on Solana**
- Wormhole wETH: `7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs`
- Allbridge wETH: Different address
- Portal wETH: Yet another address
- Each has separate liquidity pools, causing fragmentation

### Liquidity Fragmentation Problem

**Scenario:** Token exists as 3+ wrapped versions on Solana

**Impact:**
- Liquidity split across multiple DEX pools
- Higher slippage for traders
- Confusion about "real" version
- Reduced composability in DeFi protocols
- Increased integration burden for wallets/dApps

**Example from 2022:**
```
Ethereum USDT liquidity on Solana:
- Wormhole USDT: $50M liquidity
- Allbridge USDT: $20M liquidity
- Total fragmented: $70M across 2 pools

Native USDC on Solana:
- Single canonical USDC: $800M liquidity
- 11x better capital efficiency
```

## Multi-Chain Architecture Patterns

### Pattern 1: Canonical + Burn-and-Mint

**Best for:** New tokens launching multichain from day one

**Architecture:**
- Designate one chain as "home chain" with canonical supply
- All other chains mint/burn tokens based on cross-chain messages
- Home chain holds the maximum supply limit

**Supply Management:**
```
Home Chain (Ethereum):
- Total Supply: 1,000,000 tokens
- Circulating on Ethereum: 600,000
- Burned for other chains: 400,000

Solana:
- Minted: 300,000 (matched to Ethereum burns)

Arbitrum:
- Minted: 100,000 (matched to Ethereum burns)

Invariant: Home supply = Ethereum circulating + Solana minted + Arbitrum minted
```

**Benefits:**
- Single source of truth for supply
- No wrapped token confusion
- Unified branding across chains
- Token maintains full functionality on all chains

**Implementation: Wormhole NTT Framework**

```rust
// Solana NTT Configuration
use ntt_messages::chain_id::ChainId;

#[account]
pub struct NttConfig {
    pub mode: Mode,           // Burning or Locking
    pub token_mint: Pubkey,   // SPL token mint
    pub home_chain: ChainId,  // Canonical supply chain
    pub paused: bool,
    pub rate_limit: RateLimit
}

pub enum Mode {
    Burning,  // Burn on send, mint on receive
    Locking   // Lock on send, unlock on receive
}

// Sending from Solana (burns tokens)
pub fn transfer_burn(
    ctx: Context<TransferBurn>,
    amount: u64,
    recipient_chain: u16,
    recipient: [u8; 32]
) -> Result<()> {
    // Burn tokens on Solana
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.from_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        ),
        amount
    )?;

    // Send cross-chain message to mint on destination
    let payload = NttMessage::NativeTokenTransfer {
        amount,
        source_token: ctx.accounts.token_mint.key().to_bytes(),
        to: recipient,
        to_chain: recipient_chain
    };

    wormhole::post_message(
        ctx.accounts.wormhole_ctx,
        0, // nonce
        payload.try_to_vec()?,
        1  // finalized
    )?;

    Ok(())
}

// Receiving on Solana (mints tokens)
pub fn redeem(
    ctx: Context<Redeem>,
    vaa_data: Vec<u8>
) -> Result<()> {
    // Verify VAA from source chain burn
    let vaa = verify_vaa(&vaa_data, &ctx.accounts.wormhole_bridge)?;

    // Parse message
    let message: NttMessage = AnchorDeserialize::deserialize(
        &mut &vaa.payload[..]
    )?;

    // Mint equivalent tokens on Solana
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
            &[&[b"mint_authority", &[bump]]]
        ),
        message.amount
    )?;

    Ok(())
}
```

**Deployment Steps:**
1. Deploy NTT Manager on home chain (Ethereum)
2. Deploy NTT Manager on Solana with `mode: Burning`
3. Transfer mint authority to Solana NTT Manager
4. Configure peer contracts (Ethereum ↔ Solana)
5. Set rate limits for security
6. Enable transfers

### Pattern 2: Lock-and-Mint (Bridge-Custodied)

**Best for:** Established tokens expanding to new chains

**Architecture:**
- Canonical tokens remain on home chain
- Tokens locked in bridge custody account
- Equivalent synthetic tokens minted on destination chains
- 1:1 backing by locked tokens

**Supply Management:**
```
Home Chain (Solana):
- Total Supply: 1,000,000 tokens (unchanged)
- In circulation: 700,000
- Locked in bridge: 300,000

Ethereum:
- Minted (backed): 200,000
- Redeemable for 200,000 locked on Solana

BSC:
- Minted (backed): 100,000
- Redeemable for 100,000 locked on Solana

Invariant: Locked on Solana = Sum(minted on all other chains)
```

**Benefits:**
- Doesn't require minting new tokens on home chain
- Preserves existing token contracts and integrations
- Simpler accounting (locked = minted elsewhere)

**Drawbacks:**
- Requires trust in bridge custody
- Minted tokens may not have full functionality
- Risk of custody compromise

**Implementation:**

```rust
// Lock tokens on Solana
pub fn lock_for_bridge(
    ctx: Context<LockTokens>,
    amount: u64,
    recipient_chain: u16,
    recipient: Vec<u8>
) -> Result<()> {
    // Transfer to bridge custody account
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.bridge_custody.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }
        ),
        amount
    )?;

    // Record lock in state
    ctx.accounts.lock_record.amount = amount;
    ctx.accounts.lock_record.user = ctx.accounts.user.key();
    ctx.accounts.lock_record.destination_chain = recipient_chain;
    ctx.accounts.lock_record.timestamp = Clock::get()?.unix_timestamp;

    // Emit cross-chain message
    emit_bridge_message(
        ctx.accounts.wormhole_ctx,
        BridgeMessage::Lock {
            amount,
            token: ctx.accounts.token_mint.key().to_bytes(),
            recipient,
            recipient_chain
        }
    )?;

    Ok(())
}

// Unlock tokens on Solana (when burning on other chain)
pub fn unlock_from_bridge(
    ctx: Context<UnlockTokens>,
    vaa_data: Vec<u8>
) -> Result<()> {
    // Verify burn happened on destination chain
    let vaa = verify_vaa(&vaa_data, &ctx.accounts.wormhole_bridge)?;

    let burn_message: BridgeMessage = parse_message(&vaa.payload)?;

    // Transfer from custody to user
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.bridge_custody.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.bridge_authority.to_account_info(),
            },
            &[&[b"bridge_authority", &[bump]]]
        ),
        burn_message.amount
    )?;

    Ok(())
}
```

### Pattern 3: Multi-Canonical (Circle USDC Model)

**Best for:** Stablecoins and tokens requiring regulatory compliance per jurisdiction

**Architecture:**
- Each chain has natively issued canonical token
- Cross-Chain Transfer Protocol (CCTP) burns on source, mints on destination
- No wrapped tokens or bridge custody
- Issuer controls minting on all chains

**Supply Management:**
```
USDC across chains (real numbers as of 2025):
- Ethereum: $25B native USDC
- Solana: $5B native USDC
- Arbitrum: $3B native USDC
- Total: $33B (no wrapped versions)

Transfer example:
1. Burn 1M USDC on Ethereum (supply drops to $24.999B)
2. CCTP message verifies burn
3. Mint 1M USDC on Solana (supply increases to $5.001B)
4. Global supply remains $33B
```

**Implementation: Circle CCTP**

```typescript
// Send USDC from Solana to Ethereum
import { CircleTransferProtocol } from '@circle-fin/cctp-sdk';

const cctp = new CircleTransferProtocol({
  solanaConnection: connection,
  ethereumProvider: ethProvider
});

// Burn on Solana
const burnTx = await cctp.burn({
  amount: 1000 * 1e6, // 1000 USDC
  destinationDomain: 0, // Ethereum
  mintRecipient: ethereumAddress,
  burnToken: USDC_MINT_SOLANA
});

// Attestation from Circle's service (automatic)
const attestation = await cctp.waitForAttestation(burnTx.signature);

// Mint on Ethereum (user or relayer submits)
const mintTx = await cctp.mint({
  attestation,
  recipient: ethereumAddress
});
```

**Benefits:**
- No bridge custody risk (issuer controls all mints)
- No liquidity fragmentation (only one version per chain)
- Regulatory clarity (issuer can comply per jurisdiction)
- Capital efficient (no large pools needed)

**Drawbacks:**
- Requires centralized issuer (Circle, Tether, etc.)
- Not applicable for decentralized community tokens
- Issuer can freeze/blacklist addresses

## Rate Limiting for Security

Rate limits protect against bridge exploits by capping throughput and queuing excess transfers.

### Implementation in Wormhole NTT

```rust
#[account]
pub struct RateLimit {
    // Outbound limit (sending from Solana)
    pub outbound_capacity: u64,      // Max tokens per duration
    pub outbound_duration: i64,       // Duration in seconds (e.g., 86400 for 24h)
    pub outbound_current: u64,        // Tokens sent in current window
    pub outbound_window_start: i64,   // Window start timestamp

    // Inbound limits (per source chain)
    pub inbound_limits: HashMap<u16, InboundLimit> // chain_id -> limit
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InboundLimit {
    pub capacity: u64,
    pub duration: i64,
    pub current: u64,
    pub window_start: i64
}

pub fn check_rate_limit(
    rate_limit: &mut RateLimit,
    amount: u64,
    direction: Direction
) -> Result<()> {
    match direction {
        Direction::Outbound => {
            // Reset window if expired
            let now = Clock::get()?.unix_timestamp;
            if now - rate_limit.outbound_window_start >= rate_limit.outbound_duration {
                rate_limit.outbound_current = 0;
                rate_limit.outbound_window_start = now;
            }

            // Check capacity
            require!(
                rate_limit.outbound_current + amount <= rate_limit.outbound_capacity,
                ErrorCode::RateLimitExceeded
            );

            // Increment counter
            rate_limit.outbound_current += amount;
        },
        Direction::Inbound(source_chain) => {
            let inbound = rate_limit.inbound_limits.get_mut(&source_chain)
                .ok_or(ErrorCode::ChainNotConfigured)?;

            // Reset window if expired
            let now = Clock::get()?.unix_timestamp;
            if now - inbound.window_start >= inbound.duration {
                inbound.current = 0;
                inbound.window_start = now;
            }

            // Check capacity
            require!(
                inbound.current + amount <= inbound.capacity,
                ErrorCode::RateLimitExceeded
            );

            // Increment counter
            inbound.current += amount;
        }
    }

    Ok(())
}
```

### Rate Limit Configuration Strategy

**Conservative Launch:**
```rust
// Day 1: Very tight limits
RateLimit {
    outbound_capacity: 100_000 * 1e6,  // 100K tokens per day
    outbound_duration: 86400,           // 24 hours

    inbound_limits: {
        ETHEREUM: InboundLimit {
            capacity: 50_000 * 1e6,     // 50K tokens per day from ETH
            duration: 86400
        },
        ARBITRUM: InboundLimit {
            capacity: 25_000 * 1e6,     // 25K tokens per day from Arbitrum
            duration: 86400
        }
    }
}

// Month 3: Moderate limits after testing
outbound_capacity: 1_000_000 * 1e6  // 1M tokens per day

// Month 6: Mature limits
outbound_capacity: 10_000_000 * 1e6 // 10M tokens per day
```

**Governance Control:**
```rust
pub fn update_rate_limit(
    ctx: Context<UpdateRateLimit>,
    new_outbound_capacity: u64,
    chain_id: u16,
    new_inbound_capacity: u64
) -> Result<()> {
    // Require governance approval (e.g., multisig, DAO vote)
    require!(
        ctx.accounts.governance.key() == GOVERNANCE_AUTHORITY,
        ErrorCode::Unauthorized
    );

    // Apply new limits
    ctx.accounts.rate_limit.outbound_capacity = new_outbound_capacity;

    if let Some(inbound) = ctx.accounts.rate_limit.inbound_limits.get_mut(&chain_id) {
        inbound.capacity = new_inbound_capacity;
    }

    emit!(RateLimitUpdated {
        outbound_capacity: new_outbound_capacity,
        chain_id,
        inbound_capacity: new_inbound_capacity,
        updated_by: ctx.accounts.governance.key()
    });

    Ok(())
}
```

### Backflow Mechanism

**Concept:** Receiving tokens refills sending capacity in opposite direction.

```rust
// When receiving 1000 tokens from Ethereum to Solana:
// 1. Check Ethereum -> Solana inbound limit (consumes capacity)
// 2. Refill Solana -> Ethereum outbound limit (adds capacity)

pub fn apply_backflow(
    rate_limit: &mut RateLimit,
    amount: u64,
    source_chain: u16
) {
    // Refill outbound capacity (capped at max)
    let refill = std::cmp::min(
        amount,
        rate_limit.outbound_capacity - rate_limit.outbound_current
    );

    rate_limit.outbound_current = rate_limit.outbound_current.saturating_sub(refill);
}
```

**Benefit:** Encourages balanced flows, prevents one-way draining.

## Real-World Examples

### 1. Sky USDS (formerly Maker DAI) on Solana

**Challenge:**
- $5B+ DeFi protocol confined to Ethereum
- Needed to tap Solana's liquidity and speed
- Traditional bridging would fragment USDS liquidity

**Solution: Wormhole NTT**
- Deployed NTT on Ethereum (home chain) and Solana
- Burn-and-mint model maintains unified supply
- Native USDS on Solana with full SPL functionality
- No wrapped versions or liquidity fragmentation

**Results:**
- Seamless integration with Solana DeFi (Jupiter, Orca, etc.)
- Unified USDS brand across chains
- Users can't accidentally buy "wrong" wrapped version

### 2. GEOD Token Multichain via NTT

**Background:**
- GEOD rewards GEODNET base station hosts for mining satellite data
- Initially Ethereum-only

**Implementation:**
- Deployed Wormhole NTT to expand to Solana
- Maintains unified 1B GEOD supply across chains
- Burns on source, mints on destination (no wrapping)

**Architecture:**
```
Home Chain: Ethereum
- Initial supply: 1,000,000,000 GEOD
- Circulating on ETH: 700M GEOD
- Burned for Solana: 300M GEOD

Solana:
- Minted: 300M GEOD (matches Ethereum burns)
- SPL token with full metadata
- Listed on Jupiter, Raydium

Users can transfer between chains:
- Solana → ETH: Burn on Solana, mint on Ethereum
- ETH → Solana: Burn on Ethereum, mint on Solana
```

### 3. Powerledger POWR Token

**Challenge:**
- POWR launched on Ethereum in 2017
- Needed Solana's speed for renewable energy trading platform
- Didn't want wrapped/synthetic token confusion

**Solution:**
- Integrated Wormhole NTT in 2025
- Native POWR on both Ethereum and Solana
- Unified token experience for users

**Key Quote:**
> "By leveraging Wormhole's Native Token Transfer (NTT) standard, we've expanded POWR to a second blockchain without resorting to wrapped or synthetic tokens. This allows POWR to now exist natively on both chains."

### 4. USDC Multi-Canonical Approach

**Architecture:**
- Native USDC issued by Circle on 27+ blockchains
- Cross-Chain Transfer Protocol (CCTP) for transfers
- No wrapped USDC or bridge custody

**Solana Specifics:**
- SPL Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- $5B+ supply as of 2025
- Only USDC version supporting Circle mint/redeem
- Integrated with every major Solana DeFi protocol

**Bridged USDC Standard:**
- For new chains, Circle allows bootstrapping with bridged USDC
- Contract designed to be upgradeable to native USDC
- Once upgraded, bridged version deprecated

**Example: Arbitrum Orbit Chain**
```
Phase 1: Launch with bridged USDC from bridge protocol
Phase 2: Coordinate with Circle for native upgrade
Phase 3: Upgrade contract in-place to native USDC
Phase 4: Deprecate bridge minting, Circle controls all mints
```

### 5. Wormhole W Token

**Background:**
- Wormhole's governance token
- Designed multichain from genesis

**Architecture:**
- Canonical supply on Solana (home chain)
- NTT deployment to Ethereum, Arbitrum, Base, etc.
- Burn-and-mint model centered on Solana

**Why Solana as Home Chain:**
- Majority of Wormhole activity on Solana
- Lower fees for token distribution
- Faster governance execution

## Token Metadata Consistency

### Cross-Chain Metadata Standards

**Critical:** Maintain identical branding across all chains.

```rust
// Solana SPL Token Metadata
pub struct TokenMetadata {
    pub name: String,           // "My Token"
    pub symbol: String,         // "MTK"
    pub uri: String,            // "https://mytoken.com/metadata.json"
    pub decimals: u8,           // 6 (common on Solana)
}

// Ethereum ERC20 Metadata
contract MyToken {
    string public name = "My Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;  // Different from Solana!
}
```

**Decimal Handling Challenge:**

Solana SPL tokens commonly use 6 decimals (micro-units like USDC), while Ethereum ERC20 tokens typically use 18 decimals (wei-like). This mismatch causes UX problems.

**Solution 1: Normalize to 18 decimals everywhere**
```rust
// On Solana, use 18 decimals to match Ethereum
pub const TOKEN_DECIMALS: u8 = 18;
```

**Solution 2: Convert in bridge logic**
```rust
// When transferring from Solana (6 decimals) to Ethereum (18 decimals)
pub fn convert_amount(amount_solana: u64) -> U256 {
    // 1000 USDC (6 decimals) = 1_000_000_000
    // Convert to 18 decimals = 1_000_000_000_000_000_000_000
    U256::from(amount_solana) * U256::from(10u64.pow(12))
}
```

**Best Practice:** Use same decimals across all chains if launching new token.

### Metadata JSON (EIP-1046 / Metaplex)

**Consistent Metadata URI:**
```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "A revolutionary multichain token",
  "image": "https://mytoken.com/logo.png",
  "external_url": "https://mytoken.com",
  "properties": {
    "category": "DeFi",
    "chains": ["solana", "ethereum", "arbitrum"],
    "canonical_addresses": {
      "solana": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "ethereum": "0x1234567890123456789012345678901234567890",
      "arbitrum": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    }
  }
}
```

## Governance and Upgradeability

### Upgrade Authority Control

**Critical:** Decide who can upgrade token contracts on each chain.

**Option 1: Unified Multisig**
```rust
// Same 5-of-9 multisig controls all chains
// Ethereum: 0xMultiSigWallet123...
// Solana: MultiSigPubkey123...

// Upgrade instruction requires multisig approval
pub fn upgrade_program(
    ctx: Context<UpgradeProgram>,
    new_program_data: Vec<u8>
) -> Result<()> {
    require!(
        ctx.accounts.multisig.is_signed(),
        ErrorCode::UnauthorizedUpgrade
    );

    // Apply upgrade
    invoke_signed(
        &bpf_loader_upgradeable::upgrade(
            &ctx.accounts.program_id.key(),
            &ctx.accounts.buffer.key(),
            &ctx.accounts.authority.key(),
            &ctx.accounts.spill.key()
        ),
        &[/* accounts */],
        &[&[b"upgrade_authority", &[bump]]]
    )?;

    Ok(())
}
```

**Option 2: Per-Chain Governance**
- Solana: DAO vote via SPL Governance
- Ethereum: Timelock contract with Governor Bravo
- Requires coordination for synchronized upgrades

**Best Practice:** Start with tight multisig control, transition to decentralized governance after stability.

### Emergency Controls

**Pause Mechanism:**
```rust
#[account]
pub struct EmergencyControls {
    pub is_paused: bool,
    pub pause_authority: Pubkey,
    pub pause_timestamp: Option<i64>
}

pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.controls.pause_authority,
        ErrorCode::Unauthorized
    );

    ctx.accounts.controls.is_paused = true;
    ctx.accounts.controls.pause_timestamp = Some(Clock::get()?.unix_timestamp);

    emit!(BridgePaused {
        chain: "solana",
        timestamp: Clock::get()?.unix_timestamp,
        reason: "Emergency pause triggered"
    });

    Ok(())
}

// Check in all transfer functions
require!(!emergency_controls.is_paused, ErrorCode::BridgePaused);
```

**Guardian Veto (Wormhole Pattern):**
- Guardians can veto suspicious transfers
- Requires supermajority to override
- Time-limited veto window (e.g., 24 hours)

## Testing Multi-Chain Deployments

### Testnet Deployment Strategy

**Phase 1: Single Testnet**
```bash
# Deploy to Solana Devnet
anchor build
anchor deploy --provider.cluster devnet

# Verify functionality
anchor test
```

**Phase 2: Cross-Chain Testnet**
```bash
# Deploy to Solana Devnet and Ethereum Sepolia
npm run deploy:devnet:solana
npm run deploy:sepolia:ethereum

# Configure NTT peers
npm run ntt:link -- \
  --chain-a solana-devnet \
  --chain-b ethereum-sepolia

# Test cross-chain transfer
npm run test:cross-chain
```

**Phase 3: Mainnet Beta**
```bash
# Deploy to Solana Mainnet only
anchor deploy --provider.cluster mainnet-beta

# Operate single-chain for 2-4 weeks
# Monitor for bugs, gather user feedback

# Then deploy to other chains
npm run deploy:mainnet:ethereum
npm run deploy:mainnet:arbitrum
```

### Integration Testing

```typescript
import { expect } from 'chai';
import { getSignedVAAWithRetry } from '@certusone/wormhole-sdk';

describe('Multichain token transfers', () => {
    it('should maintain supply invariant', async () => {
        // Get initial supplies
        const initialSolana = await getSupply(solanaProgram);
        const initialEthereum = await getSupply(ethereumContract);
        const initialTotal = initialSolana + initialEthereum;

        // Transfer from Solana to Ethereum
        const amount = 1000n * 10n ** 6n; // 1000 tokens
        await solanaProgram.methods
            .transferBurn(amount, ETHEREUM_CHAIN_ID, ethAddress)
            .rpc();

        // Wait for VAA and redeem on Ethereum
        const vaa = await getSignedVAAWithRetry(/* ... */);
        await ethereumContract.redeem(vaa);

        // Check supplies after transfer
        const finalSolana = await getSupply(solanaProgram);
        const finalEthereum = await getSupply(ethereumContract);
        const finalTotal = finalSolana + finalEthereum;

        // Verify invariant
        expect(finalTotal).to.equal(initialTotal);
        expect(finalSolana).to.equal(initialSolana - amount);
        expect(finalEthereum).to.equal(initialEthereum + amount);
    });

    it('should enforce rate limits', async () => {
        const largeAmount = 10_000_000n * 10n ** 6n; // Exceeds limit

        await expect(
            solanaProgram.methods
                .transferBurn(largeAmount, ETHEREUM_CHAIN_ID, ethAddress)
                .rpc()
        ).to.be.rejectedWith(/RateLimitExceeded/);
    });
});
```

## Launch Checklist

### Pre-Launch
- [ ] Token contracts deployed and verified on all chains
- [ ] NTT/bridge configuration completed
- [ ] Rate limits set conservatively
- [ ] Emergency pause mechanism tested
- [ ] Upgrade authorities configured (multisig)
- [ ] Metadata consistent across all chains
- [ ] Decimals handling validated
- [ ] Supply invariant tests passing
- [ ] Security audits completed for all contracts
- [ ] Testnet beta completed (2-4 weeks minimum)
- [ ] Guardian set verified (Wormhole) or oracle/relayer configured (LayerZero)
- [ ] Monitoring and alerting configured
- [ ] User documentation prepared
- [ ] Wallet integration coordinated (Phantom, MetaMask, etc.)

### Launch Day
- [ ] Deploy to Solana mainnet (home chain)
- [ ] Verify contract and initial supply
- [ ] Announce official Solana contract address
- [ ] Wait 1-4 weeks for single-chain stability
- [ ] Deploy to secondary chains (Ethereum, etc.)
- [ ] Configure NTT peers and rate limits
- [ ] Enable cross-chain transfers
- [ ] Announce multichain expansion
- [ ] Monitor first transfers closely

### Post-Launch
- [ ] Track cross-chain transfer volume
- [ ] Monitor rate limit utilization
- [ ] Watch for unusual transfer patterns
- [ ] Gradually increase rate limits based on usage
- [ ] Coordinate DEX listings on all chains
- [ ] Support wallet/explorer integration
- [ ] Gather user feedback on UX
- [ ] Plan governance transition (multisig → DAO)

## Common Pitfalls

### 1. Multiple Wrapped Versions

**Problem:** Allowing multiple bridge protocols to create wrapped versions.

**Example:**
```
Your token on Solana:
- Wormhole wrapped version: Address A
- Allbridge wrapped version: Address B
- Portal wrapped version: Address C
Result: Liquidity fragmented, users confused
```

**Solution:** Use NTT to deploy canonical version from day one.

### 2. Inconsistent Decimals

**Problem:** Using 6 decimals on Solana, 18 on Ethereum without conversion.

**Impact:**
- Users send 1.0 tokens, receive 0.000000000001 tokens (off by 10^12)
- Requires complex UI logic to display correctly
- Higher error risk

**Solution:** Standardize on 18 decimals everywhere, or handle conversion in bridge.

### 3. Insufficient Rate Limits

**Problem:** Launching with no rate limits or limits too high.

**Example:** Wormhole hack exploiter drained 120K wETH in minutes because no rate limits existed.

**Solution:** Start with tight limits (e.g., $100K/day), gradually increase.

### 4. Weak Upgrade Controls

**Problem:** Single EOA controls upgrades on all chains.

**Risk:** Private key compromise = total control of multichain token.

**Solution:** Use multisig (5-of-9 minimum) or DAO governance with timelock.

### 5. No Emergency Pause

**Problem:** Bridge exploit detected, but no way to stop transfers.

**Impact:** Exploit continues until all liquidity drained.

**Solution:** Implement pause mechanism controlled by trusted multisig.

## Summary

Designing multichain tokens requires careful consideration of architecture (canonical vs. wrapped), token flow (burn-and-mint vs. lock-and-mint), security (rate limiting, pausability), and user experience (consistent branding, decimal handling). Wormhole's NTT framework has emerged as the standard for Solana multichain tokens, enabling burn-and-mint flows without liquidity fragmentation. Real-world examples like Sky USDS, GEOD, and POWR demonstrate successful multichain launches using NTT. Always prioritize security over convenience: start with conservative rate limits, implement emergency controls, and test thoroughly on testnets before mainnet launch.

## Additional Resources

- [Wormhole NTT Documentation](https://wormhole.com/docs/products/token-transfers/native-token-transfers/overview/)
- [Wormhole NTT Deep Dive](https://wormhole.com/blog/deep-dive-wormhole-native-token-transfers-ntt)
- [Circle CCTP Overview](https://www.circle.com/cross-chain-transfer-protocol)
- [Bridged USDC Standard](https://www.circle.com/bridged-usdc)
- [Multi-Chain Stablecoins Security (Halborn)](https://www.halborn.com/blog/post/multi-chain-stablecoins-security-risks-and-best-practices)
- [Sky USDS Case Study](https://wormhole.com/case-studies/sky)
- [Powerledger POWR Case Study](https://powerledger.io/media/case-study-expanding-powr-to-solana-with-wormholes-ntt-standard/)
