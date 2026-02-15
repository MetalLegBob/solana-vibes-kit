---
name: SOS:verify
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

# Stronghold of Security — Verification Mode

After fixes are applied to address audit findings, use this command to verify the fixes are effective and no regressions were introduced.

## Prerequisites

1. `.audit/FINAL_REPORT.md` must exist (audit must be complete)
2. Developer has applied fixes to the codebase

If no report exists:
```
No audit report found at .audit/FINAL_REPORT.md.
Complete an audit first by running the full pipeline:
  /SOS:scan → /SOS:analyze → /SOS:strategize → /SOS:investigate → /SOS:report
```

---

## Verification Process

### Step 1: Load Existing Report

Read `.audit/FINAL_REPORT.md` and extract:
- All CONFIRMED findings (ID, severity, location, description)
- All POTENTIAL findings (ID, severity, location, description)
- Total count of findings to verify

Display to user:
```
Found {N} findings to verify ({confirmed} CONFIRMED, {potential} POTENTIAL).
Starting verification...
```

### Step 2: Check for Code Changes

For each finding's location, check if the code has been modified:

```bash
# If in a git repo, check for changes since the audit
git diff --name-only HEAD -- {file_path} 2>/dev/null
```

### Step 3: Re-Investigate Each Finding

For each CONFIRMED and POTENTIAL finding, spawn a verification agent:

```
Task(
  subagent_type="general-purpose",
  prompt="
    You are verifying whether a previously-identified vulnerability has been fixed.

    === ORIGINAL FINDING ===
    ID: {finding_id}
    Severity: {severity}
    Status: {CONFIRMED/POTENTIAL}
    Location: {file:lines}
    Description: {description}
    Recommended Fix: {fix description}

    === YOUR TASK ===
    1. Read the current code at the specified location
    2. Determine if the code has changed to address the vulnerability
    3. If changed, verify the fix is correct and complete
    4. Check for regressions (did the fix introduce new issues?)
    5. Assign a verification status

    === VERIFICATION STATUSES ===
    - FIXED: Vulnerability no longer exists, proper fix applied
    - PARTIALLY_FIXED: Issue addressed but not completely, or fix has gaps
    - NOT_FIXED: Vulnerability still present in code
    - REGRESSION: Fix introduced a new vulnerability
    - CANNOT_VERIFY: Code structure changed significantly, manual review needed

    === OUTPUT ===
    Write to .audit/findings/VERIFY-{finding_id}.md:

    # Verification: {finding_id}

    **Original Severity:** {severity}
    **Verification Status:** {status}

    ## Changes Found
    {What changed in the code}

    ## Verification Analysis
    {Why the fix is sufficient/insufficient}

    ## Regression Check
    {Any new issues introduced by the fix}
  "
)
```

Spawn all verification agents for a batch in a **single response** using multiple Task() calls — they run in parallel as foreground agents. Do NOT use `run_in_background=true` — background agents cannot get permission to write files.

### Step 4: Scan for Regressions

After individual verifications complete, do a quick regression scan:
- Identify all files that were modified (via git diff)
- Run Phase 0.5 grep patterns on modified files only
- Flag any new hot-spots in modified code

### Step 5: Generate Verification Report

Read all VERIFY-*.md files and compile the verification report.

Write `.audit/VERIFICATION_REPORT.md`:

```markdown
# Stronghold of Security — Verification Report

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

## Verification Results

| ID | Original Severity | Status | Notes |
|----|-------------------|--------|-------|
| {ID} | {severity} | {status icon} {status} | {brief note} |

## Detailed Results

### Fixed
{For each FIXED finding: brief confirmation}

### Partially Fixed
{For each: what's still missing}

### Not Fixed
{For each: vulnerability still present, original description}

### Regressions
{For each: what new issue was introduced}

### Cannot Verify
{For each: why manual review is needed}

## Regression Scan
{Results of grep pattern scan on modified files}

## Recommendations
{Priority-ordered actions based on verification results}
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

### Report: `.audit/VERIFICATION_REPORT.md`

{If all fixed:}
All findings have been successfully resolved. The codebase addresses all identified vulnerabilities.

{If issues remain:}
### Action Required:
- {N} findings still need attention (NOT_FIXED + PARTIALLY_FIXED)
- {N} regressions detected — new issues introduced by fixes
- Review `.audit/VERIFICATION_REPORT.md` for details

After addressing remaining issues, run `/SOS:verify` again.

---
```
