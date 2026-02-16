---
doc_id: deployment-sequence
title: "On-Chain Deployment Sequence"
wave: 3
requires: [architecture, program-spec-*, account-layout]
provides: [deployment-sequence]
status: draft
decisions_referenced: []
needs_verification: []
---

# On-Chain Deployment Sequence

## Overview

{Deployment strategy — order of operations, dependencies, rollback plan.}

## Pre-Deployment Checklist

- [ ] All programs pass `anchor test` / `cargo test-sbf`
- [ ] Security audit complete (if applicable)
- [ ] Deployment keypairs generated and secured
- [ ] Upgrade authority multi-sig configured
- [ ] Mainnet RPC endpoint verified
- [ ] Sufficient SOL for deployment + rent
- [ ] Program IDs declared in `Anchor.toml` / `declare_id!`
- [ ] IDL generated and verified

## Deployment Order

### Step 1: {Program/Action Name}

**Network:** {devnet | mainnet-beta}

**Command:**

```bash
{deployment command}
```

**Verify:**

```bash
{verification command}
```

**Rollback:** {what to do if this fails}
**Depends on:** {previous steps}

---

## Post-Deployment Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Program deployed | `solana program show {id}` | Shows program info |
| Accounts initialized | {verify command} | {expected state} |
| CPI working | {test transaction} | {expected outcome} |

## Upgrade Procedure

### Planned Upgrade

1. {step-by-step upgrade procedure}

### Emergency Upgrade

1. {expedited procedure for critical fixes}

### Rollback Procedure

1. {how to revert to previous version}

## Authority Management

| Authority | Type | Holder | Transfer Plan |
|-----------|------|--------|---------------|
| Upgrade authority | {single-sig / multi-sig} | {who} | {when to transfer/revoke} |
| Mint authority | | | |
| Freeze authority | | | |

## Environment Configuration

| Setting | Devnet | Mainnet |
|---------|--------|---------|
| RPC URL | | |
| Program ID | | |
| Admin wallet | | |
