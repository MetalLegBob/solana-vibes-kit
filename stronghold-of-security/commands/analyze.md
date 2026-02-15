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

1. Read `.audit/STATE.json` — check that `phases.scan.status === "completed"`
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
    Read these files in order:
    1. {AUDITOR_PATH} — Your full agent instructions and methodology
    2. {FOCUS_AREAS_PATH} — Find and read the section for '{focus_area_name}'
    3. .audit/HOT_SPOTS.md — Find entries tagged with your focus area

    === STEP 2: READ KNOWLEDGE BASE ===
    {List of KB file paths from KB_MANIFEST.md Phase 1 section}

    === YOUR ASSIGNMENT ===
    FOCUS: {focus_area_name}
    OUTPUT FILE: {output_file_path}

    Analyze the ENTIRE codebase through your specific lens.
    Apply micro-first analysis (5 Whys, 5 Hows, First Principles).
    Analyze hot-spotted locations FIRST with extra scrutiny, then expand
    to full codebase coverage.

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

### Step 5: Update State

Update `.audit/STATE.json`:
```json
{
  "phases": {
    "analyze": {
      "status": "completed",
      "completed_at": "{ISO-8601}",
      "agents": {
        "01_access_control": "completed",
        "02_arithmetic": "completed",
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

### Next Step:
Run **`/clear`** then **`/SOS:strategize`** to synthesize all context into a unified
architecture document and generate attack hypotheses.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
