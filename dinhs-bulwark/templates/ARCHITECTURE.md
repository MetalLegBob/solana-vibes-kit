# Unified Off-Chain Architectural Understanding

**Project:** {PROJECT_NAME}
**Generated:** {TIMESTAMP}
**Source:** Dinh's Bulwark Phase 2 Synthesis

---

## Executive Summary

{2-3 paragraphs summarizing the overall off-chain architecture from a security perspective}

---

## System Overview

### Core Components

| Component | Type | Purpose | Location | Security Role |
|-----------|------|---------|----------|---------------|
| {Name} | API/Backend/Bot/Frontend/Infra | {What it does} | `{path}` | {How it affects security} |

### Technology Stack

| Layer | Technology | Version | Security Notes |
|-------|-----------|---------|----------------|
| Runtime | Node.js / Python / Rust | {ver} | {Notes} |
| Framework | Express / FastAPI / Actix | {ver} | {Notes} |
| Database | PostgreSQL / Redis / etc | {ver} | {Notes} |
| Blockchain | @solana/web3.js / anchor-client | {ver} | {Notes} |

### Data Flow Diagram

```
{ASCII diagram of how data flows through the off-chain system}

User → Frontend → API Gateway → Backend → Database
                      │              │
                      ▼              ▼
                 [Auth Layer]   [RPC Client] → Solana
                                     │
                                     ▼
                              [Transaction Builder]
```

---

## Trust Model

### Actors

| Actor | Trust Level | Capabilities | Entry Points |
|-------|-------------|--------------|--------------|
| Anonymous User | UNTRUSTED | Public endpoints, static assets | {Which routes} |
| Authenticated User | PARTIAL | Authenticated endpoints, own data | {Which routes} |
| Admin | TRUSTED | Admin endpoints, all data | {Which routes} |
| Keeper/Crank | SYSTEM | Automated operations | {Which services} |
| External API | UNTRUSTED | Callback/webhook data | {Which endpoints} |
| RPC Node | PARTIAL | Blockchain state, tx submission | {Which clients} |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                    │
│    - All user input (forms, headers, params)        │
│    - External API responses                         │
│    - Webhook payloads                               │
│    - RPC node responses                             │
├─────────────────────────────────────────────────────┤
│                    VALIDATION LAYER                  │
│    - Input validation & sanitization                │
│    - Authentication middleware                      │
│    - Rate limiting                                  │
│    - Request signing verification                   │
├─────────────────────────────────────────────────────┤
│                    TRUSTED ZONE                      │
│    - Validated & authenticated requests             │
│    - Internal service calls                         │
│    - Database queries with parameterized inputs     │
│    - Signed transactions                            │
├─────────────────────────────────────────────────────┤
│                    SENSITIVE ZONE                    │
│    - Private keys & signing operations              │
│    - Secret management                              │
│    - Admin operations                               │
│    - Direct blockchain state mutations              │
└─────────────────────────────────────────────────────┘
```

---

## State Management

### Critical State Stores

| Store | Type | Contents | Access Pattern | Security Concerns |
|-------|------|----------|----------------|-------------------|
| {name} | PostgreSQL/Redis/File | {What's stored} | {Read/Write patterns} | {Injection, race conditions, etc.} |

### Session & Auth State

| Mechanism | Storage | Lifetime | Revocation |
|-----------|---------|----------|------------|
| {JWT/Session/API Key} | {Where stored} | {TTL} | {How revoked} |

### State Lifecycle

```
{State machine diagram if applicable}

REQUEST → VALIDATED → PROCESSED → COMMITTED → CONFIRMED
   │          │            │           │            │
 (input)  (middleware)  (handler)  (database)   (blockchain)
```

---

## Key Mechanisms

### Mechanism 1: {Name}

**Purpose:** {Why this exists}

**How it works:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Key files:**
- `{file1}`: {role}
- `{file2}`: {role}

**Security considerations:**
- {Consideration 1}
- {Consideration 2}

### Mechanism 2: {Name}

{Same format}

---

## External Dependencies

### Blockchain Interaction

| Operation | Method | Library | Validation | Risk |
|-----------|--------|---------|------------|------|
| Read state | RPC call | @solana/web3.js | {How validated} | {Stale data, spoofing} |
| Submit tx | sendTransaction | {library} | {Confirmation level} | {Frontrunning, drops} |
| {Other} | {Method} | {Library} | {How validated} | {Risk} |

### External APIs & Services

| Service | Purpose | Auth Method | Failure Mode | Trust Level |
|---------|---------|-------------|--------------|-------------|
| {Name} | {What data/service} | {API key/OAuth/etc} | {What happens on failure} | {Trust level} |

### Package Dependencies

| Package | Version | Purpose | Known Vulnerabilities |
|---------|---------|---------|----------------------|
| {name} | {ver} | {Why used} | {CVEs or "None known"} |

---

## API Surface

### Public Endpoints

| Method | Path | Auth Required | Input Validation | Rate Limited |
|--------|------|---------------|------------------|--------------|
| {GET/POST} | `{/path}` | {Yes/No} | {How validated} | {Yes/No} |

### Internal Endpoints

| Method | Path | Access Control | Purpose |
|--------|------|----------------|---------|
| {Method} | `{/path}` | {How restricted} | {Purpose} |

### Webhook/Callback Endpoints

| Path | Source | Signature Verification | Replay Protection |
|------|--------|------------------------|-------------------|
| `{/path}` | {Service} | {How verified} | {How protected} |

---

## Access Control Summary

### Role Hierarchy

```
Super Admin
    │
    ├── Admin
    │       │
    │       └── Operator
    │
    └── User (self-only operations)
```

### Permission Matrix

| Operation | Anonymous | User | Operator | Admin | System/Crank |
|-----------|-----------|------|----------|-------|--------------|
| {Operation 1} | - | Own | All | All | All |
| {Operation 2} | - | - | - | Yes | Yes |

---

## Secret Management

### Secrets Inventory

| Secret | Type | Storage | Rotation | Access |
|--------|------|---------|----------|--------|
| {Name} | Private key / API key / etc | {Env var / KMS / File} | {Policy} | {Who/what accesses} |

### Key Usage Patterns

| Key | Used For | Signing Flow | Exposure Risk |
|-----|----------|-------------|---------------|
| {Name} | {Transaction signing / API auth} | {How key is used} | {Where key could leak} |

---

## On-Chain / Off-Chain Interface

### Transaction Construction

| Transaction Type | Builder Location | Signer | Validation Before Send |
|-----------------|------------------|--------|----------------------|
| {Type} | `{file}:{function}` | {Which key} | {What's checked} |

### State Synchronization

| Direction | What | Mechanism | Consistency Guarantee |
|-----------|------|-----------|----------------------|
| Chain → Off-chain | {State} | {Polling/Websocket/Webhook} | {Eventual/Strong} |
| Off-chain → Chain | {State} | {Transaction} | {Confirmed/Finalized} |

{If SOS audit available:}
### SOS Cross-Reference

On-chain assumptions about off-chain behavior (from `.audit/ARCHITECTURE.md`):
- {Assumption 1}: {How off-chain code honors or violates this}
- {Assumption 2}: {How off-chain code honors or violates this}

---

## High-Complexity Areas

Areas identified by multiple focus auditors as complex or risky:

### Area 1: {Name}

**Identified by:** {Which focus areas flagged this}

**Why complex:**
- {Reason 1}
- {Reason 2}

**Key code:** `{file}:{lines}`

### Area 2: {Name}

{Same format}

---

## Cross-Cutting Concerns

### Patterns Used Across Codebase

| Pattern | Usage Count | Locations | Consistency |
|---------|-------------|-----------|-------------|
| {Error handling pattern} | {N} | {file list} | {Consistent/Varies} |
| {Auth pattern} | {N} | {file list} | {Consistent/Varies} |

### Shared Assumptions

Assumptions made across multiple components:

1. **{Assumption}**: Relied upon by {components}
2. **{Assumption}**: Relied upon by {components}

---

## Attack Surface Summary

### Entry Points by Risk

| Risk Level | Entry Point | Type | Why This Risk |
|------------|-------------|------|---------------|
| HIGH | `{route/function}` | API/Webhook/Cron | {Reason} |
| MEDIUM | `{route/function}` | API/Webhook/Cron | {Reason} |

### Known Protections

Protections observed:

- {Protection 1}: `{location}`
- {Protection 2}: `{location}`

### Open Questions

Questions that emerged during synthesis:

1. {Question about architecture}
2. {Question about design decision}

---

## Appendix: Focus Area Cross-References

### Where Focus Areas Intersected

| Focus A | Focus B | Intersection Point | Notes |
|---------|---------|-------------------|-------|
| Secrets & Keys | Transaction Construction | Key usage in signing | Same key accessed differently |
| Auth & Session | Frontend | Token handling | Client-side storage concerns |

### Contradictions or Tensions

| Area | Observation A | Observation B | Resolution |
|------|---------------|---------------|------------|
| {Area} | {One finding} | {Contradicting finding} | {How to interpret} |

---

**This document synthesizes findings from 8 parallel off-chain context audits.**
**Use this as the foundation for attack strategy generation.**
