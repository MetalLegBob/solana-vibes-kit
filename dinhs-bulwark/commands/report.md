---
name: DB:report
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

# Dinh's Bulwark — Phase 5: Final Report

Generate the comprehensive off-chain audit report by synthesizing all findings with combination analysis, attack trees, and severity calibration.

## Prerequisites

1. Read `.bulwark/STATE.json` — check that `phases.investigate.status === "complete"`
2. Verify `.bulwark/findings/` contains investigation results

If prerequisites are missing:
```
Phase 4 (investigate) has not been completed yet.
Run /DB:investigate first to investigate attack hypotheses.
```

---

## Phase 5: Final Synthesis

### Step 1: Load Final Synthesizer Template

```bash
find ~/.claude -name "final-synthesizer.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
```

### Step 2: Gather All Inputs

1. **All findings:** Read every `.md` file in `.bulwark/findings/` (H*, S*, G* files)
2. **Architecture document:** Read `.bulwark/ARCHITECTURE.md`
3. **Strategies:** Read `.bulwark/STRATEGIES.md`
4. **Coverage report:** Read `.bulwark/COVERAGE.md` (if exists)
5. **Handover document (stacked audits):** Read `.bulwark/HANDOVER.md` (if exists) — needed for finding evolution, audit lineage, and regression detection
6. **Hot spots map:** Read `.bulwark/HOT_SPOTS.md` (if exists) — for audit coverage analysis
7. **KB severity calibration:**
   ```bash
   find ~/.claude -name "severity-calibration.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   find ~/.claude -name "common-false-positives.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   find ~/.claude -name "PATTERNS_INDEX.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   ```
6. **SOS findings (cross-boundary analysis):** If `.audit/FINAL_REPORT.md` exists, read for cross-boundary combination analysis

### Step 3: Assess Context Budget

If total findings content exceeds ~200KB:
- Inline CONFIRMED and POTENTIAL findings in full
- For NOT VULNERABLE: include only ID, status, one-line summary
- For NEEDS MANUAL REVIEW: include full content

### Step 4: Spawn Final Synthesizer

Read `config.models.report` from `.bulwark/STATE.json` (default: opus).

```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Dinh's Bulwark off-chain audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read: {SYNTHESIZER_PATH}

    === STEP 2: READ ALL INPUTS ===
    1. All .bulwark/findings/H*.md, S*.md, G*.md
    2. .bulwark/ARCHITECTURE.md
    3. .bulwark/STRATEGIES.md
    4. .bulwark/COVERAGE.md (if exists)

    === STEP 3: READ KB FOR CALIBRATION ===
    {severity-calibration.md path}
    {common-false-positives.md path}
    {PATTERNS_INDEX.md path}

    {If .audit/FINAL_REPORT.md exists (SOS audit available):}
    === STEP 4: CROSS-BOUNDARY ANALYSIS ===
    Read .audit/FINAL_REPORT.md — the on-chain audit report.
    Identify on-chain/off-chain combination attack chains where:
    - An on-chain vulnerability is exploitable via off-chain code
    - An off-chain vulnerability undermines on-chain security assumptions
    - Combined on-chain + off-chain findings create a more severe attack path

    {If .bulwark/HANDOVER.md exists (stacked audit):}
    === STEP 5: FINDING EVOLUTION ===
    Read .bulwark/HANDOVER.md. For each current finding, classify:
    - NEW: Not in previous audit
    - RECURRENT: Same finding present in previous audit (same file, same issue)
    - REGRESSION: Was fixed in a previous audit but reappeared (target file was MODIFIED, previous finding had RESOLVED status)
    - RESOLVED: Previous finding no longer present (include in report as positive progress)

    REGRESSION ESCALATION: Any REGRESSION finding gets +1 severity bump
    (LOW → MEDIUM, MEDIUM → HIGH, HIGH → CRITICAL). Document the escalation.

    === OUTPUT ===
    Write the final report to .bulwark/FINAL_REPORT.md
  "
)
```

Do NOT use `run_in_background=true`.

### Step 5: Verify Output

Check `.bulwark/FINAL_REPORT.md` exists and contains:
- Executive Summary
- Severity Breakdown
- Critical/High/Medium/Low findings
- Combination Attack Analysis
- Cross-Boundary Analysis (if SOS available)
- Attack Trees
- Remediation Roadmap

### Step 6: Archive Audit

After report generation, the current `.bulwark/` directory is preserved for `/DB:verify`. Archiving happens at the start of the _next_ audit (Phase -1 of `/DB:scan`).

---

## Update State

```json
{
  "phases": {
    "report": {
      "status": "complete",
      "completed_at": "<ISO-8601>",
      "report_file": ".bulwark/FINAL_REPORT.md"
    }
  }
}
```

---

## Phase Complete

```markdown
---

## Dinh's Bulwark Audit Complete

### Final Report: `.bulwark/FINAL_REPORT.md`

### Executive Summary:
{Extract from report}

### Severity Breakdown:
| Severity | Count |
|----------|-------|
| CRITICAL | {N} |
| HIGH | {N} |
| MEDIUM | {N} |
| LOW | {N} |
| INFO | {N} |

### Top Priority Items:
1. {Top 3 from report}

### Combination Analysis:
- {N} attack chains identified
- Critical fix nodes: {list}

{If SOS cross-boundary analysis performed:}
### Cross-Boundary Chains (On-Chain ↔ Off-Chain):
- {N} cross-boundary attack paths
- {Key chains described}

### All Audit Files:
```
.bulwark/
  ARCHITECTURE.md       — Unified off-chain architecture
  KB_MANIFEST.md        — Knowledge base loading manifest
  STRATEGIES.md         — Attack hypotheses
  COVERAGE.md           — Coverage verification
  FINAL_REPORT.md       — ** THE FINAL AUDIT REPORT **
  STATE.json            — Machine-readable state
  context/              — 8 context analyses
  findings/             — Individual investigations
```

### What's Next?
1. **Review the report** — Read `.bulwark/FINAL_REPORT.md`
2. **Fix vulnerabilities** — Address findings in priority order
3. **Verify fixes** — Run `/DB:verify` after applying fixes
4. **On-chain audit** — If not done, run `/SOS:scan` for Anchor programs

---
```
