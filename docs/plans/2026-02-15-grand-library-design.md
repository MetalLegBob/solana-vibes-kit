# Grand Library — Design Document

**Skill:** Grand Library (`/GL`)
**Version:** 1.0 (design)
**Date:** 2026-02-15
**Status:** Approved design, pending implementation

---

## Overview

Grand Library is a full-stack documentation skill that transforms project ideas into comprehensive, detailed specification suites. It works adaptively — guiding greenfield projects from idea to spec, or analyzing existing codebases to fill documentation gaps.

**Core philosophy:** Every undocumented decision is a coin flip when an LLM builds your project. Grand Library eliminates coin flips by making every decision explicit, validated, and written down before code is written (or retroactively for existing code).

**What makes it different from "just write docs":**

- **Creative doc discovery** — Grand Library doesn't just produce the obvious specs. It identifies non-obvious documents that force deeper thinking: edge case playbooks, migration strategies, error recovery procedures, integration boundary contracts. The "random" docs that end up being the most valuable.
- **Research-backed answers** — When the user faces a micro-decision ("should I use a bonding curve or constant product AMM?"), Grand Library researches the trade-offs and presents informed options, not just blank questions.
- **Reconciliation** — After all docs are written, an Opus-powered reconciliation phase cross-checks every document against every other, finding contradictions, gaps, and unanswered questions.
- **Domain packs** — General-purpose core with deep domain knowledge loaded on demand. First pack: Solana/blockchain. Future packs: web apps, mobile, APIs, etc.

**Foundation patterns used:**

| Pattern | How |
|---------|-----|
| Thin Orchestrator | `/GL:draft` orchestrator spawns doc-writing subagents |
| Signal-Based Indexing | Existing code scanning, domain pack loading |
| Progressive Disclosure | Skill structure, domain pack `INDEX.md` → on-demand knowledge |
| Structured Handoff | `DECISIONS/*.md`, `PROJECT_BRIEF.md`, doc frontmatter |

---

## Pipeline

Each phase is a separate command with a fresh context window.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAND LIBRARY v1.0                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /GL:survey        Phase 0 — Project Discovery                      │
│  ════════════      Detect: greenfield or existing code?             │
│  Greenfield: ask high-level vision questions                        │
│  Existing: scan codebase, build index, identify what exists         │
│  Output: PROJECT_BRIEF.md, DOC_MANIFEST.md                         │
│                          │                                          │
│                          ▼                                          │
│  /GL:interview     Phase 1 — Deep Interview                        │
│  ════════════════  Topic-by-topic structured Q&A                    │
│  Adaptive branching within topics                                   │
│  Research-backed options for micro-decisions                        │
│  Output: DECISIONS/*.md (per-topic), updated PROJECT_BRIEF.md       │
│                          │                                          │
│                          ▼                                          │
│  /GL:draft         Phase 2 — Document Generation                   │
│  ═══════════       Wave-based parallel doc writing                  │
│  Wave 1: Foundation docs (overview, architecture, data model)       │
│  → User validates Wave 1 →                                          │
│  Wave 2+: Feature specs, flows, references, creative docs           │
│  Output: docs/<all-documents>.md                                    │
│                          │                                          │
│                          ▼                                          │
│  /GL:reconcile     Phase 3 — Reconciliation (Opus)                 │
│  ════════════════  Cross-check ALL docs for contradictions          │
│  Identify gaps, unanswered questions, implicit assumptions          │
│  Verify every decision from interview is reflected in docs          │
│  Output: RECONCILIATION_REPORT.md, updated docs                     │
│                          │                                          │
│                          ▼                                          │
│  /GL:status        Check progress anytime                          │
│  /GL:update        Re-run interview for a specific topic            │
│  /GL:add           Add a new document to the suite                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 0 — Survey

The adaptive entry point. Detects what mode to run in:

- **Greenfield:** Asks broad vision questions — "What are you building? Who is it for? What's the tech stack?" Produces an initial project brief and a proposed doc manifest (list of documents Grand Library thinks this project needs).
- **Existing code:** Scans the codebase using Signal-Based Indexing (Pattern 2), builds an index of what exists, identifies existing docs, and produces a gap analysis — "here's what's documented, here's what's not."

In both cases, the user sees the proposed DOC_MANIFEST.md and can add, remove, or modify the doc list before proceeding. This is where Grand Library gets creative — suggesting docs the user wouldn't think to write.

### Phase 1 — Interview

Walks through topics one by one. Each topic maps to one or more documents in the manifest. The skill front-loads research where possible — if the user says "I need a bonding curve," the skill can research bonding curve variants and present informed options rather than asking the user to explain from scratch.

### Phase 2 — Draft

Generates documents in waves. Wave 1 is always the foundation: project overview, architecture, data model. User validates these before Wave 2+ fires, which produces everything else in parallel via Opus subagents.

### Phase 3 — Reconcile

Opus-powered cross-check. Reads every document and builds a consistency matrix — does the architecture doc's data flow match the API spec? Does the deployment sequence reference all the infrastructure the architecture doc describes? Contradictions become flagged items the user resolves.

### Utility Commands

- `/GL:status` — Progress dashboard (like SOS)
- `/GL:update` — Re-interview on a specific topic and regenerate affected docs
- `/GL:add` — Add a new document to an existing suite

---

## Model Allocation

| Phase | Component | Model |
|-------|-----------|-------|
| Survey | Code scanning subagents | Haiku |
| Survey | Orchestrator / doc manifest | User's context |
| Interview | Conversation | User's context |
| Interview | Research subagents | Sonnet |
| Draft | All doc-writing subagents | **Opus** |
| Reconcile | Cross-check + gap analysis | **Opus** |

The docs are the product. Opus writes all of them.

---

## The Interview Engine

The interview is the skill's core innovation. It's where micro-decisions get made explicit instead of being left to LLM coin flips.

### Topic Tree Structure

Topics are organized in a dependency tree, not a flat list. Example for a DeFi protocol:

```
Core Vision
├── Target Users & Use Cases
├── Tech Stack & Architecture
│   ├── On-chain Programs
│   │   ├── Token Model
│   │   ├── AMM / Pool Design
│   │   └── Fee & Tax Logic
│   ├── Backend / Indexer
│   └── Frontend / Client
├── Data Model & Account Structure
├── External Integrations (oracles, bridges, etc.)
├── Security & Access Control
├── Deployment & Infrastructure
├── Error Handling & Edge Cases
└── Testing & Validation Strategy
```

The skill walks this tree top-down, but **prunes branches** based on answers. "No oracle integration" → skip that entire subtree. "Simple static site frontend" → ask 2 questions instead of 15.

### Per-Topic Flow

1. **Context load** — Read the PROJECT_BRIEF so far + any relevant existing code
2. **Opening question** — Broad: "How should the fee system work?"
3. **Adaptive drill-down** — Based on the answer, ask progressively more specific questions. "You mentioned a 1% tax — should that apply to buys and sells, or just one direction?"
4. **Research fork** — When the user faces a trade-off they're unsure about, the skill spawns a Sonnet research subagent to investigate options and present a summary with pros/cons. The user picks, or asks for more detail.
5. **Decision capture** — After each topic, the skill writes `DECISIONS/<topic>.md` with every decision made, and updates `PROJECT_BRIEF.md` with a one-line summary per decision.

### Interview Design

The interview engine uses a hybrid of structured and adaptive questioning:

- **Structured layer** (topics) gives predictability — the user knows roughly how long this will take and what ground will be covered
- **Adaptive layer** (within topics) ensures no time is wasted on irrelevant questions — answers shape subsequent questions dynamically

Topic trees are dynamic, not hardcoded. The core skill has a general-purpose topic tree. Domain packs extend it with domain-specific branches. The survey phase (Phase 0) can also add project-specific topics based on what it discovers.

### Full-Stack Scope

Grand Library is NOT limited to smart contracts or backend. It covers the full project:
- On-chain programs
- Backend / indexer / API
- Frontend / website / app
- Infrastructure / deployment
- Mobile (if applicable)
- External integrations

Domain packs add depth for specific tech, but the core handles the full picture.

---

## The Research Layer

The skill has a three-tier knowledge resolution system. It never silently skips a topic because it doesn't know enough.

```
┌─────────────────────────────────────────────────────────────────┐
│  Tier 1: Domain Pack (instant, free)                            │
│  Pre-researched knowledge, indexed and ready                    │
│  "Token-2022 transfer hooks vs CPI tax? Here are               │
│   the trade-offs we've already analyzed..."                     │
│                                                                 │
│  ↓ Gap detected? ↓                                              │
│                                                                 │
│  Tier 2: Live Research (Sonnet subagent, seconds)               │
│  WebSearch + WebFetch to find current info                      │
│  "Let me look into that — found 3 relevant                     │
│   articles and the official docs..."                            │
│                                                                 │
│  ↓ Still uncertain? ↓                                           │
│                                                                 │
│  Tier 3: Flag for User (transparent)                            │
│  "I couldn't find a clear answer on this. Here's               │
│   what I found, but you should verify with [source].           │
│   For now, let's document your preferred approach               │
│   and mark it as NEEDS_VERIFICATION."                           │
└─────────────────────────────────────────────────────────────────┘
```

### Gap Detection

1. **Manifest-based** — Each domain pack has a `COVERAGE.md` that explicitly lists what topics it covers and at what depth. When the interview touches a topic not in the manifest, the skill knows immediately it needs to escalate to Tier 2.

2. **Confidence-based** — Even within covered topics, the user might ask something at the edge of what the pack covers. "What about transfer hooks with confidential transfers?" — the pack might cover transfer hooks and confidential transfers separately but not the intersection. The model self-assesses and escalates when it's not confident.

### Live Research Subagent (Tier 2)

Has access to:
- `WebSearch` — for current best practices, recent articles, forum discussions
- `WebFetch` — for official documentation, GitHub READMEs, specific reference pages
- The user's `package.json` / `Cargo.toml` / dependency files — to know what specific versions and libraries to research

Produces a structured research summary:

```markdown
---
topic: "Transfer hooks with confidential transfers"
sources_checked: 5
confidence: 7/10
---

## Options Found
1. **Option A** — [description, pros, cons, source link]
2. **Option B** — [description, pros, cons, source link]

## Recommendation
Option A because [reasoning]

## Gaps
- No production examples found — this is cutting-edge
- Solana docs are ambiguous on [specific point]
```

### Transparent Flagging (Tier 3)

The skill never pretends to know something it doesn't. If research comes back inconclusive, the decision gets documented with a `NEEDS_VERIFICATION` tag. The reconciliation phase (Phase 3) collects all these flags into a single checklist so nothing slips through.

---

## Document Generation Engine (Phase 2)

Each document is written by an Opus subagent that receives:

1. **PROJECT_BRIEF.md** — the condensed "constitution" (~500 tokens, always loaded)
2. **Relevant DECISIONS/*.md files** — only the topics that feed this doc (loaded by `provides/requires` matching)
3. **Doc template** — from the core catalog or domain pack, defining structure and sections
4. **Prior Wave docs** — if Wave 2+, the validated foundation docs are available as context

### Wave Assignment

```
Wave 1 — Foundation (must validate before continuing)
├── Project_Overview.md
├── Architecture.md
└── Data_Model.md

Wave 2 — Core Specs (parallel, depend on Wave 1)
├── Feature_Spec_AMM.md          requires: [architecture, data-model]
├── Feature_Spec_Tax_System.md   requires: [architecture, data-model]
├── Feature_Spec_Staking.md      requires: [architecture, data-model]
├── API_Reference.md             requires: [architecture]
└── Token_Program_Reference.md   requires: [data-model]

Wave 3 — Cross-cutting (parallel, depend on Wave 2)
├── Deployment_Sequence.md       requires: [architecture, all-feature-specs]
├── Security_Model.md            requires: [architecture, all-feature-specs]
├── Error_Handling_Playbook.md   requires: [all-feature-specs]
└── E2E_Test_Plan.md             requires: [all-feature-specs, deployment]

Wave 4 — Creative / Exploratory
├── Edge_Case_Analysis.md        requires: [all-prior-docs]
├── Migration_Strategy.md        requires: [architecture, deployment]
├── Failure_Mode_Catalog.md      requires: [security, error-handling]
└── <any project-specific docs>
```

### Creative Doc Discovery

Happens during Phase 0 (Survey) and Phase 1 (Interview). As the skill learns about the project, it proposes docs the user might not have thought of:

- User mentions oracle integration → skill proposes "Oracle Failure Playbook"
- User mentions multi-sig admin → skill proposes "Admin Emergency Procedures"
- User mentions token migration → skill proposes "Migration Lessons Template"
- User mentions complex fee math → skill proposes "Fee Calculation Edge Cases"

### Doc Frontmatter

Every generated document includes machine-readable frontmatter:

```yaml
---
doc_id: feature-spec-amm
title: "AMM Implementation Specification"
wave: 2
requires: [architecture, data-model]
provides: [amm-spec]
status: draft
decisions_referenced:
  - DECISIONS/pool-design.md
  - DECISIONS/fee-model.md
needs_verification: []
---
```

This frontmatter is what the reconciliation phase uses to trace every doc back to the decisions that informed it, and to check that no decision was dropped.

---

## Reconciliation Engine (Phase 3)

Opus reads the entire doc suite and hunts for problems no single doc-writing agent could catch.

**The reconciliation agent receives:**
- Every document produced in Phase 2
- PROJECT_BRIEF.md and all DECISIONS/*.md files
- The DOC_MANIFEST.md (to verify completeness)

### Four Passes

**Pass 1 — Completeness Check**

Every decision from the interview must appear in at least one document. The agent walks through each `DECISIONS/*.md` file and traces each decision to the docs that reference it.

```
Decision: "1% tax on buys only, not sells"
  → Referenced in: Tax_System_Spec.md ✓
  → Referenced in: AMM_Spec.md ✓
  → Referenced in: Token_Program_Reference.md ✗ MISSING
```

**Pass 2 — Consistency Check**

Cross-reference facts across documents. If `Architecture.md` says "3 on-chain programs" but `Deployment_Sequence.md` references 4 program deploys, that's a contradiction.

```
CONFLICT DETECTED:
  Architecture.md:L42    → "Tax is collected via transfer hook"
  Tax_System_Spec.md:L88 → "Tax is collected via CPI from AMM"
  Resolution needed: Which mechanism?
```

**Pass 3 — Gap Analysis**

Look for things that should be documented but aren't — implicit assumptions, undocumented error paths, missing edge cases:
- "Architecture.md describes an admin upgrade mechanism but no document covers what happens if an upgrade fails mid-transaction"
- "The fee model doc specifies percentage-based fees but doesn't address minimum fee amounts or dust thresholds"

**Pass 4 — NEEDS_VERIFICATION Audit**

Collect every `NEEDS_VERIFICATION` tag from the research layer (Tier 3 flags) and present them as a single checklist.

### Output

```markdown
---
docs_reviewed: 18
decisions_traced: 47
conflicts_found: 3
gaps_identified: 7
verification_items: 2
status: needs_user_review
---

## Conflicts (3)
1. Tax collection mechanism — [details + which docs + suggested resolution]
2. ...

## Gaps (7)
1. No upgrade failure recovery procedure — [suggested doc or section]
2. ...

## Unverified Decisions (2)
1. Transfer hooks + confidential transfers compatibility — [context]
2. ...

## Completeness Matrix
| Decision | Docs Referencing | Status |
|----------|-----------------|--------|
| 1% buy tax | Tax_Spec ✓, AMM_Spec ✓, Token_Ref ✗ | INCOMPLETE |
| ... | ... | ... |
```

The user reviews the report, resolves conflicts (the skill can help interactively), and affected docs get updated. Can loop — run `/GL:reconcile` again after fixes to verify everything's clean.

---

## Domain Packs

Pluggable knowledge modules that add depth for specific tech domains.

### Structure

```
domain-packs/
├── solana/
│   ├── PACK.md                    # Pack metadata + coverage manifest
│   ├── INDEX.md                   # What this pack knows (~500 tokens)
│   ├── topic-trees/               # Domain-specific interview branches
│   │   ├── token-model.md
│   │   ├── amm-design.md
│   │   ├── cpi-architecture.md
│   │   ├── account-structure.md
│   │   └── deployment.md
│   ├── knowledge/                 # Pre-researched trade-offs
│   │   ├── transfer-hooks-vs-cpi-tax.md
│   │   ├── bonding-curve-variants.md
│   │   ├── token-extensions-compatibility.md
│   │   ├── clockwork-vs-cron.md
│   │   └── ...
│   ├── templates/                 # Domain-specific doc templates
│   │   ├── program-spec-template.md
│   │   ├── account-layout-template.md
│   │   ├── cpi-interface-template.md
│   │   └── deployment-sequence-template.md
│   └── creative-triggers.md       # Domain-specific "docs you didn't think to write"
│
├── web-app/                       # Future pack
├── mobile/                        # Future pack
└── ...
```

### How Packs Integrate

1. **Phase 0 (Survey)** detects which packs are relevant — scans `Cargo.toml`, `package.json`, existing code, or asks the user. Loads the pack's `INDEX.md` only.
2. **Phase 1 (Interview)** merges the pack's topic trees into the main interview tree. Solana pack adds branches under "On-chain Programs" that the core skill wouldn't have.
3. **Phase 1 (Research)** checks the pack's `knowledge/` directory before hitting Tier 2 (live web search). If `transfer-hooks-vs-cpi-tax.md` exists, the skill uses it directly — saving time and tokens.
4. **Phase 2 (Draft)** uses the pack's `templates/` for domain-specific documents.
5. **`creative-triggers.md`** adds domain-specific doc suggestions the general-purpose skill wouldn't think of.

### Content Philosophy

**What a domain pack is NOT:**
- A mirror of official documentation
- A copy of any single MCP's knowledge
- API references or syntax guides

**What a domain pack IS:**
- Curated **decision-support knowledge** from multiple trusted sources
- Trade-off analyses that don't exist in any single doc
- Lessons from real projects that hit the edge cases

**Sources for the Solana pack:**

| Source Type | Examples | What We Extract |
|-------------|----------|-----------------|
| Official docs | Solana docs, Anchor book, Token-2022 spec | Constraints, capabilities, gotchas buried in footnotes |
| Audit reports | Trail of Bits, OtterSec, Neodyme, Halborn | Real architectural mistakes and what went wrong |
| Post-mortems | Wormhole, Mango, Cashio, Crema incidents | Design decisions that seemed fine but weren't |
| Builder blogs | Helius, Jito, Marinade engineering posts | Production lessons from teams that shipped |
| Forum discussions | Solana StackExchange, Anchor Discord archives | Edge cases real devs ran into |
| Research papers | MEV on Solana, token extension analyses | Academic rigor on trade-offs |

**Quality bar:** If a developer could get the same information from 5 minutes of reading official docs, it doesn't belong in the pack. The pack earns its place by synthesizing information that would take hours of research across multiple sources.

**Sourcing transparency:** Every knowledge file includes a `sources:` section in its frontmatter with links. The user can verify and the skill can cite them during the interview.

**Pack versioning:** Packs are versioned independently from the core skill. The `PACK.md` frontmatter declares the minimum Grand Library version it's compatible with.

---

## Context Management

Grand Library touches potentially massive amounts of content. Without careful management, it'd hit context limits fast.

### Per-Phase Context Budgets

| Phase | Orchestrator Target | Subagent Target |
|-------|-------------------|-----------------|
| Survey | 30% (scan + manifest) | Haiku scanners: 50% each |
| Interview | 50% (conversational, longer) | Research agents: 40% |
| Draft | 20% (thin orchestrator) | Doc writers: 60% each |
| Reconcile | 70% (reads everything, one job) | N/A — single agent |

### Key Techniques

1. **PROJECT_BRIEF.md stays under 500 tokens.** One-line summary per decision. This is the "always loaded" constant. If it bloats, the skill compacts it.

2. **DECISIONS files are loaded selectively.** A doc-writing agent for the AMM spec loads `DECISIONS/pool-design.md` and `DECISIONS/fee-model.md` — not `DECISIONS/frontend-framework.md`. The `requires` frontmatter field controls this.

3. **Domain pack knowledge is loaded on-demand.** The interview engine checks `INDEX.md` first (500 tokens), then loads specific knowledge files only when relevant to the current question.

4. **Wave 1 docs are summarized for Wave 2+ agents.** Wave 2 agents don't load the full `Architecture.md` (could be 3000+ tokens). They load a frontmatter summary (~100 tokens) plus specific sections they need.

5. **Reconciliation is the one exception.** The reconcile agent needs to see everything. Single Opus agent with full fresh context, runs once.

6. **`/GL:interview` manages conversation length.** After each topic is complete and `DECISIONS/<topic>.md` is written, the skill can suggest `/clear` if context is getting heavy. The next topic picks up from persisted decision files, not conversation history.

---

## Output Structure

```
docs/
├── PROJECT_BRIEF.md
├── DOC_MANIFEST.md
├── DECISIONS/
│   ├── architecture.md
│   ├── token-model.md
│   ├── fee-system.md
│   └── ...
├── Project_Overview.md
├── Architecture.md
├── Data_Model.md
├── <all generated docs...>
└── RECONCILIATION_REPORT.md
```

---

## Command Summary

| Command | Phase | Model | Purpose |
|---------|-------|-------|---------|
| `/GL:survey` | 0 | Haiku (scan) + user context | Detect greenfield/existing, build project brief + doc manifest |
| `/GL:interview` | 1 | User context + Sonnet (research) | Topic-by-topic adaptive Q&A with research-backed options |
| `/GL:draft` | 2 | Opus (all writers) | Wave-based parallel doc generation with validation on Wave 1 |
| `/GL:reconcile` | 3 | Opus | Cross-check all docs for conflicts, gaps, missing decisions |
| `/GL:status` | — | — | Progress dashboard |
| `/GL:update` | — | — | Re-interview a topic, regenerate affected docs |
| `/GL:add` | — | — | Add a new document to an existing suite |

---

## Typical Workflow

Run `/clear` between each phase for fresh context windows.

1. **`/GL:survey`** — Discover the project, propose doc manifest
2. `/clear`
3. **`/GL:interview`** — Deep topic-by-topic Q&A (may need multiple sessions for large projects)
4. `/clear`
5. **`/GL:draft`** — Generate all documents (validate Wave 1 before continuing)
6. `/clear`
7. **`/GL:reconcile`** — Cross-check everything, resolve conflicts
8. *(Resolve flagged items)*
9. **`/GL:reconcile`** — Verify clean (optional re-run)

Check progress anytime with **`/GL:status`**.

---

*This document is the approved design for Grand Library v1.0. Implementation follows the SVK Skill Foundation patterns documented in `Documents/Skill_Foundation.md`.*
