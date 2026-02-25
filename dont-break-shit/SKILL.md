---
name: DBS
version: "1.3.3"
description: >
  Don't Break Shit: Controlled change management for large-scope modifications.
  Use when: sweeping codebase changes needed, refactoring across many files,
  architectural migration, any change where breaking things is the risk.
  Pipeline: brief → interview → analyze → map → (discuss → plan → execute) per phase.
  Run /DBS:brief to start, or /DBS:status to check progress.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
  - Write
  - Edit
  - AskUserQuestion
  - TodoWrite
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

# Don't Break Shit

> *GSD gets shit done. DBS makes sure you don't break shit while doing it.*

Controlled change management for large-scope codebase modifications. When a project has significant existing code, documentation, and architecture in place and needs sweeping changes, DBS ensures nothing gets missed and the LLM makes as few unsupervised micro-decisions as possible.

---

## Getting Started

```
/DBS:brief
```

This begins a change management session by capturing your change brief and scanning the project baseline. Follow the prompts — each phase tells you what was produced and what command to run next.

Run `/DBS:status` at any time to check progress.

### Full Pipeline

```
/DBS:brief → /DBS:interview → /DBS:analyze → /DBS:map
    → /DBS:discuss N → /DBS:plan N → /DBS:execute N (repeats per phase)
```

Phases 1-4 are sequential strategic analysis. Phase 5 repeats per execution phase, wrapping GSD's discuss/plan/execute cycle. Each command runs in its own context window.

---

## Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/DBS:brief` | 1 | Capture change brief + scan project baseline |
| `/DBS:interview` | 2 | Deep interview mapping all changes and 1st/2nd/3rd order effects |
| `/DBS:analyze` | 3 | Sonnet blanket sweep + Opus synthesis for full impact map |
| `/DBS:map` | 4 | Generate multi-phase execution plan with testing gates |
| `/DBS:discuss N` | 5a | Wraps GSD discuss for a specific execution phase |
| `/DBS:plan N` | 5b | Wraps GSD plan for a specific execution phase |
| `/DBS:execute N` | 5c | Wraps GSD execute for a specific execution phase |
| `/DBS:status` | — | Progress tracking and next-step guidance |

---

## Foundation Patterns

| Pattern | How DBS Uses It |
|---------|-----------------|
| **Thin Orchestrator** | Phase 3 — main context spawns Sonnet/Opus agents for analysis, doesn't do analysis itself |
| **Signal-Based Indexing** | Phase 1 — scan structure first, read selectively. Phase 3 — batch files for agents |
| **Progressive Disclosure** | Resource loading via `resources/INDEX.md` — command files loaded on demand |
| **Structured Handoff Notes** | All phase outputs are `.dbs/*.md` files with frontmatter, consumed by subsequent phases |

---

## GSD Dependency

GSD is a **soft dependency**:
- **Phases 1-4** (brief, interview, analyze, map) work fully standalone — no GSD required
- **Phase 5** (discuss, plan, execute) wraps GSD's commands — GSD must be installed
- DBS checks for GSD when you first invoke a phase 5 command and tells you if it's missing

DBS never writes to GSD's `.planning/` directory. Both can run simultaneously without collision.

---

## SVK Awareness

DBS automatically checks for SVK artifacts during `/DBS:brief` and uses them in subsequent phases:

- **GL documentation** — reference during interview for architecture context
- **SOS audit findings** — flags if changes touch areas with known vulnerabilities
- **BOK verification** — warns if changes affect mathematically verified invariants
- **DB audit findings** — flags if changes touch areas with known off-chain security issues

If no SVK artifacts exist, this integration is silently skipped. Non-SVK projects get full value from the core workflow.

---

## Context Budget Strategy

- Phase handoffs use condensed structured summaries, not raw outputs
- Sonnet agents get bounded file batches (15-20 files) with condensed manifests
- Opus synthesis receives condensed Sonnet reports
- Large analysis outputs are chunked and summarized before passing to the next phase
- Every phase output is a standalone `.md` file — if a session dies, resume from the last artifact
