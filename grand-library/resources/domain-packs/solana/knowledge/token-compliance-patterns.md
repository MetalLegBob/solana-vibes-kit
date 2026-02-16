---
pack: solana
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# Token Compliance Patterns on Solana

## Overview

When launching tokens on Solana, especially those that may be classified as securities or serve institutional use cases, you need compliance patterns that address KYC/AML, investor accreditation, transfer restrictions, and regulatory requirements. This guide covers practical implementation patterns—not legal advice.

## Securities Law Considerations

### The Howey Test

The SEC applies the Howey Test to determine if a token is a security. A token is likely a security if it involves:
1. An investment of money
2. In a common enterprise
3. With an expectation of profits
4. Based on the efforts of others

**Key takeaway:** If there's a centralized company controlling your token project and investors expect profits from that company's efforts, you're likely dealing with a security. Bitcoin avoids this because there's no central company and no joint enterprise.

### When Your Token is a Security

If your token passes the Howey Test, you need to either:
- Register with the SEC under applicable registration statements
- Qualify for an exemption (e.g., Regulation D for accredited investors)
- Implement compliance mechanisms to restrict transfers

Smart contracts can embed securities law requirements, including:
- Automated enforcement of Regulation D holding periods
- Accredited investor verification
- Transfer restrictions ensuring compliance with federal securities regulations

## On-Chain Compliance Patterns

### Token-2022 Transfer Hooks

The **Transfer Hook extension** in Token-2022 is the primary technical mechanism for enforcing compliance on Solana. Transfer hooks execute custom instruction logic on every token transfer.

**How it works:**
- Token issuers create a Mint Account with the Transfer Hook extension enabled
- Every transfer calls a custom program before completing
- The hook program can enforce arbitrary constraints (whitelist checks, KYC verification, transfer limits)

**Real-world example:**
- **Civic Pass Transfer Hook** enables token issuers to enforce constraints through Civic Pass, ensuring only KYC-verified wallets can hold/transfer tokens
- **Obligant** (RWA debt platform) uses transfer hooks for compliance checks
- Hooks can inject RWA-specific logic including pricing oracles, geofencing, or IPFS-pinned compliance policies

**Security note:** When Token Extensions CPIs to a Transfer Hook program, all accounts become read-only, meaning sender privileges don't extend to the hook program—preventing privilege escalation attacks.

### Solana Attestation Service (SAS)

Launched May 2025 by the Solana Foundation with Civic, Solid, Trusta Labs, and Solana.ID, SAS provides reusable identity attestations.

**What it does:**
- Users receive verifiable credentials (KYC, accredited investor status, geographic eligibility)
- Credentials are cryptographically signed by trusted issuers and linked to Solana wallets
- "KYC once, access everywhere" — one verification unlocks access across multiple dApps
- Enables proof of credentials without revealing sensitive data on-chain

**Use cases:**
- Accredited investor verification for security token offerings
- Geographic eligibility checks
- AML/sanctions screening attestations
- Institutional-grade compliance for RWAs

### Whitelist-Based Token Models

For permissioned tokens (common in RWAs and security tokens), whitelist patterns involve:

1. **Onboarding process:**
   - KYC/AML checks on wallet owner
   - Educational curriculum and investor appropriateness requirements
   - Wallet address added to approved whitelist

2. **On-chain enforcement:**
   - Transfer hook checks sender/receiver against whitelist
   - Only whitelisted addresses can hold or transact

3. **Real example — Galaxy Digital ($GLXY):**
   - First Nasdaq-listed company to tokenize SEC-registered equity on Solana
   - Requires KYC checks and wallet whitelisting via Superstate
   - Only verified addresses can hold/transfer $GLXY shares on-chain
   - As of September 2025: 32,374 GLXY shares tokenized

### Project Open Framework

Project Open proposes an "Open Platform for Equity Networks" with comprehensive compliance:

- All eligible wallets undergo whitelist onboarding with KYC checks
- Wallet owners complete market education and investor appropriateness curriculum
- Token Share issuers subject to periodic reporting under the '34 Act
- Integrates traditional securities compliance with on-chain token infrastructure

## Implementation Patterns

### Pattern 1: Transfer Hook + KYC Whitelist

**When to use:** Security tokens, RWAs, institutional DeFi requiring verified participants

**Implementation:**
```
1. Deploy Token-2022 mint with Transfer Hook extension
2. Integrate with SAS or Civic Pass for KYC verification
3. Maintain on-chain or off-chain whitelist of approved addresses
4. Transfer hook queries whitelist before allowing transfers
5. Admin functions to add/remove addresses from whitelist
```

**Pros:** Strong compliance, auditable, automated enforcement
**Cons:** Requires ongoing whitelist management, higher gas costs per transfer

### Pattern 2: Accredited Investor Gating

**When to use:** Regulation D offerings, private placements

**Implementation:**
```
1. Use SAS to issue accredited investor attestations
2. Transfer hook verifies attestation exists and is valid
3. Optional: Check holding periods for Reg D compliance
4. Automatically reject transfers that violate holding requirements
```

**Pros:** Automated Reg D compliance, reduces legal risk
**Cons:** Requires robust attestation infrastructure, users need to maintain credentials

### Pattern 3: Hybrid Off-Chain + On-Chain

**When to use:** Lower gas sensitivity, complex compliance logic

**Implementation:**
```
1. Off-chain service performs KYC/AML checks
2. Issues signed compliance certificates to approved wallets
3. Transfer hook verifies signature validity
4. Certificate includes expiration, jurisdiction, investor status
```

**Pros:** Flexible compliance logic, lower on-chain storage
**Cons:** Depends on off-chain infrastructure availability, certificate management overhead

## Real Regulatory Actions

The regulatory landscape for crypto tokens continues to evolve:

- **2024-2025:** Increased SEC scrutiny on token offerings
- **Marinade Finance:** Blocked UK users (October 2023) due to FCA compliance concerns
- **Galaxy Digital:** First Nasdaq company to tokenize equity on Solana with full SEC registration
- **General trend:** More institutional players seeking compliant on-chain solutions rather than avoiding regulation

## Key Compliance Considerations

### What Compliance Patterns DON'T Solve

- **Legal advice:** These are technical patterns, not legal strategies. Consult securities counsel.
- **Regulatory approval:** Implementing transfer restrictions doesn't automatically make a token compliant.
- **All jurisdictions:** These patterns focus on U.S. securities law; international offerings have additional requirements.

### What to Track

1. **Transfer restrictions:** Can your token be freely traded or must it stay with accredited investors?
2. **Holding periods:** Does Reg D or another exemption require lock-up periods?
3. **Reporting obligations:** If issuing security tokens, what periodic disclosures are required?
4. **Investor limits:** Does your exemption cap the number of investors?
5. **AML/sanctions:** Are you screening against OFAC lists? (See separate geo-blocking guide)

## Integration with Token-2022 Extensions

Compliance patterns work alongside other Token-2022 features:

- **Confidential Transfers:** Encrypt amounts while maintaining compliance transparency (currently disabled on mainnet pending audit)
- **Transfer Fees:** Automatic compliance fee collection (e.g., for regulatory reporting costs)
- **Permanent Delegate:** Enable compliance officer override for court orders or regulatory requirements
- **Metadata:** Store compliance documentation hashes on-chain

## Best Practices

1. **Design for auditability:** Ensure compliance actions are logged and traceable
2. **Fallback mechanisms:** What happens if attestation service is down? Grace periods vs hard fails
3. **Upgrade paths:** Can you update compliance logic without migrating token holders?
4. **User experience:** Balance compliance with usability—clear error messages when transfers fail
5. **Test thoroughly:** Compliance bugs can have severe regulatory consequences

## Resources

- **Solana Token Extensions Docs:** https://solana.com/solutions/token-extensions
- **Civic Pass Transfer Hook:** https://github.com/civicteam/token-extensions-transfer-hook
- **Solana Attestation Service:** https://www.blockchainx.tech/solana-attestation-services/
- **Transfer Hook Guide:** https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/transfer-hooks

## Quality Bar

This document provides practical compliance patterns based on real implementations (Galaxy Digital, Obligant, Civic) and technical capabilities of Token-2022. It is NOT legal advice. For token launches involving securities, consult with experienced securities counsel before implementation.
