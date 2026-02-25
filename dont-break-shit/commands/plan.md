---
name: DBS:plan
description: "Wraps GSD plan for a specific execution phase"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Skill
---

# Don't Break Shit — Phase 5b: Plan

Wraps GSD's plan command for a specific execution phase, injecting the DBS impact map and phase context as additional planning context.

## Step 1: GSD Dependency Check

```bash
test -d .claude/commands/gsd/ && echo "GSD_INSTALLED" || echo "NO_GSD"
```

If GSD is NOT installed, stop with GSD requirement message (same as discuss.md).

## Step 2: Determine Phase Number

Same logic as discuss.md:
- If argument provided: use that phase number N
- If no argument: auto-advance to the next phase where `discuss` is `"complete"` but `plan` is NOT `"complete"`

Validate:
- Phase N must exist
- Phase N's `discuss` must be `"complete"` (can't plan without discussing first)

## Step 3: Load Context

Read these files:
1. `.dbs/phases/N-CONTEXT.md` — the tactical decisions from discuss
2. `.dbs/IMPACT-MAP.md` — affected files and dependency chains for this phase
3. `.dbs/MAP.md` — the phase specification (changes, testing criteria)

## Step 4: Generate Implementation Plan

Using the context from Step 3, create a detailed implementation plan for this phase. The plan should follow the conventions of GSD's planning format:

For each change in this phase:
1. **What file(s)** to modify
2. **What specifically** to change (functions, types, imports, config values)
3. **How** to change it (add, modify, delete, refactor)
4. **Verification** — how to confirm this specific change worked
5. **Dependencies** — what other changes in this phase must happen first

Organize changes into **waves** — groups of independent changes that can be made in parallel. Changes within a wave have no dependencies on each other. Waves execute sequentially.

## Step 5: Write Phase Plan

Write `.dbs/phases/N-PLAN.md`:

```markdown
---
skill: dbs
phase: plan
execution_phase: N
status: complete
updated: <ISO-8601>
key_outputs:
  - "<W> execution waves planned"
  - "<C> total changes across <F> files"
---

# Phase N: <Title> — Implementation Plan

## Overview
<Brief summary of what this phase accomplishes>

## Wave 1: <Description>
### Change 1.1: <Description>
- **File:** <path>
- **Action:** <add/modify/delete>
- **Details:** <specific changes>
- **Verify:** <how to confirm>

### Change 1.2: <Description>
...

## Wave 2: <Description>
...

## Testing Gate
After all waves complete:
- [ ] <test criterion 1 from interview>
- [ ] <test criterion 2>
- [ ] No regressions in existing tests

## Rollback
<If this phase fails, what to revert>
```

## Step 6: Update State and Report

Update `.dbs/STATE.json`:
- Set `phases.N.plan` to `"complete"`
- Update `updated` timestamp

```
Don't Break Shit — Phase N Plan Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase N: "<title>"
  Waves:    <W>
  Changes:  <C> across <F> files
  Tests:    <T> verification criteria

Artifacts:
  .dbs/phases/N-PLAN.md

Next: /clear then /DBS:execute N
```
