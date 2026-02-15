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
   - Find and read `exploit-patterns-index.md` for cross-referencing

```bash
find ~/.claude -name "severity-calibration.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
find ~/.claude -name "common-false-positives.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
find ~/.claude -name "exploit-patterns-index.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
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
    {severity-calibration.md path}
    {common-false-positives.md path}
    {PATTERNS_INDEX.md path}

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
  context/              — 10-11 deep context analyses
  findings/             — Individual investigation results
```

### What's Next?
1. **Review the report:** Read `.audit/FINAL_REPORT.md` for full details
2. **Fix vulnerabilities:** Address findings in priority order (fix critical nodes first)
3. **Verify fixes:** After applying fixes, run `/SOS:verify` to confirm they're effective
4. **Consider:** Manual expert review for NEEDS MANUAL REVIEW items

---
```
