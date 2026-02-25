---
name: DBS:map
description: "Generate multi-phase execution plan with testing gates"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - AskUserQuestion
---

# Don't Break Shit — Phase 4: Map

Generate a multi-phase execution plan from the impact map. Each phase is independently verifiable with testing gates between phases.

## Step 1: Check Prerequisites

Read `.dbs/STATE.json`:

- If file doesn't exist: Stop. Tell user to run `/DBS:brief` first.
- If `pipeline.analyze.status` is NOT `"complete"`: Stop. Tell user to complete the analysis first.
- If `pipeline.map.status` is `"complete"`: Warn and ask if they want to regenerate the map.

Update `pipeline.map.status` to `"in_progress"`.

## Step 2: Load Context

Read these files:
1. `.dbs/IMPACT-MAP.md` — the consolidated impact map
2. `.dbs/INTERVIEW.md` — for testing criteria and constraints (condense to key decisions)

## Step 3: Group Changes into Execution Phases

Analyze the impact map and group changes into execution phases using these criteria (in priority order):

### Grouping Criteria

1. **Dependency order** — changes that others depend on must come first. If file B imports from file A, and both need changes, file A's changes go in an earlier phase.

2. **Risk level** — high-risk changes early in the pipeline. Failures should surface before building on top of them. High-risk = core data structures, shared interfaces, security-critical code.

3. **Logical grouping** — related changes belong in the same phase. A type definition change and all its consumers should be in the same phase when possible.

4. **Testability** — each phase must be independently verifiable. If a group of changes can't be tested without another group, merge them into one phase.

### Phase Design Rules

- Each phase should be small enough to reason about (target: 5-15 file changes per phase)
- Each phase should have clear testing criteria derived from the interview
- Phases should minimize cross-phase dependencies
- The first phase should tackle the foundation (types, interfaces, core models)
- The last phase should handle documentation, config, and cleanup

## Step 4: Specify Each Phase

For each phase, produce:

```markdown
### Phase N: <Title>

**Changes:**
- <change 1 — referencing impact map entries>
- <change 2>
- ...

**Files:**
| File | What Changes |
|------|-------------|

**Dependencies:** Requires Phase <X>, <Y> to be complete

**Testing Criteria:**
- [ ] <criterion 1 — from interview decisions>
- [ ] <criterion 2>

**Complexity:** Low / Medium / High
**Risk:** Low / Medium / High
```

## Step 5: Present for User Review

Show the complete execution plan to the user. Ask:

> Here's the proposed execution plan with <N> phases. Would you like to:
> 1. **Approve** — proceed as-is
> 2. **Adjust** — modify phase groupings, ordering, or criteria
> 3. **Regenerate** — rebuild with different priorities

If the user wants adjustments, apply them and re-present. Repeat until approved.

## Step 6: Write MAP.md

Write `.dbs/MAP.md`:

```markdown
---
skill: dbs
phase: map
status: complete
updated: <ISO-8601>
key_outputs:
  - "<N> execution phases planned"
  - "<M> total file changes across all phases"
---

# DBS Execution Map

## Overview
<Brief summary: N phases, total changes, key dependencies>

## Phase 1: <Title>
<Full phase specification from Step 4>

## Phase 2: <Title>
...

## Execution Order
<Visual dependency graph if phases have cross-dependencies>

## Testing Strategy
<Summary of how testing gates work between phases>
```

## Step 7: Update State and Report

Update `.dbs/STATE.json`:
- Set `pipeline.map.status` to `"complete"`
- Set `project.total_phases` to the number of phases
- Set `project.current_phase` to `1`
- Initialize `phases` object with entries for each phase:
  ```json
  "phases": {
    "1": { "discuss": "pending", "plan": "pending", "execute": "pending" },
    "2": { "discuss": "pending", "plan": "pending", "execute": "pending" }
  }
  ```
- Update `updated` timestamp

Also check if GSD is installed:
```bash
test -d .claude/commands/gsd/ && echo "GSD_INSTALLED" || echo "NO_GSD"
```
Set `gsd_available` to `true` or `false`.

Display summary:

```
Don't Break Shit — Execution Map Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execution Plan:
  Total phases:    <N>
  Total changes:   <M> files across all phases
  GSD available:   yes / no

Phases:
  Phase 1: "<title>" — <file count> files, <complexity>
  Phase 2: "<title>" — <file count> files, <complexity>
  ...

Artifacts:
  .dbs/MAP.md — multi-phase execution plan

Next: /clear then /DBS:discuss
```

If GSD is not installed, add:
```
Note: GSD is required for execution phases. Install it before running /DBS:discuss.
```
