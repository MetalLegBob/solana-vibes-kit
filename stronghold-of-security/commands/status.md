---
name: SOS:status
description: "Check audit progress and get guidance on next steps"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Stronghold of Security — Status & Progress

Check the current state of an audit and get guidance on what to do next.

## Step 1: Check for Audit State

```bash
test -f .audit/STATE.json && echo "AUDIT_EXISTS" || echo "NO_AUDIT"
```

### If no audit exists:

```markdown
## No Stronghold of Security Audit Found

No `.audit/STATE.json` found in this directory.

### Getting Started:
Run `/SOS:scan` to begin a new security audit.

### Full Audit Pipeline:
| Step | Command | Description |
|------|---------|-------------|
| 1 | `/SOS:scan` | Scan codebase, build index, generate hot-spots map |
| 2 | `/SOS:analyze` | Deploy 8-9 parallel context auditors |
| 3 | `/SOS:strategize` | Synthesize findings & generate attack strategies |
| 4 | `/SOS:investigate` | Investigate hypotheses in priority batches |
| 5 | `/SOS:report` | Generate final report with attack trees |
| 6 | `/SOS:verify` | (After fixes) Verify vulnerabilities resolved |

Run `/stronghold-of-security` for a detailed getting-started guide.
```

### If audit exists:

## Step 2: Parse State & Display Dashboard

Read `.audit/STATE.json` and display the visual dashboard:

```markdown
Stronghold of Security — Audit Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{For each phase, show status icon based on STATE.json:}
{Completed phases: ✓}
{Current phase: ▸}
{Pending phases: ○}

✓ Phase 0   Scan & Index         complete
✓ Phase 1   Context Analysis     {N}/{N} agents complete
▸ Phase 2+3 Strategize           in progress
○ Phase 4   Investigation        pending
○ Phase 5   Report               pending

Model: Phase 1 ran {config.models.phase1} | Phase 4 will use {config.models.investigate}
Tier: {config.tier} ({phases.scan.loc_estimated} LOC, {phases.scan.files_scanned} files)
```

## Step 3: Phase-Specific Details

Based on current phase, show additional info:

**If investigate is in progress:**
```
Investigation: Batch {batches_completed}/{batches_total}, {completed}/{total} strategies investigated
Results so far: {confirmed} confirmed, {potential} potential, {not_vulnerable} not vulnerable
```

**If investigate is complete:**
```
Investigation: {total} strategies investigated
Results: {confirmed} CONFIRMED, {potential} POTENTIAL, {not_vulnerable} NOT VULNERABLE, {manual} MANUAL REVIEW
```

## Step 4: File Verification

Cross-check state against actual files:

```bash
test -f .audit/INDEX.md && echo "INDEX: exists" || echo "INDEX: MISSING"
test -f .audit/KB_MANIFEST.md && echo "KB_MANIFEST: exists" || echo "KB_MANIFEST: MISSING"
test -f .audit/HOT_SPOTS.md && echo "HOT_SPOTS: exists" || echo "HOT_SPOTS: MISSING"
ls .audit/context/*.md 2>/dev/null | wc -l
test -f .audit/ARCHITECTURE.md && echo "ARCHITECTURE: exists" || echo "ARCHITECTURE: MISSING"
test -f .audit/STRATEGIES.md && echo "STRATEGIES: exists" || echo "STRATEGIES: MISSING"
ls .audit/findings/*.md 2>/dev/null | wc -l
test -f .audit/COVERAGE.md && echo "COVERAGE: exists" || echo "COVERAGE: MISSING"
test -f .audit/FINAL_REPORT.md && echo "FINAL_REPORT: exists" || echo "FINAL_REPORT: MISSING"
```

If state says a phase is complete but its output files are missing, warn the user.

## Step 5: Route to Next Action

```markdown
Next: {clear instruction with exact command}
```

**Routing table:**

| Current State | Next Action |
|---------------|-------------|
| scan complete | `/clear` then `/SOS:analyze` |
| analyze complete | `/clear` then `/SOS:strategize` |
| strategize complete | `/clear` then `/SOS:investigate` |
| investigate in_progress | `/SOS:investigate` (auto-resumes) |
| investigate complete | `/clear` then `/SOS:report` |
| report complete | Review `.audit/FINAL_REPORT.md`, then `/SOS:verify` after fixes |
| all complete | Review report, `/SOS:verify` after fixes, or delete `.audit/` to start fresh |
