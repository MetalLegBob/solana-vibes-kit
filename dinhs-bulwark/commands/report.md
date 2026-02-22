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

### Step 3: Assess Context Budget (Enforced)

Count total findings content by reading all files in `.bulwark/findings/`:

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
   SOS FINAL_REPORT (if exists): Read, count lines × 3
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

Read `config.models.report` from `.bulwark/STATE.json` (default: opus).

The prompt is **conditional on the mode** determined in Step 3:

**Full Inline Mode (under 80K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Dinh's Bulwark off-chain audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read: {SYNTHESIZER_PATH}

    === STEP 2: READ ALL INPUTS (inline) ===
    All findings are provided inline (NOT_VULNERABLE trimmed to summaries).

    FINDINGS:
    {trimmed_findings_content}

    ARCHITECTURE:
    {architecture_content}

    STRATEGIES:
    {strategies_content}

    COVERAGE:
    {coverage_content_if_exists}

    === STEP 3: READ KB FOR CALIBRATION ===
    {severity-calibration.md path}
    {common-false-positives.md path}
    {PATTERNS_INDEX.md path}

    {If .audit/FINAL_REPORT.md exists:}
    === STEP 4: CROSS-BOUNDARY ANALYSIS ===
    Read .audit/FINAL_REPORT.md — the on-chain audit report.
    Identify on-chain/off-chain combination attack chains.

    {If .bulwark/HANDOVER.md exists:}
    === STEP 5: FINDING EVOLUTION ===
    Read .bulwark/HANDOVER.md. Classify findings as NEW/RECURRENT/REGRESSION/RESOLVED.
    REGRESSION ESCALATION: +1 severity bump for any REGRESSION finding.

    === OUTPUT ===
    Write the final report to .bulwark/FINAL_REPORT.md
  "
)
```

**Partial Disk Mode (80K–120K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Dinh's Bulwark off-chain audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read: {SYNTHESIZER_PATH}

    === STEP 2: READ FINDINGS (inline) ===
    Findings provided inline (NOT_VULNERABLE trimmed to summaries).

    FINDINGS:
    {trimmed_findings_content}

    ARCHITECTURE:
    {architecture_content}

    === STEP 3: READ FROM DISK ===
    These files were too large to include inline:
    - .bulwark/STRATEGIES.md
    - .bulwark/COVERAGE.md (if exists)
    - {severity-calibration.md path}
    - {common-false-positives.md path}
    - {PATTERNS_INDEX.md path}

    {Cross-boundary and finding evolution sections same as full inline mode}

    === OUTPUT ===
    Write the final report to .bulwark/FINAL_REPORT.md
  "
)
```

**Disk-Heavy Mode (over 120K):**
```
Task(
  subagent_type="general-purpose",
  model="{config.models.report}",
  prompt="
    You are the final report synthesizer for Dinh's Bulwark off-chain audit.

    === STEP 1: READ YOUR INSTRUCTIONS ===
    Read: {SYNTHESIZER_PATH}

    === STEP 2: FINDING SUMMARIES (inline — read full details from disk) ===
    {summary_only_findings — ID + status + severity + one-paragraph + location}

    For full finding details, read individual files from: .bulwark/findings/
    Prioritize reading full details for CONFIRMED and high-severity POTENTIAL findings.

    === STEP 3: READ ALL REFERENCE MATERIAL FROM DISK ===
    - .bulwark/ARCHITECTURE.md
    - .bulwark/STRATEGIES.md
    - .bulwark/COVERAGE.md (if exists)
    - {severity-calibration.md path}
    - {common-false-positives.md path}
    - {PATTERNS_INDEX.md path}

    {Cross-boundary and finding evolution sections same as full inline mode}

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
