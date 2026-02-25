---
name: DBS:discuss
description: "Wraps GSD discuss for a specific execution phase"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - AskUserQuestion
  - Skill
---

# Don't Break Shit — Phase 5a: Discuss

Wraps GSD's discuss command for a specific execution phase, injecting DBS context (impact map, testing criteria) as project context.

## Step 1: GSD Dependency Check

```bash
test -d .claude/commands/gsd/ && echo "GSD_INSTALLED" || echo "NO_GSD"
```

If GSD is NOT installed, stop with this message:

```
GSD is required for DBS execution phases (discuss, plan, execute).

GSD (Get Shit Done) handles tactical implementation — DBS provides the strategic
analysis, GSD does the actual coding.

Install GSD first, then re-run this command.
```

## Step 2: Determine Phase Number

Check if a phase number was provided as an argument:
- If argument provided: use that phase number N
- If no argument: auto-advance to the next incomplete phase from `.dbs/STATE.json`

To auto-advance, read `.dbs/STATE.json` and find the first phase where `discuss` is NOT `"complete"`.

Validate:
- Phase N must exist in STATE.json's `phases` object
- If phase N's `discuss` is already `"complete"`, warn and ask if they want to redo it

## Step 3: Check Prerequisites

Read `.dbs/STATE.json`:
- `pipeline.map.status` must be `"complete"`
- If phase N > 1, check that phase N-1's `execute` is `"complete"` (phases should be done in order)
  - If not, warn but allow override if user confirms

Update `.dbs/STATE.json`: set `phases.N.discuss` to `"in_progress"` and `project.current_phase` to N.

## Step 4: Load Phase Context

Read these files:
1. `.dbs/MAP.md` — extract the specification for Phase N
2. `.dbs/IMPACT-MAP.md` — extract affected files and dependency chains for this phase
3. `.dbs/INTERVIEW.md` — extract relevant testing criteria and constraints

Produce a condensed **phase context document** that includes:
- What changes this phase makes
- Which files are affected
- Testing criteria for this phase
- Constraints that apply
- Dependencies on prior phases and what they changed

## Step 5: Run GSD Discuss with DBS Context

The discuss step is a conversation with the user about tactical implementation decisions for this specific phase. DBS provides the strategic context; the user and Claude work out the tactical details.

Present the phase context to the user, then conduct a focused discuss session covering:

1. **Implementation approach** for each change in this phase
2. **Edge cases** — anything the impact map identified as risky
3. **Testing strategy** — how to verify each change
4. **Rollback plan** — what to do if this phase breaks something

Use AskUserQuestion for key decision points.

## Step 6: Write Phase Context

Write `.dbs/phases/N-CONTEXT.md`:

```markdown
---
skill: dbs
phase: discuss
execution_phase: N
status: complete
updated: <ISO-8601>
key_outputs:
  - "Tactical decisions for phase N captured"
---

# Phase N: <Title> — Discuss

## Changes in This Phase
<From MAP.md>

## Implementation Decisions
<Tactical decisions from the discuss session>

## Testing Plan
<How to verify this phase worked>

## Edge Cases & Risks
<Identified risks and mitigation>

## Rollback Plan
<What to do if something breaks>
```

## Step 7: Update State and Report

Update `.dbs/STATE.json`:
- Set `phases.N.discuss` to `"complete"`
- Update `updated` timestamp

```
Don't Break Shit — Phase N Discuss Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase N: "<title>"
  Changes:  <count> items
  Files:    <count> affected
  Decisions: <count> tactical decisions captured

Artifacts:
  .dbs/phases/N-CONTEXT.md

Next: /clear then /DBS:plan N
```
