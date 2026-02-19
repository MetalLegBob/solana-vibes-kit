---
name: BOK:report
description: "Phase 5: Compile verification report, suggest fixes, offer test merge"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Book of Knowledge — Phase 5: Report

Compile all verification results into a final report with fix suggestions, then offer to merge generated tests back to the user's branch.

## Prerequisites

```bash
test -f .bok/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

Read `.bok/STATE.json` — verify `phases.execute.status === "complete"`. If not: `Execute phase is not complete. Run /BOK:execute first.`

---

## Step 1: Update State

Set `phases.report.status` to `"in_progress"` in `.bok/STATE.json`.

---

## Step 2: Generate Report

Spawn an Opus subagent to synthesize the final report:

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="
    You are a BOK report synthesizer. Read the agent definition from:
    {skill_path}/agents/report-synthesizer.md

    Read all verification results from .bok/results/
    Read the report template from {skill_path}/templates/REPORT.md

    Generate a comprehensive verification report at:
    .bok/reports/{YYYY-MM-DD}-report.md

    The report must include:
    1. Summary — overall assurance level, counts
    2. Per-function findings — what was verified, tools used, pass/fail
    3. Failed verifications — counterexamples, impact, suggested code fixes
    4. Assurance map — visual table of every verified property
    5. Recommendations — prioritized fix list
    6. Test merge guide — which generated tests are worth keeping

    For each failure, provide:
    - Concrete before/after code fix
    - Severity assessment
    - Exploit scenario if unfixed

    {If degraded_mode: 'Flag that results are stress-tested, not formally proven.
     Recommend Kani installation for full assurance.'}
  "
)
```

---

## Step 3: Create Reports Directory

```bash
mkdir -p .bok/reports
```

Verify the report was written successfully.

---

## Step 4: Present Report Summary

Display the key findings from the report:

```markdown
## Phase 5 Complete — Report

### Verification Report: `.bok/reports/{date}-report.md`

**Overall Assurance Level:** {Formally Proven / Stress-Tested / Partial}

**Summary:**
- Properties verified: {N}
- Properties proven (Kani): {N}
- Properties stress-tested (Proptest + LiteSVM): {N}
- Violations found: {N}
- Fix suggestions provided: {N}

{If failures exist:}
### Critical Findings

{Top 3 failures with brief description and severity}

{If degraded mode:}
### ⚠ Degraded Mode Notice
Results are based on property-based testing (probabilistic), not formal proof.
Install Kani and re-run for mathematically proven assurance.
```

---

## Step 5: Test Merge Offer

Present the user with three options:

```markdown
### Generated Tests

BOK generated verification tests in the worktree branch `{branch_name}`.

**Options:**

1. **Merge all tests** — Bring all Kani harnesses, LiteSVM tests, and Proptest suites
   into your working branch. Tests will live in `tests/bok/`.

2. **Cherry-pick specific tests** — Choose which categories to keep:
   - [ ] Kani harnesses (`tests/bok/kani/`)
   - [ ] LiteSVM tests (`tests/bok/litesvm/`)
   - [ ] Proptest suites (`tests/bok/proptest/`)

3. **Discard tests, keep report only** — Remove the worktree and branch.
   The report at `.bok/reports/` is preserved regardless.

Which option? [1 / 2 / 3]
```

---

## Step 6: Execute User's Choice

**Option 1 — Merge all:**
```bash
git merge {worktree_branch} --no-ff -m "feat: add BOK verification tests"
```

**Option 2 — Cherry-pick:**
```bash
# For each selected category:
git checkout {worktree_branch} -- tests/bok/{category}/
git add tests/bok/{category}/
git commit -m "feat: add BOK {category} verification tests"
```

**Option 3 — Discard:**
Skip merge, proceed to cleanup.

---

## Step 7: Cleanup

Remove the worktree (regardless of merge choice):
```bash
git worktree remove .bok/worktree --force 2>/dev/null
```

Optionally delete the branch if tests were discarded:
```bash
# Only if Option 3 was chosen:
git branch -D {worktree_branch} 2>/dev/null
```

---

## Step 8: Update State & Final Summary

Update `.bok/STATE.json`:
- `phases.report.status`: `"complete"`
- `phases.report.report_path`: the report file path
- `phases.report.tests_merged`: true/false
- `worktree_path`: null
- `worktree_branch`: null (if discarded)
- `updated`: current ISO-8601 timestamp

```markdown
## Book of Knowledge — Verification Complete

**Report:** `.bok/reports/{date}-report.md`
**Tests:** {merged to working branch / cherry-picked / discarded}
**Worktree:** cleaned up

### What to Do Next:
1. Review the report for fix suggestions
2. Apply recommended fixes
3. {If SOS available: "Run /SOS — it will skip re-analyzing formally verified math"}
4. Re-run `/BOK:scan` after fixes to verify corrections

The report is readable by the SVK MCP server and will be picked up by future SOS audits.
```
