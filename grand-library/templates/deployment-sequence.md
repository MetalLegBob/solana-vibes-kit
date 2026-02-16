---
doc_id: deployment-sequence
title: "Deployment Sequence"
wave: 3
requires: [architecture]
provides: [deployment-sequence]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Deployment Sequence

## Overview

{High-level deployment strategy — what gets deployed, where, in what order.}

## Prerequisites

{What must be in place before deployment. Credentials, infrastructure, DNS, etc.}

- [ ] {prerequisite}

## Environment Configuration

| Variable | Dev | Staging | Production | Description |
|----------|-----|---------|------------|-------------|
| | | | | |

## Deployment Order

{Components must be deployed in this order. Explain why order matters.}

### Step 1: {Component}

**Deploy to:** {where}
**Method:** {how — CI/CD, manual, script}

```bash
{exact commands or reference to CI/CD config}
```

**Verify:**
```bash
{health check or verification command}
```

**Rollback:**
```bash
{exact rollback procedure}
```

---

{Repeat for each deployment step.}

## Post-Deployment Verification

| Check | Command / URL | Expected Result |
|-------|--------------|-----------------#|
| | | |

## Rollback Plan

{Complete rollback procedure if deployment fails at any step. Include data rollback if applicable.}

## Monitoring & Alerts

{What to watch after deployment. Expected metrics, alert thresholds.}
