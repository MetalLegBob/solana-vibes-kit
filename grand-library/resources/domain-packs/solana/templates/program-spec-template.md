---
doc_id: program-spec-{program_name}
title: "{Program Name} — Program Specification"
wave: 2
requires: [architecture, data-model]
provides: [program-spec-{program_name}]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Program Name} — Program Specification

## Overview

{What this program does, its role in the system, and key invariants.}

## Instructions

### {instruction_name}

**Access:** {public | admin | role-restricted}

**Accounts:**

| Account | Type | Mutable | Signer | Description |
|---------|------|---------|--------|-------------|
| | | | | |

**Args:**

| Arg | Type | Description | Constraints |
|-----|------|-------------|-------------|
| | | | |

**Behavior:**

{Step-by-step description of what happens when this instruction executes.}

**Error Cases:**

| Error | Code | When | Recovery |
|-------|------|------|----------|
| | | | |

**Events Emitted:**

{What events/logs are produced.}

---

## Accounts

### {AccountName}

**Size:** {bytes}
**Seeds:** [{seed derivation}]
**Bump:** {canonical bump storage}

| Field | Type | Offset | Description |
|-------|------|--------|-------------|
| | | | |

**Invariants:**

{Conditions that must always be true for this account.}

---

## Cross-Program Invocations (CPI)

### Outgoing CPIs

| Target Program | Instruction | When | Signer Seeds |
|---------------|-------------|------|--------------|
| | | | |

### Incoming CPIs (from other programs)

| Source Program | Instruction | Validation |
|---------------|-------------|------------|
| | | |

---

## Security Considerations

{Program-specific security notes — re-initialization guards, authority checks, arithmetic overflow, etc.}

## Compute Budget

{Expected compute units per instruction. Flag any that approach limits.}
