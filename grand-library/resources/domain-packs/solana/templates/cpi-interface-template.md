---
doc_id: cpi-interface
title: "CPI Interface Contract"
wave: 2
requires: [architecture, program-spec-*]
provides: [cpi-interface]
status: draft
decisions_referenced: []
needs_verification: []
---

# CPI Interface Contract

## Overview

{Which programs call which, and the trust model between them.}

## Program Interaction Map

```
{Visual diagram showing CPI relationships between programs}

Program A ──CPI──▸ Program B
    │                  │
    └──CPI──▸ Token Program
```

## Interfaces

### {CallerProgram} → {TargetProgram}

**Direction:** {one-way | bidirectional}
**Trust level:** {trusted — same team | untrusted — third-party | semi-trusted}

#### {instruction_name} CPI

**When called:** {under what conditions}

**Accounts passed:**

| Account | Source | Mutable | Signer | Notes |
|---------|--------|---------|--------|-------|
| | | | | |

**Signer seeds:** `[{seeds for PDA signing}]`

**Data:**

| Field | Type | Description |
|-------|------|-------------|
| | | |

**Return value:** {if using return data}

**Failure handling:**

{What happens if this CPI fails? Does the caller roll back? Retry? Skip?}

---

## Security Model

### Signer Authority

{Which PDAs sign for which CPIs, and why.}

### Re-entrancy Considerations

{Can any CPI chain lead to re-entrancy? How is it prevented?}

### Account Confusion Risks

{Could an attacker substitute accounts to redirect CPI behavior?}

## Third-Party Program Dependencies

| Program | Address | Upgradeable? | Risk if Changed |
|---------|---------|-------------|-----------------|
| Token Program | TokenkegQ... | No | N/A |
| Token-2022 | TokenzQd... | No | N/A |
| | | | |
