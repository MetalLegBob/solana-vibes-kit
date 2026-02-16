---
name: grand-library
version: "1.0.0"
description: >
  Grand Library: Full-stack documentation skill that transforms project ideas into
  comprehensive specification suites. Guides greenfield projects from idea to spec,
  or analyzes existing codebases to fill documentation gaps.
  Run /grand-library for a getting-started guide, or /GL:survey to begin.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Grand Library

A full-stack documentation skill that eliminates coin-flip decisions by making every choice explicit, validated, and written down.

> *"Every undocumented decision is a coin flip when an LLM builds your project."*

---

## Getting Started

Grand Library runs as a multi-phase pipeline. Each phase is a separate command with its own fresh context window.

### Quick Start

```
/GL:survey
```

This begins by discovering your project — greenfield or existing code — and proposing a documentation plan. Follow the prompts; each phase tells you what was produced and what to run next.

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GRAND LIBRARY v1.0                            │
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
│  Output: .docs/<all-documents>.md                                   │
│                          │                                          │
│                          ▼                                          │
│  /GL:reconcile     Phase 3 — Reconciliation (Opus)                 │
│  ════════════════  Cross-check ALL docs for contradictions          │
│  Identify gaps, unanswered questions, implicit assumptions          │
│  Verify every decision from interview is reflected in docs          │
│  Output: RECONCILIATION_REPORT.md, updated docs                     │
│                                                                     │
│  /GL:status        Check progress anytime                          │
│  /GL:update        Re-interview a topic, regenerate affected docs  │
│  /GL:add           Add a new document to the suite                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Typical Workflow

Run `/clear` between each phase for fresh context windows.

1. **`/GL:survey`** — Discover the project, propose doc manifest
2. `/clear`
3. **`/GL:interview`** — Deep topic-by-topic Q&A (may need multiple sessions)
4. `/clear`
5. **`/GL:draft`** — Generate all documents (validate Wave 1 before continuing)
6. `/clear`
7. **`/GL:reconcile`** — Cross-check everything, resolve conflicts

Check progress anytime with **`/GL:status`**.

---

## Foundation Patterns

| Pattern | How Grand Library Uses It |
|---------|--------------------------|
| Thin Orchestrator | `/GL:draft` orchestrator spawns doc-writing subagents |
| Signal-Based Indexing | Existing code scanning in survey, domain pack loading |
| Progressive Disclosure | Skill structure, domain pack INDEX.md → on-demand knowledge |
| Structured Handoff | DECISIONS/*.md, PROJECT_BRIEF.md, doc frontmatter |

---

## Output Structure

All Grand Library artifacts are written to a `.docs/` directory in the project root:

```
.docs/
├── STATE.json
├── PROJECT_BRIEF.md
├── DOC_MANIFEST.md
├── DECISIONS/
│   ├── architecture.md
│   ├── token-model.md
│   └── ...
├── <generated docs>
└── RECONCILIATION_REPORT.md
```

---

## Model Allocation

| Phase | Component | Model |
|-------|-----------|-------|
| Survey | Code scanning subagents | Haiku |
| Survey | Orchestrator / doc manifest | User's context |
| Interview | Conversation | User's context |
| Interview | Research subagents | Sonnet |
| Draft | Doc-writing subagents | Opus |
| Reconcile | Cross-check + gap analysis | Opus |
