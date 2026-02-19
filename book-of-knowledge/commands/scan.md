---
name: BOK:scan
description: "Phase 0: Index codebase, identify math-heavy code, check Kani prerequisites"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Book of Knowledge — Phase 0: Scan

You are starting a math verification pipeline using Book of Knowledge.
This phase indexes the codebase, identifies math-heavy regions, and checks for Kani installation.

## What This Phase Does

1. **Prerequisite Check** — Detect Kani installation, offer install or degraded mode
2. **Codebase Indexing** — Signal-based scan for arithmetic and DeFi math patterns
3. **Math Region Identification** — Classify functions by verification category and complexity
4. **Cross-Skill Context** — Check for GL docs and SOS findings to enrich analysis
5. **State Initialization** — Create `.bok/STATE.json` and `.bok/INDEX.md`

---

## Step 1: Initialize State

```bash
mkdir -p .bok
```

Write `.bok/STATE.json`:
```json
{
  "skill": "BOK",
  "version": "1.0.0",
  "updated": "<ISO-8601>",
  "kani_available": false,
  "degraded_mode": false,
  "worktree_path": null,
  "worktree_branch": null,
  "phases": {
    "scan": { "status": "in_progress" },
    "analyze": { "status": "pending" },
    "confirm": { "status": "pending" },
    "generate": { "status": "pending" },
    "execute": { "status": "pending" },
    "report": { "status": "pending" }
  },
  "cross_skill": { "gl_docs": false, "sos_findings": false }
}
```

---

## Step 2: Prerequisite Check — Kani

```bash
command -v cargo-kani >/dev/null 2>&1 && echo "KANI_AVAILABLE" || echo "KANI_NOT_FOUND"
```

**If Kani is available:**
- Update STATE.json: `kani_available: true`
- Report: `Kani detected. Full formal verification available.`

**If Kani is NOT available:**

Present this to the user:

```markdown
### Kani Not Found

Kani is a formal verification tool by AWS that can prove your arithmetic is correct
for ALL possible inputs — not just test cases. It's the strongest verification BOK offers.

**Install Kani:**
\`\`\`bash
cargo install --locked kani-verifier && cargo kani setup
\`\`\`

**Options:**
1. **Install now** — I'll run the install command (takes 2-5 minutes)
2. **Continue without Kani** — BOK will use LiteSVM + Proptest only (stress testing, not formal proof)

Without Kani, BOK can still find bugs via property-based testing, but results are
probabilistic rather than proven. The report will clearly flag this.
```

If user chooses to continue without Kani:
- Update STATE.json: `kani_available: false`, `degraded_mode: true`

If user installs Kani:
- Run the install command, verify with `cargo kani --version`
- Update STATE.json: `kani_available: true`

---

## Step 3: Codebase Indexing — Signal-Based Search

Use Signal-Based Indexing to identify math-heavy code. Search for these signal keywords across all Rust source files (excluding `target/`, `.bok/`):

**Arithmetic operations:**
- `checked_mul`, `checked_add`, `checked_sub`, `checked_div`
- `saturating_mul`, `saturating_add`, `saturating_sub`
- `overflowing_mul`, `overflowing_add`, `overflowing_sub`
- `as u64`, `as u128`, `as i64`, `as i128`
- `try_from`, `try_into`

**Dangerous patterns:**
- `unwrap()` near arithmetic (search for lines with both `unwrap` and arithmetic ops)
- `/` (division), `%` (modulo), `pow`, `sqrt`

**DeFi domain keywords:**
- `fee`, `tax`, `reward`, `stake`, `burn`, `mint`
- `pool`, `reserve`, `price`, `rate`, `ratio`, `share`
- `deposit`, `withdraw`, `swap`, `liquidity`
- `collateral`, `leverage`, `funding`, `premium`
- `basis_point`, `bps`, `decimal`, `precision`
- `truncat`, `round`

For each signal keyword, use Grep in `files_with_matches` mode against `**/*.rs` (excluding `target/`). Collect all matching files and their hit counts.

---

## Step 4: Math Region Identification

For each file with signal hits (sorted by hit count, highest first):

1. **Read the file** — Focus on functions containing signal hits
2. **Extract function boundaries** — Identify `fn` declarations containing math operations
3. **Classify by category** — Map to one of the 19 knowledge base categories:
   - Token swaps, Fee calculations, Staking rewards, Interest/yield, LP share, Price oracle, Bonding curves, Liquidation, Vesting, Auction, Collateral ratios, Vote/governance, Token-2022 fees, Royalty splits, Decimal normalization, Timestamp/duration, Leverage/perpetuals, Randomness/distribution, Bit packing
4. **Estimate complexity:**
   - **Simple arithmetic** — Pure math in a single function, Kani-provable
   - **Multi-account economic** — Involves account balances/state, needs LiteSVM
   - **Cross-program** — CPI-dependent math, needs integration testing

---

## Step 5: Cross-Skill Context

Check for other SVK skill artifacts:

```bash
test -f .docs/STATE.json && echo "GL_DOCS_FOUND" || echo "NO_GL"
test -f .audit/STATE.json && echo "SOS_AUDIT_FOUND" || echo "NO_SOS"
```

**If GL docs found:**
- Read `.docs/STATE.json` to confirm Grand Library completed
- Note which functions/modules have spec documentation
- Update STATE.json: `cross_skill.gl_docs: true`

**If SOS audit found:**
- Read `.audit/STATE.json` to confirm SOS completed
- Check for arithmetic-related findings that BOK should prioritize
- Update STATE.json: `cross_skill.sos_findings: true`

---

## Step 6: Generate Math Region Index

Write `.bok/INDEX.md` with the scan results:

```markdown
# Book of Knowledge — Math Region Index

Generated by /BOK:scan on {date}.

## Summary
- Files scanned: {N}
- Files with math signals: {N}
- Math regions identified: {N}
- Kani available: {yes/no}
- GL docs available: {yes/no}
- SOS findings available: {yes/no}

## Math Regions

### {Category Name}

| Function | File | Complexity | Signal Hits | Has GL Spec | SOS Flagged |
|----------|------|-----------|-------------|-------------|-------------|
| `{fn_name}` | `{path}` | Simple | {N} | {yes/no} | {yes/no} |

{repeat for each category with identified regions}

## Uncategorized

Functions with math signals that don't clearly fit a category:

| Function | File | Signal Hits | Notes |
|----------|------|-------------|-------|
```

---

## Step 7: Update State & Present Results

Update `.bok/STATE.json`:
- `phases.scan.status`: `"complete"`
- `phases.scan.math_regions_found`: {N}
- `phases.scan.files_indexed`: {N}
- `updated`: current ISO-8601 timestamp

Present summary:

```markdown
## Phase 0 Complete — Scan

**Codebase Metrics:**
- Files scanned: {N}
- Math regions identified: {N}
- Categories matched: {list of matched categories}

**Verification Mode:**
- Kani: {available / degraded mode}
- LiteSVM: available (added during generate phase)
- Proptest: available (added during generate phase)

**Cross-Skill Context:**
- GL documentation: {loaded — {N} functions have specs / not found}
- SOS findings: {loaded — {N} arithmetic concerns flagged / not found}

**Output:**
- `.bok/STATE.json` — Audit state
- `.bok/INDEX.md` — Math region index ({N} regions)

### Next Step:
Run `/clear` then `/BOK:analyze` to match regions against verification patterns and propose invariants.
```
