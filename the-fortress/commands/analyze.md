---
name: the-fortress:analyze
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

# The Fortress — Phase 1 + 1.5: Analyze & Validate

Deploy parallel context auditors to build deep security understanding of the codebase through 10 specialized lenses.

## Prerequisites

Before starting, verify the scan phase is complete:

1. Read `.audit/STATE.json` — check that `phases.scan.status === "completed"`
2. Verify `.audit/KB_MANIFEST.md` exists
3. Verify `.audit/HOT_SPOTS.md` exists

If any prerequisite is missing:
```
Phase 0 (scan) has not been completed yet.
Run /the-fortress:scan first to analyze the codebase and generate the KB manifest.
```

---

## Phase 1: Parallel Context Building

### Step 1: Load Configuration

Read `.audit/STATE.json` to get:
- `config.tier` — determines number of focus areas and agent depth
- `config.defi_economic_agent` — whether to spawn 11th agent
- `config.protocol_types` — for economic model agent

Read `.audit/KB_MANIFEST.md` to get:
- Phase 1 agent KB file list (which knowledge base files each agent loads)

### Step 2: Prepare Agent Prompts

For each focus area, the orchestrator must:

1. **Read the agent template:** Read the context-auditor.md file from the skill directory
   ```bash
   find ~/.claude -name "context-auditor.md" -path "*/the-fortress/agents/*" 2>/dev/null | head -1
   ```

2. **Read focus-specific guidance:** Read focus-areas.md from the skill directory and extract the section for this focus area
   ```bash
   find ~/.claude -name "focus-areas.md" -path "*/the-fortress/resources/*" 2>/dev/null | head -1
   ```

3. **Read KB files:** Read each knowledge base file listed in KB_MANIFEST.md Phase 1 section

4. **Inline everything into the prompt** — Agent prompts must be self-contained. The `@` file reference syntax does NOT work across Task() boundaries. Read every file and paste its content directly into the agent's prompt string.

### Step 3: Spawn Context Auditors

**Focus Areas and Output Files:**

| # | Focus Area | Output File |
|---|------------|-------------|
| 01 | Access Control | `.audit/context/01-access-control.md` |
| 02 | Arithmetic Safety | `.audit/context/02-arithmetic.md` |
| 03 | State Machine | `.audit/context/03-state-machine.md` |
| 04 | CPI & External Calls | `.audit/context/04-cpi-external.md` |
| 05 | Token & Economic | `.audit/context/05-token-economic.md` |
| 06 | Account Validation | `.audit/context/06-account-validation.md` |
| 07 | Oracle & External Data | `.audit/context/07-oracle-data.md` |
| 08 | Upgrade & Admin | `.audit/context/08-upgrade-admin.md` |
| 09 | Error Handling | `.audit/context/09-error-handling.md` |
| 10 | Timing & Ordering | `.audit/context/10-timing-ordering.md` |

For `quick` tier: Only spawn agents 01, 02, 04, 05, 06 (5 core focus areas).

**CRITICAL — Parallel Foreground Agents:**

Spawn ALL agents in a **single response** using multiple Task() calls. This makes them run in parallel while keeping them as foreground agents (so they can write files with user permission). Do NOT use `run_in_background=true` — background agents cannot get permission to write files.

**Spawn Pattern:**

```
// Spawn ALL of these in a SINGLE response message — they will run in parallel
For each focus area:
  Task(
    subagent_type="general-purpose",
    prompt="
      === CONTEXT AUDITOR INSTRUCTIONS ===
      {FULL CONTENT of agents/context-auditor.md, inlined}

      === YOUR ASSIGNMENT ===
      FOCUS: {focus_area_name}
      OUTPUT FILE: {output_file_path}

      === FOCUS-SPECIFIC GUIDANCE ===
      {CONTENT of this focus area's section from resources/focus-areas.md, inlined}

      === KNOWLEDGE BASE ===
      Read these files before starting your analysis:
      {List of KB file paths from KB_MANIFEST.md Phase 1 section}

      === HOT SPOTS ===
      Read .audit/HOT_SPOTS.md and find entries tagged with your focus area.
      Analyze these locations FIRST with extra scrutiny.
      Then expand to full codebase coverage.

      === OUTPUT FORMAT ===
      Your output file has TWO parts:
      1. CONDENSED SUMMARY at the top (between <!-- CONDENSED_SUMMARY_START -->
         and <!-- CONDENSED_SUMMARY_END --> markers). This is a structured
         distillation of your full analysis — write it AFTER completing
         your analysis, but place it at the TOP of the output file.
         Must be self-contained so downstream phases can read it alone.
      2. FULL ANALYSIS below the markers. Go as deep as needed — no limits.

      Analyze the ENTIRE codebase through your specific lens.
      Apply micro-first analysis (5 Whys, 5 Hows, First Principles).
    "
  )
```

**Conditional 11th Agent: Economic Model Analyzer**

If `config.defi_economic_agent === true` AND tier is standard or deep, include this Task() call in the SAME response as the 10 context auditors:

```
Task(
  subagent_type="general-purpose",
  prompt="
    === ECONOMIC MODEL ANALYZER INSTRUCTIONS ===
    {FULL CONTENT of agents/economic-model-analyzer.md, inlined}

    === YOUR ASSIGNMENT ===
    OUTPUT FILE: .audit/context/11-economic-model.md

    === PROTOCOL PLAYBOOK ===
    {CONTENT of matched protocol playbook from KB, inlined}

    === OUTPUT FORMAT ===
    Two-part output: CONDENSED SUMMARY at the top of the file (between
    <!-- markers -->), then FULL ANALYSIS below. Write the summary AFTER
    completing your analysis, but place it at the TOP. Go as deep as needed.

    Model the economic system: token flows, invariants, value extraction,
    flash loan impact, MEV sensitivity, incentive alignment.
  "
)
```

### Step 4: Collect Results

All agents run in parallel and return when complete. Each agent writes its own output file directly. After all agents return, verify the context files were created:

```bash
ls -la .audit/context/*.md 2>/dev/null | wc -l
```

Report results: "{N}/{total} context auditors completed successfully."

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

### Validation Criteria

For each `.audit/context/NN-*.md` file, check:

| Check | Threshold | Method |
|-------|-----------|--------|
| **Has condensed summary** | Markers present | Grep for `CONDENSED_SUMMARY_START` and `CONDENSED_SUMMARY_END` |
| **Summary size** | >= 500 words | Word count between markers |
| **Full analysis size** | >= 3,000 words | Word count after end marker |
| **Code file references** | >= 5 files | Count unique file paths (pattern: backtick + path + colon + line) |
| **Invariants documented** | >= 3 | Count lines containing "INVARIANT:" or "Invariant" in headers |
| **Assumptions documented** | >= 3 | Count lines containing "ASSUMPTION:" or "Assumption" in headers |
| **Cross-focus handoffs** | >= 2 | Check "Cross-Focus Handoffs" or "Cross-Reference" section exists with entries |

### Process

1. Read each context file
2. Score against criteria (each check: pass/fail)
3. Calculate pass rate (checks passed / total checks)
4. If pass rate < 70% for any agent:
   - Re-run that specific agent with feedback about what's missing
   - Include the original output as "starting point — expand on these areas: {missing sections}"
   - Maximum 1 re-run per agent
5. Log validation results

### Validation Output

Write a brief validation summary (don't create a separate file — include in PROGRESS.md update):

```
Phase 1.5 Validation:
- 01-access-control: 7/7 checks passed
- 02-arithmetic: 6/7 checks passed (missing: cross-focus handoffs)
- ...
- Re-runs triggered: {N} ({list of agents re-run})
```

---

## Phase Complete — Present Results

After Phase 1 + 1.5 is done, present to the user:

```markdown
---

## Phase 1 + 1.5 Complete

### What was produced:
- `.audit/context/01-access-control.md` through `10-timing-ordering.md` — 10 deep context analyses
{- `.audit/context/11-economic-model.md` — DeFi economic model analysis (if applicable)}

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
Run `/the-fortress:strategize` to synthesize all context into a unified architecture document
and generate {config.strategy_count} attack hypotheses.

---
```
