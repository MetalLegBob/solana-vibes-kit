---
name: BOK:execute
description: "Phase 4: Run Kani, LiteSVM, and Proptest in the worktree, collect results"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Book of Knowledge — Phase 4: Execute

Run all verification tools in the isolated worktree and collect structured results.

## Prerequisites

```bash
test -f .bok/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
test -d .bok/worktree && echo "WORKTREE_EXISTS" || echo "NO_WORKTREE"
```

Read `.bok/STATE.json` — verify `phases.generate.status === "complete"`. If not: `Generate phase is not complete. Run /BOK:generate first.`

Verify worktree exists at the path in STATE.json.

---

## Step 1: Update State

Set `phases.execute.status` to `"in_progress"` in `.bok/STATE.json`.

Create results directory:
```bash
mkdir -p .bok/results
```

---

## Step 2: Run Proptest (Fastest — Run First)

Proptest catches obvious failures in seconds with random inputs.

```bash
cd .bok/worktree && cargo test --test bok_proptest -- --nocapture 2>&1
```

**If no single test binary:** Run all proptest files individually:
```bash
cd .bok/worktree && cargo test proptest -- --nocapture 2>&1
```

Parse output for each property test:
- `test {name} ... ok` → PASSED
- `test {name} ... FAILED` → FAILED (capture counterexample inputs)
- Timeout or panic → INCONCLUSIVE

Write results to `.bok/results/proptest-results.md`:
```markdown
# Proptest Results

| Property | Status | Iterations | Counterexample |
|----------|--------|-----------|----------------|
| {name} | PASSED | 10,000 | — |
| {name} | FAILED | 342 | {input values} |
```

---

## Step 3: Run LiteSVM

LiteSVM tests economic invariants against the actual Solana VM runtime.

```bash
cd .bok/worktree && cargo test --test bok_litesvm -- --nocapture 2>&1
```

**If no single test binary:**
```bash
cd .bok/worktree && cargo test litesvm -- --nocapture 2>&1
```

Parse output similarly. Write to `.bok/results/litesvm-results.md`.

---

## Step 4: Run Kani (Slowest — Formal Proof)

**Skip this step if `degraded_mode === true` in STATE.json.**

Kani proves properties for ALL possible inputs — this is the strongest verification.

```bash
cd .bok/worktree && cargo kani --tests 2>&1
```

If the above doesn't work, try running harnesses individually:
```bash
cd .bok/worktree && cargo kani --harness bok_kani_* 2>&1
```

Parse output for each harness:
- `VERIFICATION:- SUCCESSFUL` → PROVEN
- `VERIFICATION:- FAILED` → FAILED (capture counterexample)
- Timeout → INCONCLUSIVE (note the timeout and suggest increasing unwind bound)

Write to `.bok/results/kani-results.md`:
```markdown
# Kani Results

| Harness | Status | Unwind | Counterexample |
|---------|--------|--------|----------------|
| verify_{name} | PROVEN | 10 | — |
| verify_{name} | FAILED | 10 | {counterexample} |
| verify_{name} | INCONCLUSIVE | 10 | timeout (try --unwind 20) |
```

---

## Step 5: Collect and Summarize Results

Read all result files. Compile per-function summaries to `.bok/results/summary.md`:

```markdown
# Verification Summary

## Tallies
- **Proven (Kani):** {N} {or "N/A — degraded mode"}
- **Stress-tested (Proptest + LiteSVM):** {N}
- **Failed:** {N}
- **Inconclusive:** {N}

## Per-Function Results

### {function_name} ({file_path})

| Invariant | Kani | LiteSVM | Proptest |
|-----------|------|---------|----------|
| {description} | PROVEN | — | PASSED (10,000) |
| {description} | — | PASSED | PASSED (10,000) |
| {description} | FAILED | — | FAILED (cex: {inputs}) |
```

---

## Step 6: Update State & Present Results

Update `.bok/STATE.json`:
- `phases.execute.status`: `"complete"`
- `phases.execute.proven`: count
- `phases.execute.stress_tested`: count
- `phases.execute.failed`: count
- `phases.execute.inconclusive`: count
- `updated`: current ISO-8601 timestamp

```markdown
## Phase 4 Complete — Execute

### Verification Results

| Category | Count |
|----------|-------|
| **Proven** (Kani formal proof) | {N} |
| **Stress-tested** (Proptest + LiteSVM) | {N} |
| **Failed** (violations found) | {N} |
| **Inconclusive** (timeouts/errors) | {N} |

{If failures found:}
### ⚠ Failures Found

{For each failure: function name, invariant description, counterexample}

These failures may indicate bugs or exploitable conditions. The report phase
will provide detailed analysis and fix suggestions.

**Output:**
- `.bok/results/` — Detailed results per tool

### Next Step:
Run `/clear` then `/BOK:report` to compile the verification report with fix suggestions.
```
