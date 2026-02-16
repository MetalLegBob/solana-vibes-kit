---
pack: solana
question: "How do I integrate with cross-chain bridges?"
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Bridge Integration Patterns on Solana

## Overview

Cross-chain bridges enable asset transfers between Solana and other blockchain networks. Solana's high throughput and low fees make it an attractive destination for multichain applications, but bridge integration requires careful consideration of security, token standards, and user experience.

## Primary Bridge Protocols

### 1. Wormhole

Wormhole is the most widely adopted bridge protocol for Solana, connecting 30+ blockchains with a focus on security and decentralization.

**Architecture:**
- 19 Guardian validators run full nodes for every connected blockchain
- Guardians sign Verified Action Approvals (VAAs) as the core primitive
- Relayers are untrusted in the security model
- Operating since early 2021

**Key Features:**
- Native Token Transfers (NTT) framework for multichain tokens
- Generic message passing (see cross-chain-messaging.md)
- Sub-second messaging with fees under $0.01 for micro-transfers
- Open-source and fully audited

### 2. LayerZero

LayerZero integrated Solana in 2024, initially connecting with 7 major blockchains (Ethereum, Avalanche, Polygon, Arbitrum, BNB Chain, Optimism, Base) with plans to expand to its full network of 70+ chains.

**Architecture:**
- Ultra Light Node architecture for cross-chain communication
- Sister Solana Programs communicate with equivalent EVM Solidity contracts
- SDK and development framework for Omnichain Fungible Tokens (OFTs)

**Real-World Usage:**
- Jupiter (Solana's largest DEX) uses LayerZero for cross-chain swaps
- Jito implements LayerZero for liquid staking solutions

## Integration Approaches

### Native Token Transfers (Wormhole NTT)

NTT is the recommended approach for projects deploying multichain tokens. It avoids wrapped token fragmentation by maintaining native token properties on each chain.

**Implementation Pattern:**

```rust
// Solana NTT Manager Program handles token transfers
// The Manager coordinates with Transceivers for message verification

// Key accounts in Solana NTT:
// - ntt_manager: Controls token minting/burning logic
// - token_mint: The SPL token being transferred
// - transceiver: Wormhole transceiver for message passing
// - custody: Holds tokens in lock-release mode (if applicable)

// Sending tokens from Solana:
transfer_burn {
    from_authority: Signer,
    from: TokenAccount,
    token_mint: Mint,
    ntt_manager: Account<NttManager>,
    config: Account<Config>,
    outbox_item: Account<OutboxItem>,
    transceiver: Account<Transceiver>
}

// Receiving tokens on Solana:
redeem {
    payer: Signer,
    config: Account<Config>,
    ntt_manager: Account<NttManager>,
    token_mint: Mint,
    recipient: TokenAccount,
    transceiver_message: Account<TransceiverMessage>
}
```

**Configuration:**
- Choose burn-and-mint or lock-and-mint mode per chain
- Set rate limits for inbound/outbound transfers (see Security section)
- Configure threshold for transceiver attestations
- Define token metadata and ownership model per chain

### Traditional Bridge Integration

For integrating existing tokens with wrapped representations:

**Frontend Integration:**
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { WormholeSDK } from '@certusone/wormhole-sdk';

// Initialize Wormhole connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const wormhole = new WormholeSDK({
  network: 'MAINNET',
  chains: { solana: connection }
});

// Initiate transfer from Ethereum to Solana
const transferVAA = await wormhole.transferFromEth(
  ethProvider,
  bridgeContract,
  tokenAddress,
  amount,
  recipientChain: 'solana',
  recipientAddress: solanaWalletPubkey
);

// Complete transfer on Solana
await wormhole.redeemOnSolana(
  connection,
  bridgeAddress,
  payerWallet,
  transferVAA
);
```

## Bridge Security Patterns

### Attestation Verification

**Critical:** Always verify VAA signatures before processing bridge messages.

```rust
// Pseudo-code for VAA verification on Solana
fn verify_vaa(vaa: &VerifiableActionApproval) -> Result<()> {
    // 1. Check VAA has valid Guardian signatures
    require!(vaa.guardian_set_index == current_guardian_set, InvalidGuardianSet);

    // 2. Verify signature count meets threshold (13/19 for Wormhole)
    let valid_sigs = vaa.signatures.iter()
        .filter(|sig| verify_guardian_signature(sig))
        .count();
    require!(valid_sigs >= GUARDIAN_QUORUM, InsufficientSignatures);

    // 3. Verify VAA hasn't been replayed
    require!(!processed_vaas.contains(&vaa.hash()), VaaAlreadyProcessed);

    // 4. Check emitter chain and address match expected values
    require!(vaa.emitter_chain == expected_chain, InvalidEmitter);

    Ok(())
}
```

### Finality Checks

**Best Practice:** Ensure source chain has reached finality before minting tokens on the destination chain.

- Ethereum: Wait for 64+ block confirmations (finalized epoch)
- Solana: Wait for supermajority confirmation (~95% stake voting)
- Never mint tokens based on single block confirmation

### Rate Limiting

Wormhole NTT provides built-in rate limiting to protect against exploits:

**Configuration:**
```typescript
// Set per-chain rate limits
nttConfig.setInboundLimit({
  sourceChain: 'ethereum',
  limit: '1000000', // 1M tokens per day
  duration: 86400   // 24 hours
});

nttConfig.setOutboundLimit({
  limit: '5000000',  // 5M tokens per day
  duration: 86400
});
```

**Features:**
- Separate limits for inbound/outbound transfers
- Per-source-chain configuration for inbound limits
- Automatic queuing when limits exceeded
- Backflow mechanism refills capacity when receiving transfers

### Circuit Breakers

**Critical:** Implement pause functionality to stop transfers during detected exploits.

```rust
pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    // Only admin/multisig can pause
    require!(ctx.accounts.authority.key() == config.pause_authority, Unauthorized);

    config.is_paused = true;
    emit!(BridgePaused {
        timestamp: Clock::get()?.unix_timestamp,
        authority: ctx.accounts.authority.key()
    });

    Ok(())
}

// Check in all bridge operations
require!(!config.is_paused, BridgePaused);
```

### Guardian Set Verification

**Wormhole-specific:** Always verify Guardian set hasn't been maliciously updated.

- Guardian set updates require supermajority of current Guardians
- Monitor Guardian set changes via events
- Implement timelock or governance for Guardian set acceptance

## Historical Security Incidents

### Wormhole Exploit (February 2022) - $320 Million

**Root Cause:** Signature verification bypass on Solana side of the bridge.

**Technical Details:**
- Attacker exploited deprecated `load_current_index` function
- Function failed to validate authenticity of provided sysvar account
- Hacker injected fake sysvar account, bypassing verification
- Maliciously minted 120,000 wETH (~$320M) without burning equivalent ETH

**Stolen Assets:**
- 93,750 ETH
- 432,662 SOL
- 1,444 USDC

**Recovery:**
- Jump Trading (Wormhole's parent) offered $10M bounty
- February 2023: Counter-exploit recovered $225M via Oasis.app coordination
- Remaining funds still held by attacker

**Lessons:**
1. Never use deprecated or insecure functions for security-critical operations
2. Always validate sysvar accounts in Solana programs
3. Implement multiple verification layers (defense in depth)
4. Have incident response and recovery plans ready
5. Consider implementing slashing for malicious behavior

### Additional Bridge Exploits (Non-Solana)

**Ronin Bridge (2022) - $625M:**
- Weak validator security (5/9 multisig compromised)
- Insufficient key management
- No slashing mechanism

**Nomad Bridge (2022) - $190M:**
- Faulty contract initialization allowed anyone to pass validation
- Illustrates importance of proper setup and initialization checks

## Token Standard Considerations

### Wrapped vs. Native Tokens

**Wrapped Tokens:**
- Created by third-party bridges
- Different contract address than canonical token
- Can cause liquidity fragmentation (multiple wrapped versions)
- Example: wETH, wBTC on Solana

**Native/Canonical Tokens:**
- Officially recognized representation on the chain
- Maintained by token issuer or protocol team
- Unified liquidity across all instances
- Example: Native USDC on Solana (issued by Circle)

### Best Practice: Use NTT for New Tokens

For tokens launching multichain from day one:

1. Deploy NTT Manager on each target chain
2. Configure as burn-and-mint with canonical supply on home chain
3. Set consistent metadata (name, symbol, decimals) across chains
4. Maintain upgradeability with governance control
5. Enable rate limiting from launch

**Benefits:**
- No wrapped token proliferation
- Unified brand and liquidity
- Full control over token behavior per chain
- Future-proof for new chain integrations

## Bridge UI/UX Integration

### User Flow Best Practices

**1. Clear Asset Distinction:**
```typescript
// Show users exactly what token they'll receive
interface BridgeQuote {
  sourceToken: 'USDC (Ethereum)',
  destToken: 'USDC (Solana)',
  isWrapped: false,
  isCanonical: true
}
```

**2. Transaction Time Estimates:**
- Ethereum → Solana: ~15 minutes (finality + confirmation)
- Solana → Ethereum: ~2-3 minutes (faster finality)
- Show progress stages: "Finalizing on source chain" → "Guardians signing" → "Completing on destination"

**3. Fee Transparency:**
```typescript
interface BridgeFees {
  sourceTxFee: '0.001 ETH',      // Gas for source chain tx
  bridgeProtocolFee: '0.0001 SOL', // Wormhole/LayerZero fee
  destTxFee: '0.00001 SOL',       // Solana confirmation fee
  totalCost: '$5.43'               // USD equivalent
}
```

**4. Error Handling:**
- Provide VAA/message IDs for manual recovery
- Link to bridge explorer for transaction tracking
- Support manual redemption if auto-relay fails

### SDK Examples

**Wormhole SDK:**
```typescript
import { getEmitterAddressEth, parseSequenceFromLogEth } from '@certusone/wormhole-sdk';

// Get VAA after source chain transaction
const sequence = parseSequenceFromLogEth(receipt, bridgeAddress);
const emitterAddress = getEmitterAddressEth(tokenBridgeAddress);

// Poll for VAA from Guardian network
const { vaaBytes } = await getSignedVAAWithRetry(
  WORMHOLE_RPC_HOSTS,
  sourceChain,
  emitterAddress,
  sequence,
  { transport: grpc }
);

// Redeem on Solana
const transaction = await redeemOnSolana(
  connection,
  bridgeAddress,
  tokenBridgeAddress,
  payerAddress,
  vaaBytes
);
```

**LayerZero SDK:**
```typescript
import { LayerZeroSolana } from '@layerzerolabs/solana-sdk';

const lz = new LayerZeroSolana(connection);

// Send OFT (Omnichain Fungible Token)
const tx = await lz.sendOFT({
  srcToken: solanaTokenAddress,
  dstChainId: 101, // Ethereum
  recipient: ethereumAddress,
  amount: amountBN,
  refundAddress: solanaWallet
});
```

## Testing and Development

### Testnet Resources

**Wormhole:**
- Testnet Guardian network available
- Faucet for test tokens: https://wormhole.com/faucet
- Bridge UI: https://wormhole-foundation.github.io/example-token-bridge-ui/

**LayerZero:**
- Solana Devnet support
- Testnet endpoints for all integrated chains
- LZ Scan for transaction tracking: https://testnet.layerzeroscan.com/

### Integration Checklist

- [ ] VAA/message verification implemented correctly
- [ ] Finality requirements met before minting
- [ ] Rate limiting configured and tested
- [ ] Circuit breaker/pause mechanism implemented
- [ ] Guardian set update monitoring in place
- [ ] Replay protection for bridge messages
- [ ] Proper error handling and user recovery flows
- [ ] Security audit completed by reputable firm
- [ ] Incident response plan documented
- [ ] Frontend shows clear token distinctions (wrapped vs native)
- [ ] Transaction tracking and status updates implemented
- [ ] Testnet integration fully validated
- [ ] Monitoring and alerting configured for production

## Choosing a Bridge Protocol

### Wormhole Best For:
- Projects needing mature, battle-tested infrastructure
- Token deployments requiring NTT framework
- Apps prioritizing decentralization (19 Guardians)
- Integration with Solana-native ecosystem

### LayerZero Best For:
- Projects already using LayerZero on other chains
- Apps needing Ultra Light Node architecture
- Integration with 70+ chain network
- Omnichain Fungible Token (OFT) standard

### Evaluation Criteria:
1. **Security model:** Guardian/validator set size and reputation
2. **Decentralization:** Who controls protocol upgrades?
3. **Latency:** How fast are cross-chain messages?
4. **Cost:** Protocol fees + gas costs on both chains
5. **Developer experience:** SDK quality, documentation, support
6. **Ecosystem:** Which dApps and protocols already integrated?
7. **Audit history:** Has the protocol been exploited? How was it handled?

## Additional Resources

- [Wormhole Documentation](https://wormhole.com/docs)
- [Wormhole NTT Deep Dive](https://wormhole.com/blog/deep-dive-wormhole-native-token-transfers-ntt)
- [LayerZero Solana Getting Started](https://docs.layerzero.network/v2/developers/solana/getting-started)
- [Bridge Security Checklist (100+ Checks)](https://www.zealynx.io/blogs/cross-chain-bridge-security-checklist)
- [Chainlink Cross-Chain Security](https://chain.link/education-hub/cross-chain-bridge-vulnerabilities)

## Summary

Bridge integration on Solana requires balancing convenience, security, and user experience. Wormhole's NTT framework has emerged as the standard for new multichain tokens, while LayerZero offers compelling alternatives for existing cross-chain projects. Always prioritize security over speed of integration—the $320M Wormhole exploit demonstrates the catastrophic cost of verification shortcuts. Implement rate limiting, circuit breakers, and comprehensive testing before mainnet launch.
