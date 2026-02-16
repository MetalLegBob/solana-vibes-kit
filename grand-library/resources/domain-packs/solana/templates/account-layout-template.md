---
doc_id: account-layout
title: "Account Layout Reference"
wave: 2
requires: [architecture, data-model]
provides: [account-layout]
status: draft
decisions_referenced: []
needs_verification: []
---

# Account Layout Reference

## Overview

{High-level map of all on-chain accounts, their relationships, and derivation patterns.}

## Account Map

```
{Visual diagram showing account relationships and PDA derivation trees}
```

## Accounts

### {AccountName}

**Program:** {which program owns this}
**Type:** PDA | Keypair | Token Account | Mint
**Seeds:** `[{seed_1}, {seed_2}, ...]`
**Size:** {discriminator} + {fields} = {total} bytes
**Rent:** {lamports} SOL

| Field | Type | Size | Offset | Description |
|-------|------|------|--------|-------------|
| discriminator | u8[8] | 8 | 0 | Anchor discriminator |
| | | | | |

**Lifetime:** {Created when → Closed when}
**Growth:** {Fixed size | Variable — max {N} bytes}

---

## Rent Costs Summary

| Account | Size (bytes) | Rent (SOL) | Quantity | Total |
|---------|-------------|------------|----------|-------|
| | | | | |

**Total rent budget:** {sum} SOL

## PDA Derivation Tree

```
Program ID
├── ["prefix", user_pubkey] → UserAccount
│   ├── ["sub", user_account, index] → SubAccount
│   └── ...
└── ["global"] → GlobalConfig
```

## Account Validation Checklist

{For each account accessed in instructions — what must be validated?}

| Account | Owner Check | Discriminator | Seeds Match | Additional |
|---------|-------------|---------------|-------------|------------|
| | | | | |
