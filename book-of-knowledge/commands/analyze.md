---
name: BOK:analyze
description: "Phase 1: Match math regions against verification patterns, propose invariants with plain-language explanations"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Book of Knowledge — Phase 1: Analyze

Match identified math regions against the verification pattern knowledge base and propose invariants with plain-language explanations.

## CRITICAL — Artifact Output Path

All BOK artifacts MUST be read from and written to **`.bok/` at the project root** — the same directory that contains `Cargo.toml` or `Anchor.toml`. **Never** create BOK artifacts under `.claude/`.

## Prerequisites

```bash
test -f .bok/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

If no state: `Run /BOK:scan first to index the codebase.`

Read `.bok/STATE.json` — verify `phases.scan.status === "complete"`. If not: `Scan phase is not complete. Run /BOK:scan first.`

Read `.bok/INDEX.md` — this is the math region index from the scan phase.

---

## Step 1: Re-check Kani Availability

If STATE.json shows `kani_available: false`, re-check whether Kani has been installed since the scan phase:

```bash
command -v cargo-kani >/dev/null 2>&1 && echo "KANI_AVAILABLE" || echo "KANI_NOT_FOUND"
```

**If Kani is now available but STATE says `kani_available: false`:**
- Update STATE.json: `kani_available: true`, `degraded_mode: false`
- Inform the user:
  ```
  Kani detected! Updating from degraded mode → full verification mode.
  All three verification tools are now available (Kani + LiteSVM + Proptest).
  ```

**If Kani is still not available:**
- Offer to install: `cargo install --locked kani-verifier && cargo kani setup`
- If user installs: verify with `cargo kani --version`, then update STATE.json: `kani_available: true`, `degraded_mode: false`
- If user declines: continue in degraded mode (no change needed)

**IMPORTANT:** Always re-check — the user may have installed Kani between phases. Stale `kani_available: false` causes the generate phase to skip all Kani harnesses.

---

## Step 2: Update State

Set `phases.analyze.status` to `"in_progress"` in `.bok/STATE.json`.

---

## Step 3: Load Pattern Index

Read the skill's `resources/INDEX.md` to identify which pattern categories are relevant. For each category that has matching math regions in `.bok/INDEX.md`, note the category directory path.

**Signal-Based Loading:** Only load pattern categories that match identified regions. Do NOT load all 19 categories — load only what's needed.

---

## Step 4: Deploy Parallel Analysis Agents

For each cluster of math regions (grouped by category or by file proximity), spawn an Opus subagent:

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="
    You are a BOK invariant proposer. Read the agent definition from:
    {skill_path}/agents/invariant-proposer.md

    Your assignment:
    - Math regions: {list of functions/regions in this cluster}
    - Category: {category name}
    - Pattern files: {list of pattern file paths to load}
    - GL specs: {path to relevant GL docs, if available}
    - SOS findings: {path to relevant SOS findings, if available}

    For each math region, propose invariants following the format in the agent definition.
    Output to: .bok/invariants/{region_name}.md
    (IMPORTANT: .bok/ is at the PROJECT ROOT, next to Cargo.toml — NOT under .claude/)

    IMPORTANT: Every invariant must include:
    1. Plain-English description of what it checks
    2. Why it matters — concrete exploit scenario
    3. Which tool verifies it (Kani / LiteSVM / Proptest)
    4. Confidence level (high / medium / low)
  "
)
```

Launch agents in parallel — one per category cluster. Use the `Task` tool with `run_in_background` for parallelism.

---

## Step 5: Collect Results

After all agents complete:

1. Create `.bok/invariants/` directory if it doesn't exist
2. Verify each agent wrote its output file
3. Count invariants per tool type:
   - Kani invariants (formal proof targets)
   - LiteSVM invariants (runtime test targets)
   - Proptest invariants (property test targets)

---

## Step 6: Update State & Present Results

Update `.bok/STATE.json`:
- `phases.analyze.status`: `"complete"`
- `phases.analyze.invariants_proposed`: total count
- `phases.analyze.by_tool`: `{ "kani": N, "litesvm": N, "proptest": N }`
- `updated`: current ISO-8601 timestamp

Present summary:

```markdown
## Phase 1 Complete — Analyze

**Invariants Proposed: {N}**
- Kani (formal proof): {N}
- LiteSVM (runtime test): {N}
- Proptest (property test): {N}

**Functions Analyzed: {N}**

**Categories Matched:**
{list of categories with invariant counts}

**Output:**
- `.bok/invariants/` — {N} invariant proposal files

### What Happens Next:
In the confirm phase, you'll review each proposed invariant. You can:
- **Confirm** — include it in verification
- **Modify** — adjust the property or parameters
- **Skip** — exclude it
- **Add custom** — describe new invariants in plain English

### Next Step:
Run `/clear` then `/BOK:confirm` to review and approve invariants before code generation.
```
