# NFT / Marketplace Attack Playbook
<!-- Protocol-specific attack vectors for NFT protocols and marketplaces -->
<!-- Last updated: 2026-02-06 -->

## How NFT Protocols Work (Mental Model)

NFT protocols on Solana enable creation, transfer, and trading of non-fungible tokens. Metaplex is the dominant standard (99%+ of Solana NFTs). Marketplaces like Magic Eden, Tensor, and others use Metaplex's Auction House or custom programs for trading.

**Key components:**
- **Mint:** The unique token (supply = 1) with metadata
- **Metadata:** On-chain (Metaplex Token Metadata) and off-chain (Arweave/IPFS) data
- **Collection:** Group of related NFTs verified by collection authority
- **Royalties:** Creator-defined fees on secondary sales
- **Auction House:** Metaplex program for marketplace listings and sales
- **Trade state:** PDA accounts tracking active listings and bids
- **Candy Machine:** Minting program for collection launches

---

## Common Architecture Patterns

### Metaplex Token Metadata
- Standard for all Solana NFT metadata
- Programmable NFTs (pNFTs) for royalty enforcement
- Core (MPL Core) — newer, simpler standard

### Metaplex Auction House
- Marketplace trading protocol
- Trade state PDAs for listings/bids
- Supports multiple auction houses (different fees)

### Compressed NFTs (Bubblegum)
- State compression via Merkle trees
- Dramatically cheaper minting (100x+)
- Stored in concurrent Merkle trees, not individual accounts

### Custom Marketplace Programs
- Protocol-specific trading logic
- Often integrate with Metaplex standards
- Variable security quality

---

## Known Attack Vectors

### 1. Persistent Sale Agreement Exploit
**Severity:** CRITICAL  **EP Reference:** EP-049, EP-011
**Historical:** Metaplex Auction House exploit (Jul 2022, reported by Andy Kutruff)

**Mechanism:** When a sale executes, the Auction House tries to close trade state accounts by zeroing their data and lamports. However, if an attacker transfers lamports back to the trade state in the same transaction, the account survives garbage collection. Combined with bump overloading (using bump=0 which is valid for ~50% of PDAs), a persistent sale agreement allows the attacker to force a sale at an old (low) price whenever the seller relists the same NFT.

**Detection:**
- Are trade state accounts properly closed using `close_account`?
- Can lamports be sent to trade state accounts to keep them alive?
- Are PDA bumps passed as instruction arguments? (should use canonical bump)
- Can old listings/bids be replayed?

**Code pattern to audit:**
```rust
// DANGEROUS: Zeroing data but not using close_account
sol_memset(&mut *account_data, 0, TRADE_STATE_SIZE);
**account_lamports = 0;  // Can be re-funded in same tx!
// SAFE: Use Anchor's close constraint
#[account(mut, close = seller)]
pub trade_state: Account<'info, TradeState>,
```

**Invariant:** `closed_accounts_cannot_be_resurrected_in_same_tx`

---

### 2. Non-Canonical Bump / PDA Confusion
**Severity:** HIGH  **EP Reference:** EP-006, EP-049
**Historical:** Metaplex Token Entangler exploit (Jun 2022)

**Mechanism:** Bumps for PDAs are passed as instruction arguments instead of being derived canonically. Attacker passes a non-canonical bump that creates a valid PDA but stores an incorrect bump value. Later operations using the stored bump fail, permanently locking tokens or breaking swap mechanisms.

**Detection:**
- Are PDA bumps passed as instruction arguments?
- Are bumps stored and reused (should always derive canonically)?
- Does `find_program_address` vs supplied bump match?

**Code pattern to audit:**
```rust
// DANGEROUS: Bump from instruction argument
#[instruction(bump: u8)]
pub struct CreatePair<'info> {
    #[account(init, seeds=[...], bump, ...)]
    pub pair: Account<'info, Pair>,
}
// Then storing: pair.bump = bump;  // NOT the canonical bump!

// SAFE: Use canonical bump from init
pair.bump = ctx.bumps.pair;  // Anchor 0.29+ stores canonical
```

**Invariant:** `stored_bumps_are_always_canonical`

---

### 3. Fake Collection Verification
**Severity:** HIGH  **EP Reference:** EP-002, EP-007

**Mechanism:** NFT claims to be part of a collection but verification is missing or can be bypassed. Attacker mints an NFT with matching metadata/name but from a different collection, then uses it in protocols that check collection by name rather than on-chain verified collection key.

**Detection:**
- Is collection membership verified via Metaplex's `verified` field?
- Or is the check based on name/symbol (spoofable)?
- Can unverified NFTs be accepted by the protocol?

**Code pattern to audit:**
```rust
// DANGEROUS: Check by name (spoofable)
require!(nft.data.name.starts_with("CoolNFT"), ErrorCode::WrongCollection);
// SAFE: Check verified collection
let metadata = Metadata::from_account_info(&metadata_account)?;
require!(
    metadata.collection.as_ref()
        .map(|c| c.verified && c.key == EXPECTED_COLLECTION)
        .unwrap_or(false),
    ErrorCode::InvalidCollection
);
```

**Invariant:** `collection_membership_verified_on_chain`

---

### 4. Royalty Bypass
**Severity:** MEDIUM  **EP Reference:** EP-060
**Historical:** Widespread across Solana marketplaces (2022-2023)

**Mechanism:** NFT royalties on Solana were historically optional — marketplaces could transfer NFTs without paying creator royalties. This led to a race-to-the-bottom where marketplaces made royalties optional to attract traders. Metaplex introduced Programmable NFTs (pNFTs) with enforced royalties.

**Detection:**
- Does the protocol use Token Metadata v1.3+ with pNFTs?
- Are royalties enforced at the program level?
- Can the protocol transfer NFTs via direct SPL token transfer (bypassing royalties)?
- Does the marketplace use Metaplex's auth rules?

**Invariant:** `royalties_enforced_for_pnft_collections`

---

### 5. Candy Machine / Minting Exploits
**Severity:** HIGH  **EP Reference:** EP-058, EP-061
**Historical:** Candy Machine bot spam (Apr-May 2022, caused 8-hour network outage)

**Mechanism:** Minting mechanisms for NFT launches can be exploited in several ways:
- **Bot spam:** Bots flood mint transactions, exhausting supply before legitimate users
- **Whitelist bypass:** Guard conditions (allow lists, token gates) can be circumvented
- **Pre-reveal sniping:** If metadata is predictable before reveal, bots target rare NFTs
- **Guard account substitution:** Candy Guard accounts not properly validated

**Detection:**
- Are Candy Guards properly configured? (bot tax, allow list, mint limit, etc.)
- Is the reveal mechanism truly random and unpredictable?
- Are guard accounts validated by PDA/owner?
- Is there rate limiting per wallet?

**Invariant:** `mint_guards_cannot_be_bypassed`

---

### 6. Compressed NFT Merkle Proof Manipulation
**Severity:** HIGH  **EP Reference:** EP-033, EP-049
**Historical:** Theoretical, emerging attack surface

**Mechanism:** Compressed NFTs use concurrent Merkle trees. Operations require providing a valid Merkle proof. If the tree is not properly synchronized (concurrent writes from multiple transactions in the same slot), proofs can become invalid or an attacker can submit a proof against a stale root.

**Detection:**
- Is the Merkle tree using Solana's `spl-account-compression` correctly?
- Are concurrent operations handled? (canopy depth, max buffer size)
- Can proofs be replayed against stale roots?
- Is the tree authority properly restricted?

**Invariant:** `merkle_proofs_validated_against_current_root`

---

### 7. Metadata Manipulation / Rug Pull
**Severity:** MEDIUM  **EP Reference:** EP-008, EP-009

**Mechanism:** NFT creator retains update authority and can change metadata after sale — replacing the image, name, or attributes. This is the basis of many rug pulls. With mutable metadata, the NFT a user bought can become entirely different.

**Detection:**
- Is the NFT metadata mutable? (check `is_mutable` flag)
- Who holds the update authority?
- Is update authority set to null after launch? (immutable)
- For off-chain metadata: is it on Arweave (immutable) or a centralized server?

**Invariant:** `metadata_immutable_after_collection_finalized`

---

### 8. Supply Chain: Malicious Metaplex Package
**Severity:** CRITICAL  **EP Reference:** EP-095
**Historical:** Metaplex npm package compromise (MAL-2025-5012)

**Mechanism:** The `metaplex` npm package was compromised with malicious code that could exfiltrate secrets and private keys from developers' machines. Any developer who installed the package could have their keys stolen, leading to unauthorized access to program upgrade authorities.

**Detection:**
- Are npm dependencies pinned to exact versions?
- Is `package-lock.json` committed and reviewed?
- Are there integrity checks (npm audit, Snyk, Socket)?
- Is the `metaplex` package sourced from the official `@metaplex-foundation` scope?

**Invariant:** `dependencies_verified_and_pinned`

---

### 9. Marketplace Indexer/Verification Bypass
**Severity:** HIGH  **EP Reference:** EP-113 (frontend), EP-002, EP-007
**Historical:** Magic Eden fake NFT exploit (Jan 2023 — 25 fake NFTs sold, ~$15K), Candy Machine V2 set_collection_during_mint (CVE GHSA-9v25-r5q2-2p6w)

**Mechanism:** UI-layer or indexer bugs allow unverified NFTs to appear in verified collections, even when the on-chain contracts are secure.

**Magic Eden Incident (Jan 2023):** A new feature deployment (Snappy Marketplace / Pro Trade activity indexer) bypassed creator address verification. Attackers listed fake NFTs mimicking ABC, y00ts collections. 25 fraudulent NFTs sold (~1,100 SOL). Magic Eden refunded all affected users.

**Candy Machine V2 CVE:** Missing check in `set_collection_during_mint` instruction allowed minting NFTs to arbitrary collections. First instruction passes checks (hits bot tax), second instruction with `set_collection_during_mint` CPI incorrectly validates against the previous instruction. Could work even if Candy Machine was out of NFTs or closed. Fixed in Candy Machine V3.

**Detection:**
- Does the marketplace verify NFT collection on-chain (Metaplex `verified` field) or via indexer?
- Can new NFTs be listed without full on-chain verification?
- Are activity indexers properly checking creator addresses?
- Is Candy Machine V2 or V3? (V2 is vulnerable to set_collection bypass)

**Invariant:** `nft_collection_verification_is_on_chain_not_ui`

---

### 10. Mint Bot Swarm / DoS
**Severity:** MEDIUM  **EP Reference:** EP-061 (related)
**Historical:** Candy Machine bot swarm (Apr 2022 — 4M tx requests, 100 Gbps, 7-hour Solana outage)

**Mechanism:** Bots flood NFT mint transactions faster than legitimate users, exhausting supply. Can cause network-wide congestion on Solana. Metaplex introduced 0.01 SOL "botting penalty" for failed transactions.

**Anti-Bot Best Practices (Metaplex):**
- **Unpredictable metadata:** Use transaction ID-based URIs (not incremental)
- **Placeholder + reveal:** Load Candy Machine with generic "Mystery Asset" metadata
- **Randomized mapping:** Cryptographically secure, secret mapping of mint index → final metadata
- **Candy Guards:** Bot tax, allow list, token gate, mint limit per wallet
- **Config Lines over Hidden Settings:** Allows randomized placeholder mint order

**Detection:**
- Is Candy Guard configured with bot tax + rate limiting?
- Is metadata predictable before reveal (incremental URIs)?
- Is there a reveal mechanism, and is the mapping truly random?
- Can bots determine rarity traits before minting?

**Invariant:** `mint_bot_protection_configured`

---

### 11. P2E Game Off-Chain/On-Chain Race Condition
**Severity:** HIGH  **EP Reference:** EP-093
**Historical:** Aurory SyncSpace ($830K, Dec 2023), The Heist ($NANA, date unknown)

**Mechanism:** Hybrid P2E games with off-chain servers bridging to on-chain state are vulnerable to race conditions in the off-chain layer. Concurrent requests to non-atomic endpoints can inflate balances, duplicate items, or bypass payment checks.

**Common P2E vulnerability patterns (ChainLight research):**
1. Item duplication via off-chain bugs (MIR4 Global)
2. Missing fee/score verification (Manarium — claimed prizes without paying)
3. Bridge validator compromise (Axie/Ronin)
4. Non-atomic check-then-act in marketplace endpoints (Aurory)

**Detection:**
- Does the game have off-chain endpoints that modify on-chain state?
- Are marketplace/trading endpoints atomic? (database transactions with row locks)
- Can concurrent requests to the same endpoint cause double-spending?
- Is the bridge between off-chain and on-chain properly secured?

**Invariant:** `off_chain_endpoints_are_atomic`

---

## Key Invariants That Must Hold

1. `trade_states_properly_closed` (no resurrection via lamport transfer)
2. `pda_bumps_always_canonical` (never from instruction args)
3. `collection_verified_on_chain` (not by name/symbol)
4. `metadata_immutable_after_launch` (or update authority is null)
5. `compressed_nft_proofs_current` (no stale root replay)
6. `mint_guards_enforced` (bot tax, allow list, rate limit)
7. `royalties_enforced_via_pnft` (for collections requiring it)
8. `nft_collection_verification_is_on_chain_not_ui` (not indexer-dependent)
9. `mint_bot_protection_configured` (Candy Guard, rate limits)
10. `off_chain_endpoints_are_atomic` (for P2E hybrid games)

## Red Flags Checklist

- [ ] PDA bumps passed as instruction arguments
- [ ] Trade state / escrow accounts closed by zeroing instead of Anchor `close`
- [ ] Collection membership checked by name/symbol, not verified field
- [ ] NFT metadata is mutable with active update authority
- [ ] Off-chain metadata hosted on centralized server (not Arweave/IPFS)
- [ ] No bot protection on minting (no Candy Guard)
- [ ] Compressed NFT tree authority not properly restricted
- [ ] Marketplace allows direct SPL transfer (bypassing royalties/hooks)
- [ ] Old listings/bids can be replayed after cancellation
- [ ] No supply chain monitoring for Metaplex dependencies
- [ ] NFT verification relies on indexer/UI rather than on-chain Metaplex verified field
- [ ] Candy Machine V2 (not V3) — check for set_collection_during_mint vulnerability
- [ ] Predictable/incremental metadata URIs (bots can pre-fetch rarity data)
- [ ] P2E game with off-chain marketplace endpoints lacking atomic database operations
- [ ] Game bridge between off-chain/on-chain without proper concurrency controls
- [ ] **pNFT delegate transfer path skips Rule Set validation** (EP-122)
- [ ] **pNFT AllowList validates owner key but not destination token account ownership**
- [ ] **Burn instruction can destroy `token_record` without proper validation**
- [ ] **Compressed NFT creator verification relies on Bubblegum decompress path** (CVE GHSA-8r76-fr72-j32w)
- [ ] **Merkle proof verification not checked for concurrent tree operations**
- [ ] **DAS API indexer trust assumptions for compressed NFT data**

---

## Protocol-Specific Intelligence (Wave 8)

### Metaplex (Token Metadata, Bubblegum, pNFTs)

**Mad Shield Token Metadata Audit (Dec 2023) — 3 Critical Findings:**

1. **SHIELD_MTM_01 [Critical]: Burn disables all pNFT operations**
   - Missing `token_record` validation when authority is token owner
   - Burning the token record permanently disables all pNFT operations for that asset
   - **Audit focus:** Verify destructive operations (burn) cannot destroy control structures

2. **SHIELD_MTM_02 [Critical]: All pNFT rules bypassed in transfer**
   - When transfer authority is token delegate, validation of metadata account skipped in one execution path
   - Complete bypass of creator-defined transfer rules (royalties, allowlists, etc.)
   - **Audit focus:** Verify Rule Set enforcement runs on ALL execution paths, not just owner path

3. **SHIELD_MTM_03 [Critical]: AllowList rule bypass**
   - Provide AllowList pubkey as owner but transfer to destination token account owned by different address
   - NFT transferred to non-approved program, violating royalty enforcement
   - **Audit focus:** Verify destination token account ownership matches validated identity

**Bubblegum Creator Verification CVE (GHSA-8r76-fr72-j32w, Dec 2022):**
- Found by @metamania01 (Solshield)
- Exploited provision allowing compressed NFT creators to decompress with verified status
- Attacker could verify a creator that did not sign
- Patched in commit c18591a7
- **Audit focus:** Verify creator verification requires actual signature, not just decompression path

**Bubblegum V2 (May 2025):**
- Major upgrade: enhanced cNFT programmability with plugins
- 1 billion assets created on V1
- cNFTs stored in Merkle trees, indexed via DAS API
- **New attack surface:** Plugin system, concurrent Merkle tree operations

**pNFT Architecture (Key Security Properties):**
- Token account always frozen on SPL Token program
- Operations funneled through Token Metadata (atomic thaw-operate-refreeze)
- Rule Sets via Token Auth Rules program for transfer restrictions
- **Risk:** Alternative execution paths may skip Rule Set enforcement

### Tensor
**Architecture:** AMM-based NFT marketplace with liquidity provision
**Status:** No public security incidents

**Key risk areas:**
- Standard AMM risks (impermanent loss, MEV) applied to NFT pricing
- Compressed NFT support adds DAS indexer trust assumptions
- Shared escrow system for efficient order execution
- **Audit focus:** Escrow accounting, compressed NFT proof verification, AMM pricing for illiquid collections

### Magic Eden
Already covered in Wave 6 (indexer bypass $15K, Candy Machine V2 CVE)

---
<!-- Sources: Wave 1+2+6+8 research, Andy Kutruff Metaplex exploits, Metaplex security docs, Mad Shield audit Dec 2023, Bubblegum CVE GHSA-8r76-fr72-j32w, Bubblegum V2 announcement, Helius ecosystem history, Elliptic NFT report, Magic Eden Jan 2023, ChainLight P2E research, Blockaid, FuzzingLabs, Tensor docs -->
