---
name: BOK:confirm
description: "Phase 2: Interactive review — user adjusts, adds, or removes proposed invariants before generation"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Book of Knowledge — Phase 2: Confirm

Interactive review gate — you review, adjust, add, or remove proposed invariants before any verification code is generated.

## Prerequisites

```bash
test -f .bok/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

Read `.bok/STATE.json` — verify `phases.analyze.status === "complete"`. If not: `Analyze phase is not complete. Run /BOK:analyze first.`

Verify `.bok/invariants/` directory exists and has files.

---

## Step 1: Update State

Set `phases.confirm.status` to `"in_progress"` in `.bok/STATE.json`.

---

## Step 2: Present Invariants for Review

Read all files in `.bok/invariants/`. Present invariants grouped by function:

```markdown
## Review: {function_name} ({file_path})

### Invariant 1: {plain-English description}

**Why it matters:** {exploit scenario}
**Tool:** {Kani / LiteSVM / Proptest}
**Confidence:** {high / medium / low}

**Property:**
\`\`\`
{formal property or pseudocode}
\`\`\`

**Code region:**
\`\`\`rust
{the relevant source code}
\`\`\`

→ **[Confirm]** / **[Modify]** / **[Skip]**

---

### Invariant 2: ...
```

Present one function at a time. Wait for user response before proceeding to the next.

---

## Step 3: Handle User Responses

For each invariant:

- **Confirm** — Mark as confirmed, include in generation
- **Modify** — User provides adjusted description or parameters. Update the invariant file.
- **Skip** — Mark as skipped, exclude from generation

Allow batch operations:
- `confirm all` — Confirm all remaining invariants for this function
- `skip all` — Skip all remaining for this function
- `confirm all remaining` — Confirm everything left in the review

---

## Step 4: Accept Custom Invariants

After reviewing all proposed invariants, ask:

```markdown
## Custom Invariants

Do you want to add any custom invariants? Describe them in plain English and I'll
translate them to formal properties.

**Examples:**
- "The total supply should never change during a swap"
- "Fees should always round in favor of the protocol"
- "No single withdrawal can drain more than 10% of the pool"

Type your invariants, or say "done" to proceed.
```

For each custom invariant:
1. Translate the plain-English description to a formal property
2. Determine which tool(s) should verify it
3. Write to `.bok/invariants/custom-{N}.md`
4. Present the translation for user confirmation

---

## Step 5: Priority Ordering

After all confirmations, order the final invariant set by:

1. **Critical-path functions** — Functions on the main execution path (swaps, deposits, withdrawals)
2. **SOS-flagged functions** — If SOS findings exist, these get higher priority
3. **Complexity** — Simple Kani proofs first, then Proptest suites, then complex LiteSVM tests

Write the ordered set to `.bok/confirmed-invariants/`:
- One file per function, containing all confirmed invariants for that function
- Each file includes: function code reference, invariant properties, tool assignments, priority rank

---

## Step 6: Update State & Present Summary

Update `.bok/STATE.json`:
- `phases.confirm.status`: `"complete"`
- `phases.confirm.invariants_confirmed`: count
- `phases.confirm.invariants_skipped`: count
- `phases.confirm.invariants_added`: count (custom)
- `updated`: current ISO-8601 timestamp

```markdown
## Phase 2 Complete — Confirm

**Confirmed: {N}** | **Skipped: {N}** | **Custom added: {N}**

**By Tool:**
- Kani: {N} harnesses to generate
- LiteSVM: {N} tests to generate
- Proptest: {N} suites to generate

**Output:**
- `.bok/confirmed-invariants/` — {N} confirmed invariant files

### Next Step:
The generate phase creates an isolated git worktree and generates all verification code there.
Your working tree will NOT be touched.

Run `/clear` then `/BOK:generate` to generate verification code.
```
