# Audit Handover

**Generated:** {TIMESTAMP}
**Current Audit:** #{AUDIT_NUMBER}
**Previous Audit:** #{PREV_AUDIT_NUMBER} — {PREV_DATE} @ {PREV_GIT_REF}

---

<!-- DELTA_SUMMARY_START -->
## Delta Summary

**Previous ref:** `{PREV_GIT_REF}`
**Current ref:** `{CURRENT_GIT_REF}`
**Files changed:** {N_MODIFIED} modified, {N_NEW} new, {N_DELETED} deleted, {N_UNCHANGED} unchanged

| File | Status | Magnitude | Notes |
|------|--------|-----------|-------|
| `{path}` | NEW | — | First appearance |
| `{path}` | MODIFIED | major/minor | {N} lines changed |
| `{path}` | UNCHANGED | — | Identical to previous audit |
| `{path}` | DELETED | — | Removed since previous audit |

### Massive Rewrite Detection

{If >70% files changed: "⚠ MASSIVE REWRITE DETECTED — >70% of files changed. Verification agents will be skipped. This audit runs essentially fresh but carries forward the findings digest for evolution tracking."}

{If <=70%: "Normal delta — verification agents will run on unchanged code."}
<!-- DELTA_SUMMARY_END -->

---

<!-- FINDINGS_DIGEST_START -->
## Previous Findings Digest

**Source:** `.audit-history/{PREV_DIR}/FINAL_REPORT.md`

### CONFIRMED Findings

| ID | Title | Severity | File | Relevance |
|----|-------|----------|------|-----------|
| {ID} | {Title} | {CRITICAL/HIGH/MEDIUM/LOW} | `{file}` | {RECHECK / VERIFY / RESOLVED_BY_REMOVAL} |

### POTENTIAL Findings

| ID | Title | Severity | File | Relevance |
|----|-------|----------|------|-----------|
| {ID} | {Title} | {CRITICAL/HIGH/MEDIUM/LOW} | `{file}` | {RECHECK / VERIFY / RESOLVED_BY_REMOVAL} |

### Relevance Tags

- **RECHECK** — Finding is in a MODIFIED file. Fix may have landed, or change may have made it worse. High-priority investigation target.
- **VERIFY** — Finding is in an UNCHANGED file. Lighter pass to confirm it still holds given changes elsewhere.
- **RESOLVED_BY_REMOVAL** — Finding was in a DELETED file. No longer applicable.
<!-- FINDINGS_DIGEST_END -->

---

<!-- FALSE_POSITIVE_LOG_START -->
## Previous False Positive Log

Hypotheses from the previous audit that were investigated and classified NOT_VULNERABLE. Grouped by file. Entries targeting MODIFIED files have been dropped (the dismissal no longer applies when code changes).

| Hypothesis ID | File | One-Line Description | Dismissal Reason |
|---------------|------|---------------------|------------------|
| {H_ID} | `{file}` (UNCHANGED) | {description} | {reason} |

**Token budget:** ~{N} entries, ~{estimated_tokens} tokens
<!-- FALSE_POSITIVE_LOG_END -->

---

<!-- ARCHITECTURE_SNAPSHOT_START -->
## Architecture Snapshot

Condensed version of the previous audit's architectural understanding. Phase 2 will verify these still hold against the current codebase.

### Key Trust Boundaries

{3-5 bullet points from previous ARCHITECTURE.md}

### Critical Invariants

{Top 5-10 invariants from previous audit, with enforcement status}

### Data Flow Assertions

{2-3 key data flow descriptions from previous audit}
<!-- ARCHITECTURE_SNAPSHOT_END -->

---

<!-- AUDIT_LINEAGE_START -->
## Audit Lineage

| # | Date | Git Ref | Confirmed | Potential | Files Scanned |
|---|------|---------|-----------|-----------|---------------|
| 1 | {date} | `{ref}` | {N} | {N} | {N} |
| 2 | {date} | `{ref}` | {N} | {N} | {N} |
| ... | ... | ... | ... | ... | ... |
| {current} | {today} | `{HEAD}` | — | — | — |
<!-- AUDIT_LINEAGE_END -->

---

**End of Handover**
