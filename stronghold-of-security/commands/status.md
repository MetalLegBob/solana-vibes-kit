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

Check the current state of a Fortress audit and get guidance on what to do next.

## Step 1: Check for Audit State

Check if an audit is in progress:

```bash
test -f .audit/STATE.json && echo "AUDIT_EXISTS" || echo "NO_AUDIT"
```

### If no audit exists:

```markdown
## No Fortress Audit Found

No `.audit/STATE.json` found in this directory.

### Getting Started:
Run `/SOS:scan` to begin a new security audit.

This will:
1. Analyze your codebase structure and detect protocol patterns
2. Generate a knowledge base manifest tailored to your code
3. Run a static pre-scan to identify hot-spots
4. Set up the audit pipeline for subsequent phases

### Full Audit Pipeline:
| Step | Command | Description |
|------|---------|-------------|
| 1 | `/SOS:scan` | Scan codebase & generate hot-spots map |
| 2 | `/SOS:analyze` | Deploy 10-11 parallel context auditors |
| 3 | `/SOS:strategize` | Synthesize findings & generate attack strategies |
| 4 | `/SOS:investigate` | Investigate hypotheses in priority batches |
| 5 | `/SOS:report` | Generate final report with attack trees |
| 6 | `/SOS:verify` | (After fixes) Verify vulnerabilities resolved |

Run `/stronghold-of-security` for a detailed getting-started guide.
```

### If audit exists:

## Step 2: Parse State

Read `.audit/STATE.json` and determine the current phase.

## Step 3: Display Progress

```markdown
## Stronghold of Security — Audit Status

**Audit ID:** {audit_id}
**Started:** {started_at}
**Tier:** {config.tier}
**Last Updated:** {last_updated}

### Phase Progress:

| Phase | Status | Details |
|-------|--------|---------|
| Scan | {status_icon} | {details — e.g., "42 files, 15K LOC, 23 hot-spots"} |
| Analyze | {status_icon} | {details — e.g., "10/10 agents complete, 890KB output"} |
| Strategize | {status_icon} | {details — e.g., "67 strategies (12 T1, 28 T2, 27 T3)"} |
| Investigate | {status_icon} | {details — e.g., "Batch 3/14, 15/67 complete"} |
| Report | {status_icon} | {details — e.g., "FINAL_REPORT.md generated"} |
```

Status icons:
- Completed: `Completed`
- In Progress: `In Progress`
- Pending: `Pending`

## Step 4: File Verification

Cross-check state against actual files:

```bash
# Verify key files exist
test -f .audit/KB_MANIFEST.md && echo "KB_MANIFEST: exists" || echo "KB_MANIFEST: MISSING"
test -f .audit/HOT_SPOTS.md && echo "HOT_SPOTS: exists" || echo "HOT_SPOTS: MISSING"
ls .audit/context/*.md 2>/dev/null | wc -l  # Context files count
test -f .audit/ARCHITECTURE.md && echo "ARCHITECTURE: exists" || echo "ARCHITECTURE: MISSING"
test -f .audit/STRATEGIES.md && echo "STRATEGIES: exists" || echo "STRATEGIES: MISSING"
ls .audit/findings/*.md 2>/dev/null | wc -l  # Findings count
test -f .audit/COVERAGE.md && echo "COVERAGE: exists" || echo "COVERAGE: MISSING"
test -f .audit/FINAL_REPORT.md && echo "FINAL_REPORT: exists" || echo "FINAL_REPORT: MISSING"
```

If state says a phase is complete but its output files are missing, warn the user.

## Step 5: Route to Next Action

Determine the next incomplete phase and display:

```markdown
### Next Step:
Run **`/clear`** then **`{next_command}`** to {description of what it does}.
(`/clear` gives the next phase a fresh context window — critical for quality.)
```

### If audit is fully complete:

```markdown
### Audit Complete!
All phases have finished. Your report is at `.audit/FINAL_REPORT.md`.

**Options:**
- Review the report: Read `.audit/FINAL_REPORT.md`
- Verify fixes: After applying fixes, run `/SOS:verify`
- Start fresh: Delete `.audit/` and run `/SOS:scan`
```

### If investigation is in progress (partial):

```markdown
### Investigation In Progress
Phase 4 was interrupted. {completed}/{total} strategies investigated.

**Resume:** Run `/SOS:investigate` — it will automatically pick up from Batch {next_batch}.
```
