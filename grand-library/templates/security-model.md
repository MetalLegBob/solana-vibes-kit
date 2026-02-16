---
doc_id: security-model
title: "Security Model"
wave: 3
requires: [architecture]
provides: [security-model]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Security Model

## Threat Model Overview

{What are the main categories of threats this system faces?}

## Actors

| Actor | Trust Level | Capabilities | Threats |
|-------|-------------|-------------|---------|
| | | | |

## Authentication

**Mechanism:** {OAuth 2.0, JWT, API keys, wallet signatures, etc.}

{Detailed description of auth flow.}

### Auth Flow

1. {Step}
2. {Step}
3. ...

### Session Management

{Session duration, refresh tokens, revocation, concurrent sessions.}

## Authorization

**Model:** {RBAC, ABAC, capability-based, etc.}

### Roles & Permissions

| Role | Permissions | Restrictions |
|------|-------------|-------------|
| | | |

### Access Control Matrix

| Resource | Public | User | Admin | System |
|----------|--------|------|-------|--------|
| | | | | |

## Sensitive Operations

| Operation | Required Auth | Rate Limited | Audit Logged | Confirmation |
|-----------|--------------|-------------|--------------|-------------|
| | | | | |

## Data Protection

### Data Classification

| Classification | Examples | Encryption | Retention | Access |
|---------------|----------|------------|-----------|--------|
| | | | | |

### Encryption

- **At rest:** {approach}
- **In transit:** {approach}
- **Key management:** {approach}

## Compliance

{Regulatory requirements — GDPR, SOC2, PCI-DSS, etc. How the system addresses each.}

## Security Checklist

- [ ] {security requirement}
