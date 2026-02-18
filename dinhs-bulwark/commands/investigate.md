---
name: DB:investigate
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

# Dinh's Bulwark — Phase 4 + 4.5: Investigate & Verify Coverage

Investigate each attack hypothesis with dedicated agents, then verify coverage against the knowledge base.

## Prerequisites

1. Read `.bulwark/STATE.json` — check that `phases.strategize.status === "complete"`
2. Verify `.bulwark/STRATEGIES.md` exists
3. Verify `.bulwark/ARCHITECTURE.md` exists

If prerequisites are missing:
```
Phase 2+3 (strategize) has not been completed yet.
Run /DB:strategize first to synthesize context and generate attack strategies.
```

### Resume Support

Check if `phases.investigate.status === "in_progress"`. If so:

1. Detect completed strategies from files:
   ```bash
   ls .bulwark/findings/H*.md .bulwark/findings/S*.md .bulwark/findings/G*.md 2>/dev/null | sort
   ```

2. Skip completed strategies, resume from where we left off.

3. Report: `Resuming from Batch {N}. {completed}/{total} strategies already done.`

---

## Phase 4: Parallel Investigation

### Step 1: Load Configuration

Read `.bulwark/STATE.json` for:
- `config.models.investigate` — model for Tier 1+2 (default: sonnet)
- `config.models.investigate_tier3` — model for Tier 3 (default: haiku)
- `config.models.coverage` — model for coverage verification (default: sonnet)

Read `.bulwark/STRATEGIES.md` and parse all strategies.

### Step 2: Sort by Priority

1. **Tier 1** (CRITICAL) — investigate first
2. **Tier 2** (HIGH) — investigate second
3. **Tier 3** (MEDIUM-LOW) — investigate last

Group into batches by tier:
- **Tier 1 (CRITICAL):** Batch size 5 — deep investigation, full context loading
- **Tier 2 (HIGH):** Batch size 5 — full investigation
- **Tier 3 (MEDIUM-LOW):** Batch size 8 — lightweight investigation, condensed context

### Step 3: Locate Skill Files & Build Routing Table

```bash
find ~/.claude -name "hypothesis-investigator.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
find ~/.claude -name "lightweight-investigator.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
```

**Check for stacked audit context:**
```bash
test -f .bulwark/HANDOVER.md && echo "STACKED_AUDIT" || echo "FIRST_AUDIT"
```

If `STACKED_AUDIT`:
- Read `.bulwark/HANDOVER.md` to extract the findings digest and false positive log
- Map each strategy to its RECHECK/VERIFY/NEW status based on target files
- **RECHECK strategies get highest sub-priority within their tier** — they target code that changed and may have regressed

Build routing table from `.bulwark/context/NN-*.md` frontmatter `provides` fields:
```
secrets-findings → .bulwark/context/01-secrets-key-management.md
auth-findings → .bulwark/context/02-auth-session.md
transaction-findings → .bulwark/context/03-transaction-construction.md
...
```

### Step 4: Execute Batches

**CRITICAL — Batching Rules:**
- Max 5 investigators per response
- Each batch = single response with multiple Task() calls
- Wait for batch to complete, then spawn next
- Do NOT use `run_in_background=true`

**Tier 1+2 — full investigation (Sonnet):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.investigate}",
  prompt="
    You are a hypothesis investigator for Dinh's Bulwark off-chain audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read: {INVESTIGATOR_PATH}

    === STEP 2: READ CONTEXT ===
    1. .bulwark/ARCHITECTURE.md — Unified architecture
    2. ONLY these context files (routed via provides/requires):
       {List 1-3 .bulwark/context/NN-*.md files}
       Read FULL ANALYSIS section for code-level detail.
    3. Check .bulwark/findings/ for completed investigations.
    {If STACKED_AUDIT: '4. .bulwark/HANDOVER.md — Previous findings digest and false positive log.
       This strategy has evolution status: {RECHECK/VERIFY/NEW}.
       If RECHECK: Previous finding existed in modified file — check if fix landed or if change made it worse.
       If VERIFY: Previous finding in unchanged file — lighter pass to confirm it still holds.
       If NEW: No previous finding — investigate fresh.'}

    === STEP 3: READ KNOWLEDGE BASE ===
    {List of relevant KB pattern files}

    === YOUR ASSIGNMENT ===
    STRATEGY: {Full strategy entry from STRATEGIES.md}
    OUTPUT FILE: .bulwark/findings/{strategy_id}.md
    {If STACKED_AUDIT: 'EVOLUTION: Classify your finding as NEW / RECURRENT / REGRESSION / RESOLVED relative to previous audit.'}

    Investigate. Determine: CONFIRMED / POTENTIAL / NOT VULNERABLE / NEEDS MANUAL REVIEW
    Focus on off-chain code. Skip Anchor programs.
  "
)
```

**Tier 3 — lightweight check (Haiku, batch 8):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.investigate_tier3}",
  prompt="
    You are a lightweight investigator for Dinh's Bulwark.

    === STEP 1: READ INSTRUCTIONS ===
    Read: {LIGHTWEIGHT_PATH}

    === STEP 2: READ CONTEXT (condensed only) ===
    1. .bulwark/ARCHITECTURE.md
    2. Relevant .bulwark/context/NN-*.md — CONDENSED SUMMARY only
    {If STACKED_AUDIT: '3. .bulwark/HANDOVER.md — Check false positive log. If this strategy matches a previous NOT_VULNERABLE dismissal in an UNCHANGED file, note the prior reasoning.'}

    === YOUR ASSIGNMENT ===
    STRATEGY: {strategy entry}
    OUTPUT FILE: .bulwark/findings/{strategy_id}.md
    {If STACKED_AUDIT: 'EVOLUTION: NEW / RECURRENT / REGRESSION / RESOLVED'}
  "
)
```

**Tier 3 batch size is 8** (vs 5 for Tier 1+2) because lightweight investigations use condensed context and smaller models.

After each batch: update STATE.json and report progress.

### Step 5: Strategy Supplement (After First Tier 1 Batch)

If any findings are CONFIRMED or POTENTIAL in Batch 1: generate up to 10 supplemental strategies (S001-S010). Append to STRATEGIES.md and add to queue.

### Step 6: Execute Remaining Batches

Continue Tier 1, Tier 2, Tier 3, supplemental. Same pattern — max 5 per response.

### Step 7: Tally Results

```bash
grep -l "CONFIRMED" .bulwark/findings/*.md 2>/dev/null | wc -l
grep -l "POTENTIAL" .bulwark/findings/*.md 2>/dev/null | wc -l
grep -l "NOT VULNERABLE" .bulwark/findings/*.md 2>/dev/null | wc -l
grep -l "NEEDS MANUAL REVIEW" .bulwark/findings/*.md 2>/dev/null | wc -l
```

---

## Phase 4.5: Coverage Verification

**When to run:** After all batches complete. Skip for `quick` tier.

### Spawn Coverage Verification Agent

```
Task(
  subagent_type="general-purpose",
  model="{config.models.coverage}",
  prompt="
    You are a coverage verification agent for Dinh's Bulwark.

    === WHAT TO READ ===
    1. .bulwark/ARCHITECTURE.md — component map and API surface
    2. .bulwark/KB_MANIFEST.md — what KB patterns should have been checked
    3. All .bulwark/findings/ files — what was investigated

    === CHECK DIMENSIONS ===

    1. COMPONENT COVERAGE — was every detected component audited?
    2. OC PATTERN COVERAGE — was every relevant OC considered?
    3. API SURFACE COVERAGE — was every endpoint/route examined?

    === OUTPUT ===
    Write to .bulwark/COVERAGE.md with gap hypotheses (G001, G002, etc.)
  "
)
```

Investigate CRITICAL/HIGH gaps in a final batch.

---

## Update State

```json
{
  "phases": {
    "investigate": {
      "status": "complete",
      "completed_at": "<ISO-8601>",
      "total_strategies": {N},
      "results": {
        "confirmed": {N},
        "potential": {N},
        "not_vulnerable": {N},
        "needs_manual_review": {N}
      },
      "coverage_verification": "completed"
    }
  }
}
```

---

## Phase Complete

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

### Notable Findings:
{Top 3-5 most significant CONFIRMED/POTENTIAL findings}

### Next Step:
Run **`/clear`** then **`/DB:report`** to generate the final audit report.

---
```
