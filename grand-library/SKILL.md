---
name: GL
version: "1.3.0"
description: >
  Grand Library: Full-stack documentation skill that transforms project ideas into
  comprehensive specification suites. Guides greenfield projects from idea to spec,
  or analyzes existing codebases to fill documentation gaps.
  Run /GL for a getting-started guide, or /GL:survey to begin.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<!-- SVK Version Check — runs once per session on first skill invocation -->
<svk-version-check>
**On first invocation this session**, silently perform a version check:

1. Look for `.claude/svk-meta.json` in the current project. If it doesn't exist, skip this check entirely.
2. Read the `svk_repo` path and `installed_version` from the metadata file.
3. Run: `git -C <svk_repo> fetch --tags --quiet 2>/dev/null`
4. Run: `git -C <svk_repo> tag --sort=-v:refname | head -1` to get the latest tag.
5. Compare the installed version against the latest tag (strip the leading `v`).
6. If they match, skip — the user is up to date.
7. If the latest tag is newer, show this message ONCE (never repeat in this session):

> **SVK Update Available:** v{latest} is available (you're on v{installed}).
> - **Update now:** I can pull and reinstall the changed skills in this session
> - **Update later:** Start a new chat and run `/SVK:update`

8. If the git commands fail (offline, repo moved, etc.), skip silently. Never show errors from version checking.

**Important:** Do NOT block or delay the user's actual command. Perform this check, show the notification if needed, then proceed with the command they invoked.
</svk-version-check>

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
│  /GL:repos         Browse forkable open source repo catalogue      │
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
| Interview | Fork opportunity verification | Haiku |
| Repos | Catalogue browsing | User's context |
| Repos | Live verification | Haiku |
| Draft | Doc-writing subagents | Opus |
| Reconcile | Cross-check + gap analysis | Opus |
