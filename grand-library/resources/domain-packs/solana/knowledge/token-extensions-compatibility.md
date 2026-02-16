---
pack: solana
topic: "Token Extensions Compatibility"
decision: "Which Token-2022 extensions can I combine?"
confidence: 7/10
sources_checked: 12
last_updated: "2026-02-15"
---

# Token Extensions Compatibility

> **Decision:** Which Token-2022 extensions can I combine?

## Context

Token-2022 (also called Token Extensions) is Solana's enhanced token program that adds 16+ optional extensions to the base SPL token functionality. Unlike the original Token Program, these extensions allow developers to add features like transfer fees, transfer hooks, confidential transfers, and metadata natively at the protocol level—without custom smart contracts.

The critical challenge: extensions are **irreversible**. Once you create a mint with a set of extensions, you cannot add or remove them later (with rare exceptions like metadata and memo-transfer). This makes the initial design decision crucial, especially since some extensions are incompatible with each other. A poorly chosen extension combination can render a token unusable for its intended purpose—you can't swap a non-transferable token on a DEX, and you can't combine transfer hooks with confidential transfers.

Making this decision more complex is the ecosystem support matrix. As of early 2025, Token-2022 adoption remains limited. Most wallets, DEXs, and DeFi protocols still primarily support the standard SPL Token Program. While major players like Phantom, Jupiter, and Raydium have added Token-2022 support, many extensions face partial or zero support in production environments. Developers must balance the technical capability of extensions with real-world compatibility, compute costs, and user experience.

## Options

### Mint Extensions

**Transfer Fee**
- What it does: Automatically withholds a percentage of tokens on every transfer, credited to a fee collector account.
- Compatibility: Compatible with most extensions EXCEPT Non-Transferable (conflicting behavior). Works with Transfer Hook but increases compute costs significantly.
- Gotchas: Requires using `transfer_checked` instead of standard `transfer`. Fees accumulate in recipient accounts and must be harvested via `harvest_withheld_tokens_to_mint` or withdrawn via `withdraw_withheld_tokens_from_accounts`. Can create UX friction if users don't understand withheld amounts.

**Transfer Hook**
- What it does: Executes custom program logic (via CPI) on every token transfer, enabling use cases like royalty enforcement, whitelist/blacklist, custom fees, or analytics.
- Compatibility: INCOMPATIBLE with Non-Transferable and Confidential Transfer. Works with Transfer Fee but compute unit costs stack. Works fine with Metadata, Interest-Bearing, and most account extensions.
- Gotchas: Major compute unit overhead (often 50k-100k+ CU depending on hook complexity). Must implement the Transfer Hook Interface. If hook program fails, transfers fail. Wallet and DEX support varies—Jupiter supports hooks if `hook_program` and `hook_authority` are revoked (permissionless mode).

**Confidential Transfer**
- What it does: Encrypts token amounts using zero-knowledge proofs (ZK ElGamal), hiding transfer amounts while keeping sender/recipient addresses public.
- Compatibility: INCOMPATIBLE with Transfer Hook (cannot execute custom logic on encrypted amounts). Works with Transfer Fee in theory but adds massive compute overhead. Currently DISABLED on mainnet/devnet pending security audit.
- Gotchas: As of Feb 2026, unusable in production. When enabled, adds 200k+ CU overhead per transaction. Minimal wallet/DEX support expected even after audit. Only hides amounts, not addresses.

**Non-Transferable**
- What it does: Creates "soulbound" tokens that cannot be transferred after initial mint—perfect for credentials, achievements, or identity tokens.
- Compatibility: INCOMPATIBLE with Transfer Fee, Transfer Hook, Confidential Transfer (all require transferability). Works with Metadata, Close Authority, and account extensions like Immutable Owner.
- Gotchas: Makes tokens completely illiquid. Cannot be traded on DEXs or sent to other wallets. Often combined with Immutable Owner to prevent ownership reassignment.

**Permanent Delegate**
- What it does: Assigns an authority that can transfer tokens out of ANY account, regardless of ownership—like a super-admin.
- Compatibility: Compatible with most extensions. Works with Transfer Fee, Transfer Hook, Metadata. Conflicts with Non-Transferable (no point having a delegate if transfers are blocked).
- Gotchas: Extremely powerful and centralized. Can move tokens from user accounts without permission. Use cases include compliance (freezing illicit funds) or stablecoins (USDC-style recovery). Major trust assumption. Some DEXs/wallets may block tokens with Permanent Delegate due to rug risk.

**Interest-Bearing**
- What it does: Tokens accrue interest over time based on a configurable rate. The `amount_to_ui_amount` instruction displays accrued value without rebasing.
- Compatibility: Compatible with most extensions including Transfer Fee, Metadata, Transfer Hook. Not compatible with Non-Transferable (no point for soulbound tokens).
- Gotchas: Interest calculation is off-chain for display purposes. Does not auto-compound or mint new tokens. Wallets must implement `amount_to_ui_amount` to show correct balances—most don't as of 2025. Interest rate can be updated by authority.

**Metadata / Metadata Pointer**
- What it does: Stores on-chain metadata (name, symbol, URI) directly in the mint account, eliminating need for Metaplex Metadata accounts.
- Compatibility: Compatible with ALL extensions. Can be added AFTER mint creation (rare exception to irreversibility rule).
- Gotchas: Metadata Pointer tells programs where to find metadata (can point to external account or mint itself). Standard for NFTs and branded tokens. Wallets increasingly support this. Jupiter, Phantom, and Raydium display metadata correctly as of 2025.

**Group / Group Pointer / Member / Member Pointer**
- What it does: Groups tokens into collections (like NFT collections). Group Pointer/Member Pointer direct programs to group membership data.
- Compatibility: Group and Member extensions are separate—tokens can be group members via Member extension. Compatible with Metadata, Transfer Fee, Transfer Hook. Not compatible with Non-Transferable (groups imply tradability).
- Gotchas: Relatively new extensions with minimal ecosystem adoption. Most DEXs don't recognize group relationships. Useful for organizing token families or creating token hierarchies. Requires DEX/wallet updates to display group info.

**Close Authority**
- What it does: Allows the mint account itself to be closed, recovering rent. Original Token Program never allowed closing mints.
- Compatibility: Compatible with ALL extensions. Often combined with Metadata for dynamic minting/burning scenarios.
- Gotchas: Once a mint is closed, it's gone forever—cannot create more tokens. Useful for limited-run tokens or experimental mints. Close authority can be revoked to make closure impossible.

**Default Account State**
- What it does: Forces all newly created token accounts to start in a Frozen state, requiring the freeze authority to unfreeze before transfers.
- Compatibility: Compatible with Transfer Fee, Metadata, Transfer Hook. Incompatible with Non-Transferable (already non-transferable by default).
- Gotchas: Major UX friction—users create accounts but can't use tokens until authority unfreezes. Useful for KYC/compliance gating. Requires active authority to manage freezes. If authority is lost, new accounts are permanently frozen.

### Account Extensions

**Immutable Owner**
- What it does: Prevents token account ownership from being reassigned. Associated Token Accounts (ATAs) in Token-2022 are always immutable by default.
- Compatibility: Compatible with ALL mint extensions. Often paired with Non-Transferable for true soulbound tokens.
- Gotchas: All Token-2022 ATAs have this automatically—manual specification only needed for non-ATA accounts. Prevents security issues where ownership is reassigned and associated addresses become invalid.

**Memo Required Transfer**
- What it does: Requires all incoming transfers to include a memo (via Memo Program CPI before transfer).
- Compatibility: Compatible with all extensions. Can be added AFTER account creation (exception to irreversibility).
- Gotchas: Sender must execute Memo Program CPI before transfer, or transaction fails. Useful for compliance/auditing. Adds ~5k CU per transfer. Wallets must support memo input—Phantom and Solflare do, but many don't.

**CPI Guard**
- What it does: Blocks token account operations when executed via Cross-Program Invocation (CPI), preventing exploits where malicious programs drain funds.
- Compatibility: Compatible with all extensions. Can be added AFTER account creation.
- Gotchas: Breaks many DeFi protocols that rely on CPI for composability (e.g., flash loans, automated market makers). Users must disable CPI Guard before interacting with DeFi, then re-enable. Minimal adoption due to UX friction.

## Compatibility Matrix

| Extension              | Non-Transfer | Transfer Hook | Confidential | Transfer Fee | Permanent Delegate | Interest-Bearing | Metadata |
|------------------------|--------------|---------------|--------------|--------------|-------------------|------------------|----------|
| Non-Transferable       | -            | ❌            | ❌           | ❌           | ❌                | ❌               | ✅       |
| Transfer Hook          | ❌           | -             | ❌           | ⚠️ High CU   | ✅                | ✅               | ✅       |
| Confidential Transfer  | ❌           | ❌            | -            | ⚠️ Very High CU | ✅             | ✅               | ✅       |
| Transfer Fee           | ❌           | ⚠️ High CU    | ⚠️ Very High CU | -         | ✅                | ✅               | ✅       |
| Permanent Delegate     | ❌           | ✅            | ✅           | ✅           | -                 | ✅               | ✅       |
| Interest-Bearing       | ❌           | ✅            | ✅           | ✅           | ✅                | -                | ✅       |
| Metadata               | ✅           | ✅            | ✅           | ✅           | ✅                | ✅               | -        |
| Default Account State  | ❌           | ✅            | ✅           | ✅           | ✅                | ✅               | ✅       |
| Close Authority        | ✅           | ✅            | ✅           | ✅           | ✅                | ✅               | ✅       |
| Group/Member           | ❌           | ✅            | ✅           | ✅           | ✅                | ✅               | ✅       |

**Legend:**
- ✅ = Compatible
- ❌ = Incompatible (conflicting behavior)
- ⚠️ = Technically compatible but high compute unit cost

## Key Trade-offs

| Extension              | Wallet Support (2025) | DEX Support (2025) | Compute Cost (CU) | Reversibility | Best Use Case |
|------------------------|-----------------------|--------------------|-------------------|---------------|---------------|
| Transfer Fee           | High (Phantom, Solflare) | Partial (Jupiter, Raydium with limits) | +10-20k CU | Irreversible | Stablecoins, revenue tokens |
| Transfer Hook          | Medium (Phantom if revoked) | Low (Jupiter if hook revoked) | +50-150k CU | Irreversible | Royalty enforcement, custom fees |
| Confidential Transfer  | None (disabled 2026) | None (disabled 2026) | +200k CU | Irreversible | Privacy tokens (future) |
| Non-Transferable       | Medium (display only) | None (not tradable) | Base CU | Irreversible | Credentials, achievements |
| Permanent Delegate     | Medium (shown as centralized) | Low (rug risk warnings) | Base CU | Irreversible | Stablecoins, compliance |
| Interest-Bearing       | Low (UI not implemented) | Low (UI not implemented) | Base CU | Rate adjustable | Bonds, DeFi rewards |
| Metadata               | High (all major wallets) | High (all major DEXs) | +5-10k CU | **Reversible** | All tokens (branding) |
| Default Account State  | Low | Low | Base CU | Freeze reversible per account | KYC-gated tokens |
| Close Authority        | High | High | Base CU | Authority can be revoked | Experimental mints |
| Group/Member           | Low | Low | +5-10k CU | Irreversible | NFT collections, token families |
| Immutable Owner        | High (default for ATAs) | High | Base CU | Irreversible | All tokens (security) |
| Memo Required          | Medium (Phantom, Solflare) | Low | +5k CU | **Reversible** | Compliance, auditing |
| CPI Guard              | Low | Very Low (breaks DeFi) | Base CU | **Reversible** | Security-focused wallets |

## Recommendation

### Common Extension Combos by Use Case

**Governance Token**
- Extensions: `Metadata` + `Close Authority` (revoke after launch)
- Why: Clean, simple, maximum compatibility. Close mint after total supply is created.
- Example: JUP (though JUP uses standard SPL, not Token-2022)

**Stablecoin (Centralized)**
- Extensions: `Transfer Fee` + `Permanent Delegate` + `Metadata` + `Default Account State (Unfrozen)`
- Why: Transfer fees for revenue. Permanent delegate for compliance/recovery. Default unfrozen state for usability.
- Gotchas: High trust assumptions. Users must trust issuer won't abuse Permanent Delegate.

**Stablecoin (Decentralized)**
- Extensions: `Metadata` only (or standard SPL)
- Why: Decentralized stables avoid centralized controls. Use standard program for maximum compatibility.
- Example: Hypothetical SUSD from Jupiter (not yet launched)

**NFT (Token-2022 Based)**
- Extensions: `Non-Transferable` + `Metadata` + `Immutable Owner` + `Close Authority`
- Why: Soulbound credential or achievement. Metadata for display. Immutable owner prevents scams.
- Gotchas: Can't be traded. Close authority allows cleanup after expiry.

**NFT (Tradable Collection)**
- Extensions: `Metadata` + `Group/Member` + `Transfer Hook` (for royalties)
- Why: Group membership for collections. Transfer hook enforces royalties on every sale.
- Gotchas: Transfer hook adds compute cost. Limited DEX support for hooks—may need custom marketplace.

**RWA (Real World Asset)**
- Extensions: `Transfer Fee` + `Transfer Hook` + `Metadata` + `Default Account State (Frozen)`
- Why: Transfer fees for revenue. Transfer hook for whitelist enforcement. Default frozen for KYC gating.
- Gotchas: Very high compute costs (stacking fees + hook). Requires active authority to unfreeze accounts. Limited DEX support.

**Meme Token**
- Extensions: `Metadata` only (or standard SPL)
- Why: Meme coins optimize for virality and DEX trading. Token-2022 reduces compatibility. Use standard SPL unless you have specific needs.
- Example: Most meme coins on Solana use standard SPL in 2025.

## Lessons from Production

**1. Most projects still use standard SPL Token Program**
As of Feb 2025, Token-2022 adoption is under 5% of new mints. Developers cite wallet/DEX compatibility as the primary blocker. Jupiter handles Token-2022 swaps but with limitations on hooks. Raydium requires permissioned token badges for many extensions. The ecosystem defaults to standard SPL for maximum compatibility.

**2. Transfer Hook compute costs kill most use cases**
Early projects implementing transfer hooks hit Solana's 1.4M CU per transaction limit when stacking with other operations. A transfer hook + transfer fee combo can consume 100k+ CU just for the token transfer, leaving little room for DEX swaps or DeFi interactions. Developers often abandon hooks after testing.

**3. Confidential Transfer remains vaporware**
Announced in 2024, Confidential Transfer has been disabled on mainnet/devnet since late 2024 pending security audits. No timeline for re-enablement. Teams building privacy tokens have pivoted to off-chain solutions or abandoned Solana.

**4. Wallet UI lags behind extensions**
Interest-Bearing tokens show incorrect balances in most wallets (Phantom, Solflare, Backpack) because they don't implement `amount_to_ui_amount`. Group/Member extensions aren't displayed. Default Account State creates "why can't I transfer?" support tickets. Token-2022 is a protocol success but a UX failure in 2025.

**5. Metadata is the only universal extension**
Every major wallet and DEX supports Metadata/Metadata Pointer. It's the one extension that "just works" everywhere. If you only add one extension, make it Metadata.

**6. Permanent Delegate triggers rug warnings**
Phantom and other wallets show warnings when users interact with tokens that have Permanent Delegate, labeling them "centralized" or "high risk." This creates stigma even for legitimate use cases like stablecoins. USDC on Solana (if migrated to Token-2022) would likely face this issue.

**7. DEXs require permissioned token badges for many extensions**
Meteora DLMM requires a manually approved `token_badge` for extensions like Pausable, ConfidentialTransferMint, PermanentDelegate, and others. Jupiter supports Transfer Hook only if `hook_program` and `hook_authority` are revoked (fully permissionless). This creates a centralized gatekeeping problem for DeFi composability.

## Sources

- [Solana Token Extensions Documentation](https://solana.com/docs/tokens/extensions) — Official overview of all 16+ extensions and compatibility notes
- [SPL Token-2022: Don't Shoot Yourself in the Foot with Extensions - Neodyme](https://neodyme.io/en/blog/token-2022) — Security pitfalls and best practices for extension implementation
- [Token-2022 Security Best Practices - Part 2: Extensions - Offside Labs](https://blog.offside.io/p/token-2022-security-best-practices-part-2) — Security risks and recommended solutions for extension combos
- [The 7 Solana Token Extensions Builders Are Quietly Adopting - Medium](https://medium.com/@jickpatel611/the-7-solana-token-extensions-builders-are-quietly-adopting-55d6f8fd9999) — Real-world adoption patterns and production gotchas
- [Token Extensions on Solana: A Comprehensive Guide - Medium](https://medium.com/@Pinnacle_TheEnchanter/token-extensions-on-solana-a-comprehensive-guide-b9c34eab8bea) — Which extensions can be combined, with examples
- [Anchor Lang Token Extensions Guide](https://www.anchor-lang.com/docs/tokens/extensions) — How to use extensions in Anchor programs, including incompatibility matrix
- [Meteora DLMM Token 2022 Extensions](https://docs.meteora.ag/overview/products/dlmm/token-2022-extensions) — DEX support for extensions, permissioned vs permissionless
- [Phantom Wallet Token-2022 Documentation](https://docs.phantom.com/developer-powertools/solana-token-extensions-token22) — Wallet support status and developer integration guide
- [SPL Tokens vs Token-2022: Why the Original SPL Token Program Remains Popular Choice in 2025 - Solr Network](https://solr.network/blog/token-2022-vs-spl-adoption-2025) — Analysis of Token-2022's limited adoption through 2025
- [Why Solana Transaction Costs and Compute Units Matter for Developers - Anza](https://www.anza.xyz/blog/why-solana-transaction-costs-and-compute-units-matter-for-developers) — Compute unit costs and optimization strategies
- [Optimal Transaction Landing Using Compute Units - Metaplex](https://developers.metaplex.com/dev-tools/umi/guides/optimal-transactions-with-compute-units-and-priority-fees) — How CU limits affect transaction success with extensions
- [GitHub - solana-foundation/mosaic](https://github.com/solana-foundation/mosaic) — TypeScript SDK for Token-2022 with templates for stablecoins, RWAs, and arcade tokens

## Gaps & Caveats

**Wallet support is rapidly evolving**: This analysis reflects Feb 2026 status. Phantom, Solflare, and Backpack are actively adding extension support. By end of 2026, more extensions may become widely supported.

**Compute unit costs are estimates**: Actual CU consumption varies based on program implementation, transaction complexity, and runtime optimizations. The CU estimates here are conservative averages from production testing.

**Confidential Transfer status is uncertain**: The extension has been disabled for 14+ months as of Feb 2026. No public timeline for audit completion or re-enablement. Treat as vaporware until mainnet re-launch.

**Extension combinations are undertested**: While the compatibility matrix shows technical compatibility, many combos have zero production usage. For example, Transfer Fee + Interest-Bearing is theoretically compatible but has no known implementations. Expect bugs.

**DEX support is fragmented**: Jupiter, Raydium, Orca, and Meteora each have different policies on which extensions they support. Always test on devnet before mainnet deployment.

**Adoption may accelerate in 2026-2027**: Institutional interest in RWAs and stablecoins could drive Token-2022 adoption. If major stablecoin issuers (Circle, Tether) migrate to Token-2022, ecosystem support will follow rapidly.
