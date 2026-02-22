---
name: DB:analyze
description: "Phase 1+1.5: Deploy selected parallel off-chain auditor agents and validate output quality"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Dinh's Bulwark — Phase 1 + 1.5: Analyze & Validate

Deploy the selected auditor agents (determined during Phase 0 scan) to build deep understanding of the codebase through specialized security lenses.

## Prerequisites

1. Read `.bulwark/STATE.json` — check that `phases.scan.status === "complete"`
2. Verify `.bulwark/KB_MANIFEST.md` exists
3. Verify `.bulwark/INDEX.md` exists
4. Verify `config.selected_auditors` array exists in STATE.json

If any prerequisite is missing:
```
Phase 0 (scan) has not been completed yet.
Run /DB:scan first to detect project components, select auditors, and build the index.
```

---

## Phase 1: Parallel Context Building

### Step 1: Load Configuration

Read `.bulwark/STATE.json` for:
- `config.tier` — determines agent depth
- `config.selected_auditors` — the array of auditor definitions to deploy
- `config.auditor_count` — total number of agents to spawn
- `config.models.phase1` — model for context auditor agents (opus or sonnet)
- `config.models.quality_gate` — model for quality gate (haiku)
- `cross_skill.sos_available` — whether SOS findings are available
- `cross_skill.gl_available` — whether GL docs are available

Read `.bulwark/KB_MANIFEST.md` for Phase 1 agent KB file lists.

### Step 2: Locate Skill Files

Find the agent template and catalog paths:

```bash
find ~/.claude -name "context-auditor.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
find ~/.claude -name "auditor-catalog.md" -path "*/dinhs-bulwark/resources/*" 2>/dev/null | head -1
```

Store as `AUDITOR_PATH` and `CATALOG_PATH`.

### Step 3: Build Agent List from Selected Auditors

Read `config.selected_auditors` from STATE.json. For each selected auditor, derive:

- **Agent number:** Sequential (01, 02, 03, ...)
- **Auditor ID:** From selection (e.g., SEC-01, AUTH-01, INJ-03)
- **Focus area name:** From catalog (e.g., "Private Key & Wallet Security")
- **Output file:** `.bulwark/context/{NN}-{id-slug}.md` (e.g., `01-SEC-01-private-key-wallet.md`)
- **KB manifest path:** From KB_MANIFEST.md
- **AI pitfalls domain:** Category slug from KB_MANIFEST.md

### Step 3.5: Context Budget Estimation

Estimate per-agent input tokens before spawning:

```
Per agent budget estimate:
  Agent template (context-auditor.md):  ~3,000 tokens (fixed)
  Auditor catalog section:              ~500 tokens (fixed)
  INDEX.md (agent's focus subset):      Count tagged entries × ~50 tokens each
  KB manifest files:                    Count files × ~500 tokens each
  AI pitfalls file:                     ~500 tokens (fixed)
  Cross-skill context (if available):   ~1,000 tokens (fixed)
  ────────────────────────
  Estimated total per agent:            Sum of above
```

**Adaptive batch sizing:**
- If avg estimate < 40K tokens: batch size = 8
- If avg estimate 40-80K tokens: batch size = 5 (default)
- If avg estimate > 80K tokens: batch size = 3

**Auto-split for large scopes:**
If estimated total > 120K tokens for any single agent (e.g., an auditor whose focus area tags hundreds of files in INDEX.md), split that agent's file scope across 2 agents. Both use the same auditor ID and focus area. Agent A gets the first half of tagged files; Agent B gets the second half. Both write to the same output file (A creates, B appends).

Report: `Estimated ~{N}K tokens per agent, using batch size {N}.`

### Step 4: Spawn Auditor Agents

**CRITICAL — Batching Rules:**

- Spawn **max {adaptive_batch_size} agents per response** (from Step 3.5 estimate)
- Each batch is a single response with multiple Task() calls (parallel within batch)
- Wait for a batch to complete, then spawn the next
- Do NOT use `run_in_background=true`
- Do NOT inline file contents into prompts — agents read files themselves

**Batch calculation:**
- Total agents: {config.auditor_count}
- Batches needed: ceil(auditor_count / {adaptive_batch_size})
- Example: 16 auditors with batch size 5 = 4 batches (5+5+5+1)

**Spawn Pattern — each agent gets this prompt:**

```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",
  prompt="
    You are an off-chain security auditor for the Dinh's Bulwark audit pipeline.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    1. {AUDITOR_PATH} — Your full agent instructions and methodology
    2. {CATALOG_PATH} — Find and read the section for '{auditor_id}: {focus_area_name}'
       This contains your triggers, key concerns, and focus guidance.

    === STEP 2: READ CODEBASE INDEX ===
    Read .bulwark/INDEX.md — identify files tagged with your focus area.
    Prioritize files with high risk marker counts for your focus.

    === STEP 3: 3-LAYER SEARCH ===
    Layer 1: You've read the index. Identify your 10-20 most relevant files.
    Layer 2: Read function signatures and key structures for those files.
    Layer 3: Read full source ONLY for the 5-10 files needing deep analysis.

    === STEP 4: READ KNOWLEDGE BASE ===
    {List of KB file paths from KB_MANIFEST.md for this agent's category}

    === STEP 5: READ AI PITFALLS ===
    {Path to ai-pitfalls/{category-slug}.md for this auditor's domain}

    {If cross_skill.sos_available:}
    === STEP 6: CROSS-SKILL CONTEXT ===
    Read .audit/ARCHITECTURE.md — extract trust boundary information.
    Focus on: what does on-chain code ASSUME about off-chain behavior?

    {If cross_skill.gl_available:}
    Read .docs/ — check if spec defines intended behavior for your focus area.

    === YOUR ASSIGNMENT ===
    AUDITOR ID: {auditor_id}
    FOCUS: {focus_area_name}
    OUTPUT FILE: {output_file_path}

    Apply micro-first analysis (5 Whys, 5 Hows, First Principles).
    Use 3-layer search: INDEX → signatures → full source.
    SCOPE: All off-chain code. SKIP Anchor programs in programs/ directory.

    === OUTPUT FORMAT ===
    Write your output file with TWO parts:
    1. CONDENSED SUMMARY at top (between <!-- CONDENSED_SUMMARY_START -->
       and <!-- CONDENSED_SUMMARY_END -->). Self-contained. Include your
       auditor ID in the frontmatter task_id field.
    2. FULL ANALYSIS below. Go as deep as needed.
  "
)
```

### Step 5: Deploy Verification Agents (Stacked Audits Only)

**Condition:** `stacking.is_stacked === true` AND `stacking.massive_rewrite === false`

If both conditions are met, deploy verification agents for VERIFY-tagged findings from the HANDOVER.md. These are findings from the previous audit that target UNCHANGED files — they need a lighter pass to confirm they still hold given changes elsewhere.

Read `.bulwark/HANDOVER.md`. Extract all findings tagged `VERIFY`. Group them by the auditor domain they belong to.

For each group, spawn a verification agent:

```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",
  prompt="
    You are a verification auditor for Dinh's Bulwark stacked audit.

    === CONTEXT ===
    This is a STACKED AUDIT. The following findings from the previous audit
    target UNCHANGED files. Your job is a lighter-weight check: confirm each
    finding still holds given changes in OTHER files that may have altered
    control flow, imports, or shared state.

    === FINDINGS TO VERIFY ===
    {List of VERIFY-tagged findings with file, severity, description}

    === WHAT TO CHECK ===
    For each finding:
    1. Read the target file — confirm it's truly unchanged
    2. Check imports and dependencies — did any imported module change?
    3. Check shared state — did any database schema, config, or shared
       module that this code depends on change?
    4. Quick-check the finding still applies

    === OUTPUT ===
    For each finding, write:
    - STILL_VALID: Finding confirmed, unchanged conditions
    - INVALIDATED: Finding no longer applies (explain why — e.g., upstream fix)
    - NEEDS_FULL_RECHECK: Context changed significantly, needs full investigation

    Write to: .bulwark/context/verification-{domain}.md
  "
)
```

Batch these at max 5 per response, same as main auditors.

**If `stacking.massive_rewrite === true`:** Skip verification agents entirely. The codebase changed too much for verification to be meaningful.

### Step 6: Collect Results

After each batch completes, verify context files were created:

```bash
ls -la .bulwark/context/*.md 2>/dev/null | wc -l
```

Report progress:
```
Batch {current}/{total_batches} complete.
{files_created}/{auditor_count} context files written.
Remaining batches: {remaining}
```

### Step 7: Update State

Update `.bulwark/STATE.json` with analyze phase progress:
```json
{
  "phases": {
    "analyze": {
      "status": "in_progress",
      "agents_completed": {N},
      "agents_total": {auditor_count},
      "batches_completed": {N},
      "batches_total": {N}
    }
  }
}
```

---

## Phase 1.5: Output Validation Quality Gate

**When to run:** After all Phase 1 agents complete. Skip for `quick` tier.

### Process

Locate the quality gate agent:
```bash
find ~/.claude -name "quality-gate.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
```

**For large auditor counts (>15):** Run quality gate in batches of 10 context files to avoid overloading the validator's context window.

Spawn Haiku agent(s) to validate context files:

```
Task(
  subagent_type="general-purpose",
  model="{config.models.quality_gate}",
  prompt="
    You are a quality gate validator for Dinh's Bulwark off-chain audit.

    === READ YOUR INSTRUCTIONS ===
    Read this file: {QUALITY_GATE_PATH}

    === VALIDATE THESE FILES ===
    {List .bulwark/context/*.md files for this validation batch}

    Report which files pass and which need re-runs.
  "
)
```

If any agent scores < 70%, re-run with structured feedback from the quality gate:

```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",
  prompt="
    You are an off-chain security auditor for Dinh's Bulwark. This is a RE-RUN.

    === ORIGINAL INSTRUCTIONS ===
    {Same prompt as original run}

    === QUALITY GATE FEEDBACK ===
    Your previous output failed validation. Fix these issues:
    {Structured feedback from quality gate — missing sections, insufficient detail, etc.}

    === IMPORTANT ===
    - Read your previous output at {output_file_path} and IMPROVE it
    - Focus specifically on the missing items listed above
    - Do not reduce existing good content — only add what's missing
  "
)
```

**Re-run limits:**
- Maximum 1 re-run per agent
- Maximum 3 re-runs total across all agents
- If still failing after re-run, accept and note the gap

---

## Phase Complete — Present Results

```markdown
---

## Phase 1 + 1.5 Complete

### What was produced:
- `.bulwark/context/` — {N} context analysis files

### Auditors Deployed:
| # | ID | Focus Area | Status |
|---|-----|-----------|--------|
{For each selected auditor: number, ID, name, pass/fail/re-run}

### Summary:
- **Agents completed:** {N}/{auditor_count}
- **Total output:** ~{N}KB across {N} files
- **Quality gate:** {Passed / {N} re-runs triggered}
- **Batches:** {N} batches of 5

### Phase Stats:
- **Model:** {config.models.phase1} (auditors), haiku (quality gate)
- **Agents spawned:** {N} auditors + {N} quality gate validators

### Next Step:
Run **`/clear`** then **`/DB:strategize`** to synthesize all context into a unified
architecture document and generate attack hypotheses.

---
```
