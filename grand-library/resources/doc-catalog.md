---
skill: grand-library
type: doc-catalog
version: "1.0.0"
description: >
  Master catalog of document types Grand Library can produce.
  Phase 0 selects from this catalog to build the project's DOC_MANIFEST.
  Documents are organized by wave (generation order).
---

# Document Catalog

## Wave 1 — Foundation (always generated, validated before continuing)

| Doc ID | Title | Requires (topics) | Description |
|--------|-------|-------------------|-------------|
| project-overview | Project Overview | core-vision | High-level summary: what, why, who, scope |
| architecture | Architecture | tech-stack | Components, communication, deployment topology |
| data-model | Data Model | data-model | Entities, relationships, storage, data flow |

## Wave 2 — Core Specs (parallel, depend on Wave 1)

| Doc ID | Title | Requires (topics) | Description |
|--------|-------|-------------------|-------------|
| feature-spec-{name} | Feature Specification | varies | One per major feature — behavior, inputs, outputs, edge cases |
| api-reference | API Reference | backend | Endpoints, request/response schemas, auth, errors |
| frontend-spec | Frontend Specification | frontend | Pages, components, state, user flows |

## Wave 3 — Cross-cutting (parallel, depend on Wave 2)

| Doc ID | Title | Requires (topics) | Description |
|--------|-------|-------------------|-------------|
| deployment-sequence | Deployment Sequence | architecture, infra | Step-by-step deployment procedure |
| security-model | Security Model | security | Threat model, access control matrix, data protection |
| error-handling-playbook | Error Handling Playbook | error-handling | Every error type, what causes it, how to recover |
| test-plan | End-to-End Test Plan | testing | Test strategy, cases, environments, acceptance criteria |

## Wave 4 — Creative / Exploratory (optional, context-dependent)

| Doc ID | Title | Trigger | Description |
|--------|-------|---------|-------------|
| edge-case-analysis | Edge Case Analysis | complex logic | Boundary conditions, corner cases, unexpected inputs |
| migration-strategy | Migration Strategy | migration mentioned | How to move from old to new system safely |
| failure-mode-catalog | Failure Mode Catalog | distributed system | What fails, blast radius, recovery steps |
| admin-emergency-procedures | Admin Emergency Procedures | privileged ops | What admins do when things go wrong |
| service-degradation-playbook | Service Degradation Playbook | external deps | What happens when dependencies fail |
| concurrency-catalog | Concurrency & Race Conditions | multi-user | Race conditions, deadlocks, ordering guarantees |

## Domain Pack Extensions

Domain packs add to this catalog. For example, a Solana pack would add:
- Program Specification (per on-chain program)
- Account Layout Reference
- CPI Interface Contract
- Token Economics Model
- On-Chain Deployment Sequence

These are added to the catalog dynamically when a pack is loaded.
