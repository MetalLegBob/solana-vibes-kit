---
name: SOS:analyze
description: "Phase 1+1.5: Deploy parallel context auditors and validate output quality"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Stronghold of Security — Phase 1 + 1.5: Analyze & Validate

Deploy parallel context auditors to build deep security understanding of the codebase through 8 specialized lenses.

## Prerequisites

Before starting, verify the scan phase is complete:

1. Read `.audit/STATE.json` — check that `phases.scan.status === "complete"`
2. Verify `.audit/KB_MANIFEST.md` exists
3. Verify `.audit/HOT_SPOTS.md` exists

If any prerequisite is missing:
```
Phase 0 (scan) has not been completed yet.
Run /SOS:scan first to analyze the codebase and generate the KB manifest.
```

---

## Phase 1: Parallel Context Building

### Step 1: Load Configuration

Read `.audit/STATE.json` to get:
- `config.tier` — determines number of focus areas and agent depth
- `config.defi_economic_agent` — whether to spawn 11th agent
- `config.protocol_types` — for economic model agent
- `config.models.phase1` — model for context auditor agents (opus or sonnet)
- `config.models.quality_gate` — model for quality gate validation (haiku)
- `stacking.is_stacked` — whether this is a stacked audit
- `stacking.massive_rewrite` — if true, skip verification agents
- `stacking.handover_generated` — whether HANDOVER.md exists

Read `.audit/KB_MANIFEST.md` to get:
- Phase 1 agent KB file list (which knowledge base files each agent loads)

### Step 2: Locate Skill Files

Find the file paths for agent templates and resources. These paths will be given to agents so they can read the files themselves (do NOT inline file contents into prompts — that makes prompts too large).

```bash
find ~/.claude -name "context-auditor.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
find ~/.claude -name "economic-model-analyzer.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
find ~/.claude -name "focus-areas.md" -path "*/stronghold-of-security/resources/*" 2>/dev/null | head -1
```

Store these paths as `AUDITOR_PATH`, `ECON_AGENT_PATH`, `FOCUS_AREAS_PATH`.

If `stacking.is_stacked === true`:
```bash
find ~/.claude -name "verification-agent.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```
Store as `VERIFICATION_AGENT_PATH`.

Also read `.audit/HANDOVER.md` and extract the list of RECHECK findings (from the Findings Digest section) grouped by focus area, for injection into primary auditor prompts.

Also read `.audit/KB_MANIFEST.md` to get the Phase 1 KB file list (paths only — don't read the KB files yourself, agents will read them).

### Step 3: Estimate Context Budget

Before spawning, estimate per-agent input tokens:

```
Per agent budget estimate:
  Agent template (context-auditor.md):  ~3,000 tokens (fixed)
  Focus manifest KB:                    Read manifest, count files × ~500 tokens each
  INDEX.md:                             Read .audit/INDEX.md, count LOC for focus-tagged files × ~3 tokens/LOC
  Hot-spots for focus area:             Count entries in HOT_SPOTS.md for this focus × ~50 tokens each
  ────────────────────────
  Estimated total per agent:            Sum of above
```

**Adaptive batch sizing based on estimate:**
- If avg estimate < 40K tokens: batch size = 8
- If avg estimate 40-80K tokens: batch size = 5 (default)
- If avg estimate > 80K tokens: batch size = 3

**Auto-split for large scopes:**
If estimated total > 120K tokens for any single agent, split that agent's file list across 2 agents covering the same focus area. Each gets half the relevant files, full KB manifest. Both write to the same output file (first writes, second appends).

Report estimate to user: "Estimated ~{N}K tokens per agent, using batch size {N}."

### Step 4: Spawn Context Auditors

**Focus Areas and Output Files:**

| # | Focus Area | Output File |
|---|------------|-------------|
| 01 | Access Control & Account Validation | `.audit/context/01-access-control.md` |
| 02 | Arithmetic Safety | `.audit/context/02-arithmetic.md` |
| 03 | State Machine & Error Handling | `.audit/context/03-state-machine.md` |
| 04 | CPI & External Calls | `.audit/context/04-cpi-external.md` |
| 05 | Token & Economic | `.audit/context/05-token-economic.md` |
| 06 | Oracle & External Data | `.audit/context/06-oracle-data.md` |
| 07 | Upgrade & Admin | `.audit/context/07-upgrade-admin.md` |
| 08 | Timing & Ordering | `.audit/context/08-timing-ordering.md` |

For `quick` tier: Only spawn agents 01, 02, 04, 05 (4 core focus areas, single batch).
Conditional: Agent 09 economic model analyzer (if `config.defi_economic_agent === true`).

**CRITICAL — Batching Rules:**

- Spawn **max {adaptive_batch_size} agents per response** (from Step 3 estimate)
- Each batch is a single response with multiple Task() calls (agents run in parallel within a batch)
- Wait for a batch to complete, then spawn the next batch
- Do NOT use `run_in_background=true` — background agents cannot get permission to write files
- Do NOT inline file contents into prompts — agents read files themselves via the Read tool

**Batch 1:** Agents 01-05 (or up to {adaptive_batch_size})
**Batch 2:** Agents 06-08 + conditional Agent 09 (economic model, if `config.defi_economic_agent === true`)

**Spawn Pattern — each agent gets this prompt (with its specific focus area):**

```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",  // Read from STATE.json — "opus" or "sonnet"
  prompt="
    You are a context auditor for Stronghold of Security security audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    1. {AUDITOR_PATH} — Your full agent instructions and methodology
    2. {FOCUS_AREAS_PATH} — Find and read the section for '{focus_area_name}'

    === STEP 2: READ CODEBASE INDEX ===
    Read .audit/INDEX.md — identify files tagged with your focus area.
    Prioritize files with high risk marker counts for your focus.

    === STEP 3: 3-LAYER SEARCH ===
    Layer 1: You've read the index. Identify your 10-20 most relevant files.
    Layer 2: For those files, read function signatures and struct definitions.
             Prioritize based on relevance to your focus.
    Layer 3: Read full source ONLY for the 5-10 files needing deep analysis.
             For files with zero hot-spots for your focus, Layer 2 only.

    === STEP 4: READ KNOWLEDGE BASE ===
    {List of KB file paths from KB_MANIFEST.md Phase 1 section}

    === STEP 5: READ HOT-SPOTS ===
    Read .audit/HOT_SPOTS.md — find entries tagged with your focus area.
    Analyze hot-spotted locations FIRST with extra scrutiny.

    {If stacking.is_stacked AND this focus area has RECHECK findings:}
    === STEP 6: PREVIOUS FINDINGS TO RECHECK ===
    The following findings from the previous audit are in files that have
    MODIFIED since then. They are high-priority investigation targets —
    determine if the change fixed them, made them worse, or is unrelated:

    {List of RECHECK findings for this focus area from HANDOVER.md,
     each with: finding ID, title, severity, file, one-line description}

    === YOUR ASSIGNMENT ===
    FOCUS: {focus_area_name}
    OUTPUT FILE: {output_file_path}

    Apply micro-first analysis (5 Whys, 5 Hows, First Principles).
    Use 3-layer search: INDEX → signatures → full source.
    Analyze hot-spotted locations FIRST, then expand coverage.

    === OUTPUT FORMAT ===
    Write your output file with TWO parts:
    1. CONDENSED SUMMARY at the top (between <!-- CONDENSED_SUMMARY_START -->
       and <!-- CONDENSED_SUMMARY_END --> markers). This is a structured
       distillation of your full analysis — write it AFTER completing
       your analysis, but place it at the TOP of the output file.
       Must be self-contained so downstream phases can read it alone.
    2. FULL ANALYSIS below the markers. Go as deep as needed — no limits.
  "
)
```

**Economic Model Analyzer (Batch 3, if applicable):**

```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",  // Same model as other Phase 1 agents
  prompt="
    You are an economic model analyzer for Stronghold of Security security audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {ECON_AGENT_PATH} — Your full agent instructions

    === STEP 2: READ PROTOCOL PLAYBOOK ===
    Read the matched protocol playbook from the knowledge base:
    {path to matched protocol playbook from KB_MANIFEST}

    === YOUR ASSIGNMENT ===
    OUTPUT FILE: .audit/context/09-economic-model.md

    Model the economic system: token flows, invariants, value extraction,
    flash loan impact, MEV sensitivity, incentive alignment.

    === OUTPUT FORMAT ===
    Two-part output: CONDENSED SUMMARY at top (<!-- markers -->),
    FULL ANALYSIS below. Write summary AFTER analysis, place at TOP.
  "
)
```

### Step 4: Collect Results

After each batch completes, verify the context files were created:

```bash
ls -la .audit/context/*.md 2>/dev/null | wc -l
```

Report progress after each batch: "Batch {N}/2 complete. {files_created}/{total} context files written."

After all batches: "{N}/{total} context auditors completed successfully."

### Step 4b: Spawn Verification Agents (Stacked Audits Only)

**When:** Only if `stacking.is_stacked === true` AND `stacking.massive_rewrite === false`.

**Skip if:** Not a stacked audit, or massive rewrite detected (>70% files changed).

Verification agents run on **Sonnet** and verify that previous audit conclusions still hold for unchanged code. They run in parallel, separate from primary auditors — this keeps verification work out of primary auditor context windows.

**One verification agent per focus area with unchanged files:**

For each focus area where the previous audit had context analysis and the current audit has UNCHANGED files tagged with that focus:

1. Read the previous audit's context file from the archive:
   `{stacking.previous_audit.path}/context/NN-{focus-area}.md`
   Extract the CONDENSED SUMMARY section only.

2. Read the Delta Summary from `.audit/HANDOVER.md`

3. Spawn a verification agent:

```
Task(
  subagent_type="general-purpose",
  model="sonnet",
  prompt="
    You are a verification agent for Stronghold of Security stacked audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {VERIFICATION_AGENT_PATH}

    === STEP 2: READ PREVIOUS SUMMARY ===
    Here is the condensed summary from the previous audit for your focus area:
    {Paste the extracted CONDENSED SUMMARY content — this is small, ~1-2K tokens}

    === STEP 3: READ DELTA SUMMARY ===
    Read .audit/HANDOVER.md — extract the Delta Summary section
    (between <!-- DELTA_SUMMARY_START --> and <!-- DELTA_SUMMARY_END -->).

    === YOUR ASSIGNMENT ===
    FOCUS AREA: {focus_area_name}
    OUTPUT FILE: .audit/context/NN-{focus-area}-verification.md

    Verify previous conclusions still hold given changes elsewhere.
  "
)
```

**Batch all verification agents together** (they're lightweight — ~1-2K tokens input each). Spawn all in a single batch.

After verification agents complete, verify output files exist:
```bash
ls -la .audit/context/*-verification.md 2>/dev/null | wc -l
```

Report: "{N} verification agents completed."

### Step 5: Update State

Update `.audit/STATE.json`:
```json
{
  "phases": {
    "analyze": {
      "status": "complete",
      "completed_at": "{ISO-8601}",
      "agents": {
        "01_access_control": "complete",
        "02_arithmetic": "complete",
        ...
      },
      "verification_agents": {
        "01_access_control_verification": "complete",
        ...
      },
      "total_output_kb": {N},
      "quality_gate": "{passed|ran_reruns|skipped}"
    }
  }
}
```

---

## Phase 1.5: Output Validation Quality Gate

**When to run:** After all Phase 1 agents complete. Skip for `quick` tier.

### Process

Locate the quality gate agent template:
```bash
find ~/.claude -name "quality-gate.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

Spawn a single Haiku agent to validate all context files:

```
Task(
  subagent_type="general-purpose",
  model="{config.models.quality_gate}",  // "haiku" — from STATE.json
  prompt="
    You are a quality gate validator.

    === READ YOUR INSTRUCTIONS ===
    Read this file: {QUALITY_GATE_PATH} — Full validation criteria

    === VALIDATE THESE FILES ===
    {List all .audit/context/NN-*.md files}

    Report which files pass and which need re-runs.
  "
)
```

If any agent scores < 70%, re-run that specific agent with feedback about what's missing. Maximum 1 re-run per agent.

Log validation results in PROGRESS.md update.

---

## Phase Complete — Present Results

After Phase 1 + 1.5 is done, present to the user:

```markdown
---

## Phase 1 + 1.5 Complete

### What was produced:
- `.audit/context/01-access-control.md` through `08-timing-ordering.md` — 8 deep context analyses
{- `.audit/context/09-economic-model.md` — DeFi economic model analysis (if applicable)}

### Summary:
- **Agents completed:** {N}/{N}
- **Total output:** ~{N}KB across {N} files
- **Quality gate:** {Passed / {N} re-runs triggered}
- **Key observations across agents:**
  - {Top 2-3 cross-cutting themes noticed while validating}

### Each context file contains:
- **Condensed Summary** (~8KB) — Key findings, invariants, risks, and cross-focus handoffs
- **Full Analysis** (remaining) — Complete deep analysis for Phase 4 investigators

{If stacked audit:}
### Verification Agents:
- **Agents completed:** {N} verification agents on unchanged code
- **Status:** {N} verified, {N} needs recheck, {N} concerns found

### Phase Stats:
- **Model:** {config.models.phase1} (context auditors), {config.models.quality_gate} (quality gate)
- **Agents spawned:** {N} auditors + {N} verification agents + 1 quality gate validator
- **Estimated tokens:** ~{agents × avg_estimate}K input across all batches

### Next Step:
Run **`/clear`** then **`/SOS:strategize`** to synthesize all context into a unified
architecture document and generate attack hypotheses.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
