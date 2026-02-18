# SOS Audit Stacking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-audit lifecycle support to SOS — previous audits are archived and inform future audits via a handover document, without skipping any analysis.

**Architecture:** When `/SOS:scan` detects a completed `.audit/`, it archives it to `.audit-history/<date>-<hash>/`, computes a git diff delta, and generates `HANDOVER.md` with sectioned content that downstream phases selectively extract. New verification agents (Sonnet) handle unchanged code in parallel with primary auditors. The final report gains audit lineage and finding evolution tracking.

**Tech Stack:** Claude Code skills (markdown orchestration files), subagent prompts, Bash (git diff), structured markdown templates with HTML comment section markers.

**Design Document:** `docs/plans/2026-02-18-sos-audit-stacking-design.md` — the authoritative reference for all behavioral requirements.

---

## Task 1: Create HANDOVER.md Template

**Files:**
- Create: `stronghold-of-security/templates/HANDOVER.md`

**Step 1: Write the template**

Write `stronghold-of-security/templates/HANDOVER.md`:

```markdown
# Audit Handover

**Generated:** {TIMESTAMP}
**Current Audit:** #{AUDIT_NUMBER}
**Previous Audit:** #{PREV_AUDIT_NUMBER} — {PREV_DATE} @ {PREV_GIT_REF}

---

<!-- DELTA_SUMMARY_START -->
## Delta Summary

**Previous ref:** `{PREV_GIT_REF}`
**Current ref:** `{CURRENT_GIT_REF}`
**Files changed:** {N_MODIFIED} modified, {N_NEW} new, {N_DELETED} deleted, {N_UNCHANGED} unchanged

| File | Status | Magnitude | Notes |
|------|--------|-----------|-------|
| `{path}` | NEW | — | First appearance |
| `{path}` | MODIFIED | major/minor | {N} lines changed |
| `{path}` | UNCHANGED | — | Identical to previous audit |
| `{path}` | DELETED | — | Removed since previous audit |

### Massive Rewrite Detection

{If >70% files changed: "⚠ MASSIVE REWRITE DETECTED — >70% of files changed. Verification agents will be skipped. This audit runs essentially fresh but carries forward the findings digest for evolution tracking."}

{If <=70%: "Normal delta — verification agents will run on unchanged code."}
<!-- DELTA_SUMMARY_END -->

---

<!-- FINDINGS_DIGEST_START -->
## Previous Findings Digest

**Source:** `.audit-history/{PREV_DIR}/FINAL_REPORT.md`

### CONFIRMED Findings

| ID | Title | Severity | File | Relevance |
|----|-------|----------|------|-----------|
| {ID} | {Title} | {CRITICAL/HIGH/MEDIUM/LOW} | `{file}` | {RECHECK / VERIFY / RESOLVED_BY_REMOVAL} |

### POTENTIAL Findings

| ID | Title | Severity | File | Relevance |
|----|-------|----------|------|-----------|
| {ID} | {Title} | {CRITICAL/HIGH/MEDIUM/LOW} | `{file}` | {RECHECK / VERIFY / RESOLVED_BY_REMOVAL} |

### Relevance Tags

- **RECHECK** — Finding is in a MODIFIED file. Fix may have landed, or change may have made it worse. High-priority investigation target.
- **VERIFY** — Finding is in an UNCHANGED file. Lighter pass to confirm it still holds given changes elsewhere.
- **RESOLVED_BY_REMOVAL** — Finding was in a DELETED file. No longer applicable.
<!-- FINDINGS_DIGEST_END -->

---

<!-- FALSE_POSITIVE_LOG_START -->
## Previous False Positive Log

Hypotheses from the previous audit that were investigated and classified NOT_VULNERABLE. Grouped by file. Entries targeting MODIFIED files have been dropped (the dismissal no longer applies when code changes).

| Hypothesis ID | File | One-Line Description | Dismissal Reason |
|---------------|------|---------------------|------------------|
| {H_ID} | `{file}` (UNCHANGED) | {description} | {reason} |

**Token budget:** ~{N} entries, ~{estimated_tokens} tokens
<!-- FALSE_POSITIVE_LOG_END -->

---

<!-- ARCHITECTURE_SNAPSHOT_START -->
## Architecture Snapshot

Condensed version of the previous audit's architectural understanding. Phase 2 will verify these still hold against the current codebase.

### Key Trust Boundaries

{3-5 bullet points from previous ARCHITECTURE.md}

### Critical Invariants

{Top 5-10 invariants from previous audit, with enforcement status}

### Data Flow Assertions

{2-3 key data flow descriptions from previous audit}
<!-- ARCHITECTURE_SNAPSHOT_END -->

---

<!-- AUDIT_LINEAGE_START -->
## Audit Lineage

| # | Date | Git Ref | Confirmed | Potential | Files Scanned |
|---|------|---------|-----------|-----------|---------------|
| 1 | {date} | `{ref}` | {N} | {N} | {N} |
| 2 | {date} | `{ref}` | {N} | {N} | {N} |
| ... | ... | ... | ... | ... | ... |
| {current} | {today} | `{HEAD}` | — | — | — |
<!-- AUDIT_LINEAGE_END -->

---

**End of Handover**
```

**Step 2: Verify the template was created**

Run: `test -f stronghold-of-security/templates/HANDOVER.md && echo "EXISTS" || echo "MISSING"`
Expected: EXISTS

**Step 3: Commit**

```bash
git add stronghold-of-security/templates/HANDOVER.md
git commit -m "feat(SOS): add HANDOVER.md template for audit stacking"
```

---

## Task 2: Create Verification Agent Template

**Files:**
- Create: `stronghold-of-security/agents/verification-agent.md`

**Step 1: Write the verification agent**

Write `stronghold-of-security/agents/verification-agent.md`:

```markdown
# Verification Agent

You are a verification agent for Stronghold of Security audit stacking. Your job is to verify that conclusions from a **previous audit** still hold for **unchanged code**, given that other parts of the codebase have changed.

**Model:** Sonnet
**Context:** You receive the previous audit's condensed summary for your focus area + the delta summary showing what changed elsewhere.

## Your Mission

You are NOT re-auditing. You are verifying. The code in your focus area has NOT changed. But other code HAS changed — and those changes may invalidate previous conclusions about trust boundaries, data flows, or invariants.

## What You Receive

1. **Previous condensed summary** for your focus area (from the archived audit's context file)
2. **Delta summary** from HANDOVER.md — which files changed, what's new, what's deleted
3. **Your focus area assignment** — which security lens you're verifying

## Verification Process

### Step 1: Understand What Changed

Read the delta summary. For each MODIFIED and NEW file:
- Does this file interact with any mechanisms described in the previous summary?
- Could changes here invalidate assumptions the previous auditor made?
- Do any trust boundaries shift because of these changes?

### Step 2: Check Cross-Dependencies

For each key finding in the previous summary:
- **Invariants:** Does the invariant still hold given changes elsewhere?
  - If the invariant depends on code that changed → flag for RECHECK
  - If the invariant is self-contained in unchanged code → VERIFIED
- **Assumptions:** Are the assumptions still valid?
  - If an assumption relied on behavior in changed code → flag for RECHECK
  - If the assumption is about unchanged code → VERIFIED
- **Trust boundaries:** Have any trust boundaries shifted?
  - New entry points could change who can reach previously-safe code
  - Deleted validation could remove protections

### Step 3: Check for New Attack Surface from Changes

Even though YOUR files didn't change, the changes elsewhere might create:
- New paths into unchanged code that bypass previous protections
- Changed data flows that could deliver unexpected values
- Modified access control that changes who can call unchanged functions

### Step 4: Write Verification Output

Write your output to the assigned file path.

## Output Format

```markdown
---
task_id: sos-verification-{focus_area_slug}
provides: [{focus_area_slug}-verification]
focus_area: {focus_area_slug}
verification_status: {VERIFIED / NEEDS_RECHECK / CONCERNS_FOUND}
previous_audit_ref: {archived audit path}
---
<!-- CONDENSED_SUMMARY_START -->
# {Focus Area} — Verification Summary

## Verification Status: {VERIFIED / NEEDS_RECHECK / CONCERNS_FOUND}

## Previous Conclusions Checked: {N}

### Verified (Still Valid)
- {Conclusion}: Still holds because {reason}
- {Conclusion}: Still holds — no cross-dependencies with changed code

### Needs Recheck (Potentially Invalidated)
- {Conclusion}: May be affected by changes in `{modified_file}` because {reason}
- {Conclusion}: Assumption about `{function}` may no longer hold — `{related_file}` was modified

### New Concerns from Changes
- Changes in `{file}` may create new path to `{unchanged_function}` bypassing {protection}
- Deleted `{file}` removed {validation} that `{unchanged_code}` relied on

## Cross-Focus Handoffs
- → **{Agent}**: {item needing investigation due to changes}

## Summary
{2-3 sentences on overall verification result}
<!-- CONDENSED_SUMMARY_END -->
```

## Important Rules

1. **Don't re-audit unchanged code** — you're verifying, not discovering
2. **Focus on cross-dependencies** — how do changes ELSEWHERE affect conclusions HERE?
3. **Be conservative** — if in doubt, flag for RECHECK rather than VERIFIED
4. **Be specific** — reference exact files and line numbers from both old and new code
5. **Keep it concise** — your output should be ~1-2K tokens, not a full context analysis

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Re-read all source files | Only read files that changed and could affect your focus |
| Generate new findings | Flag concerns for the primary auditors |
| Assume changes are safe | Check if changes affect your focus area's conclusions |
| Write a full context analysis | Write a concise verification summary |
```

**Step 2: Verify the file was created**

Run: `test -f stronghold-of-security/agents/verification-agent.md && echo "EXISTS" || echo "MISSING"`
Expected: EXISTS

**Step 3: Commit**

```bash
git add stronghold-of-security/agents/verification-agent.md
git commit -m "feat(SOS): add verification agent template for stacked audits"
```

---

## Task 3: Modify scan.md — Archive Detection & Handover Generation

This is the largest change. `scan.md` is the entry point and needs to:
1. Detect a previous completed audit
2. Archive it to `.audit-history/`
3. Compute the git diff delta
4. Generate HANDOVER.md
5. Update STATE.json schema with `previous_audit` field

**Files:**
- Modify: `stronghold-of-security/commands/scan.md`

**Step 1: Add archive detection and handover generation to scan.md**

Insert a new section **after the frontmatter and title** (after line 16 "This command performs the initial codebase scan and static pre-analysis.") but **before "## What This Phase Does"** (line 18). Actually, the cleanest approach is to add a new phase section between the arguments section (line 30) and "## Phase 0: Pre-Flight Analysis" (line 34).

Add this new section between the `## Arguments` section and `## Phase 0: Pre-Flight Analysis`:

```markdown
---

## Phase -1: Archive Detection & Handover Generation

**When:** Always runs first, before any codebase analysis.
**Goal:** Check for a previous completed audit. If found, archive it and generate a handover document.

### Step 1: Check for Previous Audit

```bash
test -f .audit/STATE.json && echo "PREVIOUS_AUDIT_EXISTS" || echo "NO_PREVIOUS_AUDIT"
```

**If NO_PREVIOUS_AUDIT:** Skip to Phase 0. First-time users see zero behavior change.

**If PREVIOUS_AUDIT_EXISTS:**

### Step 2: Validate Previous Audit is Complete

Read `.audit/STATE.json`. Check that `phases.report.status === "completed"`.

If the previous audit is **not** complete (e.g., abandoned mid-pipeline):
```
⚠ Incomplete audit detected in .audit/ (stopped at {last_completed_phase}).
This audit will be archived as-is. Findings from incomplete audits are not
carried forward in the handover.
```
Archive it anyway but skip handover generation (no FINAL_REPORT.md to extract findings from).

### Step 3: Read Previous Audit Metadata

From the previous `.audit/STATE.json`, extract:
- `audit_id`
- `started_at`
- `config.tier`
- `phases.scan.files_scanned`
- `phases.scan.loc_estimated`

Get the git ref at the time of the previous audit:
```bash
# Get the commit hash from when the audit was created
git log --format="%H" -1 --before="{started_at}" 2>/dev/null || git rev-parse HEAD
```

If `phases.report.status === "completed"`, also extract findings summary from `.audit/FINAL_REPORT.md`:
- Count of CONFIRMED findings
- Count of POTENTIAL findings

### Step 4: Archive the Previous Audit

```bash
# Generate archive directory name: YYYY-MM-DD-<short-hash>
PREV_DATE=$(date -j -f "%Y-%m-%dT%H:%M:%S" "{started_at}" "+%Y-%m-%d" 2>/dev/null || echo "{started_at_date_part}")
SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
ARCHIVE_DIR=".audit-history/${PREV_DATE}-${SHORT_HASH}"

mkdir -p .audit-history
mv .audit "$ARCHIVE_DIR"
```

Report to user:
```
Previous Audit Archived
  Moved .audit/ → ${ARCHIVE_DIR}
```

### Step 5: Compute Delta

```bash
# Get previous audit's git ref
PREV_REF="{git_ref_from_step_3}"

# Compute what changed
git diff --name-status "${PREV_REF}..HEAD" -- '*.rs' 2>/dev/null
```

Parse the git diff output to categorize each file:
- `A` (added) → `NEW`
- `M` (modified) → `MODIFIED`
- `D` (deleted) → `DELETED`
- Files in the previous INDEX.md that don't appear in the diff → `UNCHANGED`

For MODIFIED files, estimate magnitude:
```bash
# For each modified file, count changed lines
git diff --stat "${PREV_REF}..HEAD" -- "{file}" 2>/dev/null
```
- `minor`: < 10 lines changed
- `major`: >= 10 lines changed

Calculate massive rewrite detection:
- Count total source files (from previous INDEX.md or current filesystem)
- If MODIFIED + NEW > 70% of total files → flag as massive rewrite

### Step 6: Generate HANDOVER.md

**Only if previous audit was complete** (had `phases.report.status === "completed"`):

Create a fresh `.audit/` directory:
```bash
mkdir -p .audit/{context,findings}
```

Read the HANDOVER.md template from the skill:
```bash
find ~/.claude -name "HANDOVER.md" -path "*/stronghold-of-security/templates/*" 2>/dev/null | head -1
```

Generate `.audit/HANDOVER.md` by filling the template with:

**Delta Summary section:**
- Build the file status table from Step 5 results

**Previous Findings Digest section:**
- Read `{ARCHIVE_DIR}/FINAL_REPORT.md`
- Extract all CONFIRMED and POTENTIAL findings
- For each finding, check its file against the delta:
  - File is MODIFIED → tag: `RECHECK`
  - File is UNCHANGED → tag: `VERIFY`
  - File is DELETED → tag: `RESOLVED_BY_REMOVAL`

**Previous False Positive Log section:**
- Read `{ARCHIVE_DIR}/STRATEGIES.md`
- Read all `{ARCHIVE_DIR}/findings/*.md` files
- Collect hypotheses where the finding status is `NOT VULNERABLE` or `NOT_VULNERABLE`
- For each, check the target file against the delta:
  - File is UNCHANGED → retain (include in log)
  - File is MODIFIED or DELETED → drop (dismissal no longer applies)
- Write one-line compressed entries: hypothesis ID, description, file, dismissal reason

**Architecture Snapshot section:**
- Read `{ARCHIVE_DIR}/ARCHITECTURE.md`
- Extract and condense:
  - Trust boundaries (from Trust Model section)
  - Top 5-10 invariants (from Key Mechanisms / Critical Invariants sections)
  - Key data flow assertions (from Data Flow Diagram / State Management sections)
- Target: ~1-2K tokens for this section

**Audit Lineage section:**
- If the archived audit's STATE.json has a `previous_audit` field, follow the chain to build full lineage
- Add one row per previous audit: number, date, git ref, confirmed count, potential count, files scanned
- Add the current audit as the latest entry (with "—" for counts since it hasn't run yet)

### Step 7: Display Handover Summary

After normal pre-flight info, display:

```markdown
Previous Audit Detected
  Audit #{N} — {date} @ commit {short_hash}
  Found: {confirmed} confirmed, {potential} potential, {files_scanned} files scanned
  Since then: {N_MODIFIED} files modified, {N_NEW} new files, {N_DELETED} deleted
  Handover generated → .audit/HANDOVER.md
```

If massive rewrite detected:
```markdown
⚠ Massive Rewrite Detected (>{percent}% files changed)
  Verification agents will be skipped for this audit.
  Previous findings carried forward for evolution tracking only.
```
```

Then, in the **State Initialization** section (around line 300), update the STATE.json schema to include the `previous_audit` field. Replace the existing STATE.json block with one that includes:

```json
{
  "version": "2.1.0",
  "audit_id": "{generated-uuid}",
  "audit_number": {N},
  "started_at": "{ISO-8601}",
  "last_updated": "{ISO-8601}",
  "git_ref": "{current HEAD hash}",
  "previous_audit": {
    "path": ".audit-history/{YYYY-MM-DD}-{short-hash}",
    "audit_id": "{previous audit_id}",
    "git_ref": "{previous git ref}",
    "date": "{previous date}",
    "complete": true,
    "summary": {
      "confirmed": {N},
      "potential": {N},
      "files_scanned": {N}
    }
  },
  "stacking": {
    "is_stacked": true,
    "handover_generated": true,
    "massive_rewrite": false,
    "delta": {
      "new_files": {N},
      "modified_files": {N},
      "unchanged_files": {N},
      "deleted_files": {N}
    }
  },
  "config": {
    "...existing config fields..."
  },
  "phases": {
    "...existing phase fields..."
  }
}
```

When `previous_audit` is `null` (first audit), omit the field entirely. Same for `stacking` — omit when not a stacked audit.

Also update `audit_number`: if previous audit has an `audit_number`, increment by 1. Otherwise, if there's a previous audit, set to 2. If no previous audit, set to 1.

Update the **Phase Complete** output section at the bottom of scan.md to include handover info when applicable:

```markdown
{If stacked audit:}
### Audit Stacking:
- Previous audit: #{prev_number} ({prev_date} @ {prev_ref})
- Delta: {N} modified, {N} new, {N} deleted, {N} unchanged files
- Handover: `.audit/HANDOVER.md` ({N} previous findings carried forward)
- Lineage: {N} audits in chain
```

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/scan.md` and verify:
- "Phase -1" section exists before Phase 0
- STATE.json schema includes `previous_audit` and `stacking` fields
- Phase Complete output includes stacking info
- Version bumped to 2.1.0

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/scan.md
git commit -m "feat(SOS): add archive detection and handover generation to scan phase"
```

---

## Task 4: Modify index.md — Add delta_status Column

**Files:**
- Modify: `stronghold-of-security/commands/index.md`

**Step 1: Add delta_status support to the indexer**

In `index.md`, add instructions for the indexer agent to include a `delta_status` column when a handover exists.

After the existing "=== STEP 1: FIND ALL SOURCE FILES ===" section in the agent prompt (around line 51), add a new step:

```
    === STEP 1.5: CHECK FOR HANDOVER (stacked audit) ===
    Check if .audit/HANDOVER.md exists:
    - If YES: Read the Delta Summary section (between
      <!-- DELTA_SUMMARY_START --> and <!-- DELTA_SUMMARY_END --> markers).
      Extract the file status table. You will use this to add a
      delta_status column to INDEX.md.
    - If NO: This is a fresh audit. Skip this step.
```

In the "=== STEP 4: WRITE INDEX.md ===" section, add the `delta_status` column to the file entries. Update the file entry format (around line 113-118) to include:

```
    ### {program_name}/src/{path/to/file.rs}
    - LOC: {N}
    - Delta: {NEW / MODIFIED / UNCHANGED / DELETED}  ← only present in stacked audits
    - Structs: {comma-separated list}
    - Functions: {comma-separated list}
    - External calls: {comma-separated list or 'none'}
    - Risk markers: {marker}({count}), {marker}({count}), ...
    - Focus relevance: [{comma-separated focus area tags}]
```

Also add the delta column to the Focus Area File Map tables (around line 124-140):

```
    ### Access Control & Account Validation
    | File | LOC | Delta | Risk Markers | Key Functions |
    |------|-----|-------|-------------|---------------|
    | {path} | {N} | {NEW/MOD/—} | {summary} | {top 3 functions} |
```

Use `—` for the Delta column when this is not a stacked audit.

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/index.md` and verify:
- STEP 1.5 exists for handover checking
- File entries include `Delta:` field
- Focus Area File Map tables include Delta column

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/index.md
git commit -m "feat(SOS): add delta_status column to INDEX.md for stacked audits"
```

---

## Task 5: Modify analyze.md — Add Verification Agents

**Files:**
- Modify: `stronghold-of-security/commands/analyze.md`

**Step 1: Add stacking awareness to analyze.md**

In the **Step 1: Load Configuration** section (around line 38), add loading of stacking state:

```markdown
Read `.audit/STATE.json` to get:
- `config.tier` — determines number of focus areas and agent depth
- `config.defi_economic_agent` — whether to spawn 11th agent
- `config.protocol_types` — for economic model agent
- `config.models.phase1` — model for context auditor agents (opus or sonnet)
- `config.models.quality_gate` — model for quality gate validation (haiku)
- `stacking.is_stacked` — whether this is a stacked audit
- `stacking.massive_rewrite` — if true, skip verification agents
- `stacking.handover_generated` — whether HANDOVER.md exists
```

After **Step 2: Locate Skill Files** (around line 58), add:

```markdown
If `stacking.is_stacked === true`:
```bash
find ~/.claude -name "verification-agent.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```
Store as `VERIFICATION_AGENT_PATH`.

Also read `.audit/HANDOVER.md` and extract the list of RECHECK findings (from the Findings Digest section) grouped by focus area, for injection into primary auditor prompts.
```

In the **Step 4: Spawn Context Auditors** section, modify the primary auditor prompt to include RECHECK findings when stacking is active. Add this block to the agent prompt (after "=== STEP 5: READ HOT-SPOTS ===" around line 144):

```
    {If stacking.is_stacked AND this focus area has RECHECK findings:}
    === STEP 6: PREVIOUS FINDINGS TO RECHECK ===
    The following findings from the previous audit are in files that have
    MODIFIED since then. They are high-priority investigation targets —
    determine if the change fixed them, made them worse, or is unrelated:

    {List of RECHECK findings for this focus area from HANDOVER.md,
     each with: finding ID, title, severity, file, one-line description}
```

After the primary auditor batches (after Step 4 "Collect Results" around line 204), add a new section for verification agents:

```markdown
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
```

In the **Step 5: Update State** section, add verification agent tracking:

```json
{
  "phases": {
    "analyze": {
      "status": "completed",
      "completed_at": "{ISO-8601}",
      "agents": {
        "01_access_control": "completed",
        "02_arithmetic": "completed",
        "..."
      },
      "verification_agents": {
        "01_access_control_verification": "completed",
        "..."
      },
      "total_output_kb": {N},
      "quality_gate": "{passed|ran_reruns|skipped}"
    }
  }
}
```

In the **Phase Complete** output, add verification agent info:

```markdown
{If stacked audit:}
### Verification Agents:
- **Agents completed:** {N} verification agents on unchanged code
- **Status:** {N} verified, {N} needs recheck, {N} concerns found
```

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/analyze.md` and verify:
- Stacking state is loaded in Step 1
- Verification agent path is located
- RECHECK findings are injected into primary auditor prompts
- Step 4b exists for verification agent spawning
- Verification agents are tracked in STATE.json update
- Phase Complete output includes verification info

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/analyze.md
git commit -m "feat(SOS): add verification agents for unchanged code in stacked audits"
```

---

## Task 6: Modify strategize.md — False Positive Deduplication

**Files:**
- Modify: `stronghold-of-security/commands/strategize.md`

**Step 1: Add handover integration to strategize.md**

In the **Phase 2: Context Synthesis** section, update **Step 1: Extract Condensed Summaries** (around line 40) to also load verification agent outputs:

```markdown
For each file in `.audit/context/NN-*.md`:
1. Read the file
2. Extract content between `<!-- CONDENSED_SUMMARY_START -->` and `<!-- CONDENSED_SUMMARY_END -->` markers
3. If markers are not found, fall back to reading the first 200 lines
4. Collect all summaries

**Stacked audits:** Also read `.audit/context/NN-*-verification.md` files (verification agent outputs). These contain verification summaries for unchanged code. Include them in the synthesis alongside primary auditor summaries.
```

In **Step 2: Synthesize Architecture Document** (around line 49), add:

```markdown
**Stacked audits:** Read the Architecture Snapshot from `.audit/HANDOVER.md` (between `<!-- ARCHITECTURE_SNAPSHOT_START -->` and `<!-- ARCHITECTURE_SNAPSHOT_END -->` markers). Use this as a starting reference, but verify all assertions against current analysis. Note where previous architectural understanding has been confirmed or invalidated by changes.
```

In **Phase 3: Strategy Generation**, after **Step 1: Load Knowledge Base** (around line 116), add a new step:

```markdown
### Step 1b: Load Handover Context (Stacked Audits Only)

**When:** Only if `.audit/HANDOVER.md` exists.

Read `.audit/HANDOVER.md` and extract:

1. **False Positive Log** (between `<!-- FALSE_POSITIVE_LOG_START -->` and `<!-- FALSE_POSITIVE_LOG_END -->`):
   - These are hypotheses that were investigated and dismissed in the previous audit
   - They target UNCHANGED files only (entries for MODIFIED files were already filtered during handover generation)

2. **Findings Digest** (between `<!-- FINDINGS_DIGEST_START -->` and `<!-- FINDINGS_DIGEST_END -->`):
   - Previous CONFIRMED and POTENTIAL findings with relevance tags

3. **Architecture Snapshot** (between `<!-- ARCHITECTURE_SNAPSHOT_START -->` and `<!-- ARCHITECTURE_SNAPSHOT_END -->`):
   - Key trust boundaries and invariants from previous audit
```

In **Step 2: Generate Attack Hypotheses** (around line 118), add deduplication rules:

```markdown
**Stacked audit behavioral rules:**

When generating hypotheses for a stacked audit, apply these rules:

1. **Do NOT regenerate hypotheses that match entries in the False Positive Log targeting UNCHANGED code.** These were already investigated and dismissed — they are confirmed dead ends. Skip them.

2. **DO regenerate hypotheses on MODIFIED code even if they match previous false positives.** The code changed, so the previous dismissal is void. The false positive log already filtered out MODIFIED-file entries during handover generation, so any remaining entries are safe to skip.

3. **Previous CONFIRMED findings on MODIFIED code (tagged RECHECK) become automatic Tier 1 hypotheses.** Frame them as: "Did the fix for {finding_title} actually work? Verify that {finding_id} at `{file}` is now properly addressed." These are the highest priority.

4. **Previous CONFIRMED findings on UNCHANGED code (tagged VERIFY) do NOT need new hypotheses.** The verification agents already checked these. Reference the verification agent output instead.

5. **The 20%+ novel hypothesis requirement still applies** to newly generated strategies. This ensures fresh creative thinking even on repeat audits.

6. **Net effect:** Significant token savings by avoiding known dead ends on unchanged code, while maintaining full thoroughness on changed and new code.

**Tracking:** In the generated STRATEGIES.md, tag each hypothesis with its origin:
- `Origin: Novel` — new hypothesis not from previous audit
- `Origin: RECHECK ({previous_finding_id})` — re-investigation of previous finding on modified code
- `Origin: KB ({EP-XXX})` — from knowledge base exploit pattern
- `Origin: Playbook` — from protocol playbook
```

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/strategize.md` and verify:
- Verification agent outputs are loaded in Phase 2
- Architecture Snapshot is used as starting reference
- Step 1b loads handover context
- Four deduplication rules are present
- Origin tagging is specified

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/strategize.md
git commit -m "feat(SOS): add false positive deduplication and RECHECK rules for stacked audits"
```

---

## Task 7: Modify investigate.md — RECHECK Context Loading

**Files:**
- Modify: `stronghold-of-security/commands/investigate.md`

**Step 1: Add RECHECK context to investigate.md**

In the **Step 1: Load Configuration** section (around line 60), add:

```markdown
Read `.audit/STATE.json` for:
- ...existing fields...
- `stacking.is_stacked` — whether this is a stacked audit
- `previous_audit.path` — path to archived audit (for loading previous finding files)
```

In the **Step 4: Execute Batches** section, modify the Tier 1+2 investigator prompt (around line 137). Add a new step to the prompt for RECHECK hypotheses:

```
    {If this hypothesis has Origin: RECHECK ({previous_finding_id}):}
    === STEP 2b: READ PREVIOUS FINDING (RECHECK only) ===
    This hypothesis is a re-investigation of a finding from a previous audit.
    Read the previous finding file for context:
    {previous_audit.path}/findings/{previous_finding_id}.md

    This tells you what was found last time at this location and why it was
    flagged. Your job: determine if the issue is FIXED, WORSE, or DIFFERENT
    given the code changes since then. The code HAS changed (that's why this
    is a RECHECK) — so read the current code carefully and compare.
```

This goes after "=== STEP 2: READ CONTEXT ===" and before "=== STEP 3: READ KNOWLEDGE BASE ===" in the existing prompt.

The extra context per RECHECK investigator is ~200-500 tokens (one finding file).

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/investigate.md` and verify:
- Stacking state is loaded in Step 1
- RECHECK investigators get Step 2b with previous finding file
- The prompt change only applies when the hypothesis has Origin: RECHECK

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/investigate.md
git commit -m "feat(SOS): add previous finding context for RECHECK hypotheses"
```

---

## Task 8: Modify report.md — Audit Lineage & Finding Evolution

**Files:**
- Modify: `stronghold-of-security/commands/report.md`

**Step 1: Add evolution tracking to report.md**

In the **Step 2: Gather All Inputs** section (around line 42), add handover loading:

```markdown
6. **Handover document (stacked audits):** If `.audit/HANDOVER.md` exists, read:
   - Audit Lineage section (between `<!-- AUDIT_LINEAGE_START -->` and `<!-- AUDIT_LINEAGE_END -->`)
   - Previous Findings Digest section (between `<!-- FINDINGS_DIGEST_START -->` and `<!-- FINDINGS_DIGEST_END -->`)
```

In the **Step 4: Spawn Final Synthesizer** prompt (around line 80), add handover context:

```
    {If .audit/HANDOVER.md exists:}
    === STEP 4: AUDIT EVOLUTION (stacked audits only) ===
    Read .audit/HANDOVER.md and extract:
    - Audit Lineage section (<!-- AUDIT_LINEAGE_START --> markers)
    - Previous Findings Digest (<!-- FINDINGS_DIGEST_START --> markers)

    Use this to generate two new report sections:

    **Audit Lineage:** Full chain of previous audits with summary stats.
    Include in the report metadata section.

    **Finding Evolution:** For EACH finding in this audit, classify it:
    - NEW — First seen in this audit. Not present in any previous audit.
    - RECURRENT — Was present in a previous audit AND is still present.
      Flag prominently if it has survived 2+ audits.
    - REGRESSION — Was in a previous audit, was marked as fixed/resolved
      in an intermediate audit, and is now back. ESCALATE severity.
    - RESOLVED — Was in the previous audit but is no longer present
      (either explicitly fixed or the code was deleted/rewritten).

    For RESOLVED findings, list them in a separate section so users can
    see their fix progress.

    For RECURRENT findings surviving 2+ audits, add a prominent warning:
    "⚠ This finding has persisted across {N} audits without resolution."
```

In the **Step 5: Verify Output** section (around line 112), add evolution checks:

```markdown
3. If stacked audit, verify it also contains:
   - Audit Lineage section
   - Finding Evolution section
   - RESOLVED findings list
```

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/report.md` and verify:
- Handover is loaded in Step 2
- Synthesizer prompt includes Step 4 for evolution tracking
- Finding evolution classifications are defined (NEW, RECURRENT, REGRESSION, RESOLVED)
- Verification checks include evolution sections

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/report.md
git commit -m "feat(SOS): add audit lineage and finding evolution to report phase"
```

---

## Task 9: Modify FINAL_REPORT.md Template — Evolution Sections

**Files:**
- Modify: `stronghold-of-security/templates/FINAL_REPORT.md`

**Step 1: Add evolution sections to the template**

Add a new section after "## Report Metadata" (line 419) and before "**End of Report**" (line 431). Insert before the end:

```markdown
---

## Audit Lineage

> **History:** This audit is part of a chain of security reviews tracking this codebase over time.

| # | Date | Git Ref | Confirmed | Potential | Files Scanned | Notes |
|---|------|---------|-----------|-----------|---------------|-------|
| 1 | {date} | `{ref}` | {N} | {N} | {N} | Initial audit |
| 2 | {date} | `{ref}` | {N} | {N} | {N} | {N} files changed |
| {current} | {date} | `{ref}` | {N} | {N} | {N} | Current audit |

---

## Finding Evolution

> **Tracking:** How findings have changed across audits.

### Evolution Summary

| Classification | Count | Description |
|----------------|-------|-------------|
| NEW | {N} | First seen in this audit |
| RECURRENT | {N} | Present in previous audit(s), still present |
| REGRESSION | {N} | Previously fixed, now broken again |
| RESOLVED | {N} | Was in previous audit, no longer present |

### New Findings

| ID | Title | Severity |
|----|-------|----------|
| {ID} | {Title} | {Severity} |

### Recurrent Findings

> **⚠ Attention:** These findings have persisted across multiple audits.

| ID | Title | Severity | First Seen | Audits Present |
|----|-------|----------|------------|----------------|
| {ID} | {Title} | {Severity} | Audit #{N} ({date}) | {N} audits |

{For findings surviving 2+ audits:}
> **⚠ {ID}: {Title}** has persisted across {N} audits without resolution. Consider prioritizing this fix.

### Regressions

> **🔴 ESCALATED:** These findings were previously fixed but have reappeared.

| ID | Title | Original Severity | Escalated Severity | Previously Fixed In |
|----|-------|-------------------|-------------------|-------------------|
| {ID} | {Title} | {Original} | {Escalated} | Audit #{N} ({date}) |

### Resolved Findings

> **✓ Progress:** These findings from previous audits are no longer present.

| ID | Title | Original Severity | Resolution |
|----|-------|-------------------|------------|
| {ID} | {Title} | {Severity} | {Fixed in code / Removed with deleted file} |
```

Also update the "Report Metadata" table (around line 420) to include lineage info:

```markdown
| Field | Value |
|-------|-------|
| Report Generated | {TIMESTAMP} |
| Stronghold of Security Version | 2.1.0 |
| Audit Number | #{N} |
| Previous Audits | {N} |
| Total Agent Invocations | {N} |
| Analysis Duration | {TIME} |
| Context Files Generated | {N} |
| Strategies Investigated | {N} |
| Verification Agents | {N} |
```

**Step 2: Verify the changes**

Read `stronghold-of-security/templates/FINAL_REPORT.md` and verify:
- Audit Lineage section exists with lineage table
- Finding Evolution section exists with four classifications
- Recurrent findings have warning callouts
- Regressions show escalated severity
- Resolved findings track fix progress
- Report Metadata includes audit number and previous audits count

**Step 3: Commit**

```bash
git add stronghold-of-security/templates/FINAL_REPORT.md
git commit -m "feat(SOS): add evolution and lineage sections to FINAL_REPORT template"
```

---

## Task 10: Modify status.md — Lineage Display

**Files:**
- Modify: `stronghold-of-security/commands/status.md`

**Step 1: Add lineage display to status.md**

In **Step 2: Parse State & Display Dashboard** (around line 48), add lineage info to the dashboard output. After the model/tier line (around line 67), add:

```markdown
{If state has previous_audit field:}
Chain: Audit #{audit_number} — {N} previous audits in history
  Previous: #{prev_number} — {prev_date} @ {prev_ref} ({prev_confirmed} confirmed, {prev_potential} potential)
```

In **Step 3: Phase-Specific Details** (around line 69), add:

```markdown
**If stacking is active:**
```
Stacking: Audit #{audit_number} in chain
  Delta: {delta.modified_files} modified, {delta.new_files} new, {delta.deleted_files} deleted
  Handover: {handover_generated ? "Generated" : "Skipped (incomplete previous audit)"}
  Massive rewrite: {massive_rewrite ? "YES — verification agents skipped" : "No"}
```
```

Also, in **Step 1: Check for Audit State** (around line 17), after checking for `.audit/STATE.json`, also check for audit history:

```markdown
Also check for audit history:
```bash
test -d .audit-history && ls .audit-history/ 2>/dev/null | wc -l
```

If audit history exists but no current audit:
```markdown
## No Active Audit

No `.audit/STATE.json` found, but {N} previous audit(s) found in `.audit-history/`.

### Previous Audits:
{For each directory in .audit-history/, sorted by name (date-based):}
| # | Directory | Date |
|---|-----------|------|
| {N} | {dir_name} | {extracted date} |

Run `/SOS:scan` to begin a new audit. Previous audit context will be
automatically carried forward via the handover system.
```
```

**Step 2: Verify the changes**

Read `stronghold-of-security/commands/status.md` and verify:
- Dashboard shows audit chain info when stacking is active
- Delta summary is shown
- Audit history is displayed when no active audit exists but history is present

**Step 3: Commit**

```bash
git add stronghold-of-security/commands/status.md
git commit -m "feat(SOS): add audit lineage and stacking info to status display"
```

---

## Task 11: Final Review & Integration Test

**Files:**
- Read: All modified files (scan.md, index.md, analyze.md, strategize.md, investigate.md, report.md, status.md, FINAL_REPORT.md template)
- Read: All new files (HANDOVER.md template, verification-agent.md)

**Step 1: Cross-reference all files against design document**

Read `docs/plans/2026-02-18-sos-audit-stacking-design.md` and verify each requirement is implemented:

| Design Doc Section | Implementation Location | Status |
|---|---|---|
| §1 Archive Structure | scan.md Phase -1 Steps 3-4 | Check |
| §1 State Linkage | scan.md STATE.json schema | Check |
| §2 Handover: Delta Summary | HANDOVER.md template, scan.md Step 5-6 | Check |
| §2 Handover: Findings Digest | HANDOVER.md template, scan.md Step 6 | Check |
| §2 Handover: False Positive Log | HANDOVER.md template, scan.md Step 6 | Check |
| §2 Handover: Architecture Snapshot | HANDOVER.md template, scan.md Step 6 | Check |
| §2 Handover: Audit Lineage | HANDOVER.md template, scan.md Step 6 | Check |
| §3 Phase 0.25 delta_status | index.md Step 1.5, format update | Check |
| §3 Phase 0.5 no change | (verified — no changes to scan.md hot-spots section) | Check |
| §3 Phase 1 primary auditors | analyze.md RECHECK injection | Check |
| §3 Phase 1 verification agents | analyze.md Step 4b, verification-agent.md | Check |
| §3 Phase 1.5 no change | (verified — quality gate unchanged) | Check |
| §3 Phase 2 synthesis | strategize.md verification outputs + snapshot | Check |
| §3 Phase 3 strategy gen | strategize.md Step 1b + dedup rules | Check |
| §3 Phase 4 investigation | investigate.md Step 2b RECHECK context | Check |
| §3 Phase 4.5 no change | (verified — coverage verification unchanged) | Check |
| §3 Phase 5 synthesis | report.md Step 4 evolution tracking | Check |
| §4 Context budget | (verified — all token estimates within design bounds) | Check |
| §5 UX: scan output | scan.md Step 7 handover summary | Check |
| §5 UX: status lineage | status.md lineage display | Check |
| §5 UX: report evolution | FINAL_REPORT.md evolution sections | Check |
| §5 Edge: massive rewrite | scan.md Step 5, analyze.md Step 4b skip | Check |
| §5 Edge: clean audit | (no flag needed — delete .audit-history/) | Check |
| §5 Edge: no code changes | (handled — all files UNCHANGED, verification agents confirm) | Check |
| §5 Edge: verify distinction | (verified — verify.md unchanged, no archiving/handover) | Check |
| §6 Model assignments | All model references match design table | Check |

**Step 2: Verify no regressions in existing flow**

Confirm that when no `.audit/STATE.json` exists (first-time audit):
- scan.md Phase -1 detects "NO_PREVIOUS_AUDIT" and skips to Phase 0
- index.md skips Step 1.5 (no HANDOVER.md)
- analyze.md skips Step 4b (stacking.is_stacked is absent/false)
- strategize.md skips Step 1b (no HANDOVER.md)
- investigate.md doesn't add Step 2b (no RECHECK hypotheses)
- report.md doesn't add Step 4 (no HANDOVER.md)
- status.md doesn't show lineage (no previous_audit field)
- FINAL_REPORT.md template sections are filled with "N/A — first audit" or omitted

**Step 3: Commit the plan itself**

```bash
git add docs/plans/2026-02-18-sos-audit-stacking-implementation.md
git commit -m "docs: add audit stacking implementation plan"
```
