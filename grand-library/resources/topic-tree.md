---
skill: grand-library
type: topic-tree
version: "1.0.0"
description: >
  General-purpose topic tree for software project interviews.
  Domain packs extend this with domain-specific branches.
  The survey phase may add project-specific topics based on discovery.
---

# General-Purpose Topic Tree

## How This Tree Works

- Topics are walked **top-down** during the interview
- **Pruning:** When the user's answer makes a subtopic irrelevant, skip it entirely
- **Branching:** When the user's answer reveals complexity, ask follow-up questions
- **Extension points:** Marked with `[DOMAIN_PACK]` — domain packs insert branches here
- Each topic maps to one or more documents in the DOC_MANIFEST

## Tree

```
Core Vision
├── Project Purpose & Goals
│   ├── What are you building? (one sentence)
│   ├── What problem does it solve?
│   ├── Who are the target users?
│   └── What does success look like?
├── Scope & Boundaries
│   ├── What's in scope for v1?
│   ├── What's explicitly out of scope?
│   └── What are the hard constraints? (time, budget, regulatory)
│
Tech Stack & Architecture
├── Overall Architecture
│   ├── Monolith vs microservices vs serverless?
│   ├── What are the major components?
│   ├── How do components communicate?
│   └── [DOMAIN_PACK] domain-specific architecture questions
├── Backend / Server
│   ├── Language & framework
│   ├── API style (REST, GraphQL, RPC, etc.)
│   ├── Authentication & authorization approach
│   └── [DOMAIN_PACK] domain-specific backend questions
├── Frontend / Client
│   ├── Web, mobile, desktop, CLI, or combination?
│   ├── Framework & rendering strategy (SSR, SPA, static)
│   ├── State management approach
│   └── UI/UX constraints or design system
├── On-Chain / Smart Contracts (if applicable)
│   └── [DOMAIN_PACK] full on-chain architecture tree
├── Infrastructure & Deployment
│   ├── Hosting / cloud provider
│   ├── CI/CD pipeline
│   ├── Environment strategy (dev, staging, prod)
│   └── Monitoring & observability
│
Data Model
├── Core Entities
│   ├── What are the main data objects?
│   ├── What are the relationships between them?
│   └── [DOMAIN_PACK] domain-specific data structures
├── Storage
│   ├── Database technology & why
│   ├── Caching strategy
│   └── File/blob storage needs
├── Data Flow
│   ├── Where does data enter the system?
│   ├── How does it transform?
│   └── Where does it exit?
│
External Integrations
├── Third-Party Services
│   ├── Which external APIs or services?
│   ├── What happens when they're down?
│   └── Rate limits, quotas, costs
├── [DOMAIN_PACK] domain-specific integrations (oracles, bridges, etc.)
│
Security & Access Control
├── Authentication
│   ├── Who are the actor types? (user, admin, system, etc.)
│   ├── Auth mechanism (OAuth, JWT, API keys, wallet, etc.)
│   └── Session management
├── Authorization
│   ├── Permission model (RBAC, ABAC, capability-based)
│   ├── What are the sensitive operations?
│   └── Admin / privileged operations
├── Data Protection
│   ├── What data is sensitive?
│   ├── Encryption at rest and in transit
│   └── Compliance requirements (GDPR, SOC2, etc.)
├── [DOMAIN_PACK] domain-specific security concerns
│
Error Handling & Edge Cases
├── Failure Modes
│   ├── What can go wrong?
│   ├── How should each failure be handled?
│   └── What's the recovery strategy?
├── Edge Cases
│   ├── What are the boundary conditions?
│   ├── What happens with empty/null/zero inputs?
│   └── Concurrent access / race conditions
│
Testing & Validation
├── Testing Strategy
│   ├── Unit, integration, e2e — what balance?
│   ├── What frameworks/tools?
│   └── What's the minimum test coverage target?
├── Validation
│   ├── How will you verify correctness?
│   ├── Staging/testnet strategy
│   └── User acceptance criteria
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "No frontend" or "CLI only" | Frontend/Client subtree (ask 0 questions) |
| "No smart contracts" | On-Chain subtree entirely |
| "Simple CRUD app" | Reduce Architecture to 2-3 questions |
| "Solo project" | Reduce Security/Access Control to basics |
| "No external services" | External Integrations subtree |

## Creative Doc Triggers

During the interview, watch for these signals to suggest non-obvious documents:

| Signal | Suggest |
|--------|---------|
| Complex permission model | "Admin Emergency Procedures" doc |
| External API dependency | "Service Degradation Playbook" |
| Multi-step deployment | "Deployment Runbook" |
| Migration from existing system | "Migration Strategy & Rollback Plan" |
| Financial / value transfer | "Economic Edge Cases Analysis" |
| Multi-user concurrent access | "Concurrency & Race Condition Catalog" |
