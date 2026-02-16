---
pack: solana
type: topic-tree-extension
extends: "Tech Stack > On-Chain / Smart Contracts, Data Model > Core Entities"
---

# Account Structure & Data Layout

## Extension Point
Extends:
- Tech Stack > On-Chain / Smart Contracts > [DOMAIN_PACK] full on-chain architecture tree
- Data Model > Core Entities > [DOMAIN_PACK] domain-specific data structures

## Tree

```
Account Structure & Data Layout
├── PDA Derivation Strategy
│   ├── What PDA derivation patterns do you use?
│   │   ├── Flat (single global PDA, e.g., ["config"])?
│   │   │   └── What data is stored in the global account?
│   │   ├── User-keyed (one PDA per user, e.g., ["user", user_pubkey])?
│   │   │   └── What user-specific data is stored?
│   │   ├── Hierarchical (nested PDAs, e.g., ["pool", pool_id, "vault"])?
│   │   │   └── Diagram the hierarchy tree
│   │   ├── Counter-based (sequential IDs, e.g., ["item", counter.to_le_bytes()])?
│   │   │   └── Where is the counter stored? (global state, user state)
│   │   ├── Multi-seed composite (e.g., ["user", user_key, "token", mint_key])?
│   │   │   └── Why multiple seeds? (uniqueness, namespace, indexing)
│   │   └── Hash-based (content-addressed, e.g., hash of data)?
│   ├── Do you store PDA bump seeds?
│   │   ├── If yes: In the account itself (Anchor default) or separate?
│   │   ├── If no: Re-derive on every access (slower but saves space)?
│   │   └── Do you enforce canonical bump (first valid bump)?
│   ├── How do you handle PDA seed collisions?
│   │   └── Do you append a nonce or counter to ensure uniqueness?
│   └── Can PDAs be derived off-chain for indexing?
│       └── Do you provide a seed derivation library for clients?
├── Account Sizing & Memory Layout
│   ├── Are your accounts fixed-size or dynamic?
│   │   ├── Fixed-size (known at compile time)?
│   │   │   └── What is the account size in bytes?
│   │   ├── Dynamic (variable-length fields like Vec)?
│   │   │   ├── What is the max size per account?
│   │   │   └── How do you handle growth? (realloc, new account, pagination)
│   │   └── Hybrid (fixed header + dynamic data)?
│   ├── Do you use `realloc` to grow accounts?
│   │   ├── If yes: Under what conditions?
│   │   ├── Who pays for the additional rent? (user, protocol)
│   │   ├── What is the max realloc size in one transaction? (10KB limit)
│   │   └── Do you handle realloc failures gracefully?
│   ├── How do you handle large data (>10KB per account)?
│   │   ├── Split across multiple accounts (pagination)?
│   │   │   └── How do you link them? (next account PDA in previous account)
│   │   ├── Use zero-copy with references?
│   │   └── Store off-chain with on-chain hash/commitment?
│   ├── Do you optimize for memory alignment?
│   │   ├── Struct field ordering (largest to smallest)?
│   │   └── Use of `repr(C)` or `repr(packed)`?
│   └── What is your account size growth strategy over time?
│       └── Can accounts be upgraded to new layouts?
├── Serialization & Discriminators
│   ├── What serialization format do you use?
│   │   ├── Borsh (Anchor default)?
│   │   ├── Bincode?
│   │   ├── Zero-copy (bytemuck, Pod)?
│   │   │   └── Why zero-copy? (gas savings, large data)
│   │   └── Custom binary format?
│   ├── Do you use account discriminators?
│   │   ├── Anchor discriminator (8-byte hash of account name)?
│   │   ├── Custom enum or version byte?
│   │   └── How do you validate discriminators on read?
│   ├── Do you version your account schemas?
│   │   ├── If yes: How? (version field in account, separate discriminator)
│   │   └── How do you handle migrations between versions?
│   └── Do you support backward compatibility?
│       └── Can old clients read new account formats?
├── Rent Strategy & Account Lifecycle
│   ├── How do you handle rent?
│   │   ├── All accounts rent-exempt (prefunded to 2+ years)?
│   │   ├── User pays rent on account creation?
│   │   ├── Protocol subsidizes rent (better UX)?
│   │   └── Rent refunded on account closure?
│   ├── Who can create accounts?
│   │   ├── Users create their own accounts (permissionless)?
│   │   ├── Protocol creates accounts on behalf of users?
│   │   ├── Requires approval or whitelist?
│   │   └── Admin-only for certain account types?
│   ├── Who can close accounts?
│   │   ├── Account owner (standard pattern)?
│   │   ├── Protocol admin (for cleanup)?
│   │   ├── Anyone (permissionless reaper for abandoned accounts)?
│   │   └── Automatic (program logic triggers closure)?
│   ├── Do you prevent account revival attacks?
│   │   ├── How? (check account is uninitialized, store creation timestamp)
│   │   └── What happens if same PDA is closed and recreated?
│   └── Do you implement account cleanup or archival?
│       ├── Reaper pattern (close stale accounts, reclaim rent)?
│       └── What defines "stale"? (inactive for X days, zero balance)
├── Account Relationships & References
│   ├── How do accounts reference each other?
│   │   ├── Store full Pubkey (32 bytes per reference)?
│   │   ├── Store PDA seeds (cheaper, derive on read)?
│   │   ├── Store index into a registry?
│   │   └── Implicit relationship via PDA derivation?
│   ├── Do you have parent-child account hierarchies?
│   │   ├── If yes: How do you prevent orphaned children?
│   │   └── Can parents be deleted while children exist?
│   ├── Do you use linked lists or trees on-chain?
│   │   ├── Linked list (e.g., for pagination, order book)?
│   │   │   └── What is the max list length? (iteration gas limits)
│   │   ├── Tree (e.g., Merkle tree for verification)?
│   │   │   └── What tree implementation? (SPL Account Compression, custom)
│   │   └── Graph (complex relationships)?
│   └── How do you handle circular references?
│       └── Are they allowed or prevented?
├── Indexing & Query Strategy
│   ├── How do off-chain systems find your accounts?
│   │   ├── getProgramAccounts (RPC query with filters)?
│   │   │   └── What filters? (memcmp on discriminator, size, owner)
│   │   ├── Anchor-generated TypeScript client?
│   │   ├── Custom indexer (Geyser plugin, webhook)?
│   │   ├── On-chain registry (list of all accounts)?
│   │   │   └── How is the registry maintained? (append-only, admin)
│   │   └── Deterministic PDA derivation (know seeds, derive all)?
│   ├── Do you emit events or logs for indexing?
│   │   ├── If yes: What events? (account created, updated, deleted)
│   │   └── How do indexers consume them? (Solana logs, custom parser)
│   ├── Do you support pagination for large datasets?
│   │   └── How? (cursor-based, offset-based, account chaining)
│   └── Do you maintain on-chain indexes?
│       ├── Example: Account registry, sorted list, counter
│       └── What are the tradeoffs? (gas cost vs query speed)
└── Zero-Copy & Advanced Patterns
    ├── Do you use zero-copy deserialization?
    │   ├── If yes: Which types? (Pod, Zeroable via bytemuck)
    │   └── Why? (large accounts, gas savings, slice access)
    ├── Do you use account data slices?
    │   └── To read/write specific fields without full deserialization?
    ├── Do you store large blobs (images, metadata)?
    │   ├── If yes: On-chain or off-chain?
    │   ├── If on-chain: How? (chunked across accounts, compression)
    │   └── If off-chain: How do you verify integrity? (hash, signature)
    └── Do you use Solana Account Compression (Merkle trees)?
        ├── For what? (NFTs, state snapshots, historical data)
        └── What tree depth and buffer size?
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "Simple single-account program" | PDA derivation complexity, hierarchical structures |
| "All accounts are fixed-size" | Realloc and dynamic sizing branches |
| "No account versioning needed" | Migration and versioning branches |
| "Users always pay their own rent" | Protocol rent subsidy branches |
| "No complex relationships, just user accounts" | Account relationships and references branches |
| "Standard getProgramAccounts only" | Custom indexing and on-chain registry branches |

## Creative Doc Triggers

| Signal | Suggest |
|--------|---------|
| Hierarchical PDA structure (3+ levels) | Create "PDA Derivation Tree Diagram" showing all PDAs and their seeds |
| Multiple account types with versioning | Create "Account Schema Reference" table with fields and versions |
| Complex account relationships (parent-child, linked lists) | Create "Account Relationship Diagram" with arrows and cardinality |
| Custom serialization or zero-copy | Create "Memory Layout Diagram" showing byte offsets and alignment |
| Account migration strategy | Create "Account Migration Guide" with before/after schemas and upgrade script |
| On-chain registry or index | Create "Registry Structure Documentation" showing how accounts are tracked |
| Large data split across accounts | Create "Account Pagination Strategy" showing how data is chunked and retrieved |
| Account lifecycle with automatic cleanup | Create "Account Lifecycle State Machine" diagram |
