---
name: SOS:investigate
description: "Phase 4+4.5: Investigate attack hypotheses in priority-ordered batches, then verify coverage"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Stronghold of Security — Phase 4 + 4.5: Investigate & Verify Coverage

Investigate each attack hypothesis with dedicated agents, then verify coverage against the knowledge base.

## Prerequisites

1. Read `.audit/STATE.json` — check that `phases.strategize.status === "complete"`
2. Verify `.audit/STRATEGIES.md` exists
3. Verify `.audit/ARCHITECTURE.md` exists

If prerequisites are missing:
```
Phase 2+3 (strategize) has not been completed yet.
Run /SOS:strategize first to synthesize context and generate attack strategies.
```

### Resume Support

Check if `phases.investigate.status === "in_progress"` in STATE.json. If so, this is a **resume**:

1. **Detect completed strategies from files:**
   ```bash
   ls .audit/findings/H*.md .audit/findings/S*.md .audit/findings/G*.md 2>/dev/null | sort
   ```
   Parse filenames to get completed strategy IDs (e.g., `H001`, `H002`, `S001`).

2. **Cross-reference with STATE.json:**
   Compare `phases.investigate.strategies` status map with actual files. Trust files as ground truth — if a finding file exists, the strategy is done regardless of STATE.json.

3. **Handle partial batches:** If a batch was interrupted (some findings written, others not), only re-run the missing strategies from that batch. Do NOT re-run strategies that already have finding files.

4. **Report and continue:**
   ```
   Resuming investigation from Batch {N}. {completed}/{total} strategies already investigated.
   Skipping: {list of completed IDs}
   Remaining: {N} strategies in {N} batches
   ```

5. **Rebuild routing table** (Step 3) before resuming — context file frontmatter is still available.

---

## Phase 4: Parallel Investigation

### Step 1: Load Configuration

Read `.audit/STATE.json` for:
- `config.tier` — affects coverage verification
- `config.models.investigate` — model for Tier 1+2 investigators (default: sonnet)
- `config.models.investigate_tier3` — model for Tier 3 investigators (default: haiku)
- `config.models.coverage` — model for coverage verification agent (default: sonnet)
- `stacking.is_stacked` — whether this is a stacked audit
- `previous_audit.path` — path to archived audit (for loading previous finding files)

Read `.audit/STRATEGIES.md` and parse all strategies.

### Step 2: Sort by Priority

Sort strategies into priority order:
1. **Tier 1** (CRITICAL potential) — investigate first
2. **Tier 2** (HIGH potential) — investigate second
3. **Tier 3** (MEDIUM-LOW potential) — investigate last

### Context Budget Estimation

Estimate per-investigator input tokens:
```
Per investigator budget:
  Agent template (hypothesis-investigator.md):  ~3,000 tokens (fixed)
  Hypothesis text from STRATEGIES.md:           ~500 tokens
  ARCHITECTURE.md:                              Read file, estimate ~3 tokens/line
  Routed context files (1-3):                   Read files, estimate ~3 tokens/line
  KB pattern files:                             ~500 tokens each
  ────────────────────────
  Estimated total per investigator:             Sum of above
```

**Adaptive batch sizing:**
- If avg estimate < 40K tokens: batch size = 8
- If avg estimate 40-80K tokens: batch size = 5 (default)
- If avg estimate > 80K tokens: batch size = 3

**Tier 3 with Haiku:** Tier 3 investigators get condensed context (CONDENSED SUMMARY only, no full analysis), so their estimates are smaller. Use batch size 8 for Tier 3 batches.

**Auto-split for large scopes:**
If estimated total > 120K tokens for any single agent (e.g., a strategy that requires multiple large context files and many KB patterns):
- Split that strategy's investigation across 2 agents
- Agent A: Reads ARCHITECTURE.md + primary context files (first 1-2 from routing table)
- Agent B: Reads remaining context files + all KB patterns
- Both investigate the same hypothesis but from different vantage points
- Both write to the same output file (A writes, B appends a `## Supplemental Analysis` section)

**Pre-spawn validation:**
Before spawning each batch, verify the strategy text entry from STRATEGIES.md is under 2K tokens. If a single strategy entry is exceptionally long (>2K tokens), trim to: title + hypothesis + target files + attack path. The agent can read the full strategy from STRATEGIES.md if needed.

Group into batches using the adaptive batch size.

### Step 3: Locate Skill Files & Build Routing Table

Find the investigator agent template paths (do NOT read/inline — agents read themselves):

```bash
find ~/.claude -name "hypothesis-investigator.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
find ~/.claude -name "lightweight-investigator.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

Store as `INVESTIGATOR_PATH` (Tier 1+2) and `LIGHTWEIGHT_PATH` (Tier 3).

**Build routing table:** Scan all `.audit/context/NN-*.md` files and read their YAML frontmatter to extract `provides` fields. Build a map:

```
provides → file mapping:
  access-control-findings → .audit/context/01-access-control.md
  access-control-invariants → .audit/context/01-access-control.md
  arithmetic-findings → .audit/context/02-arithmetic.md
  ...
```

For each strategy's `Requires` field, look up matching context files from this map. Each investigator gets **only the 1-3 context files whose `provides` match the strategy's `requires`** — not all context files.

### Step 4: Execute Batches (5 Agents Per Batch)

**CRITICAL — Batching Rules:**

- Spawn **max 5 investigators per response** to avoid prompt-too-long errors
- Each batch is a single response with multiple Task() calls (agents run in parallel within a batch)
- Wait for a batch to complete, then spawn the next batch
- Do NOT use `run_in_background=true` — background agents cannot get permission to write files
- Do NOT inline file contents into prompts — agents read files themselves via the Read tool

**Execute Tier 1 strategies first, then Tier 2, then Tier 3.** Group into batches of 5 within each tier.

**Spawn Pattern — each investigator gets this prompt:**

For **Tier 1 and Tier 2** strategies, use the full investigation model:
```
Task(
  subagent_type="general-purpose",
  model="{config.models.investigate}",  // "sonnet" — from STATE.json
  prompt="
    You are a hypothesis investigator for Stronghold of Security security audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {INVESTIGATOR_PATH} — Your full investigation methodology

    === STEP 2: READ CONTEXT (routed via provides/requires) ===
    1. Read .audit/ARCHITECTURE.md — Unified architectural understanding
    2. Read ONLY these context files (matched via provides/requires routing):
       {List 1-3 .audit/context/NN-*.md files whose 'provides' matches
        this strategy's 'Requires' field}
       Read the FULL ANALYSIS section (after CONDENSED_SUMMARY_END marker)
       for detailed code-level analysis.
    3. Check .audit/findings/ for completed investigations.
       If a prior finding covers your hypothesis's code path,
       reference it rather than re-analyzing. Focus on what's NEW.

    {If this hypothesis has Origin: RECHECK ({previous_finding_id}):}
    === STEP 2b: READ PREVIOUS FINDING (RECHECK only) ===
    This hypothesis is a re-investigation of a finding from a previous audit.
    Read the previous finding file for context:
    {previous_audit.path}/findings/{previous_finding_id}.md

    This tells you what was found last time at this location and why it was
    flagged. Your job: determine if the issue is FIXED, WORSE, or DIFFERENT
    given the code changes since then. The code HAS changed (that's why this
    is a RECHECK) — so read the current code carefully and compare.

    === STEP 3: READ KNOWLEDGE BASE ===
    {List of relevant KB file paths from KB_MANIFEST Phase 4 section}

    === YOUR ASSIGNMENT ===
    STRATEGY TO INVESTIGATE:
    {Full strategy entry from STRATEGIES.md — this is the only content
     that gets pasted directly into the prompt}

    OUTPUT FILE: .audit/findings/{strategy_id}.md

    Investigate this attack hypothesis.
    Determine: CONFIRMED / POTENTIAL / NOT VULNERABLE / NEEDS MANUAL REVIEW
    Write finding to the output file.
  "
)
```

For **Tier 3** strategies, use the lightweight Haiku model with the lightweight agent template:
```
Task(
  subagent_type="general-purpose",
  model="{config.models.investigate_tier3}",  // "haiku" — from STATE.json
  prompt="
    You are a lightweight hypothesis investigator for Stronghold of Security.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {LIGHTWEIGHT_PATH} — Your lightweight investigation methodology

    === STEP 2: READ CONTEXT (condensed only) ===
    1. Read .audit/ARCHITECTURE.md
    2. Read the relevant .audit/context/NN-*.md file — CONDENSED SUMMARY only
       (between CONDENSED_SUMMARY_START and CONDENSED_SUMMARY_END markers)

    === YOUR ASSIGNMENT ===
    STRATEGY TO INVESTIGATE:
    {Full strategy entry from STRATEGIES.md}

    OUTPUT FILE: .audit/findings/{strategy_id}.md
  "
)
```

After each batch completes, update STATE.json with per-strategy status and report progress:
"Batch {N}/{total} complete. {confirmed} confirmed, {potential} potential so far."

### Step 5: Strategy Supplement (After First Tier 1 Batch Only)

After Batch 1 completes, if any findings are CONFIRMED or POTENTIAL: generate up to 10 supplemental strategies (S001-S010) inspired by early findings. Append to `.audit/STRATEGIES.md` under "## Supplemental Strategies" and add to the investigation queue.

If no CONFIRMED or POTENTIAL in Batch 1, skip this step.

### Step 6: Execute Remaining Batches

Continue with remaining Tier 1 strategies (if more than 5), then Tier 2, Tier 3, and supplemental strategies. Same spawn pattern — max 5 per response, agents read their own files.

Wait for each batch to complete before starting the next.

**Progress tracking:** After each batch, update STATE.json:
```json
{
  "phases": {
    "investigate": {
      "status": "in_progress",
      "batches_completed": {N},
      "batches_total": {N},
      "strategies": {
        "H001": "complete",
        "H002": "complete",
        "H003": "in_progress",
        ...
      }
    }
  }
}
```

Report progress: "Batch {N}/{total} complete. {confirmed} confirmed, {potential} potential so far."

### Step 7: Tally Results

After all batches complete, count findings by status:

```bash
grep -l "CONFIRMED" .audit/findings/*.md 2>/dev/null | wc -l
grep -l "POTENTIAL" .audit/findings/*.md 2>/dev/null | wc -l
grep -l "NOT VULNERABLE" .audit/findings/*.md 2>/dev/null | wc -l
grep -l "NEEDS MANUAL REVIEW" .audit/findings/*.md 2>/dev/null | wc -l
```

---

## Phase 4.5: Coverage Verification

**When to run:** After all Phase 4 batches complete. Skip for `quick` tier.

### Goal

Goal-backward check that nothing important was missed before final synthesis.

### Step 1: Spawn Coverage Verification Agent

```
Task(
  subagent_type="general-purpose",
  model="{config.models.coverage}",  // "sonnet" — from STATE.json
  prompt="
    You are a coverage verification agent for Stronghold of Security security audit.
    Your job is to check that the investigation phase didn't miss anything important.

    === WHAT TO READ ===
    1. .audit/ARCHITECTURE.md — Get the instruction list and overall structure
    2. .audit/KB_MANIFEST.md — What KB patterns should have been checked
    3. All .audit/findings/H*.md and .audit/findings/S*.md — What was investigated
    4. The matched protocol playbook from the knowledge base — for Red Flags Checklist

    === THREE DIMENSIONS TO CHECK ===

    1. INSTRUCTION COVERAGE
    For every externally-callable instruction listed in ARCHITECTURE.md:
    - Was it analyzed by at least one investigation?
    - If not, flag as a gap

    2. EP COVERAGE
    For every relevant EP mentioned in KB_MANIFEST:
    - Was it considered by at least one hypothesis?
    - Check by looking at Historical Precedent fields in STRATEGIES.md
    - Flag uncovered EPs

    3. PLAYBOOK COVERAGE
    For the matched protocol playbook's Red Flags Checklist:
    - Was each checklist item addressed by at least one finding?
    - Flag unchecked items

    === OUTPUT ===
    Write to .audit/COVERAGE.md:

    # Coverage Verification Report

    ## Summary
    - Instructions covered: {N}/{total}
    - EPs addressed: {N}/{relevant total}
    - Playbook items covered: {N}/{total}

    ## Instruction Coverage
    | Instruction | Investigated By | Findings |
    |-------------|----------------|----------|
    | {name} | {H-IDs} | {finding IDs} |

    ## EP Coverage Gaps
    EPs not addressed by any hypothesis:
    - EP-XXX ({name}) — {why it's relevant to this codebase}

    ## Playbook Coverage Gaps
    Items from {protocol}-attacks.md not addressed:
    - {item} — {why it matters}

    ## Gap Hypotheses (auto-generated)
    For each CRITICAL or HIGH gap, generate a hypothesis:
    - G001: {hypothesis based on missed EP/instruction}
    - G002: ...

    Mark each gap as:
    - CRITICAL gap — must investigate
    - HIGH gap — should investigate
    - MEDIUM gap — flag in report only
    - LOW gap — informational only
  "
)
```

### Step 2: Handle Gaps

After the coverage agent completes, read `.audit/COVERAGE.md`:

- **CRITICAL/HIGH gaps:** Generate a final investigation batch for G001, G002, etc.
  Spawn investigators using the same pattern as Phase 4 batches.
  Output: `.audit/findings/G001.md`, etc.

- **MEDIUM/LOW gaps:** Leave as-is. They'll be flagged in the final report as "Not Investigated — Manual Review Recommended."

---

## Update State

Update `.audit/STATE.json`:
```json
{
  "phases": {
    "investigate": {
      "status": "complete",
      "completed_at": "{ISO-8601}",
      "total_strategies": {N},
      "supplemental_strategies": {N},
      "batches_completed": {N},
      "results": {
        "confirmed": {N},
        "potential": {N},
        "not_vulnerable": {N},
        "needs_manual_review": {N}
      },
      "coverage_verification": "{completed|skipped}",
      "gap_investigations": {N}
    }
  }
}
```

Update `.audit/PROGRESS.md` with investigate phase marked as completed.

---

## Phase Complete — Present Results

```markdown
---

## Phase 4 + 4.5 Complete

### Investigation Results:
| Status | Count |
|--------|-------|
| CONFIRMED | {N} |
| POTENTIAL | {N} |
| NOT VULNERABLE | {N} |
| NEEDS MANUAL REVIEW | {N} |

### What was produced:
- `.audit/findings/H001.md` through `H{N}.md` — {N} hypothesis investigations
{- `.audit/findings/S001.md` through `S{N}.md` — {N} supplemental investigations}
{- `.audit/findings/G001.md` through `G{N}.md` — {N} gap investigations}
- `.audit/COVERAGE.md` — Coverage verification report

### Batches:
- {N} investigation batches completed
- {N} supplemental strategies generated from early findings
- {N} coverage gaps investigated

### Notable Findings:
{Top 3-5 most significant CONFIRMED/POTENTIAL findings with brief descriptions}

### Phase Stats:
- **Model:** {config.models.investigate} (Tier 1+2), {config.models.investigate_tier3} (Tier 3)
- **Agents spawned:** {total_agents} investigators + 1 coverage verifier
- **Estimated tokens:** ~{agents × avg_estimate}K input across all batches

### Next Step:
Run **`/clear`** then **`/SOS:report`** to generate the final audit report.
The report will include combination analysis, attack trees, and severity calibration
across all {total_findings} findings.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
