---
name: BOK:generate
description: "Phase 3: Create isolated worktree, generate Kani harnesses + LiteSVM tests + Proptest suites"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Book of Knowledge — Phase 3: Generate

Create an isolated git worktree and generate verification code for all confirmed invariants.

**Key principle:** Your working tree is never touched. All generated code lives in an isolated worktree branch. You choose what to keep after execution.

## Prerequisites

```bash
test -f .bok/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

Read `.bok/STATE.json` — verify `phases.confirm.status === "complete"`. If not: `Confirm phase is not complete. Run /BOK:confirm first.`

Verify `.bok/confirmed-invariants/` directory exists and has files.

---

## Step 1: Update State

Set `phases.generate.status` to `"in_progress"` in `.bok/STATE.json`.

---

## Step 2: Create Worktree

```bash
BRANCH_NAME="bok/verify-$(date +%s)"
git worktree add .bok/worktree -b "$BRANCH_NAME"
```

Update STATE.json:
- `worktree_path`: `.bok/worktree`
- `worktree_branch`: the branch name

If worktree creation fails (e.g., uncommitted changes):
```
⚠ Git worktree creation failed. This usually means you have uncommitted changes.
Please commit or stash your changes, then re-run /BOK:generate.
```

---

## Step 3: Dependency Setup

In the worktree, add verification dependencies to `Cargo.toml`:

```bash
cd .bok/worktree
```

Add dev-dependencies (check if they already exist first):
- `proptest = "1"` under `[dev-dependencies]`
- `litesvm = "0.3"` under `[dev-dependencies]`

If Kani is available (not degraded mode), no Cargo dependency needed — Kani uses its own toolchain via `cargo kani`.

Create the test directory structure:
```bash
mkdir -p .bok/worktree/tests/bok/kani
mkdir -p .bok/worktree/tests/bok/litesvm
mkdir -p .bok/worktree/tests/bok/proptest
```

---

## Step 4: Generate Verification Code

Read all confirmed invariant files from `.bok/confirmed-invariants/`.

For each function's invariants, spawn parallel Opus subagents:

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="
    You are a BOK harness generator. Read the agent definition from:
    {skill_path}/agents/harness-generator.md

    Your assignment:
    - Function: {function_name} in {file_path}
    - Confirmed invariants: {list}
    - Templates to use: {template paths}
    - Worktree path: .bok/worktree

    Generate:
    1. Kani harness → .bok/worktree/tests/bok/kani/harness_{function_name}.rs
       (Skip if degraded mode)
    2. LiteSVM test → .bok/worktree/tests/bok/litesvm/test_{function_name}.rs
       (Only for invariants requiring runtime context)
    3. Proptest suite → .bok/worktree/tests/bok/proptest/prop_{function_name}.rs

    Use the templates as structural guides but adapt to the actual function
    signatures and invariant properties. Include comments explaining what
    each test verifies and why.
  "
)
```

Launch one agent per function. Use `run_in_background` for parallelism.

---

## Step 5: Verify Generated Code

After all agents complete:

1. Check that generated files exist and are non-empty
2. Run a syntax check:
   ```bash
   cd .bok/worktree && cargo check --tests 2>&1 | head -50
   ```
3. If compilation errors exist, attempt to fix them (common issues: missing imports, wrong module paths)
4. Count generated artifacts per category

---

## Step 6: Update State & Present Summary

Update `.bok/STATE.json`:
- `phases.generate.status`: `"complete"`
- `phases.generate.harnesses_generated`: count
- `phases.generate.litesvm_tests_generated`: count
- `phases.generate.proptest_suites_generated`: count
- `updated`: current ISO-8601 timestamp

```markdown
## Phase 3 Complete — Generate

**Worktree:** `.bok/worktree` (branch: {branch_name})

**Generated:**
- Kani harnesses: {N} {or "skipped (degraded mode)"}
- LiteSVM tests: {N}
- Proptest suites: {N}

**Compilation:** {passed / N errors to review}

**Structure:**
\`\`\`
.bok/worktree/tests/bok/
├── kani/       ({N} files)
├── litesvm/    ({N} files)
└── proptest/   ({N} files)
\`\`\`

### Next Step:
The execute phase runs all verification tools. This may take several minutes,
especially Kani proofs.

Run `/clear` then `/BOK:execute` to run verification.
```
