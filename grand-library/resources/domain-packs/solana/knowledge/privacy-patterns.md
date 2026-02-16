---
pack: solana
confidence: 8/10
sources_checked: 11
last_updated: "2026-02-16"
---

# Privacy Patterns on Solana

## Overview

Solana is a public blockchain where all transactions and account states are visible. However, privacy-enhancing technologies enable selective confidentiality for amounts, balances, and transaction graphs. This guide covers what privacy solutions exist, their current status, trade-offs, and what's actually usable today versus theoretical.

## The Privacy Landscape on Solana

### Solana's Public Nature

By default, Solana transactions expose:
- Sender and receiver addresses (always visible)
- Transaction amounts
- Token balances
- Transaction history and graph

**Why this matters:**
- Competitors can see your trading strategies
- Users expose their net worth to everyone
- Business transactions reveal commercial relationships
- Privacy is necessary for institutional adoption

### Privacy Evolution

1. **Privacy 1.0 (2022-2024):** Shielded transfers and mixers (Elusiv)
2. **Privacy 2.0 (2024-present):** Native protocol features (Confidential Transfers), ZK computation (Light Protocol), encrypted computation (Arcium)
3. **Future:** Shared private computation, confidential DeFi, private AI

## Token-2022 Confidential Transfers

### Overview

The Confidential Transfer extension in Token-2022 enables private token transfers by encrypting transaction amounts using homomorphic encryption and zero-knowledge proofs.

**What it hides:**
- Transaction amounts
- Token balances (with Confidential Balances extension)
- Mint/burn amounts (with confidential mint/burn)
- Fee amounts (with private fee handling)

**What it DOESN'T hide:**
- Sender addresses (always public)
- Receiver addresses (always public)
- That a transaction occurred
- Token type being transferred

### Current Status: DISABLED on Mainnet

**CRITICAL:** As of February 2026, the ZK ElGamal Proof Program (ZkE1Gama1Proof11111111111111111111111111111) is temporarily disabled on mainnet and devnet pending completion of a security audit.

**Timeline:**
- **June 2024:** Initial "Confidential Transfers" rolled out, focusing on obfuscating token amounts
- **Early 2025:** "Confidential Balances" launched—ZK-powered encrypted token standard for institutional compliance
- **Current (Feb 2026):** Temporarily disabled for security audit
- **Expected:** JavaScript-based ZK libraries for browser/mobile wallet compatibility coming later in 2025 (now potentially 2026)

**What this means:**
- Confidential Transfers are NOT currently usable on mainnet for production applications
- Development and testing can continue on localnet
- When re-enabled, it will be the first ZK-powered encrypted token standard with sub-second finality

### Technical Implementation

**Cryptography:**
- **Homomorphic encryption:** Allows mathematical operations on encrypted values without decryption
- **Zero-knowledge proofs:** Prove transaction validity without revealing amounts
- **Sigma protocols and Bulletproofs:** Faster proof generation than privacy systems like Zcash or Railgun

**Architecture:**
- **Native Program:** ZK ElGamal Proof program for creating and verifying proofs on-chain
- **Client-side proof generation:** Users generate proofs in their wallet
- **On-chain verification:** Network verifies proofs without learning amounts

**Balance types:**
- **Pending balance:** Encrypted incoming transfers awaiting user acknowledgment
- **Available balance:** Encrypted spendable balance
- **Apply pending balance:** User operation to move pending to available (requires proof generation)

### Use Cases

**When confidential transfers make sense:**
- **Institutional DeFi:** Hiding trade sizes from competitors
- **Payroll:** Employees don't see each other's salaries
- **Supply chain:** Obscure payment amounts in commercial relationships
- **High-value trading:** Prevent frontrunning based on visible order sizes

**When they DON'T help:**
- Hiding participant identities (addresses still public)
- Complete anonymity (transaction graph visible)
- Regulatory evasion (compliance layers can still access amounts)

### Privacy + Compliance

Confidential Transfers are designed for "compliance without sacrificing privacy":
- Audit keys can be issued to regulators
- View keys allow selective disclosure
- Works with institutional compliance requirements
- Balances encrypted but provably correct

**This is NOT a mixer or tumbler.** It's private accounting, not anonymity.

## Light Protocol

### Overview

Light Protocol introduces a UTXO (Unspent Transaction Outputs) model to Solana with zero-knowledge privacy. Unlike Elusiv's pooled fund approach, Light uses UTXOs tied to shielded keypairs.

**How it works:**
- UTXO holds two balances: one in SOL, one in SPL token
- Program logic encoded into zero-knowledge circuits (zk-SNARKs)
- Computation and proof generation happen client-side
- On-chain verification ensures correctness without revealing details

### Key Innovation

Light Protocol brings **private state** to Solana:
- Traditional Solana: All state visible
- With Light: State can be committed to on-chain (Merkle tree) but encrypted
- Applications can build private logic without revealing all data

**Use cases:**
- Private DeFi positions
- Confidential voting
- Hidden order books
- Private token holdings

### Current Status

Light Protocol is actively developed and operational on mainnet. Unlike Confidential Transfers, Light is not disabled. However, it requires:
- Application-specific integration (not automatic like token extensions)
- Client-side ZK proof generation capability
- More complex developer experience than standard Solana programs

### Trade-offs

**Pros:**
- More flexible than Confidential Transfers
- Enables private application logic, not just private amounts
- Active development and mainnet support

**Cons:**
- Higher complexity for developers
- Proof generation can be resource-intensive
- Requires specialized knowledge of ZK circuits
- Addresses still visible on-chain

## Elusiv (Sunsetted)

### What Elusiv Was

Elusiv was the first major privacy protocol on Solana, using shielded pools similar to Zcash or Tornado Cash.

**How it worked:**
- Users deposited tokens into a shielded pool
- Pool contained mixed funds from multiple users
- Withdrawals unlinkable to deposits through ZK proofs
- Broke the transaction graph

### Current Status: SUNSETTED

**Timeline:**
- **Feb 29, 2024:** Elusiv announced sunsetting
- **Withdrawal-only mode:** Until January 1, 2025
- **Current status:** No longer operational

**Why it matters:**
- Pioneered "Privacy 1.0" on Solana
- Team evolved into Arcium (Privacy 2.0)
- Demonstrated mixer-style approaches have legal/regulatory risks

### Lessons from Elusiv

1. **Regulatory risk:** Privacy mixers face intense scrutiny (see Tornado Cash sanctions)
2. **Sustainability:** Maintaining mixer infrastructure is challenging
3. **Evolution:** Privacy moving from "hiding transactions" to "selective confidentiality with compliance"

## Arcium (Privacy 2.0)

### Overview

Arcium, created by the same team behind Elusiv, represents the evolution to "Privacy 2.0"—shared private computation rather than simple shielded transfers.

**Key technologies:**
- **Multi-Party Computation (MPC):** Multiple parties jointly compute results without revealing inputs
- **Zero-Knowledge Proofs (ZKP):** Prove computation correctness without revealing data
- **Encrypted computation:** Process encrypted data without decryption

### Use Cases

**Confidential DeFi:**
- Private trading strategies
- Hidden liquidity pools
- Confidential lending positions

**Private AI:**
- Model inference on encrypted data
- Training on private datasets
- Predictions without revealing inputs

**Encrypted gaming logic:**
- Hidden game state (fog of war)
- Provably fair randomness
- Anti-cheat without revealing algorithms

### Status

Arcium is actively developed but represents cutting-edge technology. Adoption is still early-stage compared to simpler privacy solutions.

## Privacy Trade-offs on Public Blockchains

### Fundamental Constraints

**You cannot have:**
- Complete anonymity + full decentralization + regulatory compliance
- Total privacy + public verification
- Zero trust + zero visibility

**You must choose:**
- **Privacy over amounts** (Confidential Transfers): Hides how much, not who
- **Privacy over participants** (mixers): Hides who, but legally risky
- **Selective disclosure** (view keys, audit keys): Privacy with compliance escape hatches

### The Public Ledger Reality

Solana's architecture is fundamentally transparent:
- All transactions stored publicly
- Validators must verify all state transitions
- Consensus requires shared state visibility

**Privacy solutions work WITHIN these constraints:**
- Encrypt amounts but prove validity
- Commit to state without revealing it
- Selective disclosure to authorized parties

### Performance Trade-offs

**Proof generation costs:**
- Confidential Transfers: Moderate cost, sub-second on modern devices
- Complex ZK circuits (Light Protocol): Higher cost, may require powerful client
- Mixer operations: High proof generation cost

**On-chain verification costs:**
- ZK proof verification adds compute units
- More complex proofs = more expensive transactions
- Bulk verification can amortize costs

**User experience trade-offs:**
- Proof generation time (seconds to minutes)
- Wallet complexity (managing encrypted balances)
- Recovery challenges (lose keys = lose access to encrypted balances)

## Mixer-Style Approaches and Legal Risks

### The Tornado Cash Precedent

**August 2022:** U.S. Treasury sanctioned Tornado Cash, an Ethereum mixer.

**Rationale:**
- Facilitated money laundering for Lazarus Group (North Korean hackers)
- Laundered over $7 billion worth of cryptocurrency since 2019
- Insufficient KYC/AML controls

**Implications for Solana:**
- Mixer-style privacy services face existential legal risk in U.S. jurisdiction
- Even decentralized/non-custodial services not immune from sanctions
- Developers of sanctioned services face potential criminal liability

### Why Mixers are High-Risk

1. **Money laundering enabler:** Primary use case is breaking transaction traceability, attractive to criminals
2. **Lack of compliance integration:** No KYC, no AML, no selective disclosure
3. **Regulatory hostility:** Governments view mixers as facilitating crime
4. **Developer liability:** Contributors to sanctioned projects face legal jeopardy

### Compliant Alternatives

Modern privacy solutions avoid mixer model:
- **Confidential Transfers:** Amounts hidden, but addresses visible and auditable
- **View keys:** Allow selective disclosure to regulators
- **Audit keys:** Enable compliance without sacrificing all privacy
- **Attestation integration:** Can require KYC for access to privacy features

## What's Actually Usable Today (Feb 2026)

### Production-Ready

**Light Protocol:**
- ✅ Operational on mainnet
- ✅ Active development
- ⚠️ Requires custom integration, not plug-and-play
- ⚠️ Developer complexity high

**Arcium:**
- ✅ Privacy 2.0 platform operational
- ⚠️ Early adoption stage
- ⚠️ Advanced use cases, not simple transfers

### Temporarily Unavailable

**Confidential Transfers (Token-2022):**
- ❌ Disabled on mainnet pending security audit
- ✅ Most promising for mainstream adoption when re-enabled
- ✅ Native protocol support, easier integration
- ⏳ Expected re-enablement: TBD (audit completion)

### Sunsetted

**Elusiv:**
- ❌ No longer operational
- ❌ Withdrawal-only mode ended Jan 1, 2025

## Practical Recommendations

### For dApp Developers

**If you need privacy NOW:**
- **Light Protocol:** If you can handle complexity and custom integration
- **Arcium:** If your use case fits advanced MPC/ZKP scenarios
- **Wait for Confidential Transfers:** If you want simple, native solution

**Implementation strategy:**
1. Design your application to be privacy-agnostic where possible
2. Abstract privacy layer so you can swap implementations
3. Monitor Confidential Transfers audit progress
4. Test on devnet/localnet even while mainnet disabled

### For Token Issuers

**Privacy for your token:**
- **Wait for Token-2022 Confidential Transfers:** Most straightforward path
- **Consider compliance requirements:** View keys, audit keys essential for institutional adoption
- **Test UX:** Encrypted balances have different user experience than normal SPL tokens

### For Privacy-Conscious Users

**What you CAN do today:**
- Use Light Protocol-integrated applications
- Wait for Confidential Transfers re-enablement
- Accept trade-off: Privacy on amounts, not identities

**What you CANNOT do:**
- Achieve full anonymity (addresses always visible)
- Use mixer-style services without legal risk
- Expect mainstream wallet support for privacy features yet

## Future Outlook

### Short-term (2026)

- Confidential Transfers re-enabled on mainnet post-audit
- JavaScript/mobile wallet support for ZK proof generation
- More dApps integrating Light Protocol
- Institutional adoption of confidential tokens

### Medium-term (2027-2028)

- Mainstream wallet support for encrypted balances
- Privacy-by-default for institutional DeFi
- Regulatory clarity on compliant privacy solutions
- Arcium adoption for advanced use cases

### Long-term

- Privacy 2.0: Shared private computation standard
- Confidential smart contracts
- Private AI and gaming on Solana
- Regulatory frameworks for privacy + compliance

## Resources

- **Confidential Transfers Docs:** https://solana.com/docs/tokens/extensions/confidential-transfer
- **Confidential Balances Guide:** https://www.helius.dev/blog/confidential-balances
- **Light Protocol Overview:** https://www.helius.dev/blog/privacy-on-solana-with-elusiv-and-light
- **Arcium (formerly Elusiv):** https://www.arcium.com/articles/the-rebirth-of-privacy-on-solana
- **QuickNode Confidential Transfers Tutorial:** https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/confidential

## Key Takeaways

1. **Confidential Transfers are currently disabled on mainnet** pending security audit—the most promising native privacy solution but not yet usable in production.

2. **Light Protocol is operational** but requires custom integration and ZK expertise—best option for privacy needs today.

3. **Addresses are always visible on Solana**—privacy solutions hide amounts and balances, not participants.

4. **Mixer-style approaches are legally risky**—Tornado Cash sanctions show government hostility to transaction-breaking privacy.

5. **Privacy + Compliance is the future**—Modern solutions integrate view keys, audit keys, and attestations to balance privacy with regulatory requirements.

6. **User experience still evolving**—Proof generation, encrypted balance management, and wallet support are improving but not yet mainstream-ready.

Solana's privacy landscape is rapidly evolving. What's unavailable today may be standard tomorrow, but patience is required as security audits and compliance frameworks mature.
