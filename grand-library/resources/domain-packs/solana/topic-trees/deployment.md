---
pack: solana
type: topic-tree-extension
extends: "Tech Stack > Overall Architecture, Tech Stack > Backend / Server, Tech Stack > On-Chain / Smart Contracts"
---

# Deployment & Operations

## Extension Point
Extends:
- Tech Stack > Overall Architecture > [DOMAIN_PACK] domain-specific architecture questions
- Tech Stack > Backend / Server > [DOMAIN_PACK] domain-specific backend questions
- Tech Stack > On-Chain / Smart Contracts > [DOMAIN_PACK] full on-chain architecture tree

## Tree

```
Deployment & Operations
├── Program Deployment Pipeline
│   ├── What is your deployment pipeline?
│   │   ├── Local testnet (solana-test-validator)?
│   │   │   └── For what purpose? (unit tests, local dev, CI)
│   │   ├── Devnet (public test network)?
│   │   │   └── How long do you test on devnet? (days, weeks)
│   │   ├── Testnet (deprecated but some use it)?
│   │   ├── Mainnet-beta staging (canary deployment)?
│   │   │   └── With limited users or full traffic?
│   │   └── Mainnet-beta production?
│   ├── Do you use a multi-stage deployment process?
│   │   ├── If yes: What are the stages and gates between them?
│   │   └── What criteria must be met to promote between stages?
│   ├── How do you deploy program upgrades?
│   │   ├── Direct upgrade (solana program deploy --upgrade)?
│   │   ├── Via multisig (Squads, Realm governance)?
│   │   │   └── What is the approval threshold?
│   │   ├── Time-locked upgrade (announce, wait, execute)?
│   │   │   └── What is the time lock duration?
│   │   └── Immutable programs (no upgrades allowed)?
│   ├── Do you use program derived addresses for program upgrades?
│   │   └── To preserve program ID across redeployments?
│   └── What is your rollback strategy?
│       ├── Can you revert to a previous program version?
│       └── How are program version artifacts stored? (Git tags, registry)
├── Upgrade Authority Management
│   ├── Who controls the program upgrade authority?
│   │   ├── Single keypair (risky, only for early testing)?
│   │   ├── Multisig (Squads Protocol, Realm, custom)?
│   │   │   └── What is the m-of-n threshold? (e.g., 3-of-5)
│   │   ├── Time-lock contract (programmable delay)?
│   │   ├── DAO governance (token-weighted voting)?
│   │   │   └── What is the proposal and voting process?
│   │   └── No upgrade authority (immutable program)?
│   │       └── At what point do you revoke upgrade authority?
│   ├── Is there a path to full immutability?
│   │   ├── If yes: What milestones trigger authority revocation?
│   │   └── If no: Why retain upgradeability indefinitely?
│   ├── Do you have an emergency upgrade process?
│   │   ├── Fast-track for critical security fixes?
│   │   └── Who can invoke emergency upgrades?
│   └── How do you communicate upgrades to users?
│       ├── On-chain announcement (event log)?
│       ├── Off-chain (Twitter, Discord, email)?
│       └── In-app notification?
├── IDL Management & Client Generation
│   ├── Do you publish an Anchor IDL?
│   │   ├── If yes: Where? (on-chain, GitHub, NPM, S3)
│   │   ├── Do you use `anchor idl init` to store IDL on-chain?
│   │   │   └── What is the IDL account address?
│   │   └── If no: How do clients know your interface? (manual docs)
│   ├── How do you version the IDL?
│   │   ├── Semantic versioning (1.0.0, 1.1.0, 2.0.0)?
│   │   ├── Git commit hash?
│   │   ├── Timestamp or deployment date?
│   │   └── How do clients request a specific IDL version?
│   ├── Do you auto-generate client libraries?
│   │   ├── TypeScript (Anchor default)?
│   │   ├── Rust (for other programs to CPI)?
│   │   ├── Python (via anchorpy)?
│   │   └── Other languages?
│   ├── How do you handle IDL breaking changes?
│   │   ├── Deprecation notices in old IDL?
│   │   ├── Maintain multiple IDL versions?
│   │   └── Migration guide for client developers?
│   └── Do you publish client SDKs separately?
│       └── Where? (NPM, crates.io, GitHub)
├── Verifiable Builds
│   ├── Do you support verifiable builds?
│   │   ├── If yes: Using which tool? (Anchor verify, Solana Verify, custom)
│   │   ├── Where is the source code? (GitHub, public repo)
│   │   └── What is the commit hash of the deployed program?
│   ├── Do you publish build instructions?
│   │   ├── Dockerfile for reproducible environment?
│   │   ├── Rust version and toolchain lockfile?
│   │   └── Anchor/Solana CLI versions?
│   ├── Have you verified the deployed program matches source?
│   │   ├── On-chain hash vs local build hash?
│   │   └── Who performed the verification? (team, third-party auditor)
│   └── Do you maintain a verification registry?
│       └── Example: solscan.io verified programs, SourceLookup
├── Account Initialization & Migration
│   ├── How do you initialize protocol state on deployment?
│   │   ├── Separate initialize instruction (called once)?
│   │   ├── Automatic on first use (lazy init)?
│   │   ├── Deployed with pre-initialized accounts?
│   │   └── Who has authority to initialize?
│   ├── Do you need to migrate existing account data?
│   │   ├── If yes: What is the migration strategy?
│   │   │   ├── Lazy migration (upgrade on next user interaction)?
│   │   │   ├── Batch migration (admin script upgrades all accounts)?
│   │   │   ├── User-triggered migration (users call upgrade instruction)?
│   │   │   └── New account creation (old accounts deprecated)?
│   │   └── How do you handle partially migrated states?
│   ├── Do you version account schemas?
│   │   ├── If yes: How do you detect account version? (discriminator, version field)
│   │   └── Can new program read old account versions?
│   ├── What is your account compatibility strategy?
│   │   ├── Forward compatible (new program, old accounts)?
│   │   ├── Backward compatible (old clients, new accounts)?
│   │   └── Breaking changes require migration?
│   └── Do you provide migration scripts or tools?
│       └── For users or protocol admin?
├── RPC Infrastructure
│   ├── What RPC provider(s) do you use?
│   │   ├── Public endpoints (Solana Foundation, free tier)?
│   │   ├── Paid RPC services (Helius, Quicknode, Triton, Alchemy)?
│   │   │   └── What tier/plan?
│   │   ├── Self-hosted RPC nodes?
│   │   │   └── How many nodes? (validator + RPC split)
│   │   └── Hybrid (primary + fallback)?
│   ├── Do you implement RPC failover?
│   │   ├── If yes: How many fallback RPCs?
│   │   ├── Automatic failover on timeout or error?
│   │   └── Health check mechanism?
│   ├── How do you handle RPC rate limits?
│   │   ├── Client-side rate limiting?
│   │   ├── Request batching?
│   │   ├── Caching (what data, how long)?
│   │   └── Paid tier to avoid limits?
│   ├── Do you use websocket subscriptions?
│   │   ├── For what? (account changes, logs, program events)
│   │   └── How do you handle websocket disconnections?
│   └── Do you run your own validator?
│       ├── If yes: For RPC, staking rewards, or both?
│       └── What is your validator stake?
├── Monitoring & Observability
│   ├── How do you monitor on-chain program health?
│   │   ├── Transaction success/failure rates?
│   │   ├── Compute unit usage trends?
│   │   ├── Account creation/deletion rates?
│   │   └── Protocol TVL, volume, or other KPIs?
│   ├── What monitoring tools do you use?
│   │   ├── Solana Beach, Solscan, Explorer?
│   │   ├── Custom dashboards (Grafana, Datadog)?
│   │   ├── On-chain analytics (Dune, Flipside)?
│   │   └── Real-time alerting (PagerDuty, Discord webhooks)?
│   ├── Do you index program events or logs?
│   │   ├── If yes: Using what? (Geyser plugin, Helius webhooks, custom)
│   │   └── Where do you store indexed data? (Postgres, Clickhouse, S3)
│   ├── How do you track program errors?
│   │   ├── Parse transaction logs for error codes?
│   │   ├── Sentry or error tracking service?
│   │   └── On-call rotation for critical errors?
│   ├── Do you monitor RPC performance?
│   │   ├── Latency metrics (p50, p95, p99)?
│   │   ├── Error rates by RPC provider?
│   │   └── Failover trigger thresholds?
│   └── Do you have user-facing status pages?
│       ├── Real-time uptime (status.yourprotocol.com)?
│       └── Incident postmortems?
└── Security & Incident Response
    ├── What is your security deployment checklist?
    │   ├── Audit completed (by whom, when)?
    │   ├── Bug bounty program active (Immunefi, self-hosted)?
    │   ├── Formal verification (if applicable)?
    │   ├── Testnet soak period (how long)?
    │   └── Gradual rollout (canary users)?
    ├── Do you have an incident response plan?
    │   ├── Emergency pause mechanism?
    │   │   └── Who can trigger pause? (multisig, guardian, DAO)
    │   ├── Emergency upgrade process (bypass time lock)?
    │   ├── Communication protocol (where, who, how fast)?
    │   └── Post-incident review process?
    ├── How do you handle security disclosures?
    │   ├── Responsible disclosure policy (where published)?
    │   ├── Bug bounty rewards (ranges, payout process)?
    │   └── Embargo period before public disclosure?
    ├── Do you have rollback or recovery mechanisms?
    │   ├── Account state snapshots (for rollback)?
    │   ├── Circuit breakers (automatic pause on anomaly)?
    │   └── Whitehat rescue operations (if funds at risk)?
    └── What insurance or risk mitigation do you have?
        ├── Protocol insurance (Nexus Mutual, etc.)?
        ├── Self-insurance fund (treasury reserve)?
        └── User loss compensation policy?
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "Still in local development, not deployed" | Mainnet deployment branches |
| "Not using Anchor" | IDL management branches |
| "Immutable program from day one" | Upgrade authority and migration branches |
| "Using public RPC, no custom infrastructure" | Self-hosted RPC and validator branches |
| "Pre-audit, no security measures yet" | Security and incident response (but warn this is risky) |

## Creative Doc Triggers

| Signal | Suggest |
|--------|---------|
| Multi-stage deployment pipeline (devnet → testnet → mainnet) | Create "Deployment Pipeline Diagram" showing stages and approval gates |
| Multisig upgrade authority with time lock | Create "Upgrade Authority Workflow" flowchart |
| IDL versioning with breaking changes | Create "IDL Changelog" documenting version history and breaking changes |
| Verifiable builds with public source | Create "Build Verification Guide" with step-by-step reproduction instructions |
| Complex account migration (lazy or batch) | Create "Account Migration Runbook" with scripts and validation steps |
| RPC failover with multiple providers | Create "RPC Configuration Table" showing primary, fallback, and health checks |
| Custom monitoring with Geyser or webhooks | Create "Event Indexing Architecture" diagram |
| Incident response with emergency pause | Create "Emergency Response Playbook" with roles and escalation steps |
| Bug bounty program | Create "Security Disclosure Policy" document with scope and rewards |
