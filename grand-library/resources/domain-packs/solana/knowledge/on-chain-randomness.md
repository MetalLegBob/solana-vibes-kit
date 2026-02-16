---
pack: solana
topic: "On-Chain Randomness"
decision: "How do I get verifiable randomness on Solana?"
confidence: 8/10
sources_checked: 25
last_updated: "2026-02-16"
---

# On-Chain Randomness on Solana

## The Problem

Generating true randomness on Solana presents a fundamental challenge: all validators must produce identical results to maintain consensus. This reproducibility requirement prevents programs from accessing local entropy sources, as other nodes couldn't verify that values were generated fairly. Any deterministic on-chain computation can be predicted by front-runners who can simulate transactions before submitting them.

## Solution Overview

There are four main approaches to randomness on Solana, each with distinct security trade-offs:

1. **Oracle-based VRF** (Switchboard, ORAO, Pyth Entropy) - External oracles provide verifiable randomness
2. **Slot Hash** (RecentSlotHashes sysvar) - Use blockchain slot hashes as entropy
3. **Commit-Reveal Schemes** - Multi-party protocols where participants commit before revealing
4. **MagicBlock Ephemeral VRF** - Free VRF on Ephemeral Rollups (specialized use case)

## Option 1: Oracle-Based VRF (Recommended for Most Use Cases)

### Switchboard VRF

**How it works:** Switchboard uses a commit-reveal pattern where neither party knows the outcome until after commitment. The oracle generates randomness off-chain using secure hardware (SGX enclaves) and provides cryptographic proofs that can be verified on-chain.

**Security Model:**
- Uses Ed25519 VRF cryptography
- Randomness generated in trusted execution environments (TEEs)
- Proof verification happens on-chain
- Cannot be manipulated by validators or users
- Requires trust in Switchboard oracle network

**Cost:** ~0.002-0.007 SOL per request (reduced from original 0.1 SOL)

**Latency:** Several seconds to minutes (oracle must generate and submit proof)

**Best for:** Gaming, lotteries, NFT drops, any application where fairness is critical and latency of a few seconds is acceptable.

**Implementation:**
```rust
// Basic Switchboard VRF request pattern
pub struct RequestRandomness<'info> {
    #[account(mut)]
    pub randomness_account: AccountLoader<'info, RandomnessAccountData>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// The randomness result is delivered via callback to your program
```

**Key Considerations:**
- Your program must implement a callback instruction that Switchboard calls when randomness is ready
- Need to fund the request with wSOL
- Latest version uses "on-demand" model with improved reliability
- Multiple VRF accounts can be pooled for higher throughput

**Documentation:** https://docs.switchboard.xyz/randomness

### ORAO VRF

**How it works:** Multi-node VRF oracle based on EDDSA signatures. Byzantine quorum of fulfillment nodes provides randomness.

**Security Model:**
- Proof of Authority consensus among oracle nodes
- Ed25519-based VRF
- Multiple independent nodes must agree
- Cannot be manipulated by single oracle

**Cost:** 0.001 SOL per request (cheapest oracle option)

**Latency:** 4-20 seconds (sub-second possible in optimal conditions)

**Best for:** High-volume applications where cost matters, gaming with frequent randomness needs.

**Key Differences from Switchboard:**
- Faster average response time
- Lower cost
- Active development with good developer support
- Uses multi-node consensus vs single oracle with SGX

**Implementation:** Similar CPI pattern to Switchboard, SDK available at https://github.com/orao-network/solana-vrf

### Pyth Entropy

**How it works:** Newer randomness solution from Pyth Network using commit-reveal scheme with hash-chain approach.

**Cost:** Variable, newer service with evolving pricing

**Status:** Launched Q1 2024, processed 265,000 requests through Q2 2024 with $19,000 revenue (average ~$0.07 per request)

**Best for:** Applications already using Pyth price feeds, cross-chain randomness needs (Pyth supports 70+ blockchains)

**Key Features:**
- Part of larger Pyth oracle ecosystem
- Pull-based oracle model
- Newer, less battle-tested than Switchboard/ORAO

**Documentation:** https://www.pyth.network/entropy

## Option 2: Slot Hash (Native, But Dangerous)

### RecentSlotHashes Sysvar

**How it works:** Access the `SlotHashes` sysvar which contains recent slot hashes. These hashes can be used as entropy source.

**Security Model - CRITICAL WARNINGS:**
- **Validator Manipulation:** Block producers can see and potentially withhold blocks if randomness is unfavorable
- **Predictable:** Anyone can read the slot hash before your transaction executes
- **MEV Vulnerable:** Sophisticated actors can front-run or sandwich your transaction
- **Only partially random:** Slot hashes are deterministic based on block contents

**Cost:** Free (native sysvar access)

**Latency:** Instant (same transaction)

**ONLY safe for:**
- Low-value randomness where manipulation doesn't matter
- Secondary entropy mixed with user-provided secrets
- Situations where all participants see the result simultaneously (no front-running possible)

**UNSAFE for:**
- Lotteries (validator can manipulate winner)
- High-value games (players can choose whether to submit transaction after seeing outcome)
- NFT attribute assignment (bots can cherry-pick)
- Anything where economic value > transaction fee

**Implementation:**
```rust
use solana_program::sysvar::slot_hashes::{SlotHashes, ID as SLOT_HASHES_ID};

pub fn get_slot_hash_randomness(
    slot_hashes: &SlotHashes,
    user_seed: &[u8],
) -> Result<[u8; 32]> {
    // Get most recent slot hash
    let recent_slot_hash = slot_hashes.first()
        .ok_or(ProgramError::InvalidAccountData)?;

    // Mix with user-provided seed to prevent pre-computation
    let mut hasher = sha3::Keccak256::new();
    hasher.update(&recent_slot_hash.hash.to_bytes());
    hasher.update(user_seed);
    Ok(hasher.finalize().into())
}
```

**Mitigation:** Can be slightly improved by:
1. Requiring users to commit to actions before hash is revealed
2. Mixing multiple slot hashes from different times
3. Combining with user-provided secrets
4. Using future slot hash (but this has other issues)

## Option 3: Commit-Reveal Schemes

**How it works:** Multi-phase protocol where participants commit to secret values before they're revealed and combined.

**Typical Flow:**
1. **Commit Phase:** Each participant submits `hash(secret_value)`
2. **Wait Period:** After all commits are in, no new commits accepted
3. **Reveal Phase:** Each participant reveals their `secret_value`
4. **Combine:** All revealed values are hashed together to produce final randomness

**Security Model:**
- No single party can manipulate the final result
- Requires all participants to reveal (or have slashing mechanism)
- Still vulnerable if one party can choose to abort after seeing others' reveals

**Cost:** Free (no oracle fees), but requires multiple transactions per participant

**Latency:** Requires multiple transaction rounds (typically 2-3 slot times minimum)

**Best for:**
- Multi-player games where all players must participate
- Decentralized lotteries where participants are the randomness source
- Situations where collusion between participants is unlikely

**Challenges:**
- **Last Revealer Problem:** The last participant to reveal can see all other values and choose whether to reveal (abort attack)
- **Griefing:** Participants can refuse to reveal, stalling the protocol
- **Coordination Complexity:** Requires careful state management

**Solutions to Last Revealer:**
- Require deposits that are slashed if participant doesn't reveal
- Use timelock encryption (participants encrypt reveals, decrypt keys released later)
- Combine with VDF (Verifiable Delay Function) to ensure no one can see final result early

**Implementation Pattern:**
```rust
// Phase 1: Commit
pub fn commit_secret(ctx: Context<CommitSecret>, commitment: [u8; 32]) -> Result<()> {
    require!(
        ctx.accounts.game.phase == Phase::Committing,
        ErrorCode::WrongPhase
    );

    ctx.accounts.player_commitment.commitment = commitment;
    ctx.accounts.player_commitment.has_revealed = false;
    Ok(())
}

// Phase 2: Reveal
pub fn reveal_secret(ctx: Context<RevealSecret>, secret: Vec<u8>) -> Result<()> {
    require!(
        ctx.accounts.game.phase == Phase::Revealing,
        ErrorCode::WrongPhase
    );

    // Verify hash(secret) == stored commitment
    let hash = sha3::Keccak256::digest(&secret);
    require!(
        hash.as_slice() == ctx.accounts.player_commitment.commitment,
        ErrorCode::InvalidReveal
    );

    // Accumulate into final randomness
    ctx.accounts.game.accumulate_randomness(&secret)?;
    Ok(())
}
```

**Real-world usage:** Proposed in Solana SPL (Issue #2691), used in some on-chain games, Flow blockchain has native commit-reveal randomness.

## Option 4: MagicBlock Ephemeral VRF

**How it works:** VRF provided on MagicBlock's Ephemeral Rollups (temporary execution environments for gaming).

**Cost:** FREE (as of November 2025 announcement)

**Security Model:**
- Open-source and audited
- Ed25519-based VRF
- Only works within Ephemeral Rollups, not base Solana

**Best for:**
- Gaming applications using MagicBlock's infrastructure
- High-frequency randomness needs where oracle costs would be prohibitive
- Temporary game sessions (ephemeral rollups designed for games)

**Limitations:**
- Specialized infrastructure, not general-purpose Solana
- Requires using MagicBlock's Ephemeral Rollup system
- Newer technology, less battle-tested

**Documentation:** https://www.magicblock.xyz/blog/unlocking-free-vrfs-on-solana

## Use Case Decision Matrix

### High-Value DeFi / Lotteries
**Use:** Oracle VRF (Switchboard or ORAO)
**Why:** Cannot risk manipulation, need cryptographic proof of fairness
**Cost:** Worth paying 0.001-0.007 SOL for security

### Fast-Paced Gaming (100+ requests/minute)
**Consider:** ORAO (fastest, cheapest) or MagicBlock (if using their infrastructure)
**Alternative:** Switchboard with VRF account pooling

### NFT Attribute Assignment
**Use:** Oracle VRF
**Why:** Slot hash would allow bots to cherry-pick rare traits

### Low-Stakes Gaming (<$1 value per game)
**Could use:** Slot hash + user seed, but still risky
**Better:** ORAO for 0.001 SOL if you can afford it

### Multi-Player Consensus
**Use:** Commit-reveal with slashing
**Why:** Players are the entropy source, no oracle fees

### Randomness in DeFi Vaults/Derivatives
**Use:** Oracle VRF only
**Why:** Financial applications require highest security standard

## Security Checklist

Before deploying randomness in production, verify:

- [ ] **Economic value at risk < cost to manipulate?** If a validator can profit more from manipulation than they'd lose in fees/reputation, slot hash is unsafe
- [ ] **Can users front-run?** If users can see randomness before committing, they can selectively participate
- [ ] **Is timing critical?** Slower oracle VRF won't work for real-time gaming (use MagicBlock or optimistic approach)
- [ ] **Do you have fallback mechanism?** What happens if oracle fails to deliver randomness?
- [ ] **Are you verifying proofs on-chain?** Don't just trust the oracle, verify the VRF proof
- [ ] **Could validator withhold blocks?** With slot hash, block producer can choose not to publish if outcome is unfavorable
- [ ] **Are you mixing entropy sources?** Never use timestamp, clock, or single slot hash alone

## Cost Comparison Summary (as of Feb 2026)

| Solution | Cost per Request | Latency | Manipulation Risk |
|----------|-----------------|---------|-------------------|
| Switchboard VRF | 0.002-0.007 SOL | Seconds-Minutes | Very Low (requires breaking TEE) |
| ORAO VRF | 0.001 SOL | 4-20 seconds | Low (requires colluding oracles) |
| Pyth Entropy | ~0.07 USD average | Seconds | Low (newer, less data) |
| MagicBlock VRF | FREE | Sub-second | Medium (requires trust in ER) |
| Slot Hash | FREE | Instant | **HIGH** - trivially manipulable |
| Commit-Reveal | ~2-3x transaction fees | Multiple slots | Medium (last revealer problem) |

## Common Pitfalls

### ❌ DON'T: Use Clock Sysvar
```rust
// NEVER DO THIS - completely predictable
let clock = Clock::get()?;
let random = clock.unix_timestamp % 100; // NOT RANDOM!
```

### ❌ DON'T: Use Recent Blockhash Alone
```rust
// Validator can manipulate
let blockhash = ctx.accounts.recent_blockhashes.first()?;
```

### ❌ DON'T: Trust User-Provided "Random" Values
```rust
// User can choose favorable values
pub fn play_game(ctx: Context<Play>, user_random: u64) {
    // User will always pass winning numbers!
}
```

### ✅ DO: Use Oracle VRF for Anything Valuable
```rust
// Request Switchboard randomness
let randomness_request = RequestRandomness {
    randomness_account: ctx.accounts.vrf,
    payer: ctx.accounts.player,
    // ...
};

switchboard_on_demand::request_randomness(
    CpiContext::new(
        ctx.accounts.switchboard_program.to_account_info(),
        randomness_request,
    ),
    params,
)?;
```

### ✅ DO: Mix Multiple Entropy Sources
```rust
// Defense in depth - even if one source is weak
let mut hasher = sha3::Keccak256::new();
hasher.update(&vrf_output);  // Primary: Oracle VRF
hasher.update(&user_seed);   // Secondary: User input
hasher.update(&slot_hash);   // Tertiary: Blockchain state
let final_random = hasher.finalize();
```

## Migration Paths

### From Slot Hash to VRF
1. Add oracle VRF as primary randomness source
2. Keep slot hash as secondary entropy (mix both)
3. Gradually increase reliance on VRF
4. Monitor costs and adjust request frequency

### Choosing Between Oracle Providers
**Start with ORAO if:**
- High request volume (cost matters)
- Need faster response times
- Building on Solana only

**Choose Switchboard if:**
- Maximum decentralization required
- Already using Switchboard price feeds
- Need cross-chain randomness (Switchboard supports multiple chains)

**Consider Pyth Entropy if:**
- Already integrated with Pyth oracles
- Need unified oracle solution
- Cross-chain requirements (70+ chains)

## Recent Developments (2024-2026)

- **Switchboard On-Demand** (2024): New architecture with improved reliability and commit-reveal pattern
- **Pyth Entropy Launch** (Q1 2024): New player in randomness market, 265k requests by Q2
- **MagicBlock Free VRF** (Nov 2025): First free VRF solution on Solana (via Ephemeral Rollups)
- **ORAO Multi-Node** (2024): Byzantine quorum upgrade for improved security
- **Switchboard Cost Reduction** (2022-2024): From 0.1 SOL → 0.002 SOL (50x improvement)

## Further Reading

- Switchboard Randomness Tutorial: https://docs.switchboard.xyz/docs-by-chain/solana-svm/randomness/randomness-tutorial
- Adevar Labs Security Analysis: https://adevarlabs.com/blog/on-chain-randomness-on-solana-predictability-manipulation-safer-alternatives-part-1
- ORAO VRF SDK: https://github.com/orao-network/solana-vrf
- Pyth Entropy Docs: https://www.pyth.network/blog/pyth-entropy-random-number-generation-for-blockchain-apps
- Solana VRF Course: https://solana.com/developers/courses/connecting-to-offchain-data/verifiable-randomness-functions
- RFC on Commit-Reveal: https://github.com/solana-labs/solana-program-library/issues/2691

## Bottom Line

**For production applications with any economic value: Use oracle-based VRF.** The cost (0.001-0.007 SOL) is negligible compared to the security risk of manipulation. Slot hash and other "free" methods are only acceptable for low-value, non-competitive scenarios where manipulation doesn't matter.

The choice between Switchboard, ORAO, and Pyth Entropy comes down to:
- **Cost sensitivity** → ORAO (0.001 SOL)
- **Speed requirements** → ORAO (4-20 sec) or MagicBlock (sub-second on ER)
- **Maximum decentralization** → Switchboard (SGX + established network)
- **Ecosystem integration** → Match your existing oracle provider

Never use timestamp, clock, or single slot hash as your only randomness source. If you can't afford oracle fees, implement a proper commit-reveal scheme with slashing mechanisms instead.
