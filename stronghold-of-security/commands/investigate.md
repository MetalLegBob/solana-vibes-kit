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

1. Read `.audit/STATE.json` — check that `phases.strategize.status === "completed"`
2. Verify `.audit/STRATEGIES.md` exists
3. Verify `.audit/ARCHITECTURE.md` exists

If prerequisites are missing:
```
Phase 2+3 (strategize) has not been completed yet.
Run /SOS:strategize first to synthesize context and generate attack strategies.
```

### Resume Support

Check if `phases.investigate.status === "in_progress"` in STATE.json. If so, this is a **resume**:
- Read `phases.investigate.batches_completed` and `phases.investigate.strategies` to find where we left off
- Skip already-completed strategies
- Resume from the next incomplete batch
- Display: "Resuming investigation from Batch {N}. {completed}/{total} strategies already investigated."

---

## Phase 4: Parallel Investigation

### Step 1: Load Configuration

Read `.audit/STATE.json` for:
- `config.tier` — affects coverage verification
- `config.models.investigate` — model for Tier 1+2 investigators (default: sonnet)
- `config.models.investigate_tier3` — model for Tier 3 investigators (default: haiku)
- `config.models.coverage` — model for coverage verification agent (default: sonnet)

Read `.audit/STRATEGIES.md` and parse all strategies.

### Step 2: Sort by Priority

Sort strategies into priority order:
1. **Tier 1** (CRITICAL potential) — investigate first
2. **Tier 2** (HIGH potential) — investigate second
3. **Tier 3** (MEDIUM-LOW potential) — investigate last

Group into batches of **5** (max agents per response to avoid prompt-too-long errors).

### Step 3: Locate Skill Files & Build Routing Table

Find the investigator agent template path (do NOT read/inline it — agents read it themselves):

```bash
find ~/.claude -name "hypothesis-investigator.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

Store as `INVESTIGATOR_PATH`.

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

For **Tier 3** strategies, use the lightweight Haiku model with condensed output:
```
Task(
  subagent_type="general-purpose",
  model="{config.models.investigate_tier3}",  // "haiku" — from STATE.json
  prompt="
    You are a lightweight hypothesis investigator for Stronghold of Security.

    === READ CONTEXT ===
    1. Read .audit/ARCHITECTURE.md
    2. Read the relevant .audit/context/NN-*.md file (CONDENSED SUMMARY only)

    === YOUR ASSIGNMENT ===
    STRATEGY TO INVESTIGATE:
    {Full strategy entry from STRATEGIES.md}

    OUTPUT FILE: .audit/findings/{strategy_id}.md

    === LIGHTWEIGHT INVESTIGATION ===
    Confirm or deny ONLY. Do NOT do full investigation methodology.
    1. Read the target code locations
    2. Check if the specific attack vector is viable
    3. Write a SHORT finding (confirm/deny + 1 paragraph rationale + code reference)

    Output format:
    # Finding: {ID} - {Name}
    ## Status: {CONFIRMED | POTENTIAL | NOT VULNERABLE}
    ## Confidence Score: {1-10}
    ## Rationale
    {1 paragraph with specific code references}
    ## Code Evidence
    {Key code snippet if CONFIRMED/POTENTIAL}
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
        "H001": "completed",
        "H002": "completed",
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
      "status": "completed",
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

### Next Step:
Run **`/clear`** then **`/SOS:report`** to generate the final audit report.
The report will include combination analysis, attack trees, and severity calibration
across all {total_findings} findings.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
