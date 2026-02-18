---
name: DB:status
description: "Check audit progress and get guidance on next steps"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Dinh's Bulwark — Status & Progress

Check the current state of an off-chain audit and get guidance on what to do next.

## Step 1: Check for Audit State

```bash
test -f .bulwark/STATE.json && echo "AUDIT_EXISTS" || echo "NO_AUDIT"
```

Also check for history:
```bash
test -d .bulwark-history && ls .bulwark-history/ 2>/dev/null | wc -l
```

### If no audit exists:

If history exists:
```markdown
## No Active Audit

No `.bulwark/STATE.json` found, but {N} previous audit(s) in `.bulwark-history/`.

### Previous Audits:
| # | Directory | Date |
|---|-----------|------|
{For each in .bulwark-history/}

Run `/DB:scan` to begin a new audit.
```

If no history either:
```markdown
## No Dinh's Bulwark Audit Found

No `.bulwark/STATE.json` found in this directory.

### Getting Started:
Run `/DB:scan` to begin a new off-chain security audit.

### Full Audit Pipeline:
| Step | Command | Description |
|------|---------|-------------|
| 1 | `/DB:scan` | Detect components, build index, run static tools |
| 2 | `/DB:analyze` | Deploy selected off-chain auditor agents |
| 3 | `/DB:strategize` | Synthesize findings & generate attack strategies |
| 4 | `/DB:investigate` | Investigate hypotheses in priority batches |
| 5 | `/DB:report` | Generate final report with attack trees |
| 6 | `/DB:verify` | (After fixes) Verify vulnerabilities resolved |

Run `/DB` for a detailed getting-started guide.
```

### If audit exists:

## Step 2: Parse State & Display Dashboard

Read `.bulwark/STATE.json` and display:

```markdown
Dinh's Bulwark — Off-Chain Audit Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{For each phase:}
{✓ complete, ▸ current, ○ pending}

✓ Phase 0   Scan & Index         complete
✓ Phase 1   Context Analysis     {N}/{auditor_count} agents complete
▸ Phase 2+3 Strategize           in progress
○ Phase 4   Investigation        pending
○ Phase 5   Report               pending

Model: Phase 1 ran {models.phase1} | Phase 4 will use {models.investigate}
Tier: {tier} ({loc_estimated} LOC, {files_scanned} files)
Auditors: {auditor_count} selected (of 51 in catalog)

Cross-Skill:
  SOS: {available — on-chain context loaded / not found}
  GL:  {available — spec oracle loaded / not found}
```

## Step 3: Phase-Specific Details

**If investigate is in progress:**
```
Investigation: Batch {batches_completed}/{batches_total}
Results so far: {confirmed} confirmed, {potential} potential
```

**If investigate is complete:**
```
Investigation: {total} strategies investigated
Results: {confirmed} CONFIRMED, {potential} POTENTIAL, {not_vulnerable} NOT VULNERABLE
```

## Step 4: File Verification

Cross-check state against actual files:

```bash
test -f .bulwark/INDEX.md && echo "INDEX: exists" || echo "INDEX: MISSING"
test -f .bulwark/KB_MANIFEST.md && echo "KB_MANIFEST: exists" || echo "KB_MANIFEST: MISSING"
ls .bulwark/context/*.md 2>/dev/null | wc -l
test -f .bulwark/ARCHITECTURE.md && echo "ARCHITECTURE: exists" || echo "ARCHITECTURE: MISSING"
test -f .bulwark/STRATEGIES.md && echo "STRATEGIES: exists" || echo "STRATEGIES: MISSING"
ls .bulwark/findings/*.md 2>/dev/null | wc -l
test -f .bulwark/COVERAGE.md && echo "COVERAGE: exists" || echo "COVERAGE: MISSING"
test -f .bulwark/FINAL_REPORT.md && echo "FINAL_REPORT: exists" || echo "FINAL_REPORT: MISSING"
```

Warn if state says complete but output files are missing.

## Step 5: Route to Next Action

```markdown
Next: {clear instruction with exact command}
```

**Routing table:**

| Current State | Next Action |
|---------------|-------------|
| scan complete | `/clear` then `/DB:analyze` |
| analyze complete | `/clear` then `/DB:strategize` |
| strategize complete | `/clear` then `/DB:investigate` |
| investigate in_progress | `/DB:investigate` (auto-resumes) |
| investigate complete | `/clear` then `/DB:report` |
| report complete | Review `.bulwark/FINAL_REPORT.md`, then `/DB:verify` after fixes |
| all complete | Review report, `/DB:verify` after fixes |
