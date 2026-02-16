---
pack: solana
type: topic-tree-extension
extends: "Tech Stack > On-Chain / Smart Contracts, Security & Access Control"
---

# CPI Architecture & Security

## Extension Point
Extends:
- Tech Stack > On-Chain / Smart Contracts > [DOMAIN_PACK] full on-chain architecture tree
- Security & Access Control > [DOMAIN_PACK] domain-specific security concerns

## Tree

```
CPI Architecture & Security
├── CPI Topology & Program Graph
│   ├── What is your program's CPI topology?
│   │   ├── Hub-and-spoke (one central program, many peripherals)?
│   │   │   └── What is the hub program? (core logic, registry, router)
│   │   ├── Peer-to-peer (programs call each other directly)?
│   │   │   └── How many programs are in the mesh? (map the call graph)
│   │   ├── Layered (clear separation: UI → router → core → primitives)?
│   │   │   └── What are the layer boundaries?
│   │   └── Monolithic (single program, minimal external CPIs)?
│   ├── Which external programs do you CPI into?
│   │   ├── SPL Token / Token-2022 (transfers, mints, burns)?
│   │   ├── System Program (account creation, lamport transfers)?
│   │   ├── Other DeFi protocols (AMMs, lending, staking)?
│   │   │   └── Which ones? (Raydium, Orca, Marinade, Jupiter, etc.)
│   │   ├── Oracles (Pyth, Switchboard)?
│   │   ├── Metaplex (NFT operations)?
│   │   └── Custom programs (your own multi-program architecture)?
│   ├── Which programs CPI into yours?
│   │   ├── Do you have public CPI interfaces for composability?
│   │   └── Do you restrict who can call via program ID checks?
│   └── What is the maximum CPI depth?
│       └── Have you tested stack depth limits? (Solana limit is 4)
├── Trust Model & Program Validation
│   ├── How do you validate calling programs?
│   │   ├── Do you check `invoke_signed` caller program ID?
│   │   ├── Do you maintain a whitelist of trusted programs?
│   │   │   └── How is the whitelist managed? (on-chain registry, hardcoded)
│   │   ├── Do you allow any program to call (fully permissionless)?
│   │   └── Do you use program-derived authorities to enforce trust?
│   ├── How do you validate accounts passed via CPI?
│   │   ├── Owner checks (ensure account owned by expected program)?
│   │   ├── PDA derivation re-verification (prevent account substitution)?
│   │   ├── Discriminator validation (Anchor account type)?
│   │   ├── Balance/data sanity checks (not zero, within bounds)?
│   │   └── Signer checks (who authorized this action)?
│   ├── Do you trust account data from upstream CPIs?
│   │   ├── Or do you re-validate everything after CPI returns?
│   │   └── What data do you specifically re-check?
│   └── How do you handle untrusted or arbitrary program CPIs?
│       ├── Do you ever invoke arbitrary program IDs (e.g., router pattern)?
│       └── What safeguards prevent malicious program injection?
├── PDA Signing & Authority Delegation
│   ├── Which PDAs act as signers in your program?
│   │   └── List the PDA seeds and their purposes
│   ├── Do you use inner signing (PDA signs for downstream CPI)?
│   │   ├── What authority does the PDA represent? (vault, protocol, user proxy)
│   │   └── How do you prevent unauthorized use of PDA authority?
│   ├── Do you use outer signing (user signs, PDA validates)?
│   │   └── What are the validation rules?
│   ├── Do you delegate authority across CPI boundaries?
│   │   ├── Via PDA seeds (derived authority)?
│   │   ├── Via on-chain approval accounts (explicit delegation)?
│   │   └── Via token account delegate (SPL token delegation)?
│   ├── Can authority be revoked or rotated?
│   │   └── How? (on-chain state update, new PDA derivation)
│   └── Do you use bump seed validation?
│       └── Do you store canonical bumps or derive them on-chain?
├── CPI Error Handling & Propagation
│   ├── How do you handle errors from downstream CPIs?
│   │   ├── Propagate errors up (let caller handle)?
│   │   ├── Catch and retry with different parameters?
│   │   ├── Catch and fall back to alternative logic?
│   │   └── Log and continue (risky, only if non-critical)?
│   ├── Do you wrap CPI errors with context?
│   │   └── How do you preserve error information through the call stack?
│   ├── What happens if a mid-transaction CPI fails?
│   │   ├── Entire transaction reverts (default Solana behavior)?
│   │   └── Do you rely on partial transaction state? (NO - it all reverts)
│   └── Do you have CPI-specific error codes?
│       └── How do you distinguish your errors from downstream errors?
├── Re-entrancy Protection
│   ├── Can your program be re-entered via CPI?
│   │   ├── Scenario: Your program → External program → CPI back to you
│   │   └── Is this intentionally allowed or must be prevented?
│   ├── What re-entrancy guards do you use?
│   │   ├── Status flag in program state (lock/unlock pattern)?
│   │   │   └── Where is the flag stored? (global PDA, per-user account)
│   │   ├── Increment-only nonce (detect unexpected state changes)?
│   │   ├── Disallow CPI from self (check caller program ID != self)?
│   │   └── Anchor's `#[access_control]` macro?
│   ├── Have you tested cross-program re-entrancy scenarios?
│   │   └── What happens if: A → B → C → A?
│   └── Are there legitimate re-entrant use cases?
│       └── Example: Flash loan callback that re-enters pool for arbitrage
├── Account State Consistency Across CPIs
│   ├── Do you modify account state, then CPI, then modify again?
│   │   └── Risk: CPI could see intermediate state or re-enter
│   ├── Do you use check-effect-interaction pattern?
│   │   ├── 1. Validate all inputs (checks)
│   │   ├── 2. Update state (effects)
│   │   └── 3. Make external calls (interactions)
│   ├── Do you read account data after CPI returns?
│   │   └── Could the CPI have modified shared accounts unexpectedly?
│   ├── How do you handle accounts that multiple programs write to?
│   │   ├── Example: Shared vault, oracle account, registry
│   │   └── Do you lock accounts or use versioning?
│   └── Do you use instruction introspection?
│       └── To verify no unexpected instructions are in the same transaction?
└── CPI Gas & Compute Budget
    ├── How much compute do your CPIs consume?
    │   └── Have you profiled worst-case CPI chains?
    ├── Do you request additional compute units?
    │   ├── Via ComputeBudgetProgram instruction?
    │   └── What is your max compute budget?
    ├── Do you optimize CPI calls for gas?
    │   ├── Batch operations where possible?
    │   ├── Use `invoke` vs `invoke_signed` appropriately?
    │   └── Minimize account cloning/serialization?
    └── What is your fallback if compute budget is exceeded?
        └── Can operations be split across multiple transactions?
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "Single program, no CPIs" | Entire tree |
| "Only CPI to SPL Token, no custom programs" | Complex topology and trust model branches |
| "No programs call into ours (no public CPI interface)" | Inbound CPI validation branches |
| "Simple PDA signing, no delegation" | Complex authority delegation branches |
| "No re-entrancy risk (design prevents it)" | Re-entrancy protection details |

## Creative Doc Triggers

| Signal | Suggest |
|--------|---------|
| Complex multi-program topology (3+ programs) | Create "Program Call Graph Diagram" showing CPI flow with arrows and trust boundaries |
| Hub-and-spoke or layered architecture | Create "CPI Layer Diagram" showing separation of concerns |
| PDA signing with multiple seeds | Create "PDA Authority Table" listing each PDA, its seeds, and what it can sign for |
| Re-entrancy guards with status flags | Create "Re-entrancy Protection Pattern" code example |
| Whitelist of trusted programs | Create "Trusted Program Registry" table with program IDs and purposes |
| Complex error propagation strategy | Create "CPI Error Handling Flowchart" |
| Custom CPI interfaces for composability | Create "CPI Interface Reference" documenting public entry points |
| Instruction introspection for security | Create "Transaction Validation Logic" showing introspection checks |
