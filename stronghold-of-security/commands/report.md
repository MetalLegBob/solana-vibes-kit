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

1. Read `.audit/STATE.json` — check that `phases.investigate.status === "completed"`
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

### Step 3: Assess Context Budget

Count total input size. The final synthesizer needs to process potentially many findings.

If total findings content exceeds ~200KB:
- Inline the CONFIRMED and POTENTIAL findings in full
- For NOT VULNERABLE findings, include only the ID, status, and one-line summary
- For NEEDS MANUAL REVIEW, include full content

If total fits in context (~200KB or less):
- Inline everything

### Step 4: Spawn Final Synthesizer

Read `config.models.report` from `.audit/STATE.json` (default: opus).

Locate the synthesizer template:
```bash
find ~/.claude -name "final-synthesizer.md" -path "*/stronghold-of-security/agents/*" 2>/dev/null | head -1
```

```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",  // "opus" — from STATE.json
  prompt="
    You are the final report synthesizer for Stronghold of Security.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read this file: {SYNTHESIZER_PATH} — Full synthesis methodology

    === STEP 2: READ ALL INPUTS ===
    1. All .audit/findings/H*.md, S*.md, G*.md — Investigation results
    2. .audit/ARCHITECTURE.md — Architectural context
    3. .audit/STRATEGIES.md — Attack hypotheses
    4. .audit/COVERAGE.md — Coverage gaps (if exists)

    === STEP 3: READ KB FOR CALIBRATION ===
    {severity-calibration.md path} — Severity calibration reference
    {common-false-positives.md path} — False positive patterns
    {PATTERNS_INDEX.md path} — Master EP catalog for cross-referencing

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
      "status": "completed",
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
