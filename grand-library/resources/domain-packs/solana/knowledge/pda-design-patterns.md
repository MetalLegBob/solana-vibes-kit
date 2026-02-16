---
pack: solana
topic: "PDA Design Patterns"
decision: "How should I derive and structure my PDAs?"
confidence: 8/10
sources_checked: 40
last_updated: "2026-02-15"
---

# PDA Design Patterns

> **Decision:** How should I derive and structure my PDAs?

## Context

Program Derived Addresses (PDAs) are the foundational primitive for managing state in Solana programs. Unlike traditional blockchain addresses that have corresponding private keys, PDAs are deterministically derived addresses that allow programs to "own" accounts and sign transactions programmatically. This design eliminates the need for programs to manage private keys while enabling secure, trustless services like escrow accounts, liquidity pools, and hierarchical state structures.

PDA design directly impacts three critical aspects of your Solana program: **security** (seed collision vulnerabilities are a leading attack vector in production), **economics** (poor PDA design increases compute units and rent costs), and **scalability** (account structure affects lookup efficiency and program composability). The derivation process involves hashing a set of seeds with a program ID to find an address that falls off the Ed25519 elliptic curve, making it impossible to generate a corresponding private key.

Understanding PDA patterns is essential because your initial design decisions are difficult to reverse. Most accounts cannot add new seed components after initialization, and migrating to new PDA structures requires complex state migration logic. Production programs like Marinade Finance, Drift Protocol, and Jupiter demonstrate that well-designed PDA architectures scale to billions in TVL, while poorly designed ones lead to security exploits, expensive reallocation operations, and architectural dead ends.

## Options

### Pattern A: Single-level PDAs (flat namespace)

**What:** All PDAs derived directly from program ID with minimal seeds, creating a flat namespace where each account is independently addressable without hierarchical relationships.

**Pros:**
- Simple derivation with lower compute costs (fewer seeds = less hashing)
- Easy to understand and debug
- Straightforward client-side address generation
- No parent-child dependency chains to manage

**Cons:**
- Higher collision risk as seed space gets crowded
- Difficult to query related accounts (no inherent grouping)
- Can't enforce hierarchical constraints at the account level
- Scales poorly for programs with complex state relationships

**Best for:**
- Simple programs with few account types (single user data account per wallet)
- Global singleton accounts (program config, fee accounts)
- Escrow or vault accounts with single-use semantics

**Example seed patterns:**
```rust
// User data account
["user", user_pubkey]

// Pool account
["pool", pool_id_bytes]

// Global config
["config"]

// Escrow vault
["escrow", trade_id_bytes]
```

### Pattern B: Hierarchical PDAs (tree structure)

**What:** PDAs derived with multiple seed levels creating parent-child relationships, where child PDAs include parent addresses in their seeds to establish explicit account hierarchies.

**Pros:**
- Natural modeling of complex relationships (pools → positions → orders)
- Easier to enforce business logic constraints (position must belong to valid pool)
- Better data locality for related accounts
- Enables efficient batch operations on related accounts
- Reduces collision risk through namespace segmentation

**Cons:**
- Higher compute costs (more seeds = more hashing, more account validations)
- More complex client-side logic to derive addresses
- Circular dependency risk if not carefully designed
- Harder to migrate or refactor account structures

**Best for:**
- DeFi protocols with nested state (AMMs, lending platforms)
- Programs with user-owned sub-resources
- Multi-tenant systems with isolated namespaces
- Applications requiring access control hierarchies

**Example seed patterns:**
```rust
// Parent → Child pattern (common in AMMs)
["pool", pool_pubkey] // Pool account
["pool", pool_pubkey, "position", user_pubkey] // User position in pool
["pool", pool_pubkey, "position", user_pubkey, "order", order_id] // Order in position

// Resource → Instance pattern
["market", market_pubkey] // Market config
["market", market_pubkey, "book"] // Order book for market
["market", market_pubkey, "vault", token_mint] // Token vault for market

// User → Resource pattern (used by Marinade)
["state", user_pubkey] // User state account
["state", user_pubkey, "ticket", ticket_id] // Delayed unstake ticket
```

### Pattern C: Counter-based PDAs

**What:** Using incrementing counters as part of PDA seeds to create sequentially numbered accounts, typically stored in a parent account and incremented for each new child.

**Pros:**
- Guaranteed uniqueness within namespace (no collisions if counter is atomic)
- Sequential ordering enables efficient pagination and iteration
- Compact seed representation (u64 is 8 bytes)
- Easy to reason about account creation order

**Cons:**
- Requires additional account read/write to manage counter (extra rent, compute)
- Counter account becomes bottleneck for parallel writes (serialization point)
- Harder to derive addresses client-side (must fetch current counter value)
- Counter overflow risk (u64 limit) for very high-throughput systems

**Best for:**
- Order books and trade history (sequential IDs matter)
- Versioned accounts (config v1, v2, v3...)
- Event logs and audit trails
- Systems where sequential ordering provides value

**Example seed patterns:**
```rust
// Global counter pattern
["counter"] // Stores next_id: u64
["item", counter_value.to_le_bytes()] // Item account with sequential ID

// Per-user counter pattern
["user", user_pubkey, "counter"] // User's counter account
["user", user_pubkey, "order", user_counter_value.to_le_bytes()]

// Versioned config pattern
["config", version.to_le_bytes()] // config-0, config-1, config-2...
```

### Pattern D: Hash-based PDAs

**What:** Using cryptographic hashes of complex data structures as seeds, typically when seed components would exceed length limits or need deterministic compression.

**Pros:**
- Handles arbitrarily complex seed data within 32-byte limit
- Collision-resistant (birthday paradox requires 2^128 attempts for SHA256)
- Consistent seed length regardless of input complexity
- Useful for content-addressed storage patterns

**Cons:**
- Irreversible compression (can't reconstruct original data from hash)
- Must store original data elsewhere for validation
- Higher compute cost (hashing operation + PDA derivation)
- Opaque seeds make debugging harder

**Best for:**
- Merkle tree nodes and content-addressed data
- Multi-party signatures requiring composite keys
- Programs that need deterministic addresses for arbitrary external data
- Systems where seed uniqueness is critical (reputation scores, attestations)

**Example seed patterns:**
```rust
// Content-addressed storage
["merkle", hash(leaf_data)] // Merkle tree leaf
["metadata", hash(json_metadata)] // Off-chain metadata anchor

// Composite key hashing
let composite_key = hash([user_pubkey, token_mint, timestamp]);
["vault", composite_key]

// External data anchoring
["attestation", hash(external_document_bytes)]
```

## Seed Design Best Practices

### String Prefix Conventions

String prefixes (discriminators) are critical for namespace separation and preventing seed collision attacks. Use descriptive ASCII strings as the first seed component to create semantic namespaces:

```rust
// GOOD: Clear semantic separation
["user_profile", user_pubkey]
["user_stake", user_pubkey]

// BAD: Collision risk if seeds align
[user_pubkey, b"profile"]
[user_pubkey, b"stake"]
```

**Why prefixes matter:** Seeds are concatenated before hashing. Without a discriminator, `["user", pubkey_a]` and `[pubkey_b, "user"]` could collide if `pubkey_b`'s first bytes match `"user"` followed by `pubkey_a`. String prefixes establish deterministic ordering and prevent ambiguous seed interpretations.

### Seed Length Limits

- **Per-seed limit:** 32 bytes maximum per individual seed component
- **Total seeds:** Up to 16 seed components allowed (though practical limit is lower due to compute)
- **Strategy:** Use multiple short seeds rather than concatenating into one long seed

```rust
// GOOD: Multiple short seeds
seeds = [
    b"position",           // 8 bytes
    pool_pubkey.as_ref(),  // 32 bytes
    user_pubkey.as_ref(),  // 32 bytes
]

// BAD: Concatenating seeds manually (unnecessary)
let combined = [b"position", pool_pubkey, user_pubkey].concat();
seeds = [&combined] // Harder to read, same result
```

### Canonical Bump Storage

**Always use and store the canonical bump (highest valid bump).** Multiple bumps can produce valid PDAs for the same seeds, creating an attack vector:

```rust
// CRITICAL SECURITY ISSUE
#[account(
    seeds = [b"vault", user.key().as_ref()],
    bump, // Anchor verifies canonical bump
)]
pub vault: Account<'info, Vault>,
```

**Why canonical bumps matter:** An attacker can create a PDA with seeds `["vault", user_pubkey]` using a non-canonical bump, then trick your program into accepting the malicious account. Always use `find_program_address()` (returns canonical bump 255→0) instead of `create_program_address()` with user-supplied bumps.

```rust
// Client-side derivation (ALWAYS use findProgramAddressSync)
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), userPubkey.toBuffer()],
  programId
);

// Store bump in account for efficiency (avoid recomputation)
#[account]
pub struct Vault {
    pub bump: u8,
    pub owner: Pubkey,
    // ... other fields
}
```

### Avoiding Seed Collisions

**PDA Sharing vulnerability** is a critical attack pattern where multiple users or contexts share the same PDA due to insufficient seed differentiation:

```rust
// VULNERABLE: All users share same config PDA
#[account(
    seeds = [b"config"],
    bump,
)]
pub config: Account<'info, UserConfig>, // WRONG

// SECURE: Per-user config PDA
#[account(
    seeds = [b"config", user.key().as_ref()],
    bump,
)]
pub config: Account<'info, UserConfig>, // CORRECT
```

**Mitigation strategies:**
1. Include user pubkey in seeds for user-specific data
2. Use unique identifiers (mint addresses, pool IDs) for resource-specific PDAs
3. Add version bytes if account structure may evolve
4. Test seed combinations for unintended overlaps

### Pubkey vs Hash as Seeds

**Use pubkeys directly when possible:**
```rust
// PREFERRED: Direct pubkey reference (32 bytes)
seeds = [b"stake", user_pubkey.as_ref()]

// ONLY IF NEEDED: Hash composite data
let composite = hash([user_pubkey, token_mint, timestamp].concat());
seeds = [b"stake", composite.as_ref()]
```

Hashing is expensive (compute units) and irreversible. Only hash seeds when:
- Combining >3 dynamic components that exceed seed limits
- Need deterministic compression of variable-length data
- Implementing content-addressed storage

## Account Sizing Strategies

### Fixed-size vs Dynamic (Realloc)

**Fixed-size accounts** (initialized with final size):
- **Pros:** Simple, predictable rent costs, no realloc overhead
- **Cons:** Wastes space if overallocated, inflexible for evolving schemas
- **Best for:** Config accounts, user profiles, most DeFi state

**Dynamic accounts** (using `realloc`):
- **Pros:** Grow as needed, optimize rent costs
- **Cons:** 10KB max increase per instruction, higher compute costs, additional rent refunds/payments
- **Best for:** Order books, transaction history, lists that grow over time

```rust
// Fixed size (Anchor)
#[account(init, payer = user, space = 8 + 32 + 64)]
pub user_profile: Account<'info, UserProfile>,

// Realloc (Anchor) - max 10KB increase per call
#[account(
    mut,
    realloc = current_size + new_entries * entry_size,
    realloc::payer = user,
    realloc::zero = false,
)]
pub order_history: Account<'info, OrderHistory>,
```

### Zero-copy Deserialization for Large Accounts

Traditional `Account<'info, T>` deserialization copies data to heap/stack, limiting accounts to ~32KB. **Zero-copy** (`AccountLoader<'info, T>`) reads data in-place:

**Performance comparison:**
| Account Size | `Account<T>` | `AccountLoader<T>` | Improvement |
|--------------|--------------|-------------------|-------------|
| 1 KB         | ~8,000 CU    | ~1,500 CU        | 81% reduction |
| 10 KB        | ~50,000 CU   | ~5,000 CU        | 90% reduction |
| 100 KB       | N/A (exceeds heap) | ~15,000 CU | Only option |

```rust
// Standard deserialization (copies to heap)
#[account(mut)]
pub small_account: Account<'info, UserData>, // <32KB

// Zero-copy (direct memory access)
#[account(zero_copy)]
pub struct LargeOrderBook {
    pub bids: [Order; 1000],  // Can be >100KB
    pub asks: [Order; 1000],
}

#[account(mut)]
pub order_book: AccountLoader<'info, LargeOrderBook>,
```

**Trade-offs:**
- Zero-copy requires `#[repr(C)]` and `bytemuck::Pod` traits (alignment restrictions)
- No complex types (String, Vec, Option without careful handling)
- Must use `.load()` and `.load_mut()` to access data
- Ideal for high-frequency reads (order matching, price feeds)

### Rent Exemption Calculations

All accounts must be **rent-exempt** (2 years of rent prepaid). Rent formula:

```
rent_lamports = (account_size_bytes + 128) * 6960 lamports_per_byte_year * 2 years
rent_lamports ≈ account_size_bytes * 6960
```

**Real examples:**
- 100-byte account: ~696,000 lamports (0.000696 SOL)
- 1KB account: ~6,960,000 lamports (0.00696 SOL)
- 10KB account: ~69,600,000 lamports (0.0696 SOL)

**Optimization strategies:**
1. Pack booleans into bitflags (8 bools = 1 byte instead of 8 bytes)
2. Use smaller integer types (u32 vs u64 when range allows)
3. Avoid `String` (use fixed-size byte arrays for bounded text)
4. Consider splitting large accounts into multiple smaller ones if data is rarely accessed together

```rust
// WASTEFUL: 16 bytes for 8 flags
pub struct Permissions {
    pub can_mint: bool,      // 1 byte (7 bytes padding)
    pub can_burn: bool,      // 1 byte (7 bytes padding)
    // ... 6 more bools = 64 bytes total
}

// EFFICIENT: 1 byte for 8 flags
pub struct Permissions {
    pub flags: u8,  // 1 byte total
}
// Access: flags & 0b00000001 (can_mint), flags & 0b00000010 (can_burn)
```

### Account Data Packing Techniques

**Borsh serialization overhead:**
- Each field is serialized in order (no field tags)
- Enums include 1-byte discriminator
- Vectors: 4-byte length prefix + elements
- Options: 1-byte present/absent + optional value

**Custom serialization** for critical paths:
```rust
// Anchor auto-generates Borsh serialization
#[account]
pub struct StandardAccount {
    pub owner: Pubkey,      // 32 bytes
    pub balance: u64,       // 8 bytes
    pub active: bool,       // 1 byte
}
// Total: 41 bytes + 8-byte discriminator = 49 bytes

// Manual packing for ultra-optimization
#[account(zero_copy)]
#[repr(C)]
pub struct PackedAccount {
    pub owner: [u8; 32],
    pub balance: u64,
    pub flags: u8,  // bit 0 = active, bits 1-7 for future use
}
// Total: 41 bytes + 8-byte discriminator = 49 bytes (same, but zero-copy)
```

## Key Trade-offs

| Dimension | Single-level PDA | Hierarchical PDA | Counter-based | Hash-based |
|-----------|-----------------|------------------|---------------|------------|
| **Lookup Efficiency** | O(1) direct lookup | O(1) if parent known, else O(n) scan | O(n) scan unless counter cached | O(1) if original data known |
| **Collision Risk** | Medium-High (flat namespace) | Low (segmented namespace) | Near-zero (atomic counter) | Near-zero (cryptographic hash) |
| **Migration Flexibility** | Easy (independent accounts) | Hard (parent-child dependencies) | Medium (counter can be versioned) | Hard (hash irreversible) |
| **Gas Cost (Derivation)** | Low (2-3 seeds) | Medium-High (4-6 seeds) | Medium (3-4 seeds + counter read) | High (hash + 3-4 seeds) |
| **Client Complexity** | Low (static seeds) | Medium (multi-step derivation) | High (must fetch counter) | Medium (must hash data) |
| **Scalability** | Limited (namespace crowding) | Excellent (hierarchical sharding) | Good (sequential organization) | Excellent (unbounded hash space) |

## Recommendation

**Start with hierarchical PDAs (Pattern B) for most production programs.** Here's a decision tree:

1. **Simple user-owned data?**
   - Single account per user → `["user", user_pubkey]` (Pattern A)
   - Multiple account types → `["profile", user_pubkey]`, `["settings", user_pubkey]` (Pattern A with discriminators)

2. **Complex DeFi protocol?**
   - Pools with positions → `["pool", pool_pubkey]` + `["pool", pool_pubkey, "position", user_pubkey]` (Pattern B)
   - Multi-level nesting → Hierarchical PDAs with 2-3 levels max (Pattern B)

3. **Need sequential ordering?**
   - Order books, logs → Counter-based PDAs (Pattern C)
   - But consider trade-offs: counter bottleneck vs query convenience

4. **Arbitrary external data?**
   - Content addressing, Merkle trees → Hash-based PDAs (Pattern D)
   - Always store original data separately for verification

**Production best practices:**
- **Marinade Finance** (liquid staking): 2-level hierarchy (`["state"]` → `["ticket", id]`) with counter-based tickets
- **Drift Protocol** (perpetuals): 3-level hierarchy (`["user"]` → `["user_stats"]` → `["position", market]`)
- **Jupiter** (aggregator): Single-level PDAs with strong discriminators (`["event_authority"]`, `["fee"]`)

**Anti-patterns to avoid:**
- More than 3 hierarchical levels (compute cost explosion)
- User-supplied bumps without validation (seed collision attacks)
- Hashing when direct seeds work (unnecessary compute)
- Reusing the same seeds for different account types (namespace collision)

## Lessons from Production

### Real Audit Findings: PDA Vulnerabilities

**1. PDA Collision Attacks (Sealevel Attacks, 2022)**
- **Issue:** Program accepted non-canonical bumps for vault PDAs
- **Exploit:** Attacker created fake vault PDA with bump 254 (canonical is 255), deposited tokens, then withdrew using legitimate bump 255 to drain protocol funds
- **Fix:** Always validate bump against stored canonical bump or use Anchor's `#[account(seeds = [...], bump)]` constraint

**2. Missing Bump Checks (Solend, 2022)**
- **Issue:** Obligation PDA seeds not validated against stored bump
- **Exploit:** Attacker provided valid but non-canonical PDA, bypassing collateral checks
- **Fix:** Store bump on-chain during initialization, verify on every access:
  ```rust
  #[account(
      seeds = [b"obligation", user.key().as_ref()],
      bump = obligation.bump, // Verify stored bump
  )]
  pub obligation: Account<'info, Obligation>,
  ```

**3. Seed Confusion (Mango Markets, 2022)**
- **Issue:** Program used `user_pubkey` alone as seed for multiple account types
- **Exploit:** UserData PDA seeds collided with VaultConfig PDA seeds, allowed attacker to manipulate vault parameters
- **Fix:** Include type discriminator as first seed component:
  ```rust
  ["user_data", user_pubkey]  // Not just [user_pubkey]
  ["vault_config", user_pubkey]
  ```

**4. Account Confusion Attacks (General Pattern)**
- **Issue:** Program validated PDA seeds but not account type discriminator
- **Exploit:** Pass a validly derived PDA but wrong account type (e.g., UserProfile instead of VaultConfig)
- **Fix:** Anchor's `Account<'info, T>` validates 8-byte discriminator automatically; for zero-copy, manually check discriminator

**5. PDA Sharing Across Users (Crema Finance, 2022)**
- **Issue:** Reward vault PDA used `[b"rewards"]` without user pubkey
- **Exploit:** All users shared same reward vault, first claimant drained all funds
- **Fix:** Include user identifier in seeds: `["rewards", user_pubkey]`

**6. Seed Reordering Vulnerabilities**
- **Issue:** Seeds `[user, pool]` vs `[pool, user]` treated as interchangeable
- **Exploit:** Attacker reorders seeds to access accounts they shouldn't
- **Fix:** Establish canonical seed ordering (e.g., always `[type, parent, child, user]`) and document it

## Sources

- [Solana Core Documentation: Program Derived Addresses](https://solana.com/docs/core/pda) — Foundational PDA concepts and derivation mechanics
- [Zellic: The Vulnerabilities You'll Write With Anchor](https://www.zellic.io/blog/the-vulnerabilities-youll-write-with-anchor) — Seed collision attacks, PDA sharing, and security anti-patterns
- [Sec3: Why You Should Always Validate PDA Bump Seeds](https://sec3.dev/blog/pda-bump-seeds) — Detailed analysis of bump validation vulnerabilities
- [Solana Security Courses: Bump Seed Canonicalization](https://solana.com/developers/courses/program-security/bump-seed-canonicalization) — Security implications of non-canonical bumps
- [Solana Security Courses: PDA Sharing](https://solana.com/developers/courses/program-security/pda-sharing) — Account confusion attacks and mitigation strategies
- [Cantina: Securing Solana - A Developer's Guide](https://cantina.xyz/blog/securing-solana-a-developers-guide) — Production security checklist covering PDA vulnerabilities
- [Zealynx: Solana Security Checklist](https://www.zealynx.io/blogs/solana-security-checklist) — 45 critical checks including PDA seed collision patterns
- [Helius: A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security) — Real-world exploit analysis and PDA attack vectors
- [Anchor Lang Documentation: PDAs](https://www.anchor-lang.com/docs/basics/pda) — Anchor's PDA constraints and seed validation patterns
- [QuickNode: How to Use Program Derived Addresses](https://www.quicknode.com/guides/solana-development/anchor/how-to-use-program-derived-addresses) — Practical PDA implementation examples
- [RareSkills: Account Rent and Storage Costs](https://rareskills.io/post/solana-account-rent) — Rent calculation formulas and cost optimization
- [Solana Developers: Token Extensions Reallocate](https://solana.com/developers/guides/token-extensions/reallocate) — Dynamic account resizing patterns
- [Jacob Creech: Realloc Tutorial](https://github.com/jacobcreech/realloc-tutorial) — Practical realloc implementation examples
- [Anchor Lang: Zero Copy](https://www.anchor-lang.com/docs/features/zero-copy) — Zero-copy deserialization performance and usage
- [Helius: Optimizing Solana Programs](https://www.helius.dev/blog/optimizing-solana-programs) — Compute unit optimization and account data packing
- [Medium: Building Efficient Solana Programs](https://blog.blockmagnates.com/building-efficient-solana-programs-10fa3900236c) — Account sizing strategies and serialization trade-offs
- [Chainstack: Solana Anchor Accounts, Seeds, and Bumps](https://chainstack.com/solana-anchor-accounts-pdas-seeds-bumps/) — Comprehensive PDA derivation walkthrough

## Gaps & Caveats

**Account Resizing Limitations:**
- Realloc max increase of 10KB per instruction (need multiple transactions for larger growth)
- Realloc only works on program-owned accounts (can't resize PDAs owned by other programs)
- Frequent realloc operations cost more compute than allocating full size upfront
- Rent refunds when shrinking accounts can complicate client-side balance tracking

**Future Solana Runtime Changes:**
- PDA derivation algorithm may evolve (e.g., different curve, hash functions)
- Rent economics could change (though unlikely to remove rent-exempt requirement)
- Account size limits (currently 10MB) may increase with future runtime optimizations
- Cross-program invocation depth limits affect hierarchical PDA validation chains

**Zero-copy Deserialization Edge Cases:**
- Requires precise memory alignment (`#[repr(C)]`), can break with Rust compiler updates
- No backward compatibility if you change field types or ordering
- Harder to version accounts (need careful planning for schema evolution)
- Not compatible with Anchor's automatic `#[account]` macros (must use `#[account(zero_copy)]`)

**PDA Derivation Performance:**
- Each additional seed component increases compute units (roughly 50-100 CU per seed)
- Hierarchical PDAs require validating multiple accounts per instruction (compounds compute cost)
- Client-side derivation with many seeds can slow down UI responsiveness
- Programs hitting compute limits may need to batch PDA validations across multiple instructions

**Unresolved Questions:**
- No canonical pattern for versioning PDA structures (community uses ad-hoc approaches)
- Limited guidance on optimal seed count for compute/UX balance (most production code uses 2-4)
- Account compression techniques (Merkle trees, state compression) may replace traditional PDAs for high-scale applications
- Interoperability challenges when PDAs need to be referenced across programs with different seed conventions
