---
name: DBS:analyze
description: "Parallel codebase sweep + Opus synthesis for full impact map"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

# Don't Break Shit — Phase 3: Analyze

The thoroughness-critical phase. Parallel Sonnet agents sweep the entire codebase to identify everything that needs to change, backed by Opus synthesis to catch cross-file dependency chains.

**Architecture:** Thin Orchestrator pattern — this context spawns agents for analysis, it does NOT do analysis itself.

## Step 1: Check Prerequisites

Read `.dbs/STATE.json`:

- If file doesn't exist: Stop. Tell user to run `/DBS:brief` first.
- If `pipeline.interview.status` is NOT `"complete"`: Stop. Tell user to complete the interview first.
- If `pipeline.analyze.status` is `"complete"`: Warn and ask if they want to re-run.
- If `pipeline.analyze.status` is `"in_progress"`: Check `.dbs/analysis/` for existing batch reports. Offer to resume from last completed batch or restart.

Update `pipeline.analyze.status` to `"in_progress"`.

## Step 2: Load and Condense Interview

Read `.dbs/INTERVIEW.md` and produce a **condensed change manifest** — key decisions only, no interview dialog. This condensed version is what gets injected into every agent. Target: under 3,000 tokens.

The condensed manifest should include:
- Each primary change (what + where)
- Each decision point (effect + decision)
- All constraints
- Testing criteria (condensed)

**Do NOT pass the raw interview transcript to agents.** Always condense first.

## Step 3: Inventory Source Files

Scan the project for all source files that agents should analyze:

```bash
# Find all source files, excluding common non-source directories
find . -type f \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/target/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/.dbs/*' \
  -not -path '*/.audit/*' \
  -not -path '*/.docs/*' \
  -not -path '*/.bok/*' \
  -not -path '*/.bulwark/*' \
  -not -name '*.lock' \
  -not -name 'package-lock.json' \
  -not -name '*.min.js' \
  -not -name '*.min.css' \
  | sort
```

Count the total files and plan batching:
- **Target:** 15-20 files per batch
- **Batch by directory** when possible (keeps related files together)
- **Cap:** If a single directory has >20 files, split into sub-batches

Update STATE.json with `pipeline.analyze.batches_total`.

## Step 4: Pass 1 — Sonnet Blanket Sweep

For each batch, spawn a **Sonnet subagent** via the Task tool:

```
Task tool parameters:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "DBS analyze batch NNN"
```

Each agent receives this prompt:

```
You are analyzing files for a DBS (Don't Break Shit) change management session.

## Change Manifest (condensed)
<insert condensed manifest>

## Your Batch: Files to Analyze
<list of file paths in this batch>

## Instructions
For EACH file in your batch:
1. Read the file
2. Determine if it is affected by any of the changes in the manifest
3. If affected, report:
   - What specifically is affected (functions, types, imports, config values, etc.)
   - What needs to change (and how, at a high level)
   - What needs to be removed
   - What needs to be added
   - Any cross-file dependencies you notice (e.g., "this file imports X from file Y which is also changing")
4. If NOT affected, say so briefly and why

## Output Format
Write your analysis to: .dbs/analysis/batch-NNN.md

Use this structure:
---
skill: dbs
phase: analyze
batch: NNN
files_analyzed: <count>
files_affected: <count>
---

# Batch NNN Analysis

## <file_path>
**Status:** affected / not-affected
<analysis if affected>

## <next_file_path>
...
```

**Context budget:** Each agent gets at most 20 files. If a file is very large (>500 lines), the agent should focus on the parts relevant to the change manifest rather than analyzing every line.

**Parallelism:** Launch agents in parallel using multiple Task calls. Up to 5 concurrent agents.

After each agent completes, update STATE.json `pipeline.analyze.batches_completed`.

## Step 5: Pass 2 — Opus Synthesis

After all Sonnet agents complete, read all batch reports from `.dbs/analysis/`.

If the total content exceeds ~60K tokens, condense each batch report to its key findings before passing to Opus.

Spawn a single **Opus agent** via the Task tool:

```
Task tool parameters:
  subagent_type: "general-purpose"
  model: "opus"
  description: "DBS Opus impact synthesis"
```

The Opus agent receives:

```
You are synthesizing impact analysis for a DBS change management session.

## Change Manifest (condensed)
<insert condensed manifest>

## Sonnet Batch Reports
<insert all batch reports, condensed if needed>

## Your Task
Synthesize the batch reports into a consolidated impact map. Specifically look for:

1. **Cross-file dependency chains** — changes in file A that affect file B through imports, shared types, or runtime behavior
2. **Second/third-order effects spanning files** — cascading impacts the per-batch agents couldn't see
3. **Contradictions** — agents disagreeing about whether something is affected
4. **False negatives** — files marked "not affected" but referenced by affected files
5. **Missing files** — files not in any batch that should have been analyzed

## Output Format
Write to: .dbs/IMPACT-MAP.md

---
skill: dbs
phase: analyze
status: complete
updated: <ISO-8601>
key_outputs:
  - "<N> files affected out of <M> analyzed"
  - "<K> cross-file dependency chains identified"
---

# DBS Impact Map

## Summary
<High-level summary: what's changing, how many files affected, risk level>

## Affected Files
| File | Impact | Changes Needed | Dependencies |
|------|--------|---------------|--------------|

## Cross-File Dependency Chains
<Each chain: A → B → C with explanation>

## Risk Areas
<Highest-risk changes and why>

## False Negative Review
<Files initially marked not-affected that actually are>

## Contradictions Resolved
<Any disagreements between batch reports>
```

## Step 6: Update State and Report

Update `.dbs/STATE.json`:
- Set `pipeline.analyze.status` to `"complete"`
- Update `updated` timestamp

Display summary:

```
Don't Break Shit — Analysis Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analysis:
  Files scanned:     <total>
  Files affected:    <count>
  Batches:           <N> Sonnet agents + 1 Opus synthesis
  Dependency chains: <count>
  Risk areas:        <count>

Artifacts:
  .dbs/analysis/     — <N> batch reports
  .dbs/IMPACT-MAP.md — consolidated impact map

Next: /clear then /DBS:map
```
