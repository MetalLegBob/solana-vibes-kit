---
name: SOS:report
description: "Phase 5: Generate final audit report with combination analysis, attack trees, and severity calibration"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Stronghold of Security — Phase 5: Final Report

Generate the comprehensive audit report by synthesizing all findings with combination analysis, attack trees, and severity calibration.

## Prerequisites

1. Read `.audit/STATE.json` — check that `phases.investigate.status === "complete"`
2. Verify `.audit/findings/` contains investigation results

If prerequisites are missing:
```
Phase 4 (investigate) has not been completed yet.
Run /SOS:investigate first to investigate attack hypotheses.
```

---

## Phase 5: Final Synthesis

### Step 1: Load Final Synthesizer Template

Read the final synthesizer agent template:
```bash
find ~/.claude -name "final-synthesizer.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

### Step 2: Gather All Inputs

The final synthesizer needs:

1. **All findings:** Read every `.md` file in `.audit/findings/` (H*, S*, G* files)
2. **Architecture document:** Read `.audit/ARCHITECTURE.md`
3. **Strategies:** Read `.audit/STRATEGIES.md`
4. **Coverage report:** Read `.audit/COVERAGE.md` (if exists — Phase 4.5 may have been skipped)
5. **KB files for severity calibration:**
   - Find and read `severity-calibration.md` from the skill's knowledge base
   - Find and read `common-false-positives.md` from the skill's knowledge base
   - Find and read `PATTERNS_INDEX.md` for cross-referencing
6. **Handover document (stacked audits):** If `.audit/HANDOVER.md` exists, read:
   - Audit Lineage section (between `<!-- AUDIT_LINEAGE_START -->` and `<!-- AUDIT_LINEAGE_END -->`)
   - Previous Findings Digest section (between `<!-- FINDINGS_DIGEST_START -->` and `<!-- FINDINGS_DIGEST_END -->`)

```bash
find ~/.claude -name "severity-calibration.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
find ~/.claude -name "common-false-positives.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
find ~/.claude -name "PATTERNS_INDEX.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
```

### Step 3: Assess Context Budget (Enforced)

Count total findings content by reading all files in `.audit/findings/`:

1. **Classify findings by status:** Read each finding file, extract the status line (CONFIRMED/POTENTIAL/NOT_VULNERABLE/NEEDS_MANUAL_REVIEW). Count total lines per category.

2. **Apply trimming rules (always — not just when over threshold):**
   - **NOT_VULNERABLE findings:** ALWAYS trim to ID + status + one-line summary only. Never inline full NOT_VULNERABLE finding bodies — they add bulk with no synthesis value.
   - **NEEDS_MANUAL_REVIEW:** Include full content.
   - **CONFIRMED + POTENTIAL:** Include full content.

3. **Estimate total inline content:**
   ```
   Findings (trimmed):      {confirmed + potential full + NMR full + NV summaries} lines × 3 tokens/line
   ARCHITECTURE.md:         Read, count lines × 3
   STRATEGIES.md:           Read, count lines × 3
   COVERAGE.md:             Read, count lines × 3
   KB calibration files:    ~1,500 tokens total (fixed estimate)
   HANDOVER.md (if exists): Read, count lines × 3
   ────────────────────────
   Estimated total:         Sum of above
   ```

4. **Apply hard cap — 120K tokens estimated total:**
   - **Under 80K → Full Inline Mode:** Inline all findings (NOT_VULNERABLE already trimmed per rule 2), all reference material inline.
   - **80K–120K → Partial Disk Mode:** Move STRATEGIES.md, COVERAGE.md, and KB files to disk reads. Inline only: trimmed findings + ARCHITECTURE.md + HANDOVER summary. Add to synthesizer prompt: "Read these files from disk: {paths}"
   - **Over 120K → Disk-Heavy Mode:** Additionally move ARCHITECTURE.md to disk read. If still over 120K after all reference material moved to disk, further trim CONFIRMED+POTENTIAL findings to: ID + status + severity + one-paragraph summary + code location. Full details available via disk read. Warn user: "Very large finding set ({N} findings). Synthesizer will work from summaries and read full details from disk as needed."

5. **Announce budget to user:**
   ```
   Context budget: ~{estimated}K tokens ({mode: full inline / partial disk / disk-heavy})
   Findings: {confirmed} CONFIRMED, {potential} POTENTIAL, {nv} NOT_VULNERABLE (trimmed), {nmr} NEEDS_MANUAL_REVIEW
   ```

### Step 3.5: Pre-Spawn Validation

After assembling the prompt content (before spawning), verify:
- Total assembled content (prompt text + inline content) < 120K estimated tokens
- If over, re-apply trimming from Step 3 rule 4 with stricter thresholds
- Log: `Pre-spawn check: ~{N}K tokens estimated. Mode: {mode}.`

### Step 4: Spawn Final Synthesizer

Read `config.models.report` from `.audit/STATE.json` (default: opus).

Locate the synthesizer template:
```bash
find ~/.claude -name "final-synthesizer.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

The prompt is **conditional on the mode** determined in Step 3:

**Full Inline Mode (under 80K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",  // "opus" — from STATE.json
  prompt="
    You are the final report synthesizer for Stronghold of Security.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {SYNTHESIZER_PATH} — Full synthesis methodology

    === STEP 2: READ ALL INPUTS (inline) ===
    All findings provided inline (NOT_VULNERABLE trimmed to summaries).

    FINDINGS:
    {trimmed_findings_content}

    ARCHITECTURE:
    {architecture_content}

    STRATEGIES:
    {strategies_content}

    COVERAGE:
    {coverage_content_if_exists}

    === STEP 3: READ KB FOR CALIBRATION ===
    {severity-calibration.md path} — Severity calibration reference
    {common-false-positives.md path} — False positive patterns
    {PATTERNS_INDEX.md path} — Master EP catalog for cross-referencing

    {If .audit/HANDOVER.md exists:}
    === STEP 4: AUDIT EVOLUTION (stacked audits only) ===
    Read .audit/HANDOVER.md and extract:
    - Audit Lineage section (<!-- AUDIT_LINEAGE_START --> markers)
    - Previous Findings Digest (<!-- FINDINGS_DIGEST_START --> markers)
    Classify findings as NEW/RECURRENT/REGRESSION/RESOLVED.
    REGRESSION ESCALATION: +1 severity bump.
    For RECURRENT findings surviving 2+ audits, add prominent warning.

    === OUTPUT ===
    Write the final report to .audit/FINAL_REPORT.md
  "
)
```

**Partial Disk Mode (80K–120K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Stronghold of Security.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {SYNTHESIZER_PATH}

    === STEP 2: READ FINDINGS (inline) ===
    Findings provided inline (NOT_VULNERABLE trimmed to summaries).

    FINDINGS:
    {trimmed_findings_content}

    ARCHITECTURE:
    {architecture_content}

    === STEP 3: READ FROM DISK ===
    These files were too large to include inline:
    - .audit/STRATEGIES.md
    - .audit/COVERAGE.md (if exists)
    - {severity-calibration.md path}
    - {common-false-positives.md path}
    - {PATTERNS_INDEX.md path}

    {Audit evolution section same as full inline mode}

    === OUTPUT ===
    Write the final report to .audit/FINAL_REPORT.md
  "
)
```

**Disk-Heavy Mode (over 120K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Stronghold of Security.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {SYNTHESIZER_PATH}

    === STEP 2: FINDING SUMMARIES (inline — read full details from disk) ===
    {summary_only_findings — ID + status + severity + one-paragraph + location}

    For full finding details, read individual files from: .audit/findings/
    Prioritize reading full details for CONFIRMED and high-severity POTENTIAL findings.

    === STEP 3: READ ALL REFERENCE MATERIAL FROM DISK ===
    - .audit/ARCHITECTURE.md
    - .audit/STRATEGIES.md
    - .audit/COVERAGE.md (if exists)
    - {severity-calibration.md path}
    - {common-false-positives.md path}
    - {PATTERNS_INDEX.md path}

    {Audit evolution section same as full inline mode}

    === OUTPUT ===
    Write the final report to .audit/FINAL_REPORT.md
  "
)
```

**Do NOT use `run_in_background=true`** — background agents cannot get permission to write files.

### Step 5: Verify Output

After the synthesizer returns, verify:

1. `.audit/FINAL_REPORT.md` exists
2. It contains required sections:
   - Executive Summary
   - Severity Breakdown
   - Critical/High/Medium/Low findings
   - Combination Attack Analysis
   - Attack Trees
   - Severity Re-Calibration
   - Recommendations
3. If stacked audit, verify it also contains:
   - Audit Lineage section
   - Finding Evolution section
   - RESOLVED findings list

---

## Update State

Update `.audit/STATE.json`:
```json
{
  "phases": {
    "report": {
      "status": "complete",
      "completed_at": "{ISO-8601}",
      "report_file": ".audit/FINAL_REPORT.md"
    }
  }
}
```

Update `.audit/PROGRESS.md` — mark all phases complete.

---

## Phase Complete — Present Results

Read the Executive Summary and Severity Breakdown from the generated report, then present:

```markdown
---

## Stronghold of Security Audit Complete

### Final Report: `.audit/FINAL_REPORT.md`

### Executive Summary:
{Extract and display the executive summary from the report}

### Severity Breakdown:
| Severity | Count |
|----------|-------|
| CRITICAL | {N} |
| HIGH | {N} |
| MEDIUM | {N} |
| LOW | {N} |
| INFO | {N} |

### Top Priority Items:
1. {Extract top 3 from report}
2. ...
3. ...

### Attack Chains Found:
- {N} combination attack chains identified
- Critical fix nodes: {list — the fixes that break the most attack paths}

### All Audit Files:
```
.audit/
  ARCHITECTURE.md       — Unified architecture understanding
  HOT_SPOTS.md          — Phase 0.5 static scan results
  KB_MANIFEST.md        — Knowledge base loading manifest
  STRATEGIES.md         — Generated attack hypotheses
  COVERAGE.md           — Coverage verification report
  FINAL_REPORT.md       — ** THE FINAL AUDIT REPORT **
  PROGRESS.md           — Audit progress tracking
  STATE.json            — Machine-readable audit state
  context/              — 8-9 deep context analyses
  findings/             — Individual investigation results
```

### Phase Stats:
- **Model:** {config.models.report} (final synthesizer)
- **Agents spawned:** 1 synthesizer
- **Estimated tokens:** ~{findings + architecture + KB}K input

### What's Next?
1. **Review the report:** Read `.audit/FINAL_REPORT.md` for full details
2. **Fix vulnerabilities:** Address findings in priority order (fix critical nodes first)
3. **Verify fixes:** After applying fixes, run `/SOS:verify` to confirm they're effective
4. **Consider:** Manual expert review for NEEDS MANUAL REVIEW items

---
```
