---
name: DBS:execute
description: "Wraps GSD execute for a specific execution phase"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Edit
  - Task
  - Skill
---

# Don't Break Shit — Phase 5c: Execute

Wraps GSD's execute command for a specific execution phase. Implements changes wave-by-wave with the DBS impact map as ground truth.

## Step 1: GSD Dependency Check

```bash
test -d .claude/commands/gsd/ && echo "GSD_INSTALLED" || echo "NO_GSD"
```

If GSD is NOT installed, stop with GSD requirement message (same as discuss.md).

## Step 2: Determine Phase Number

Same logic as discuss.md/plan.md:
- If argument provided: use that phase number N
- If no argument: auto-advance to the next phase where `plan` is `"complete"` but `execute` is NOT `"complete"`

Validate:
- Phase N must exist
- Phase N's `plan` must be `"complete"` (can't execute without a plan)

## Step 3: Load Context

Read these files:
1. `.dbs/phases/N-PLAN.md` — the implementation plan with waves
2. `.dbs/IMPACT-MAP.md` — ground truth for what should change
3. `.dbs/phases/N-CONTEXT.md` — tactical decisions and testing criteria

Update `.dbs/STATE.json`: set `phases.N.execute` to `"in_progress"`.

## Step 4: Execute Wave by Wave

For each wave in the plan:

### 4a: Implement Changes

Execute the changes specified in the wave. For independent changes within a wave, use parallel subagents via the Task tool where appropriate:

- Each subagent receives the specific change to make, the file to modify, and the expected outcome
- Subagents should use Read to verify current file state before modifying
- Subagents should use Edit for targeted modifications (not Write for full file rewrites)

### 4b: Verify Wave

After all changes in a wave are complete:
1. Run any automated tests if the project has them:
   ```bash
   # Detect and run test suite
   test -f package.json && npm test 2>&1 | tail -20
   test -f Cargo.toml && cargo test 2>&1 | tail -20
   test -f pyproject.toml && pytest 2>&1 | tail -20
   ```
2. Check that modified files are syntactically valid
3. Cross-reference against the impact map — did we change what we said we'd change?

### 4c: Commit Wave

After wave verification passes:
```bash
git add <changed files>
git commit -m "dbs(phase-N): wave W — <brief description>"
```

If verification fails, stop and report the failure. Do NOT continue to the next wave.

## Step 5: Testing Gate

After all waves complete, run the phase's testing gate from the plan:

1. Run the full test suite
2. Check each testing criterion from `.dbs/phases/N-PLAN.md`
3. Cross-reference the impact map — verify all expected changes were made

Report results to the user.

## Step 6: Update State and Report

Update `.dbs/STATE.json`:
- Set `phases.N.execute` to `"complete"`
- Update `updated` timestamp
- If N < total_phases, set `project.current_phase` to N+1

```
Don't Break Shit — Phase N Execute Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase N: "<title>"
  Waves executed:  <W>
  Files changed:   <F>
  Tests:           <pass/fail status>
  Commits:         <count>

Testing Gate: PASSED / FAILED
```

### If more phases remain:

```
Progress: Phase N of <total> complete

Next: /clear then /DBS:discuss <N+1>
```

### If this was the last phase:

```
All <total> phases complete!

DBS Change Management Session Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All changes have been implemented and verified.
Run /DBS:status for a full summary.

The .dbs/ directory contains the complete audit trail of all decisions and changes.
```
