---
pack: solana
question: "How do I send messages across chains from Solana?"
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# Cross-Chain Messaging from Solana

## Overview

Cross-chain messaging enables Solana programs to send arbitrary data to contracts on other blockchains, unlocking use cases beyond simple token transfers: cross-chain governance, multichain NFTs, synchronized state, and decentralized oracle networks. This guide focuses on the two primary messaging protocols for Solana: Wormhole and LayerZero.

## Why Cross-Chain Messaging?

Cross-chain messaging solves blockchain isolation by allowing Solana to communicate with 30+ other networks. Key use cases:

- **Cross-chain governance:** Vote on Solana, execute on Ethereum L2s
- **Multichain NFTs:** Mint on Solana, bridge metadata to other chains
- **Liquidity coordination:** Synchronize DEX state across chains
- **Oracle data distribution:** Publish Solana data to EVM chains
- **Cross-chain identity:** Maintain unified identity across ecosystems
- **Yield optimization:** Coordinate strategies across multiple DeFi protocols

## Wormhole Messaging Protocol

Wormhole is the most mature and widely adopted cross-chain messaging protocol for Solana, processing over 1 billion messages across 30+ blockchains since 2021.

### Core Primitive: VAA (Verified Action Approval)

**VAA** is a signed attestation produced by Wormhole's Guardian network that proves a specific event occurred on a source blockchain.

**Structure:**
```rust
pub struct VAA {
    // VAA header
    pub version: u8,
    pub guardian_set_index: u32,
    pub signatures: Vec<Signature>, // 13+ of 19 Guardian signatures

    // VAA body
    pub timestamp: u32,
    pub nonce: u32,
    pub emitter_chain: u16,      // Source chain ID
    pub emitter_address: [u8; 32], // Source contract
    pub sequence: u64,            // Message ordering
    pub consistency_level: u8,    // Finality requirement
    pub payload: Vec<u8>          // Arbitrary message data
}
```

**Security Model:**
- 19 Guardian validators run full nodes for every connected blockchain
- Guardians independently observe on-chain events and sign VAAs
- 13/19 Guardian signatures required for valid VAA (66% threshold)
- Guardians are reputable entities: Jump Crypto, Staked, Figment, etc.

### Sending Messages from Solana

**Program Architecture:**

```rust
use anchor_lang::prelude::*;
use wormhole_anchor_sdk::wormhole;

#[program]
pub mod cross_chain_app {
    use super::*;

    pub fn send_message(
        ctx: Context<SendMessage>,
        nonce: u32,
        payload: Vec<u8>,
        consistency_level: u8
    ) -> Result<()> {
        // Post message to Wormhole Core Bridge
        wormhole::post_message(
            CpiContext::new(
                ctx.accounts.wormhole_program.to_account_info(),
                wormhole::PostMessage {
                    config: ctx.accounts.wormhole_bridge.to_account_info(),
                    message: ctx.accounts.wormhole_message.to_account_info(),
                    emitter: ctx.accounts.emitter.to_account_info(),
                    sequence: ctx.accounts.wormhole_sequence.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    fee_collector: ctx.accounts.wormhole_fee_collector.to_account_info(),
                    clock: ctx.accounts.clock.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                }
            ),
            nonce,
            payload,
            consistency_level, // Finalized = 1, Confirmed = 0
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Wormhole program
    pub wormhole_program: Program<'info, wormhole::program::Wormhole>,

    /// Wormhole config
    #[account(mut)]
    pub wormhole_bridge: Account<'info, wormhole::BridgeData>,

    /// Account to store the posted message
    #[account(mut)]
    pub wormhole_message: Signer<'info>,

    /// Emitter account (your program's PDA)
    pub emitter: Account<'info, EmitterAccount>,

    /// Sequence tracker
    #[account(mut)]
    pub wormhole_sequence: Account<'info, wormhole::SequenceTracker>,

    /// Wormhole fee collector
    #[account(mut)]
    pub wormhole_fee_collector: Account<'info, wormhole::FeeCollector>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
```

**Payload Encoding:**

```rust
// Custom message serialization
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CrossChainAction {
    pub action_type: u8,    // 1 = transfer, 2 = governance, etc.
    pub target_chain: u16,  // Destination chain ID
    pub recipient: [u8; 32], // Address on target chain
    pub amount: u64,
    pub data: Vec<u8>       // Additional parameters
}

// Serialize for cross-chain send
let payload = CrossChainAction {
    action_type: 2, // Governance vote
    target_chain: 2, // Ethereum
    recipient: ethereum_contract_address,
    amount: 0,
    data: vote_data.try_to_vec()?
}.try_to_vec()?;
```

### Receiving Messages on Solana

**VAA Verification and Processing:**

```rust
pub fn receive_message(
    ctx: Context<ReceiveMessage>,
    vaa_data: Vec<u8>
) -> Result<()> {
    // Parse and verify VAA
    let vaa = wormhole::parse_and_verify_vaa(
        &ctx.accounts.wormhole_bridge,
        &vaa_data,
        ctx.accounts.clock.unix_timestamp
    )?;

    // Check VAA is from expected emitter
    require!(
        vaa.emitter_chain == ETHEREUM_CHAIN_ID,
        ErrorCode::InvalidEmitterChain
    );
    require!(
        vaa.emitter_address == ETHEREUM_CONTRACT_ADDRESS,
        ErrorCode::InvalidEmitter
    );

    // Replay protection
    require!(
        !ctx.accounts.processed_vaas.contains(&vaa.hash()),
        ErrorCode::VaaAlreadyProcessed
    );

    // Deserialize payload
    let action: CrossChainAction = AnchorDeserialize::deserialize(
        &mut &vaa.payload[..]
    )?;

    // Execute cross-chain action
    match action.action_type {
        1 => handle_transfer(ctx, action)?,
        2 => handle_governance(ctx, action)?,
        _ => return Err(ErrorCode::InvalidActionType.into())
    }

    // Mark VAA as processed
    ctx.accounts.processed_vaas.insert(vaa.hash());

    Ok(())
}
```

**Automatic Relaying:**

Wormhole provides optional relayer infrastructure (untrusted in the security model):

```typescript
import { RelayerApp } from '@certusone/wormhole-relayer-sdk';

// Set up automatic relaying
const relayer = new RelayerApp({
  wormholeRpc: 'https://wormhole-v2-mainnet-api.certus.one',
  solanaRpc: 'https://api.mainnet-beta.solana.com',
});

// Configure relay delivery
await relayer.deliverToSolana({
  targetChain: 'solana',
  targetAddress: programId,
  gasLimit: 500000,
  receiverValue: 0.01 * 1e9 // SOL for recipient
});
```

### Message Verification and Trust

**Consistency Levels:**

```rust
pub enum ConsistencyLevel {
    Confirmed = 0,  // ~400ms on Solana, faster but reorg risk
    Finalized = 1   // ~13s on Solana, safe finality
}
```

**Best Practice:** Use `Finalized` for high-value operations, `Confirmed` for low-risk or time-sensitive messages.

**Guardian Observation:**
1. Solana validator finalizes block containing `post_message` instruction
2. Each Guardian observes block via their Solana full node
3. Guardian signs VAA with their private key
4. Once 13+ signatures collected, VAA is valid and can be relayed

**Trust Assumptions:**
- Trust 13 of 19 Guardians are honest
- Trust Guardians' full nodes correctly observe source chain
- Trust Guardian key security (multi-party computation, HSMs)
- No trust required in relayers (they can delay but not forge)

## LayerZero Messaging Protocol

LayerZero offers an alternative cross-chain messaging solution with its Ultra Light Node architecture, integrated with Solana in 2024.

### Architecture Overview

**Ultra Light Node (ULN):**
- Lightweight on-chain verification without running full nodes
- Separates oracle and relayer roles for security
- Configurable trust model per application

**Solana Integration:**
- Sister Solana Programs communicate with EVM contracts
- SDK for cross-chain messaging and OFT (Omnichain Fungible Tokens)
- Enhanced support for SPL tokens with lower latency

### Sending Messages with LayerZero

```rust
use layerzero_solana_sdk::prelude::*;

#[program]
pub mod lz_cross_chain {
    use super::*;

    pub fn send_lz_message(
        ctx: Context<SendLzMessage>,
        dst_chain_id: u16,
        dst_address: Vec<u8>,
        payload: Vec<u8>,
        refund_address: Pubkey,
        zro_payment_address: Pubkey,
        adapter_params: Vec<u8>
    ) -> Result<()> {
        // Call LayerZero endpoint
        lz_send(
            CpiContext::new(
                ctx.accounts.lz_endpoint.to_account_info(),
                LzSend {
                    endpoint: ctx.accounts.lz_endpoint.to_account_info(),
                    user_app: ctx.accounts.user_app.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                }
            ),
            dst_chain_id,
            dst_address,
            payload,
            refund_address,
            zro_payment_address,
            adapter_params
        )?;

        Ok(())
    }
}
```

**Key Differences from Wormhole:**
- Configurable oracle and relayer (vs. fixed Guardian set)
- Application-specific security configuration
- Native support for OFT token standard

### Real-World Usage

**Jupiter DEX:**
```typescript
// Jupiter uses LayerZero for cross-chain swaps
const quote = await jupiter.getLayerZeroQuote({
  inputChain: 'solana',
  outputChain: 'arbitrum',
  inputToken: 'SOL',
  outputToken: 'USDC',
  amount: 10 * 1e9
});

const tx = await jupiter.executeLayerZeroSwap(quote);
```

**Jito Liquid Staking:**
- Uses LayerZero to bridge JitoSOL to Ethereum
- Cross-chain governance for protocol parameters
- Synchronized staking rewards across chains

## Latency and Performance

### Message Timing Comparison

**Wormhole:**
| Source → Destination | Typical Time | Factors |
|---------------------|--------------|---------|
| Solana → Ethereum | 2-3 minutes | Solana finality (~13s) + Guardian signing (~30s) + Ethereum gas |
| Ethereum → Solana | 15-20 minutes | Ethereum finality (~15 min) + Guardian signing + Solana confirmation |
| Solana → Arbitrum | 3-5 minutes | Solana finality + Guardian signing + L2 sequencer |

**LayerZero:**
| Source → Destination | Typical Time | Factors |
|---------------------|--------------|---------|
| Solana → Ethereum | 1-2 minutes | Faster oracle/relayer model |
| Ethereum → Solana | 12-15 minutes | Ethereum finality dominates |
| Solana → Arbitrum | 2-3 minutes | Optimized L2 paths |

**Optimization Strategies:**
1. Use `Confirmed` instead of `Finalized` for non-critical messages
2. Batch multiple messages into single cross-chain transaction
3. Implement optimistic execution with revert mechanisms
4. Cache frequently accessed cross-chain state locally

## Cost Analysis

### Wormhole Fees

**Components:**
- Protocol fee: ~$0.01 for micro-transfers, ~$0.50-1 for complex messages
- Solana transaction fee: ~$0.00001 (negligible)
- Destination chain gas: Varies significantly (Ethereum: $5-50, Arbitrum: $0.10-1)

**Fee Structure:**
```rust
// Wormhole charges based on message size and destination
let fee = match destination_chain {
    ETHEREUM => 0.01 * SOL_PRICE,
    ARBITRUM => 0.001 * SOL_PRICE,
    POLYGON => 0.0005 * SOL_PRICE,
    _ => 0.01 * SOL_PRICE
};
```

### LayerZero Fees

**Components:**
- Oracle fee: Paid to Chainlink or custom oracle
- Relayer fee: Paid for destination gas + markup
- ZRO token (optional): Can reduce fees if holding/staking

**Typical Costs:**
- Solana → EVM: $0.50-2 depending on destination gas
- Solana → L2: $0.10-0.50 (cheaper than L1)

### Cost Optimization

```rust
// Batch messages to amortize cross-chain costs
pub struct BatchedMessage {
    pub message_count: u8,
    pub messages: Vec<IndividualMessage>
}

// Single cross-chain send with 10 messages:
// Cost per message: $1 / 10 = $0.10 instead of $1 each
```

## Use Case Implementations

### 1. Cross-Chain Governance

**Scenario:** DAO votes on Solana, executes on Ethereum mainnet

```rust
// On Solana: Cast vote and send message
pub fn cast_vote_cross_chain(
    ctx: Context<CastVote>,
    proposal_id: u64,
    vote: bool
) -> Result<()> {
    // Record vote on Solana
    let vote_record = &mut ctx.accounts.vote_record;
    vote_record.proposal_id = proposal_id;
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.vote = vote;

    // Encode governance message
    let payload = GovernanceMessage {
        proposal_id,
        vote_count: get_vote_tally(proposal_id)?,
        vote_threshold: GOVERNANCE_THRESHOLD,
        action: ProposalAction::Execute
    }.try_to_vec()?;

    // Send to Ethereum
    wormhole::post_message(
        ctx.accounts.wormhole_ctx,
        1, // nonce
        payload,
        1  // finalized
    )?;

    Ok(())
}
```

```solidity
// On Ethereum: Receive and execute
function receiveGovernanceVote(bytes memory vaaData) external {
    // Verify VAA from Wormhole core
    (IWormhole.VM memory vm, bool valid, string memory reason) =
        wormhole.parseAndVerifyVM(vaaData);
    require(valid, reason);

    // Verify emitter is Solana governance program
    require(vm.emitterChainId == 1, "Invalid chain");
    require(vm.emitterAddress == SOLANA_GOVERNANCE_ADDRESS, "Invalid emitter");

    // Decode and execute
    GovernanceMessage memory message = abi.decode(vm.payload, (GovernanceMessage));

    if (message.voteCount >= message.voteThreshold) {
        executeProposal(message.proposalId);
    }
}
```

### 2. Multichain NFT Metadata

**Scenario:** NFT minted on Solana, metadata/traits synchronized to Ethereum

```rust
pub fn sync_nft_metadata(
    ctx: Context<SyncNFT>,
    token_id: u64,
    metadata_uri: String,
    traits: Vec<Trait>
) -> Result<()> {
    // Prepare NFT metadata message
    let payload = NFTMetadataMessage {
        token_id,
        metadata_uri,
        traits,
        owner: ctx.accounts.nft_owner.key().to_bytes()
    }.try_to_vec()?;

    // Send to multiple chains in parallel
    for chain_id in [2, 4, 5] { // Ethereum, BSC, Polygon
        wormhole::post_message(
            ctx.accounts.wormhole_ctx,
            chain_id as u32, // nonce per chain
            payload.clone(),
            1 // finalized
        )?;
    }

    Ok(())
}
```

### 3. Cross-Chain Oracle Data

**Scenario:** Publish Solana price data to EVM chains for DeFi protocols

```rust
pub fn publish_price_feed(
    ctx: Context<PublishPrice>,
    symbol: String,
    price: u64,
    confidence: u64
) -> Result<()> {
    // Aggregate prices from Pyth, Switchboard, etc.
    let aggregated_price = aggregate_oracle_prices(symbol)?;

    let payload = PriceFeedMessage {
        symbol,
        price: aggregated_price.price,
        confidence: aggregated_price.confidence,
        timestamp: Clock::get()?.unix_timestamp,
        publisher: ctx.accounts.publisher.key().to_bytes()
    }.try_to_vec()?;

    // Publish to subscriber chains
    wormhole::post_message(
        ctx.accounts.wormhole_ctx,
        0, // nonce
        payload,
        0  // confirmed (speed matters for prices)
    )?;

    Ok(())
}
```

## Security Considerations

### Message Replay Protection

**Critical:** Always track processed VAAs to prevent replay attacks.

```rust
#[account]
pub struct ProcessedVAAs {
    pub vaas: HashSet<[u8; 32]> // Store VAA hashes
}

// In receive handler:
let vaa_hash = hash_vaa(&vaa_data);
require!(
    !processed_vaas.contains(&vaa_hash),
    ErrorCode::VaaAlreadyProcessed
);
processed_vaas.insert(vaa_hash);
```

**Alternative:** Use Wormhole sequence numbers for ordered message processing.

### Emitter Verification

**Critical:** Verify messages come from authorized source contracts.

```rust
// Whitelist of trusted emitters per chain
#[account]
pub struct TrustedEmitters {
    pub emitters: HashMap<u16, Vec<[u8; 32]>> // chain_id -> addresses
}

fn verify_emitter(vaa: &VAA, trusted: &TrustedEmitters) -> Result<()> {
    let chain_emitters = trusted.emitters.get(&vaa.emitter_chain)
        .ok_or(ErrorCode::ChainNotTrusted)?;

    require!(
        chain_emitters.contains(&vaa.emitter_address),
        ErrorCode::EmitterNotTrusted
    );

    Ok(())
}
```

### Payload Validation

**Best Practice:** Validate all payload fields before execution.

```rust
fn validate_payload(payload: &CrossChainAction) -> Result<()> {
    // Check action type is supported
    require!(
        payload.action_type <= MAX_ACTION_TYPE,
        ErrorCode::InvalidActionType
    );

    // Validate target chain
    require!(
        SUPPORTED_CHAINS.contains(&payload.target_chain),
        ErrorCode::UnsupportedChain
    );

    // Check amount limits
    require!(
        payload.amount <= MAX_CROSS_CHAIN_AMOUNT,
        ErrorCode::AmountTooLarge
    );

    // Validate recipient address format
    require!(
        payload.recipient != [0u8; 32],
        ErrorCode::InvalidRecipient
    );

    Ok(())
}
```

### Guardian Set Updates

**Monitor for malicious updates:**

```rust
pub fn verify_guardian_set(
    guardian_set_index: u32,
    expected_guardians: &[Pubkey]
) -> Result<()> {
    let current_set = get_guardian_set(guardian_set_index)?;

    // Verify set matches expected
    require!(
        current_set.keys.len() == expected_guardians.len(),
        ErrorCode::GuardianSetSizeMismatch
    );

    for (i, guardian) in current_set.keys.iter().enumerate() {
        require!(
            guardian == &expected_guardians[i],
            ErrorCode::UnexpectedGuardian
        );
    }

    Ok(())
}
```

## Testing Cross-Chain Messages

### Testnet Setup

**Wormhole Testnet:**
```bash
# Deploy to Solana Devnet
anchor build
anchor deploy --provider.cluster devnet

# Configure Wormhole testnet
export WORMHOLE_BRIDGE_ADDRESS="3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5"
export EMITTER_ADDRESS="<your program id>"

# Test message flow
anchor test --skip-build
```

**Testnets Available:**
- Solana Devnet ↔ Ethereum Sepolia
- Solana Devnet ↔ Arbitrum Sepolia
- Solana Devnet ↔ Polygon Mumbai

### Local Development

**Tilt Environment (Wormhole):**
```bash
# Runs local Guardian network + all supported chains
git clone https://github.com/wormhole-foundation/wormhole
cd wormhole
tilt up

# Test local cross-chain flow
./scripts/send-test-message.sh solana ethereum "Hello from Solana"
```

### Integration Tests

```typescript
import { expect } from 'chai';
import { getSignedVAAWithRetry } from '@certusone/wormhole-sdk';

describe('Cross-chain messaging', () => {
    it('should send message from Solana to Ethereum', async () => {
        // Send message on Solana
        const tx = await program.methods
            .sendMessage(1, Buffer.from("test payload"), 1)
            .accounts({ /* accounts */ })
            .rpc();

        // Get sequence from transaction
        const sequence = await getWormholeSequence(connection, tx);

        // Wait for VAA
        const { vaaBytes } = await getSignedVAAWithRetry(
            WORMHOLE_RPC_HOSTS,
            1, // Solana chain ID
            emitterAddress,
            sequence
        );

        // Verify VAA structure
        expect(vaaBytes).to.not.be.null;

        // Submit to Ethereum (in actual test)
        // const ethTx = await ethereumContract.receiveMessage(vaaBytes);
    });
});
```

## Monitoring and Debugging

### Transaction Tracking

**Wormhole Explorer:**
```
https://wormholescan.io/#/tx/<transaction-hash>?network=MAINNET
```

Shows:
- Source transaction details
- VAA status and signatures
- Destination redemption status

**LayerZero Scan:**
```
https://layerzeroscan.com/tx/<transaction-hash>
```

### Debugging Failed Messages

**Common Issues:**

1. **VAA not generated:**
   - Check consistency level (use Finalized)
   - Verify Wormhole fee was paid
   - Ensure message was emitted in transaction

2. **VAA signatures insufficient:**
   - Wait longer (some Guardians may be slow)
   - Check if Guardian set changed recently

3. **Redemption failed on destination:**
   - Verify emitter address in destination contract
   - Check destination gas limits
   - Validate payload format matches expected schema

**Logs and Events:**

```rust
#[event]
pub struct MessageSent {
    pub sequence: u64,
    pub nonce: u32,
    pub payload_size: usize,
    pub consistency_level: u8
}

#[event]
pub struct MessageReceived {
    pub emitter_chain: u16,
    pub emitter_address: [u8; 32],
    pub sequence: u64,
    pub payload_hash: [u8; 32]
}
```

## Choosing a Messaging Protocol

### Wormhole Pros:
- Battle-tested (1B+ messages processed)
- Strong decentralization (19 Guardians)
- Mature tooling and documentation
- Native Solana integration since 2021
- Large ecosystem of integrated apps

### Wormhole Cons:
- Fixed trust model (must trust Guardian majority)
- Slightly higher latency than alternatives
- Past exploit (though recovered and hardened)

### LayerZero Pros:
- Configurable trust model per application
- Lower latency with ULN architecture
- Growing 70+ chain network
- Native OFT token standard
- Strong backing (a16z, Sequoia)

### LayerZero Cons:
- Newer to Solana (integrated 2024)
- Smaller Solana ecosystem vs. Wormhole
- More complex security configuration

### Evaluation Checklist:
- [ ] Security model aligns with application risk profile
- [ ] Required destination chains supported
- [ ] Latency requirements met
- [ ] Cost structure acceptable for expected volume
- [ ] SDK and tooling quality sufficient
- [ ] Existing integrations and ecosystem support
- [ ] Audit history and track record

## Summary

Cross-chain messaging unlocks Solana's ability to coordinate with other blockchain ecosystems. Wormhole provides a mature, battle-tested solution with strong decentralization and broad adoption. LayerZero offers a newer alternative with configurability and lower latency. Both protocols support complex use cases beyond simple token transfers, including governance, NFTs, and oracle data distribution. Prioritize security through proper VAA verification, replay protection, and emitter validation. Test thoroughly on testnets before mainnet launch, and implement comprehensive monitoring for production cross-chain applications.

## Additional Resources

- [Wormhole Messaging Documentation](https://wormhole.com/docs/products/messaging/overview)
- [LayerZero Solana SDK](https://docs.layerzero.network/v2/developers/solana/getting-started)
- [Wormhole SDK GitHub](https://github.com/wormhole-foundation/wormhole)
- [Cross-Chain Message Tutorial (QuickNode)](https://www.quicknode.com/guides/cross-chain/wormhole/how-to-create-a-cross-chain-messaging-app)
- [Wormhole Guardian Network](https://wormhole.com/network)
