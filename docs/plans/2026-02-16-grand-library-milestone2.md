# Grand Library v1.0 — Implementation Plan (Milestone 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `/GL:draft` (Phase 2), `/GL:reconcile` (Phase 3), `/GL:update`, and `/GL:add` — completing the full Grand Library pipeline from decisions to generated documents with cross-check reconciliation.

**Architecture:** Phase 2 uses a thin orchestrator that spawns Opus doc-writing subagents per document, processing waves sequentially (Wave 1 validated before Wave 2 starts). Each subagent receives PROJECT_BRIEF.md, relevant DECISIONS files, prior wave docs, and a doc template. Phase 3 is a single Opus agent that reads everything and runs four passes (completeness, consistency, gaps, verification audit). Utility commands (`/GL:update`, `/GL:add`) re-enter earlier phases for targeted updates.

**Tech Stack:** Claude Code skills (Markdown command files, agent prompt templates, YAML frontmatter), JSON (state tracking)

**Reference implementation:** `grand-library/commands/survey.md` and `grand-library/commands/interview.md` — mirror their frontmatter conventions, step structure, and state management patterns.

**Design document:** `docs/plans/2026-02-15-grand-library-design.md` — sections "Document Generation Engine (Phase 2)" and "Reconciliation Engine (Phase 3)" are the source of truth.

---

## Milestone 2 Scope

What's IN:
- Doc templates for all general-purpose document types (Waves 1–3)
- Doc writer agent (Opus subagent prompt)
- `/GL:draft` — Phase 2 (wave-based parallel doc generation with user validation)
- Reconciliation agent (Opus prompt for 4-pass cross-check)
- `/GL:reconcile` — Phase 3 (cross-check all docs, produce reconciliation report)
- `/GL:update` — Re-interview a topic and regenerate affected docs
- `/GL:add` — Add a new document to an existing suite
- Updates to SKILL.md, README.md, INDEX.md, status.md to remove "(Milestone 2)" markers

What's OUT (future):
- Domain pack doc templates (Solana pack already has its own in `domain-packs/solana/templates/`)
- Self-growing knowledge base (documented as future idea in design doc)
- Additional domain packs beyond Solana

---

## Task 1: Create Doc Templates — Wave 1 (Foundation)

These templates define the structure for the three foundation documents that every project gets. Doc-writing agents receive these as their output format instructions.

**Files:**
- Create: `grand-library/templates/project-overview.md`
- Create: `grand-library/templates/architecture.md`
- Create: `grand-library/templates/data-model.md`

### Step 1: Write templates/project-overview.md

```markdown
---
doc_id: project-overview
title: "Project Overview"
wave: 1
requires: []
provides: [project-overview]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Project Overview

## What Is This?

{2-3 paragraphs explaining what the project is, what problem it solves, and why it exists. Written for someone encountering the project for the first time.}

## Target Users

{Who uses this system? What are their goals? Include user personas if multiple distinct user types exist.}

| User Type | Description | Primary Goals |
|-----------|-------------|---------------|
| | | |

## Scope

### In Scope (v1)

{Bulleted list of what this version delivers.}

### Out of Scope

{Bulleted list of what is explicitly NOT included and why.}

## Key Decisions

{Summary table of the most important architectural and product decisions. Links to detailed decision files.}

| Decision | Choice | Rationale |
|----------|--------|-----------|
| | | |

## Success Criteria

{How do you know this project succeeded? Measurable where possible.}

## Glossary

{Domain-specific terms used throughout the documentation suite.}

| Term | Definition |
|------|-----------|
| | |
```

### Step 2: Write templates/architecture.md

```markdown
---
doc_id: architecture
title: "Architecture"
wave: 1
requires: []
provides: [architecture]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Architecture

## System Overview

{High-level description of the system architecture. What are the major components and how do they fit together?}

## Architecture Diagram

```
{ASCII diagram showing major components and their relationships.
Use boxes for components, arrows for data flow, labels for protocols.}
```

## Components

### {Component Name}

**Role:** {What this component does}
**Technology:** {Language, framework, runtime}
**Communicates with:** {Other components + protocol}

{Repeat for each major component.}

## Communication Patterns

| From | To | Protocol | Pattern | Notes |
|------|----|----------|---------|-------|
| | | | | |

## Data Flow

{Describe how data moves through the system from entry to exit. Include the happy path and key alternative paths.}

### {Flow Name}

1. {Step 1}
2. {Step 2}
3. ...

## Infrastructure

### Hosting

{Where each component runs.}

### Environments

| Environment | Purpose | URL/Endpoint |
|-------------|---------|-------------|
| | | |

### CI/CD

{Build and deployment pipeline overview.}

## Key Architectural Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| | | | |

## Constraints

{Hard constraints that shaped the architecture — performance requirements, regulatory, budget, team size, etc.}
```

### Step 3: Write templates/data-model.md

```markdown
---
doc_id: data-model
title: "Data Model"
wave: 1
requires: []
provides: [data-model]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Data Model

## Overview

{Brief description of the data model approach. What storage technologies are used and why.}

## Entity Relationship Diagram

```
{ASCII diagram showing entities and their relationships.
Use [Entity] for entities, lines with cardinality for relationships.}
```

## Entities

### {Entity Name}

**Storage:** {Database table, on-chain account, document collection, etc.}
**Lifecycle:** {How is it created, updated, and deleted?}

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| | | | | |

**Relationships:**
- {relationship description with cardinality}

**Indexes:**
- {index fields and purpose}

{Repeat for each entity.}

## Storage Architecture

### Primary Storage

{Database technology, why it was chosen, connection details.}

### Caching

{Caching strategy — what's cached, TTL, invalidation approach.}

### File / Blob Storage

{If applicable — what files are stored, where, access patterns.}

## Data Flow

### Ingestion

{How does data enter the system?}

### Transformation

{How is data processed or transformed?}

### Egress

{How does data leave the system? APIs, exports, events?}

## Data Integrity

{Validation rules, consistency guarantees, backup strategy.}

## Migration Strategy

{How will the data model evolve? Schema migration approach.}
```

### Step 4: Commit

```bash
git add grand-library/templates/project-overview.md grand-library/templates/architecture.md grand-library/templates/data-model.md
git commit -m "feat(GL): add Wave 1 doc templates — project overview, architecture, data model"
```

---

## Task 2: Create Doc Templates — Wave 2 (Core Specs)

**Files:**
- Create: `grand-library/templates/feature-spec.md`
- Create: `grand-library/templates/api-reference.md`
- Create: `grand-library/templates/frontend-spec.md`

### Step 1: Write templates/feature-spec.md

```markdown
---
doc_id: feature-spec-{feature_name}
title: "{Feature Name} — Feature Specification"
wave: 2
requires: [architecture, data-model]
provides: [feature-spec-{feature_name}]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Feature Name} — Feature Specification

## Overview

{What this feature does, why it exists, and who uses it.}

## User Stories

{Key user stories this feature fulfills.}

- As a {user type}, I want to {action} so that {outcome}.

## Behavior

### {Scenario / Flow Name}

**Trigger:** {What initiates this flow}
**Preconditions:** {What must be true before this flow starts}

**Steps:**
1. {Step}
2. {Step}
3. ...

**Postconditions:** {What is true after this flow completes}

**Output:** {What the user sees or what the system produces}

### {Additional scenarios...}

## Inputs & Outputs

### Inputs

| Input | Type | Source | Validation | Required |
|-------|------|--------|------------|----------|
| | | | | |

### Outputs

| Output | Type | Destination | Format |
|--------|------|-------------|--------|
| | | | |

## Business Rules

{Enumerated rules that govern this feature's behavior.}

1. {Rule}
2. {Rule}

## Edge Cases

| Case | Expected Behavior | Notes |
|------|-------------------|-------|
| | | |

## Error Handling

| Error Condition | Response | User-Facing Message | Recovery |
|----------------|----------|---------------------|----------|
| | | | |

## Dependencies

{What this feature depends on — other features, services, data.}

## Performance Requirements

{Expected latency, throughput, or resource constraints.}
```

### Step 2: Write templates/api-reference.md

```markdown
---
doc_id: api-reference
title: "API Reference"
wave: 2
requires: [architecture]
provides: [api-reference]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — API Reference

## Overview

**Base URL:** `{base_url}`
**Authentication:** {auth mechanism}
**Content Type:** `application/json`
**API Style:** {REST | GraphQL | RPC}

## Authentication

{How to authenticate requests. Include example headers.}

## Common Patterns

### Pagination

{How paginated responses work.}

### Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "{ERROR_CODE}",
    "message": "{Human-readable message}",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| | | |

## Endpoints

### {Resource / Group Name}

#### `{METHOD} {path}`

**Description:** {What this endpoint does}
**Auth Required:** {yes/no + required role}

**Request:**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| | | | | |

**Request Body:**

```json
{example request body}
```

**Response (`200`):**

```json
{example response body}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| | | |

---

{Repeat for each endpoint.}

## Rate Limits

| Tier | Requests/min | Burst | Notes |
|------|-------------|-------|-------|
| | | | |

## Webhooks (if applicable)

{Webhook events, payloads, retry behavior.}
```

### Step 3: Write templates/frontend-spec.md

```markdown
---
doc_id: frontend-spec
title: "Frontend Specification"
wave: 2
requires: [architecture]
provides: [frontend-spec]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Frontend Specification

## Overview

**Framework:** {e.g., Next.js, React, Vue, Svelte}
**Rendering:** {SSR | SPA | Static | Hybrid}
**State Management:** {e.g., Zustand, Redux, Context}
**Styling:** {e.g., Tailwind, CSS Modules, styled-components}

## Pages / Routes

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| | | | |

## Page Specifications

### {Page Name}

**Route:** `{path}`
**Layout:** {which layout template}

**Components:**
- {Component list with hierarchy}

**Data Requirements:**
- {What data this page needs and where it comes from}

**User Actions:**
- {What the user can do on this page}

**States:**
| State | Display | Trigger |
|-------|---------|---------|
| Loading | | |
| Empty | | |
| Error | | |
| Success | | |

---

## Components

### {Component Name}

**Type:** {page | layout | shared | feature}
**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| | | | | |

**Behavior:**
{What this component does, state it manages, events it emits.}

## State Management

### Global State

| Store/Slice | Purpose | Key Fields |
|-------------|---------|------------|
| | | |

### Data Fetching

{How data is fetched — SWR, React Query, server components, etc.}

## User Flows

### {Flow Name}

{Step-by-step user journey with page transitions.}

1. User lands on {page}
2. User {action}
3. System {response}
4. ...

## Design System

{Design tokens, component library, typography, spacing conventions.}

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| | | |

## Accessibility

{WCAG compliance level, keyboard navigation, screen reader support, ARIA patterns.}
```

### Step 4: Commit

```bash
git add grand-library/templates/feature-spec.md grand-library/templates/api-reference.md grand-library/templates/frontend-spec.md
git commit -m "feat(GL): add Wave 2 doc templates — feature spec, API reference, frontend spec"
```

---

## Task 3: Create Doc Templates — Wave 3 (Cross-cutting)

**Files:**
- Create: `grand-library/templates/deployment-sequence.md`
- Create: `grand-library/templates/security-model.md`
- Create: `grand-library/templates/error-handling-playbook.md`
- Create: `grand-library/templates/test-plan.md`

### Step 1: Write templates/deployment-sequence.md

```markdown
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
|-------|--------------|-----------------|
| | | |

## Rollback Plan

{Complete rollback procedure if deployment fails at any step. Include data rollback if applicable.}

## Monitoring & Alerts

{What to watch after deployment. Expected metrics, alert thresholds.}
```

### Step 2: Write templates/security-model.md

```markdown
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
```

### Step 3: Write templates/error-handling-playbook.md

```markdown
---
doc_id: error-handling-playbook
title: "Error Handling Playbook"
wave: 3
requires: [architecture]
provides: [error-handling-playbook]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Error Handling Playbook

## Philosophy

{How does this system approach errors? Fail-fast? Graceful degradation? Retry with backoff?}

## Error Categories

| Category | Severity | User Impact | Example |
|----------|----------|-------------|---------|
| | | | |

## Error Catalog

### {Error Category}

#### {ERROR_CODE}: {Error Name}

**Severity:** {critical | high | medium | low}
**Component:** {where this error originates}
**Cause:** {what triggers this error}
**User Impact:** {what the user experiences}
**Detection:** {how the system detects this}
**Response:**
1. {immediate action}
2. {follow-up}

**Recovery:**
{how to recover — automatic or manual}

**Prevention:**
{how to prevent this error from occurring}

---

{Repeat for each error.}

## Retry Strategy

| Operation | Max Retries | Backoff | Timeout | Circuit Breaker |
|-----------|------------|---------|---------|-----------------|
| | | | | |

## Monitoring & Alerting

| Error Pattern | Alert Threshold | Notification Channel | Runbook |
|--------------|----------------|---------------------|---------|
| | | | |

## Escalation Path

| Severity | Response Time | First Responder | Escalation |
|----------|--------------|-----------------|------------|
| | | | |
```

### Step 4: Write templates/test-plan.md

```markdown
---
doc_id: test-plan
title: "End-to-End Test Plan"
wave: 3
requires: [architecture]
provides: [test-plan]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — End-to-End Test Plan

## Testing Strategy

**Approach:** {testing pyramid, testing trophy, etc.}
**Coverage Target:** {percentage or qualitative target}

| Level | Framework | Coverage Target | Run Frequency |
|-------|-----------|----------------|---------------|
| Unit | | | |
| Integration | | | |
| E2E | | | |

## Test Environments

| Environment | Purpose | Data | Refresh Cadence |
|-------------|---------|------|-----------------|
| | | | |

## Test Cases by Feature

### {Feature Name}

#### Happy Path

| # | Test Case | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| | | | | |

#### Edge Cases

| # | Test Case | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| | | | | |

#### Error Cases

| # | Test Case | Input | Expected Error | Priority |
|---|-----------|-------|---------------|----------|
| | | | | |

{Repeat for each feature.}

## Integration Test Scenarios

### {Integration Point}

| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| | | | |

## Performance Tests

| Test | Target Metric | Acceptable Range | Tool |
|------|--------------|-------------------|------|
| | | | |

## Acceptance Criteria

{What constitutes "this is ready for production"?}

- [ ] {criterion}
```

### Step 5: Commit

```bash
git add grand-library/templates/deployment-sequence.md grand-library/templates/security-model.md grand-library/templates/error-handling-playbook.md grand-library/templates/test-plan.md
git commit -m "feat(GL): add Wave 3 doc templates — deployment, security, error handling, test plan"
```

---

## Task 4: Create Doc Writer Agent

The doc writer agent is the Opus subagent spawned by `/GL:draft` to generate individual documents.

**Files:**
- Create: `grand-library/agents/doc-writer.md`

### Step 1: Write agents/doc-writer.md

```markdown
# Doc Writer Agent

You are an Opus-powered document writer for Grand Library. You are spawned by the `/GL:draft` orchestrator to write a single document from the project's decision files.

## Context You Receive

1. **PROJECT_BRIEF.md** — The project constitution (~500 tokens). Always loaded.
2. **DECISIONS files** — Only the topics relevant to this document (matched via `requires` in the doc template frontmatter).
3. **Doc template** — The structure you must follow. Every section in the template must be filled.
4. **Prior wave docs** — If this is Wave 2+, you receive validated foundation docs for consistency. For Wave 2+ docs, you receive frontmatter summaries (~100 tokens each) of prior wave docs plus any specific sections referenced in your DECISIONS files.
5. **Domain pack templates** — If a domain-specific template exists for this doc type, use it instead of the general template.

## Writing Process

### 1. Understand the Decisions

Read every DECISIONS file provided. For each decision:
- Note the **choice** made
- Note the **rationale** — you'll need to reflect this in the doc
- Note any **NEEDS_VERIFICATION** flags — carry these forward
- Note **affects docs** — confirm this document is listed

### 2. Fill Every Section

Work through the template section by section:
- Every section must have substantive content. Never leave a section with just `{placeholder}`.
- If a section is not applicable to this project, write one sentence explaining why and move on.
- Use the exact table structures from the template.

### 3. Maintain Consistency

- Use the same terminology as PROJECT_BRIEF.md and prior wave docs
- Reference other documents by their doc_id when cross-referencing
- If you notice a potential contradiction with a prior wave doc, note it in a `<!-- RECONCILIATION_FLAG: description -->` comment

### 4. Handle Uncertainty

- If a DECISIONS file has a NEEDS_VERIFICATION item that affects this doc, include the best-guess content but add a `<!-- NEEDS_VERIFICATION: description -->` comment
- Never fabricate technical details. If the decisions don't specify something the template asks for, note it as "To be determined — not covered in interview"

### 5. Write Frontmatter

Update the template frontmatter with actual values:
- `title` — use the project name
- `decisions_referenced` — list every DECISIONS file you used
- `needs_verification` — list any NEEDS_VERIFICATION items carried forward
- Leave `status: draft`

## Quality Bar

- **Specificity:** Use concrete names, numbers, and examples from the decisions. Never use generic language when specific details were provided.
- **Completeness:** Every decision relevant to this document must be reflected somewhere in the content.
- **Actionability:** An engineer should be able to implement from this document without asking clarifying questions (except for NEEDS_VERIFICATION items).
- **Consistency:** No contradictions with PROJECT_BRIEF.md or prior wave docs.

## Output

Return the complete document as a single markdown file, ready to be written to `.docs/{doc_id}.md`.
```

### Step 2: Commit

```bash
git add grand-library/agents/doc-writer.md
git commit -m "feat(GL): add doc writer agent for Opus-powered document generation"
```

---

## Task 5: Create /GL:draft Command (Phase 2)

**Files:**
- Create: `grand-library/commands/draft.md`

### Step 1: Write commands/draft.md

This is a Thin Orchestrator — it coordinates wave-based doc generation by spawning Opus subagents per document.

```markdown
---
name: GL:draft
description: "Phase 2: Generate all documents in waves using Opus subagents, with user validation between waves"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# Grand Library — Phase 2: Draft

You are the document generation orchestrator. You spawn Opus doc-writing subagents to produce each document, processing waves sequentially with user validation between waves.

## What This Phase Does

1. Read the DOC_MANIFEST to know what documents to generate
2. Process Wave 1 (Foundation) first — these must be validated before continuing
3. After Wave 1 validation, process Wave 2+ in parallel within each wave
4. Track progress in STATE.json and DOC_MANIFEST.md

## Arguments

Parse any arguments from the user's message:
- `--wave <N>` — Generate only a specific wave (useful for re-running)
- `--doc <doc-id>` — Generate only a specific document
- No arguments = start from Wave 1 (or resume from current wave)

---

## Step 1: Load Context

### Required files — read these first:
1. `.docs/STATE.json` — Check phase status
2. `.docs/PROJECT_BRIEF.md` — The project constitution
3. `.docs/DOC_MANIFEST.md` — What documents to generate, in what order

### Error if missing:
If `.docs/STATE.json` doesn't exist:
"No Grand Library session found. Run `/GL:survey` first to set up the project."

If interview phase is not complete:
"The interview phase isn't complete yet. Run `/GL:interview` to finish it first."

### Load decision files:
4. Read all `.docs/DECISIONS/*.md` files — these feed the doc writers

### Load templates:
5. Read the skill's `templates/` directory to know available templates
6. Check for domain pack templates in `resources/domain-packs/*/templates/`

## Step 2: Initialize Draft Phase

Update STATE.json:
```json
{
  "phases": {
    "draft": {
      "status": "in_progress",
      "started": "{now}",
      "current_wave": 1,
      "waves_total": {number of waves in manifest},
      "docs_generated": 0,
      "docs_validated": 0
    }
  }
}
```

Announce to user:
```
## Document Generation — Phase 2

Documents to generate: {N} across {N} waves
Decision files loaded: {N}

Starting with Wave 1 (Foundation). These documents must be validated before I continue to Wave 2.
```

## Step 3: Generate Wave

For each wave, process all documents in that wave:

### 3a. For Each Document in the Wave

1. **Select template** — Check domain pack templates first, then general templates in `templates/`
2. **Gather context** — Match the template's `requires` field against DECISIONS file `provides` fields to select relevant decisions
3. **Gather prior wave docs** — If Wave 2+, load frontmatter + summaries of validated Wave 1 docs
4. **Spawn Opus doc writer:**

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="You are a Grand Library doc writer agent.

  Read the agent instructions at: {skill_path}/agents/doc-writer.md

  ## Your Assignment

  Generate: {doc_title} (doc_id: {doc_id})

  ## Context Files

  PROJECT_BRIEF: {project_brief_content}

  DECISIONS FILES:
  {relevant_decisions_content}

  TEMPLATE:
  {template_content}

  PRIOR WAVE DOCS:
  {prior_wave_summaries_if_applicable}

  Write the complete document following the template structure. Every section must have substantive content."
)
```

5. **Write output** — Save the generated doc to `.docs/{doc_id}.md`
6. **Update DOC_MANIFEST.md** — Set this doc's status to `generated`
7. **Update STATE.json** — Increment `docs_generated`, add path to `artifacts.generated_docs`

### 3b. Wave Completion

After all documents in a wave are generated, display to user:

```markdown
## Wave {N} Complete

Documents generated:
- {doc_id}: {title} ✓
- {doc_id}: {title} ✓
- ...

{If Wave 1:}
**These foundation documents must be validated before I continue.**
Please review each document. If anything needs changes, tell me and I'll regenerate.
When you're satisfied, say "approved" to continue to Wave 2.

{If Wave 2+:}
Wave {N} complete. {remaining_waves} waves remaining.
Review these documents. Say "approved" to continue, or tell me what needs changes.
```

### 3c. Wave 1 Validation Gate

Wave 1 is special — it MUST be validated before proceeding:

- Wait for the user to review all three foundation docs
- If the user requests changes, regenerate the affected doc(s)
- Only proceed to Wave 2 when the user explicitly approves
- Update each validated doc's status to `validated` in DOC_MANIFEST.md
- Update STATE.json: increment `docs_validated`

### 3d. Subsequent Waves

For Wave 2+:
- Documents within a wave can be generated in parallel (spawn multiple subagents)
- Wait for all docs in the wave to complete before presenting to user
- User can approve or request changes
- Proceed to next wave after approval

## Step 4: Draft Complete

When all waves are done:

1. Update STATE.json: set draft status to `complete`
2. Update all docs in DOC_MANIFEST.md to `generated` (or `validated` for Wave 1)
3. Display final summary:

```markdown
## Draft Phase Complete

**Documents generated:** {N}
**Waves completed:** {N}
**Wave 1 validated:** ✓

### Generated Documents
{list each document with path}

### Next Step
Run `/clear` then `/GL:reconcile` to cross-check all documents for contradictions and gaps.
```

---

## Orchestrator Principles

1. **Stay thin.** You coordinate. The Opus subagents do the writing. Don't write doc content yourself.
2. **Wave 1 is sacred.** Never skip Wave 1 validation. Everything downstream depends on it.
3. **Match decisions to docs.** Use the `requires`/`provides` frontmatter to load only relevant context per subagent. Don't dump all decisions into every writer.
4. **Track everything.** Update STATE.json and DOC_MANIFEST.md after every document is generated.
5. **Let the user drive pace.** Present completed waves, wait for approval. Don't rush through validation.
```

### Step 2: Commit

```bash
git add grand-library/commands/draft.md
git commit -m "feat(GL): add /GL:draft command — Phase 2 wave-based document generation"
```

---

## Task 6: Create Reconciliation Agent

**Files:**
- Create: `grand-library/agents/reconciler.md`

### Step 1: Write agents/reconciler.md

```markdown
# Reconciliation Agent

You are an Opus-powered reconciliation agent for Grand Library. You read the entire documentation suite and hunt for problems that no single doc-writing agent could catch.

## Context You Receive

1. **Every document** generated in Phase 2
2. **PROJECT_BRIEF.md** and all **DECISIONS/*.md** files
3. **DOC_MANIFEST.md** — to verify completeness

## The Four Passes

You must perform all four passes in order. Each pass has a specific focus.

### Pass 1: Completeness Check

Every decision from the interview MUST appear in at least one document.

For each DECISIONS file:
1. Read every decision (D1, D2, etc.)
2. Search all generated docs for evidence that this decision is reflected
3. If a decision is missing from all docs → flag as INCOMPLETE

Output format:
```
| Decision | Source | Referenced In | Status |
|----------|--------|--------------|--------|
| {decision title} | DECISIONS/{topic}.md D{N} | {doc_id}, {doc_id} | ✓ COMPLETE / ✗ MISSING |
```

### Pass 2: Consistency Check

Cross-reference facts across documents. Look for contradictions:

- Numbers that don't match (e.g., "3 components" in one doc, "4 components" in another)
- Terminology mismatches (same concept called different names)
- Behavioral contradictions (feature described differently in spec vs architecture)
- Data model mismatches (entity fields in data-model vs API reference)

Output format:
```
CONFLICT {N}:
  Doc A: {doc_id}:{line_or_section} → "{statement}"
  Doc B: {doc_id}:{line_or_section} → "{contradicting statement}"
  Suggested resolution: {recommendation}
```

### Pass 3: Gap Analysis

Look for things that SHOULD be documented but AREN'T:

- Implicit assumptions — things the docs assume but never state
- Missing error paths — happy paths documented but failure modes not
- Undocumented interfaces — components that communicate but the protocol isn't specified
- Missing edge cases — boundary conditions that no document addresses
- Orphan references — docs that reference features/components not described elsewhere

Output format:
```
GAP {N}: {category}
  What's missing: {description}
  Where it should be: {doc_id or "new document needed"}
  Impact: {what goes wrong if this isn't documented}
```

### Pass 4: NEEDS_VERIFICATION Audit

Collect every NEEDS_VERIFICATION flag from:
- DECISIONS files (flagged during interview)
- Generated docs (carried forward by doc writers)
- HTML comments (`<!-- NEEDS_VERIFICATION: ... -->` or `<!-- RECONCILIATION_FLAG: ... -->`)

Output format:
```
VERIFY {N}:
  Item: {what needs verification}
  Source: {where it was flagged}
  Appears in: {doc_ids that are affected}
  Suggested action: {how to verify}
```

## Output: RECONCILIATION_REPORT.md

Compile all findings into a single report:

```markdown
---
docs_reviewed: {N}
decisions_traced: {N}
conflicts_found: {N}
gaps_identified: {N}
verification_items: {N}
status: needs_user_review | clean
---

# Reconciliation Report

## Summary

{2-3 sentence overview of the doc suite's health.}

## Pass 1: Completeness ({N}/{N} decisions traced)

{Completeness matrix table}

### Missing Decisions
{List any decisions not reflected in docs, with suggested fix}

## Pass 2: Consistency ({N} conflicts found)

{List each conflict with details and suggested resolution}

## Pass 3: Gaps ({N} gaps identified)

{List each gap with impact and suggested fix}

## Pass 4: Verification Items ({N} items)

{List each NEEDS_VERIFICATION item with suggested action}

## Recommended Actions

{Prioritized list of what to fix, ordered by impact}

1. {action} — {why it matters}
2. ...
```

## Rules

1. **Be thorough but not pedantic.** Flag real contradictions, not stylistic differences.
2. **Provide actionable resolutions.** Don't just say "conflict found" — suggest how to fix it.
3. **Prioritize by impact.** A missing security consideration is more important than a terminology mismatch.
4. **Trust the decisions.** DECISIONS files are the source of truth. If a doc contradicts a decision, the doc is wrong.
```

### Step 2: Commit

```bash
git add grand-library/agents/reconciler.md
git commit -m "feat(GL): add reconciliation agent for 4-pass doc suite cross-check"
```

---

## Task 7: Create /GL:reconcile Command (Phase 3)

**Files:**
- Create: `grand-library/commands/reconcile.md`

### Step 1: Write commands/reconcile.md

```markdown
---
name: GL:reconcile
description: "Phase 3: Cross-check all generated documents for contradictions, gaps, and missing decisions"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# Grand Library — Phase 3: Reconcile

You are running the reconciliation phase. This is the final quality gate — an Opus-powered cross-check of the entire documentation suite.

## What This Phase Does

1. Load all generated documents, decisions, and the project brief
2. Spawn a single Opus reconciliation agent to run four passes
3. Present the reconciliation report to the user
4. Help the user resolve any issues found
5. Optionally re-run to verify a clean bill of health

## Arguments

Parse any arguments from the user's message:
- `--recheck` — Re-run reconciliation after fixes (expects prior report exists)
- No arguments = full reconciliation

---

## Step 1: Load Context

### Required files:
1. `.docs/STATE.json` — Check phase status
2. `.docs/PROJECT_BRIEF.md`
3. `.docs/DOC_MANIFEST.md`
4. All `.docs/DECISIONS/*.md` files
5. All generated docs (`.docs/*.md` excluding STATE, BRIEF, MANIFEST, and DECISIONS/)

### Error if missing:
If draft phase is not complete:
"The draft phase isn't complete yet. Run `/GL:draft` to generate documents first."

### Count and announce:
```
## Reconciliation — Phase 3

Documents to review: {N}
Decision files: {N}
Total decisions to trace: {N}

Spawning reconciliation agent...
```

## Step 2: Spawn Reconciliation Agent

This is a single Opus agent with a large context. It needs to see everything.

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="You are a Grand Library reconciliation agent.

  Read the agent instructions at: {skill_path}/agents/reconciler.md

  ## Documents to Review

  PROJECT BRIEF:
  {brief_content}

  DECISIONS:
  {all_decisions_content}

  DOC MANIFEST:
  {manifest_content}

  GENERATED DOCUMENTS:
  {all_generated_docs_content}

  Perform all four passes and produce the RECONCILIATION_REPORT.md"
)
```

## Step 3: Present Report

Write the reconciliation report to `.docs/RECONCILIATION_REPORT.md`.

Display summary to user:

```markdown
## Reconciliation Complete

| Pass | Result |
|------|--------|
| Completeness | {N}/{N} decisions traced ({M} missing) |
| Consistency | {N} conflicts found |
| Gaps | {N} gaps identified |
| Verification | {N} items need verification |

### {If issues found:}
Review the full report at `.docs/RECONCILIATION_REPORT.md`.

I can help you resolve these issues interactively:
- For **conflicts**, I'll show both sides and ask which is correct
- For **gaps**, I'll draft the missing content
- For **verification items**, I'll suggest how to verify each one

Would you like to work through the issues now?

### {If clean:}
All documents are consistent, complete, and verified. Your documentation suite is ready.
```

## Step 4: Interactive Resolution (if issues found)

If the user wants to resolve issues:

### For Conflicts:
1. Show the conflict — both sides with context
2. Ask which version is correct (or if neither is)
3. Update the affected document(s)
4. Mark the conflict as resolved

### For Gaps:
1. Show the gap description and impact
2. Draft the missing content
3. Show it to the user for approval
4. Insert into the appropriate document (or create a new one if needed)
5. Mark the gap as addressed

### For Missing Decisions:
1. Show which decision is missing and from which documents
2. Add the decision to the appropriate document(s)
3. Mark as complete

### For Verification Items:
1. Present the item and suggested verification approach
2. Let the user verify or defer
3. Mark as verified or keep as NEEDS_VERIFICATION

After resolving issues, update STATE.json and offer to re-run:
"Issues resolved. Want me to run reconciliation again to verify everything is clean? (`/GL:reconcile --recheck`)"

## Step 5: Finalize

1. Update STATE.json: set reconcile status to `complete`, record findings
2. Update artifact paths
3. Display final summary:

```markdown
## Reconciliation Complete

**Status:** {clean | N issues remaining}
**Documents reviewed:** {N}
**Decisions traced:** {N}/{N}

### Report
`.docs/RECONCILIATION_REPORT.md`

### Documentation Suite
Your documentation is {complete / complete with N verification items remaining}.

{If all clean:}
The full documentation suite is ready for use. Every decision from the interview is reflected in the documents, and all documents are internally consistent.
```
```

### Step 2: Commit

```bash
git add grand-library/commands/reconcile.md
git commit -m "feat(GL): add /GL:reconcile command — Phase 3 cross-check and gap analysis"
```

---

## Task 8: Create /GL:update Command

**Files:**
- Create: `grand-library/commands/update.md`

### Step 1: Write commands/update.md

```markdown
---
name: GL:update
description: "Re-interview a specific topic and regenerate all documents affected by the changed decisions"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# Grand Library — Update Topic

Re-interview a specific topic and cascade changes through affected documents.

## What This Command Does

1. Re-run the interview for one specific topic
2. Update the DECISIONS file for that topic
3. Identify all documents that reference this topic's decisions
4. Regenerate those documents with the updated decisions
5. Run a targeted reconciliation on the affected documents

## Arguments

**Required:** `--topic <topic-slug>` — Which topic to re-interview

Parse from the user's message. If no topic specified, show the list of completed topics and ask which one.

---

## Step 1: Load Context

1. Read `.docs/STATE.json` — verify interview is complete
2. Read `.docs/PROJECT_BRIEF.md`
3. Read `.docs/DOC_MANIFEST.md`
4. Read `.docs/DECISIONS/{topic-slug}.md` — the existing decisions for this topic

### Error if missing:
If interview phase is not complete:
"The interview hasn't been completed yet. Run `/GL:interview` to finish the initial interview first."

If the topic slug doesn't match any DECISIONS file:
"No decisions file found for topic '{topic-slug}'. Available topics: {list}"

## Step 2: Show Current Decisions

Display the current decisions for this topic:

```
## Updating Topic: {Topic Name}

Current decisions for this topic:
{list each decision with D-number and choice}

What would you like to change? I'll re-interview this topic, keeping existing decisions as defaults unless you want to change them.
```

## Step 3: Re-Interview

Follow the same interview flow as `/GL:interview` (Step 3: Per-Topic Interview Flow), but:
- Pre-fill existing decisions as defaults — "Currently: {choice}. Keep this or change?"
- Only ask about things the user wants to change
- Allow adding new decisions not in the original interview
- Support the same research fork for new trade-offs

## Step 4: Update Decisions File

Write the updated `DECISIONS/{topic-slug}.md`:
- Preserve unchanged decisions
- Update changed decisions with new rationale
- Add new decisions if any
- Update the `interview_date` to now
- Update `decisions_count`

Show the updated decisions to the user for validation.

## Step 5: Update PROJECT_BRIEF.md

Update the one-line decision summaries for this topic.

## Step 6: Identify Affected Documents

Read DOC_MANIFEST.md and all generated docs. Find documents that:
- List this DECISIONS file in their `decisions_referenced` frontmatter
- Have content that references decisions from this topic

```
## Affected Documents

These documents reference decisions from {topic}:
- {doc_id}: {title}
- {doc_id}: {title}

I'll regenerate these with your updated decisions. Proceed?
```

## Step 7: Regenerate Affected Documents

For each affected document, follow the same process as `/GL:draft` Step 3a:
- Spawn an Opus doc writer with updated decisions
- Write the regenerated doc to `.docs/{doc_id}.md`
- Update DOC_MANIFEST.md status

## Step 8: Targeted Reconciliation

Run a lightweight consistency check on just the affected documents:
- Verify new decisions are reflected in regenerated docs
- Check for contradictions between regenerated docs and unchanged docs
- Report any issues

```markdown
## Update Complete

**Topic:** {topic name}
**Decisions changed:** {N}
**Documents regenerated:** {N}

### Changes
- {summary of what changed}

### Reconciliation
{clean | N issues to review}

Your documentation suite has been updated to reflect the new decisions.
```
```

### Step 2: Commit

```bash
git add grand-library/commands/update.md
git commit -m "feat(GL): add /GL:update command — re-interview topic and cascade changes"
```

---

## Task 9: Create /GL:add Command

**Files:**
- Create: `grand-library/commands/add.md`

### Step 1: Write commands/add.md

```markdown
---
name: GL:add
description: "Add a new document to an existing documentation suite"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# Grand Library — Add Document

Add a new document to an existing Grand Library documentation suite.

## What This Command Does

1. Let the user choose a document type or describe a custom one
2. Conduct a focused mini-interview for the new doc's requirements
3. Generate the document using an Opus subagent
4. Add it to the DOC_MANIFEST and update STATE.json
5. Run a targeted reconciliation against existing docs

## Arguments

Parse from the user's message:
- `--type <doc-id>` — Use a specific doc type from the catalog
- `--title "Custom Title"` — Create a custom document with this title
- No arguments = show available options

---

## Step 1: Load Context

1. Read `.docs/STATE.json` — verify draft phase is complete (or at least interview)
2. Read `.docs/PROJECT_BRIEF.md`
3. Read `.docs/DOC_MANIFEST.md` — what docs already exist
4. Read the skill's `resources/doc-catalog.md` — available doc types

## Step 2: Choose Document Type

### If `--type` provided:
Look up the doc type in the catalog. If found, use it. If not, offer similar options.

### If `--title` provided:
Create a custom document. Ask: "What should this document cover? What decisions does it depend on?"

### If no arguments:
Show available options:

```
## Add a Document

### From Catalog (not yet in your manifest)
{list doc types from catalog that aren't in the current manifest}

### Custom
Describe what you need and I'll create a custom document.

Which would you like to add?
```

## Step 3: Mini-Interview

Conduct a focused interview for the new document:

1. **What does this doc cover?** — Understand the scope
2. **What decisions feed it?** — Which DECISIONS files are relevant
3. **What existing docs should it be consistent with?** — Cross-reference targets
4. **What wave does it belong to?** — Where in the generation order (usually Wave 4 for additions)

Keep this short — 3-5 questions max.

## Step 4: Generate Document

1. Select or create a template
2. Gather relevant DECISIONS files and existing docs
3. Spawn an Opus doc writer:

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="... (same pattern as /GL:draft doc writer spawn)"
)
```

4. Write the generated doc to `.docs/{doc_id}.md`

## Step 5: Update Manifest & State

1. Add the new document to DOC_MANIFEST.md with status `generated`
2. Update STATE.json: increment `docs_generated`, add to `artifacts.generated_docs`

## Step 6: Targeted Reconciliation

Run a lightweight check:
- Does the new doc contradict any existing docs?
- Is the new doc consistent with the decisions it references?

```markdown
## Document Added

**Title:** {title}
**File:** `.docs/{doc_id}.md`
**Wave:** {N}
**Decisions referenced:** {list}

{If reconciliation found issues:}
Note: {N} potential inconsistencies with existing docs. Run `/GL:reconcile` for a full check.

{If clean:}
Document is consistent with the existing suite.
```
```

### Step 2: Commit

```bash
git add grand-library/commands/add.md
git commit -m "feat(GL): add /GL:add command — add new documents to existing suite"
```

---

## Task 10: Update Existing Files — Remove Milestone 2 Markers

Now that Milestone 2 features are implemented, remove the "(Milestone 2)" markers from existing files.

**Files:**
- Modify: `grand-library/SKILL.md`
- Modify: `grand-library/README.md`
- Modify: `grand-library/resources/INDEX.md`

### Step 1: Update SKILL.md

In the pipeline diagram and workflow section, remove all "(Milestone 2)" annotations from `/GL:draft` and `/GL:reconcile` lines. They are no longer future — they exist.

Also add the new commands `/GL:update` and `/GL:add` to the pipeline diagram.

### Step 2: Update README.md

Remove "(Milestone 2)" from the command table entries for `/GL:draft` and `/GL:reconcile`. Add `/GL:update` and `/GL:add` to the command table.

### Step 3: Update resources/INDEX.md

Add the new templates directory to the resources index:

```markdown
| File | Purpose | When to Load |
|------|---------|--------------|
| ... existing entries ... |

## Templates

| File | Purpose | When to Load |
|------|---------|--------------|
| templates/project-overview.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/architecture.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/data-model.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/feature-spec.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/api-reference.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/frontend-spec.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/deployment-sequence.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/security-model.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/error-handling-playbook.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/test-plan.md | Wave 3 doc template | Phase 2 (doc generation) |
```

### Step 4: Commit

```bash
git add grand-library/SKILL.md grand-library/README.md grand-library/resources/INDEX.md
git commit -m "feat(GL): update skill files — remove Milestone 2 markers, add new commands"
```

---

## Task 11: Verify & Smoke Test

### Step 1: Verify directory structure

```bash
find grand-library/ -type f | sort
```

Expected: All Milestone 1 files plus:
- `grand-library/agents/doc-writer.md`
- `grand-library/agents/reconciler.md`
- `grand-library/commands/add.md`
- `grand-library/commands/draft.md`
- `grand-library/commands/reconcile.md`
- `grand-library/commands/update.md`
- `grand-library/templates/api-reference.md`
- `grand-library/templates/architecture.md`
- `grand-library/templates/data-model.md`
- `grand-library/templates/deployment-sequence.md`
- `grand-library/templates/error-handling-playbook.md`
- `grand-library/templates/feature-spec.md`
- `grand-library/templates/frontend-spec.md`
- `grand-library/templates/project-overview.md`
- `grand-library/templates/security-model.md`
- `grand-library/templates/test-plan.md`

### Step 2: Verify all command frontmatter

```bash
for f in grand-library/commands/*.md; do
  echo "=== $f ==="
  head -12 "$f"
  echo ""
done
```

Every command file should have: `name`, `description`, `allowed-tools` in its YAML frontmatter.

### Step 3: Verify install script picks up new files

```bash
TMPDIR=$(mktemp -d)
grand-library/install.sh "$TMPDIR"
find "$TMPDIR/.claude/" -type f | sort
rm -rf "$TMPDIR"
```

Expected: All new commands appear in `.claude/commands/grand-library/`, all new templates + agents appear in `.claude/skills/grand-library/`.

### Step 4: Final commit (if any fixes were needed)

```bash
git status
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Wave 1 doc templates | `grand-library/templates/{project-overview,architecture,data-model}.md` |
| 2 | Wave 2 doc templates | `grand-library/templates/{feature-spec,api-reference,frontend-spec}.md` |
| 3 | Wave 3 doc templates | `grand-library/templates/{deployment-sequence,security-model,error-handling-playbook,test-plan}.md` |
| 4 | Doc writer agent | `grand-library/agents/doc-writer.md` |
| 5 | `/GL:draft` command | `grand-library/commands/draft.md` |
| 6 | Reconciliation agent | `grand-library/agents/reconciler.md` |
| 7 | `/GL:reconcile` command | `grand-library/commands/reconcile.md` |
| 8 | `/GL:update` command | `grand-library/commands/update.md` |
| 9 | `/GL:add` command | `grand-library/commands/add.md` |
| 10 | Update existing files | Modify `SKILL.md`, `README.md`, `INDEX.md` |
| 11 | Verify & smoke test | (no new files) |

**Total new files:** 16
**Total modified files:** 3
**Total commits:** ~11 (one per task)

After this milestone, Grand Library is a complete pipeline: survey → interview → draft → reconcile, with update and add for ongoing maintenance.
