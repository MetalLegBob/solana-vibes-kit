# Unified Architectural Understanding

**Project:** {PROJECT_NAME}
**Generated:** {TIMESTAMP}
**Source:** Stronghold of Security Phase 2 Synthesis

---

## Executive Summary

{2-3 paragraphs summarizing the overall architecture from a security perspective}

---

## System Overview

### Core Components

| Component | Purpose | Location | Security Role |
|-----------|---------|----------|---------------|
| {Name} | {What it does} | `{path}` | {How it affects security} |

### Data Flow Diagram

```
{ASCII diagram of how data flows through the system}

User → Entry Point → Validation → Core Logic → State Changes → Response
         │              │             │              │
         ▼              ▼             ▼              ▼
    [Details]      [Details]     [Details]      [Details]
```

---

## Trust Model

### Actors

| Actor | Trust Level | Capabilities | Entry Points |
|-------|-------------|--------------|--------------|
| Anonymous User | UNTRUSTED | {What they can do} | {Which functions} |
| Authenticated User | PARTIAL | {What they can do} | {Which functions} |
| Admin/Authority | TRUSTED | {What they can do} | {Which functions} |
| External Protocol | UNTRUSTED | {What they can do} | {CPI calls} |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                    │
│    - All user input                                  │
│    - All external accounts                           │
│    - All instruction arguments                       │
├─────────────────────────────────────────────────────┤
│                    VALIDATION LAYER                  │
│    - Account validation                              │
│    - Signer verification                             │
│    - Amount/argument validation                      │
├─────────────────────────────────────────────────────┤
│                    TRUSTED ZONE                      │
│    - Validated accounts                              │
│    - PDAs with correct seeds                         │
│    - Post-validation state                           │
└─────────────────────────────────────────────────────┘
```

---

## State Management

### Critical State Variables

| State | Location | Modified By | Read By | Invariants |
|-------|----------|-------------|---------|------------|
| {name} | `{file}:{struct}` | {functions} | {functions} | {what must always be true} |

### State Lifecycle

```
{State machine diagram if applicable}

UNINITIALIZED → INITIALIZED → ACTIVE → [PAUSED] → CLOSED
      │              │           │          │          │
   (init)       (activate)   (pause)   (resume)   (close)
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

### CPI Targets

| Program | Purpose | Validation | Trust Level |
|---------|---------|------------|-------------|
| SPL Token | Token transfers | `Program<'info, Token>` | HIGH |
| {Other} | {Purpose} | {How validated} | {Trust level} |

### Oracles/External Data

| Source | Data Type | Usage | Validation |
|--------|-----------|-------|------------|
| {Name} | {What data} | {How used} | {Staleness check, etc.} |

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

| Operation | Anonymous | User | Operator | Admin | Super Admin |
|-----------|-----------|------|----------|-------|-------------|
| {Operation 1} | - | Own | All | All | All |
| {Operation 2} | - | - | - | Yes | Yes |
| {Operation 3} | - | - | - | - | Yes |

---

## Economic Model

### Value Flows

```
{Diagram of how value/tokens flow through the system}

User Deposit → Pool → Yield Generation → Fee Extraction → User Withdrawal
                          │
                          ▼
                    Protocol Treasury
```

### Fee Structure

| Fee Type | Rate | Collection Point | Destination |
|----------|------|------------------|-------------|
| {Name} | {%} | {Where collected} | {Where it goes} |

### Economic Invariants

- {Invariant 1: e.g., total_shares * price_per_share == total_assets}
- {Invariant 2}
- {Invariant 3}

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
| {Pattern name} | {N} | {file list} | {Consistent/Varies} |

### Shared Assumptions

Assumptions made across multiple components:

1. **{Assumption}**: Relied upon by {components}
2. **{Assumption}**: Relied upon by {components}

---

## Attack Surface Summary

### Entry Points by Risk

| Risk Level | Entry Point | Why This Risk |
|------------|-------------|---------------|
| HIGH | `{function}` | {Reason} |
| HIGH | `{function}` | {Reason} |
| MEDIUM | `{function}` | {Reason} |

### Known Constraints

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
| Access Control | Token | Authority validation | Same pattern used |
| Arithmetic | Oracle | Price calculations | Precision concerns |

### Contradictions or Tensions

| Area | Observation A | Observation B | Resolution |
|------|---------------|---------------|------------|
| {Area} | {One finding} | {Contradicting finding} | {How to interpret} |

---

**This document synthesizes findings from 10 parallel context audits.**
**Use this as the foundation for attack strategy generation.**
