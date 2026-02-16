---
pack: solana
topic: "Escrow Patterns"
decision: "How do I build secure escrow on Solana?"
confidence: 8/10
sources_checked: 40
last_updated: "2026-02-16"
---

# Escrow Patterns

> **Decision:** How do I build secure escrow on Solana?

## Context

Escrow is foundational to Web3 — it's how you build trust without intermediaries. Whether you're building a marketplace, OTC desk, vesting system, or milestone payment platform, escrow enables atomic, trustless exchanges between parties who don't trust each other. On Solana, escrow patterns are ubiquitous: NFT marketplaces use them for buy/sell offers, DeFi protocols use them for token swaps, and DAOs use them for time-locked treasury management.

Solana's account model makes escrow fundamentally different from EVM chains. Instead of contracts holding tokens directly, Solana uses Program Derived Addresses (PDAs) as authorities over token accounts. This means your escrow program doesn't "own" tokens — it controls them through cryptographic derivation. Understanding this distinction is critical: PDAs have no private keys, are deterministic (same seeds = same address), and can only be signed by the program that derived them. This makes PDAs perfect for escrow: funds are provably locked until programmatic conditions are met.

The most common vulnerability in Solana escrow programs isn't reentrancy (like Ethereum) — it's missing signer checks, PDA validation failures, and account reinitialization attacks. Solana's parallel execution model and account-based architecture introduce unique attack vectors. You can't just port an EVM escrow contract; you need to understand rent exemption, account closure, cross-program invocations (CPIs), and how token account ownership interacts with PDAs.

## Options

### 1. PDA-Owned Token Escrow (Standard Pattern)

The canonical Solana escrow pattern: create a vault token account with a PDA as both the account address and authority. The initializer deposits tokens into this vault, and the program controls when they're released.

**How it works:**
- Initializer creates an `EscrowAccount` (state) and a `Vault` (token account)
- Vault is derived as a PDA using seeds like `[b"vault", escrow.key()]`
- Tokens are transferred from initializer to vault via SPL Token program
- Taker triggers exchange; program uses PDA authority to sign CPI to transfer tokens
- On cancellation, initializer can reclaim tokens (program signs with PDA)

**Best for:** Simple token swaps, marketplace offers, OTC trading

**Example structure:**
```rust
pub struct EscrowAccount {
    pub initializer: Pubkey,
    pub initializer_token: Pubkey,
    pub expected_amount: u64,
    pub vault_bump: u8,
}
```

### 2. Time-Locked Escrow (Vesting/Unlock)

Escrow that releases tokens based on time conditions using Solana's on-chain clock. Common for team vesting, investor lockups, and milestone-based payments.

**How it works:**
- Similar to standard escrow, but adds `unlock_time: i64` field
- Uses `Clock::get()?.unix_timestamp` to check current time
- Enforces `current_time >= unlock_time` before allowing withdrawals
- Can implement cliffs (no tokens until date) or linear vesting (gradual unlock)

**Best for:** Team vesting, investor lockups, LP token locks, treasury timelocks

**Key considerations:**
- Clock can drift slightly; don't rely on exact second precision
- Consider using slot numbers instead of timestamps for more predictability
- Implement partial unlocks for linear vesting (calculate vested amount on-chain)

### 3. Atomic Swap Escrow (Two-Sided)

Both parties deposit tokens into escrow simultaneously, and the swap executes atomically when both deposits are confirmed.

**How it works:**
- Both maker and taker have separate vault PDAs
- Maker deposits Token A → Vault A
- Taker deposits Token B → Vault B
- Single instruction executes both transfers atomically
- If either side fails, entire transaction reverts (no partial states)

**Best for:** DEX-style swaps, peer-to-peer token exchanges, cross-chain bridges

**Trade-off:** More complex state management, higher compute units, but safer (no front-running)

### 4. Milestone-Based Escrow (Multi-Party)

Escrow that releases funds based on completion of milestones, often with third-party validation or DAO votes.

**How it works:**
- Escrow tracks multiple milestones with separate amounts
- Requires approvals from designated validators or governance
- Partial releases as milestones complete
- Dispute resolution via oracle or on-chain vote

**Best for:** Freelance payments, grant distributions, service contracts

**Complexity:** High — requires oracle integration or governance mechanisms

### 5. NFT Escrow (Non-Fungible)

Same PDA pattern, but for NFTs (SPL tokens with supply = 1). Common in NFT marketplaces for buy/sell offers.

**How it works:**
- Seller deposits NFT into escrow vault
- Buyer sends payment (SOL or SPL token) to trigger transfer
- Escrow atomically swaps NFT for payment
- Royalties paid via CPI to Metaplex Token Metadata program

**Best for:** NFT marketplaces, NFT-gated access, NFT-backed loans

**Gotcha:** Must handle Metaplex metadata accounts, royalty enforcement, and collection verification

## Key Trade-offs

| Pattern | Complexity | Gas Cost | Security Risk | Use Case |
|---------|-----------|----------|---------------|----------|
| **PDA-Owned Token** | Low | ~0.002 SOL | Low (if signer checks correct) | Basic swaps, marketplace offers |
| **Time-Locked** | Medium | ~0.003 SOL | Medium (clock manipulation rare) | Vesting, lockups |
| **Atomic Swap** | High | ~0.005 SOL | Low (atomic = no partial failure) | DEX, P2P swaps |
| **Milestone-Based** | Very High | ~0.01+ SOL | High (oracle/governance risk) | Freelance, grants |
| **NFT Escrow** | Medium | ~0.004 SOL | Medium (royalty enforcement complex) | NFT marketplaces |

**Rent costs:** All escrow accounts must be rent-exempt (~0.002 SOL per account). Factor this into initialization costs and ensure proper reclamation on closure.

**Cancellation:** Always implement a cancel instruction. Without it, funds can be permanently locked if taker never appears. Ensure only initializer can cancel.

## Recommendation

**Start with PDA-owned token escrow** unless you specifically need time locks or atomic swaps. It's battle-tested, well-documented, and the foundation of most Solana dApps. Use the Anchor framework for automatic security checks and cleaner code.

**Use time-locked escrow for vesting** but beware of clock drift. For investor-grade vesting, consider audited platforms like Streamflow or Bonfida Token Vesting rather than rolling your own.

**Avoid milestone-based escrow** unless you have a robust oracle or governance system. The complexity outweighs benefits for most projects. Use a trusted platform like Solana Escrow instead.

**For NFT marketplaces**, study existing implementations (Tensor, Magic Eden) before building from scratch. Royalty enforcement and metadata handling have many edge cases.

### Implementation Checklist

- [ ] **PDA derivation:** Use deterministic seeds, store bump seeds
- [ ] **Signer checks:** Verify `is_signer` on all state-changing instructions
- [ ] **Owner checks:** Validate account owners match expected program/SPL Token
- [ ] **Rent exemption:** Ensure all accounts are rent-exempt on creation
- [ ] **Account closure:** Return rent to initializer when escrow completes/cancels
- [ ] **Integer overflow:** Use checked math (`checked_add`, `checked_sub`)
- [ ] **Reinitialization:** Add `is_initialized` flag or use Anchor's `init` constraint
- [ ] **Token-2022 compatibility:** Test with Token Extensions if supporting new tokens

## Lessons from Production

### Real Vulnerabilities

1. **Wormhole Bridge Hack ($325M):** Missing signature verification allowed attacker to mint arbitrary tokens. Lesson: Always verify signers in escrow, especially for bridge programs.

2. **Orderly Network Withdrawal Exploit:** Withdrawals could be stolen due to missing account ownership checks. Lesson: Validate that vault accounts match expected PDAs and haven't been swapped.

3. **Account Reinitialization Attacks:** Escrow accounts closed without zeroing data could be reinitialized with stale state. Lesson: Always zero account data on closure or use Anchor's `close` constraint.

4. **Integer Overflow in Release Builds:** Rust's default checked math only works in debug mode. Lesson: Use `overflow-checks = true` in Cargo.toml release profile or explicit checked math.

5. **Token Account Closure Race Condition:** If vault token account is closed before escrow state, rent goes to wrong recipient. Lesson: Close accounts in reverse order of creation (state last).

### Common Mistakes

- **Forgetting to check vault authority:** Attacker creates their own vault with escrow's PDA seeds but different authority.
  - **Fix:** Validate vault authority matches escrow PDA in constraints.

- **Using transfer instead of transfer_checked:** Doesn't verify token mint, allowing wrong token deposits.
  - **Fix:** Always use `transfer_checked` with explicit mint validation.

- **Not handling rent reclamation:** Users lose rent fees when escrow completes.
  - **Fix:** Close all accounts and return rent to initializer.

- **Hardcoding expected amounts:** Prevents partial fills or price adjustments.
  - **Fix:** Store expected amounts in escrow state, allow initializer to update before taker acceptance.

- **No expiration mechanism:** Escrows live forever, cluttering state.
  - **Fix:** Add optional `expiry_slot` and allow anyone to close expired escrows.

### Architecture Patterns

**Single-instruction swap (recommended):**
```rust
// Maker deposits → Taker triggers swap in one TX
// Fewer transactions = fewer failure points
pub fn accept_and_swap(ctx: Context<Swap>) -> Result<()>
```

**Multi-instruction swap (avoid unless necessary):**
```rust
// Maker deposits → Taker deposits → Third party triggers
// More complex state, higher failure risk
```

**Rent optimization:**
```rust
// Close vault and escrow in same instruction to reclaim max rent
// Order: close vault token account → close escrow state account
```

## Sources

- [Block Magnates: Write Your First Solana Escrow Contract with Anchor](https://blog.blockmagnates.com/the-ultimate-guide-to-building-an-escrow-contract-on-solana-with-anchor-ceca1811bfd2) — Comprehensive guide covering trust model, PDA-as-authority pattern, and step-by-step Anchor implementation
- [ironaddicteddog/anchor-escrow](https://github.com/ironaddicteddog/anchor-escrow) — Reference implementation showing vault PDA pattern with cancel/exchange flows
- [HackMD: Anchor Example Escrow Program](https://hackmd.io/@ironaddicteddog/anchor_example_escrow) — Detailed explanation of PDA vault creation vs authority delegation
- [TURBIN3: Build an Escrow Program on Solana](https://www.youtube.com/watch?v=x7OoYpoWAVM) — Mike MacCana's video tutorial (1hr 53min) demonstrating that "most dApps are variations on escrow"
- [Paul Smith: Building Trustless Escrow on Solana](https://medium.com/@paullysmith.sol/building-a-trustless-escrow-contract-on-solana-with-anchor-4e03c4d2ccc0) — Token-2022 compatible implementation with automated settlement patterns
- [Helius: Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security) — Attack vectors, common vulnerabilities, and mitigation strategies
- [QuillAudits: Solana Smart Contract Auditing Guide](https://www.quillaudits.com/blog/smart-contract/solana-smart-contract-auditing-guide) — Security techniques covering Wormhole hack case study
- [Colosseum Forum: Common Solana Vulnerabilities](https://colosseum.com/agent-hackathon/forum/3732) — Missing signer checks, PDA validation, integer overflow, reinitialization attacks
- [Sherlock Audit: Orderly Network Withdrawal Exploit](https://github.com/sherlock-audit/2024-09-orderly-network-solana-contract-judging/issues/55) — Real vulnerability allowing escrow withdrawal theft
- [Bhagya Rana: Token Vesting Contract Using PDAs](https://medium.com/@bhagyarana80/how-i-designed-a-token-vesting-contract-on-solana-using-program-derived-addresses-9170c36bd3bf) — Time-lock logic and clock-based vesting patterns
- [Sablier: How to Timelock Tokens on Solana](https://blog.sablier.com/how-to-timelock-tokens-on-solana/) — Production-grade timelock implementation details
- [Bonfida Token Vesting](https://github.com/solify020/token-vestment) — Audited vesting implementation with mainnet deployment
- [Streamflow Finance](https://streamflow.finance/) — Token distribution platform showing enterprise-grade escrow patterns

## Gaps & Caveats

- **Limited production vulnerability data:** Most Solana exploits target lending protocols or bridges. Pure escrow-specific hacks are rare in public disclosures, making it harder to learn from failures. The Orderly Network case is one of few documented examples.

- **Token-2022 edge cases:** New Token Extensions (transfer hooks, confidential transfers) may introduce unforeseen escrow complications. Most guides focus on SPL Token (original standard). Test thoroughly with Token-2022.

- **Cross-program composition risks:** When escrow programs interact with other protocols (DEXs, lending, staking), the attack surface expands dramatically. No comprehensive guide covers multi-protocol escrow security.

- **Rent reclamation after validator changes:** Solana's rent economics may change with network upgrades. Current patterns assume ~0.002 SOL per account, but this could shift.

- **Dispute resolution patterns underspecified:** Most guides show happy-path escrow (both parties cooperate). Real-world disputes, arbitration, and partial refunds are rarely covered in depth.

- **MEV implications:** Solana's Jito ecosystem introduces MEV. Escrow transactions could be front-run or sandwiched if not designed carefully (especially atomic swaps). Limited documentation on MEV-resistant escrow design.

- **Account compression trade-offs:** New compressed accounts (via ZK compression) could drastically reduce escrow costs, but no production examples exist yet. Patterns may shift as this technology matures.

**Confidence rating rationale (8/10):** High confidence in standard PDA escrow patterns (well-documented, battle-tested). Medium confidence in advanced patterns (time-locks, milestones) due to fewer production examples. Lower confidence in Token-2022 edge cases and MEV implications due to emerging technology.