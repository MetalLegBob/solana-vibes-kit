# Verification Report Template

Use this template structure when generating the final BOK verification report.

## Template Structure

```markdown
# Book of Knowledge — Verification Report

**Date:** {YYYY-MM-DD}
**Project:** {project_name}
**Verification Mode:** {Full (Kani + LiteSVM + Proptest) / Degraded (LiteSVM + Proptest only)}
**BOK Version:** {version from STATE.json}

---

## 1. Executive Summary

**Overall Assurance Level:** {Formally Proven / Stress-Tested / Partial / Critical Failures}

{2-3 sentence summary of findings. Be direct — lead with the most important result.}

| Metric | Count |
|--------|-------|
| Functions analyzed | {N} |
| Properties verified | {N} |
| Formally proven (Kani) | {N} |
| Stress-tested (Proptest + LiteSVM) | {N} |
| **Violations found** | **{N}** |
| Inconclusive | {N} |

{If degraded mode:}
> ⚠ **Degraded Mode:** This verification ran without Kani. Results marked as "stress-tested"
> are probabilistic — they passed 10,000+ random inputs but are NOT formally proven for ALL
> possible inputs. Install Kani (`cargo install --locked kani-verifier && cargo kani setup`)
> and re-run for mathematical certainty.

{If cross-skill context was used:}
> **Cross-Skill Context:** {GL specs were used to validate intended behavior / SOS findings
> informed priority ordering / Both GL and SOS context enhanced this analysis}

---

## 2. Per-Function Findings

{For each function that was verified, sorted by severity of findings}

### {function_name}

**File:** `{file_path}:{line_range}`
**Category:** {math category}
**Complexity:** {simple arithmetic / multi-account economic / cross-program}

| # | Property | Tool | Result | Details |
|---|----------|------|--------|---------|
| 1 | {description} | Kani | ✅ PROVEN | Verified for all inputs |
| 2 | {description} | Proptest | ✅ PASSED | 10,000 iterations |
| 3 | {description} | LiteSVM | ✅ PASSED | Runtime verified |
| 4 | {description} | Kani | ❌ FAILED | Counterexample found |
| 5 | {description} | Proptest | ⚠ INCONCLUSIVE | Timeout at 60s |

{Brief commentary on this function's verification status}

---

## 3. Failed Verifications

{For each failure, in severity order}

### F-{N}: {Short Description}

**Function:** `{function_name}` in `{file_path}:{line}`
**Severity:** {🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low}
**Tool:** {Kani / Proptest / LiteSVM}
**Pattern:** {VP-NNN if matched, or "Novel"}

#### What Failed

{Plain English — 2-3 sentences. What property was violated and why it matters.}

#### Counterexample

| Input | Value |
|-------|-------|
| {param_name} | {value} |
| {param_name} | {value} |

#### Step-by-Step Trace

1. Given inputs: {values}
2. At line {N}: {calculation} = {intermediate_value}
3. At line {N}: {what goes wrong}
4. Expected: {expected_outcome}
5. Actual: {actual_outcome}
6. **Violation:** {which property is broken and by how much}

#### Exploit Scenario

{How an attacker would exploit this in practice. Be specific about the attack mechanism,
required capital/setup, and expected profit/damage.}

#### Suggested Fix

```rust
// ❌ Before (vulnerable):
{problematic_code}

// ✅ After (fixed):
{fixed_code}
```

**Why this fix works:** {Explanation}

**Effort:** {Low — 1-2 lines / Medium — function refactor / High — architecture change}

---

## 4. Assurance Map

Visual coverage table — shows every verified property and its assurance level.

| Function | Overflow | Precision | Conservation | Rounding | Economic | Other |
|----------|----------|-----------|--------------|----------|----------|-------|
| {fn_1} | ✅ Proven | ✅ Proven | ✅ Tested | ✅ Proven | — | — |
| {fn_2} | ✅ Proven | ❌ Failed | — | ✅ Tested | ✅ Tested | — |
| {fn_3} | ⚠ Inc. | ✅ Tested | ✅ Tested | ✅ Tested | ✅ Tested | ✅ Tested |

**Legend:**
- ✅ Proven — Kani formal proof (all inputs)
- ✅ Tested — Proptest/LiteSVM passed (10,000+ random inputs)
- ❌ Failed — Violation found
- ⚠ Inc. — Inconclusive (timeout or error)
- — — Not applicable for this function

---

## 5. Recommendations

{Prioritized action list}

| # | Action | Severity | Effort | Function | Finding |
|---|--------|----------|--------|----------|---------|
| 1 | {description} | 🔴 Critical | Low | `{fn}` | F-{N} |
| 2 | {description} | 🟠 High | Medium | `{fn}` | F-{N} |
| 3 | {description} | 🟡 Medium | Low | `{fn}` | F-{N} |

### Quick Wins
{Actions that are low effort + high impact}

### Architecture Improvements
{Larger changes that would improve overall math safety}

---

## 6. Test Merge Guide

| Category | Files | Ongoing Value | Recommendation | Notes |
|----------|-------|--------------|----------------|-------|
| Kani harnesses | {N} | Formal proof on every commit | **Merge** | Run with `cargo kani` |
| LiteSVM tests | {N} | CI regression testing | **Merge** | Needs program binary |
| Proptest suites | {N} | Fast sanity checking | **Merge** | Runs with `cargo test` |

**Maintenance notes:**
- Kani harnesses: Update unwind bounds if function complexity changes
- LiteSVM tests: Rebuild program binary after changes (`anchor build`)
- Proptest suites: No maintenance needed — self-contained

---

*Generated by Book of Knowledge v{version}*
*Verification mode: {mode}*
```

## Report Quality Rules

1. **Lead with findings** — Don't bury failures under passing results
2. **Be specific** — Counterexamples, line numbers, concrete values
3. **Be educational** — Explain WHY each property matters
4. **Be actionable** — Every failure gets a fix suggestion with code
5. **Be honest about limitations** — Clearly distinguish proven vs stress-tested
6. **Quantify everything** — Counts, percentages, iteration numbers
