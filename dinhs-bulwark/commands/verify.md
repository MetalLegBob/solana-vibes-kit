---
name: DB:verify
description: "Verify that fixes for reported vulnerabilities were properly applied"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Dinh's Bulwark — Verification Mode

After fixes are applied to address audit findings, use this command to verify the fixes are effective and no regressions were introduced.

## Prerequisites

1. `.bulwark/FINAL_REPORT.md` must exist (audit must be complete)
2. Developer has applied fixes to the codebase

If no report exists:
```
No audit report found at .bulwark/FINAL_REPORT.md.
Complete an audit first by running the full pipeline:
  /DB:scan → /DB:analyze → /DB:strategize → /DB:investigate → /DB:report
```

---

## Verification Process

### Step 1: Load Existing Report

Read `.bulwark/FINAL_REPORT.md` and extract:
- All CONFIRMED findings (ID, severity, location, description)
- All POTENTIAL findings (ID, severity, location, description)
- Total count of findings to verify

Display:
```
Found {N} findings to verify ({confirmed} CONFIRMED, {potential} POTENTIAL).
Starting verification...
```

### Step 2: Check for Code Changes

For each finding's location, check if the code has been modified:

```bash
git diff --name-only HEAD -- {file_path} 2>/dev/null
```

### Step 3: Spawn Verification Agents

Read `config.models.verify` from `.bulwark/STATE.json` (default: sonnet).

Locate the verification agent template:
```bash
find ~/.claude -name "verification-agent.md" -path "*/dinhs-bulwark/agents/*" 2>/dev/null | head -1
```

For each finding, spawn a verification agent:

```
Task(
  subagent_type="general-purpose",
  model="{config.models.verify}",
  prompt="
    You are verifying an off-chain vulnerability fix for Dinh's Bulwark.

    === READ YOUR INSTRUCTIONS ===
    Read: {VERIFICATION_AGENT_PATH}

    === ORIGINAL FINDING ===
    ID: {finding_id}
    Severity: {severity}
    Status: {CONFIRMED/POTENTIAL}
    Location: {file:lines}
    Description: {description}
    Recommended Fix: {fix description}

    === YOUR TASK ===
    1. Read the current code at the specified location
    2. Determine if the vulnerability has been addressed
    3. Verify the fix is correct and complete
    4. Check for regressions
    5. Check for variant — does the same pattern exist elsewhere?

    === VERIFICATION STATUSES ===
    - FIXED: Vulnerability resolved
    - PARTIALLY_FIXED: Addressed but incomplete
    - NOT_FIXED: Still present
    - REGRESSION: Fix introduced new vulnerability
    - CANNOT_VERIFY: Code restructured, manual review needed

    === OUTPUT ===
    Write to .bulwark/findings/VERIFY-{finding_id}.md
  "
)
```

Batch verification agents (max 5 per response, parallel within batch).

### Step 4: Scan for Regressions

After individual verifications:
- Identify all modified files via git diff
- Run secret scanning patterns on modified files
- Flag any new security concerns in changed code

### Step 5: Generate Verification Report

Read all VERIFY-*.md files and compile `.bulwark/VERIFICATION_REPORT.md`:

```markdown
# Dinh's Bulwark — Verification Report

**Original Audit Date:** {from STATE.json}
**Verification Date:** {now}
**Findings Verified:** {N}

## Summary

| Status | Count |
|--------|-------|
| FIXED | {N} |
| PARTIALLY_FIXED | {N} |
| NOT_FIXED | {N} |
| REGRESSION | {N} |
| CANNOT_VERIFY | {N} |

## Detailed Results

### Fixed
{Brief confirmation per finding}

### Partially Fixed
{What's still missing}

### Not Fixed
{Vulnerability still present}

### Regressions
{New issues introduced}

### Cannot Verify
{Why manual review is needed}

## Regression Scan
{Results of pattern scan on modified files}

## Recommendations
{Priority-ordered actions}
```

---

## Present Results

```markdown
---

## Verification Complete

### Results:
| Status | Count |
|--------|-------|
| FIXED | {N} |
| PARTIALLY_FIXED | {N} |
| NOT_FIXED | {N} |
| REGRESSION | {N} |
| CANNOT_VERIFY | {N} |

### Report: `.bulwark/VERIFICATION_REPORT.md`

{If all fixed:}
All findings have been resolved. Off-chain code addresses all identified vulnerabilities.

{If issues remain:}
### Action Required:
- {N} findings still need attention
- {N} regressions detected
- Review `.bulwark/VERIFICATION_REPORT.md` for details
- After addressing, run `/DB:verify` again.

---
```
