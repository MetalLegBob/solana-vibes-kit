---
name: DB:scan
description: "Phase 0+0.5: Auto-detect project components, run static tools, build index, check for SOS/GL artifacts"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Dinh's Bulwark — Phase 0 + 0.5: Scan & Pre-Scan

You are starting a comprehensive off-chain security audit using the Dinh's Bulwark pipeline.
This command performs initial component detection and static pre-analysis for all off-chain code.

## What This Phase Does

1. **Phase 0: Component Detection** — Identify project frameworks, languages, and configuration
2. **Phase 0.5: Static Pre-Scan** — Run available static tools and build a hot-spots map

## Arguments

Parse any arguments from the user's message:
- `--tier <quick|standard|deep>` — Override auto-detected tier
- `--batch-size <N>` — Set investigation batch size (default: 5)
- `--strategy-count <N>` — Target strategy count (default: auto per tier)

If no arguments provided, use auto-detection for all settings.

---

## Scope Boundary Check

**CRITICAL:** Before anything else, check for on-chain programs:

```bash
test -f Anchor.toml && echo "ANCHOR_DETECTED" || echo "NO_ANCHOR"
ls programs/*/src/lib.rs 2>/dev/null && echo "PROGRAMS_FOUND" || echo "NO_PROGRAMS"
```

If Anchor/on-chain programs are detected:
```
Note: On-chain Anchor programs detected in programs/.
These are OUT OF SCOPE for Dinh's Bulwark — run /SOS:scan for on-chain audit.
DB will focus exclusively on off-chain code.
```

---

## Phase -1: Archive Detection & Handover Generation

**When:** Always runs first, before any codebase analysis.
**Goal:** Check for a previous audit. If found, archive it, compute what changed, and generate a handover document that enables audit stacking.

### Step 1: Check for Previous Audit

```bash
test -f .bulwark/STATE.json && echo "PREVIOUS_AUDIT_EXISTS" || echo "NO_PREVIOUS_AUDIT"
```

**If NO_PREVIOUS_AUDIT:** Skip to Phase 0. First-time users see zero behavior change.

**If PREVIOUS_AUDIT_EXISTS:**

### Step 2: Validate Previous Audit Completeness

Read `.bulwark/STATE.json`. Check `phases.report.status`.

If the previous audit is **not** complete (e.g., abandoned mid-pipeline):
```
⚠ Incomplete audit detected in .bulwark/ (stopped at {last_completed_phase}).
This audit will be archived as-is. Findings from incomplete audits are not
carried forward in the handover.
```
Archive it anyway but skip handover generation (no FINAL_REPORT.md to extract findings from).

### Step 3: Read Previous Audit Metadata

From `.bulwark/STATE.json`, extract:
- `audit_number`
- `updated` (last state change timestamp)
- `config.tier`
- `phases.scan.files_scanned`
- `phases.scan.loc_estimated`

Get the git ref at the time of the previous audit:
```bash
# Get the commit hash from when the audit state was last updated
PREV_REF=$(git log --format="%H" -1 --before="{updated}" 2>/dev/null || git rev-parse HEAD)
```

If `phases.report.status === "complete"`, also extract findings summary from `.bulwark/FINAL_REPORT.md`:
- Count of CONFIRMED findings
- Count of POTENTIAL findings

### Step 4: Archive the Previous Audit

```bash
PREV_DATE=$(date -u +"%Y-%m-%d")
SHORT_HASH=$(echo "$PREV_REF" | cut -c1-7)
ARCHIVE_DIR=".bulwark-history/${PREV_DATE}-${SHORT_HASH}"
mkdir -p .bulwark-history
mv .bulwark "$ARCHIVE_DIR"
```

Report: `Previous Audit Archived → ${ARCHIVE_DIR}`

### Step 5: Compute Delta

```bash
# Compute what changed since previous audit
git diff --name-status "${PREV_REF}..HEAD" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.rs' '*.json' '*.yml' '*.yaml' '*.toml' 'Dockerfile*' '.env*' 2>/dev/null
```

Parse the git diff output to categorize each file:
- `A` (added) → `NEW`
- `M` (modified) → `MODIFIED`
- `D` (deleted) → `DELETED`
- Files in the previous INDEX.md that don't appear in the diff → `UNCHANGED`

For MODIFIED files, estimate magnitude:
```bash
# For each modified file, count changed lines
git diff --stat "${PREV_REF}..HEAD" -- "{file}" 2>/dev/null
```
- `minor`: < 10 lines changed
- `major`: >= 10 lines changed

### Step 6: Massive Rewrite Detection

Count total source files (from previous INDEX.md or current filesystem).
If MODIFIED + NEW > 70% of total files → flag as **massive rewrite**.

Massive rewrite implications:
- Verification agents will be **skipped** in Phase 1 (stale context, not worth verifying)
- Audit runs essentially fresh but carries forward findings digest for evolution tracking
- False positive log is not generated (all dismissals potentially invalid)

### Step 7: Generate HANDOVER.md

**Only if previous audit was complete** (`phases.report.status === "complete"`):

Create a fresh `.bulwark/` directory:
```bash
mkdir -p .bulwark/{context,findings}
```

Read the HANDOVER.md template from the skill:
```bash
find ~/.claude -name "HANDOVER.md" -path "*/dinhs-bulwark/templates/*" 2>/dev/null | head -1
```

Generate `.bulwark/HANDOVER.md` by filling the template:

**Delta Summary section:**
- Build the file status table from Step 5 results
- Include massive rewrite flag if triggered

**Previous Findings Digest section:**
- Read `{ARCHIVE_DIR}/FINAL_REPORT.md`
- Extract all CONFIRMED and POTENTIAL findings
- For each finding, check its file against the delta:
  - File is MODIFIED → tag: `RECHECK`
  - File is UNCHANGED → tag: `VERIFY`
  - File is DELETED → tag: `RESOLVED_BY_REMOVAL`

**Previous False Positive Log section:**
- Read all `{ARCHIVE_DIR}/findings/*.md` files
- Collect hypotheses where the finding status is `NOT_VULNERABLE`
- For each, check the target file against the delta:
  - File is UNCHANGED → retain (include in log)
  - File is MODIFIED or DELETED → drop (dismissal no longer applies)

**Architecture Snapshot section:**
- Read `{ARCHIVE_DIR}/ARCHITECTURE.md`
- Condense to ~1-2K tokens: trust zones, top 5-10 invariants, key data flow assertions, on-chain/off-chain interface summary

**Audit Lineage section:**
- If the archived STATE.json has `previous_audit` field, follow the chain to build full lineage
- Add one row per previous audit: number, date, git ref, confirmed count, potential count, files scanned
- Add current audit as latest entry (with "—" for counts since it hasn't run yet)

### Step 8: Display Handover Summary

```markdown
### Previous Audit Detected

Audit #{N} — {date} @ commit {short_hash}
Found: {confirmed} confirmed, {potential} potential, {files_scanned} files scanned
Since then: {N_MODIFIED} files modified, {N_NEW} new files, {N_DELETED} deleted
{If massive rewrite: "⚠ MASSIVE REWRITE — >70% files changed. Running fresh audit with evolution tracking."}

Handover generated: `.bulwark/HANDOVER.md`
  - {N} findings to RECHECK (modified files)
  - {N} findings to VERIFY (unchanged files)
  - {N} findings RESOLVED_BY_REMOVAL
  - {N} false positive dismissals carried forward
```

---

## Phase 0: Component Detection

### Step 1: Initialize State

Create `.bulwark/` directory and STATE.json:

```bash
mkdir -p .bulwark/{context,findings}
```

Write `.bulwark/STATE.json`:
```json
{
  "skill": "dinhs-bulwark",
  "version": "1.0.0",
  "updated": "<ISO-8601>",
  "audit_number": 1,
  "config": {
    "tier": "standard",
    "models": {
      "index": "haiku",
      "phase1": "sonnet",
      "quality_gate": "haiku",
      "strategize": "opus",
      "investigate": "sonnet",
      "investigate_tier3": "haiku",
      "coverage": "sonnet",
      "report": "opus",
      "verify": "sonnet"
    }
  },
  "phases": {
    "scan": { "status": "in_progress" },
    "analyze": { "status": "pending" },
    "strategize": { "status": "pending" },
    "investigate": { "status": "pending" },
    "report": { "status": "pending" },
    "verify": { "status": "pending" }
  }
}
```

### Step 2: Detect Project Components

Scan the codebase for off-chain technology indicators:

**Node.js / TypeScript:**
```bash
test -f package.json && echo "NODEJS: package.json"
test -f yarn.lock && echo "NODEJS: yarn.lock"
test -f pnpm-lock.yaml && echo "NODEJS: pnpm-lock.yaml"
test -f tsconfig.json && echo "TYPESCRIPT: tsconfig.json"
```

**Python:**
```bash
test -f requirements.txt && echo "PYTHON: requirements.txt"
test -f pyproject.toml && echo "PYTHON: pyproject.toml"
test -f Pipfile && echo "PYTHON: Pipfile"
```

**Rust (non-Anchor):**
```bash
# Rust utilities, bots, or CLI tools (not Anchor programs)
find . -name "Cargo.toml" -not -path "*/programs/*" -not -path "*/target/*" 2>/dev/null
```

**Framework Detection:**
- `next.config.*` or `app/` + `pages/` → Next.js
- Express route patterns (`app.get`, `app.post`, `router.`) → Express
- FastAPI decorators (`@app.get`, `@app.post`) → FastAPI
- `nuxt.config.*` → Nuxt
- `vite.config.*` → Vite/React SPA

**Infrastructure:**
```bash
test -f Dockerfile && echo "DOCKER: Dockerfile"
test -f docker-compose.yml && echo "DOCKER: docker-compose.yml"
test -d .github/workflows && echo "CI: GitHub Actions"
```

**Environment / Config:**
```bash
ls .env .env.* .env.example 2>/dev/null
```

**Count source files and estimate LOC:**
```bash
find . -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.py' -o -name '*.rs' \
  -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/.bulwark/*' -not -path '*/dist/*' | wc -l
find . \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.py' -o -name '*.rs' \) \
  -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/.bulwark/*' -not -path '*/dist/*' \
  -exec cat {} + 2>/dev/null | wc -l
```

**Identify application patterns by grepping for:**
- Trading/DeFi bots: `swap`, `trade`, `slippage`, `arbitrage`, `liquidat`
- Keepers/Cranks: `crank`, `keeper`, `cron`, `scheduler`, `interval`
- API/Backend: `express`, `fastapi`, `router`, `middleware`, `endpoint`
- Wallet integration: `wallet`, `signTransaction`, `sendTransaction`, `phantom`
- RPC/Indexer: `getAccountInfo`, `getProgramAccounts`, `websocket`, `subscribe`
- Webhooks: `webhook`, `callback`, `signature verification`

### Step 3: Check for SOS/GL Artifacts

```bash
test -d .audit && echo "SOS_ARTIFACTS_FOUND" || echo "NO_SOS"
test -d .docs && echo "GL_ARTIFACTS_FOUND" || echo "NO_GL"
```

**If SOS artifacts found:** Read `.audit/ARCHITECTURE.md` summary for cross-skill context. Note trust boundaries and on-chain assumptions that off-chain code must respect.

**If GL docs found:** Read `.docs/` as spec oracle. Note intended behaviors that implementations should match.

Store in STATE.json:
```json
"cross_skill": {
  "sos_available": true,
  "gl_available": false
}
```

### Step 4: Auto-Detect Tier

- `quick`: < 10 source files OR < 2,000 LOC
- `standard`: 10-50 files OR 2,000-20,000 LOC
- `deep`: > 50 files OR > 20,000 LOC OR complex multi-service architecture

### Step 5: Auditor Selection (Dynamic Catalog)

**Load the auditor catalog:**
```bash
find ~/.claude -name "auditor-catalog.md" -path "*/dinhs-bulwark/resources/*" 2>/dev/null | head -1
```

Read the catalog. For each of the 51 auditor definitions, run their **trigger patterns** against the codebase using Grep (files_with_matches mode, limiting to source files). Count how many distinct triggers matched per auditor.

**Selection algorithm:**
1. **Always-select auditors** (SEC-02, ERR-01, DEP-01, DATA-04, LOGIC-02) are pre-included regardless of triggers
2. For all other auditors, count trigger matches
3. Auditors with >= 1 trigger match are candidates
4. Rank candidates by trigger match count (descending)
5. Apply tier budget:
   - `quick`: Core 5 + top candidates until 8-10 total
   - `standard`: Core 5 + all candidates with >= 2 trigger matches, up to 20 total
   - `deep`: ALL matched candidates (no cap — can be 30+)

**Store selected auditors in STATE.json:**
```json
{
  "config": {
    "selected_auditors": [
      { "id": "SEC-01", "name": "Private Key & Wallet Security", "trigger_matches": 12 },
      { "id": "SEC-02", "name": "Secret & Credential Management", "trigger_matches": 8, "always_select": true }
    ],
    "auditor_count": 16
  }
}
```

### Step 6: Present Component Map & Auditor Selection

Display detected components and the auditor selection for confirmation:

```markdown
## Pre-Flight Analysis Complete

**Codebase Metrics:**
- Source files: {N}
- Estimated LOC: ~{N}
- Languages: {detected}
- Frameworks: {detected}

**Detected Components:**
- [x/] Backend API ({framework})
- [x/] Frontend dApp ({framework})
- [x/] Trading bot / automation
- [x/] Infrastructure (Docker, CI/CD)
- [x/] Wallet integration
- [x/] RPC / indexer

**Cross-Skill Context:**
- SOS audit: {available / not found}
- GL documentation: {available / not found}

**Recommended Configuration:**
- Tier: {tier}

**Selected Auditors ({N} of 51 in catalog):**

| # | ID | Auditor | Triggers | Source |
|---|-----|---------|----------|--------|
| 1 | SEC-01 | Private Key & Wallet Security | 12 | auto |
| 2 | SEC-02 | Secret & Credential Management | 8 | always |
| 3 | AUTH-01 | Authentication Mechanisms | 15 | auto |
| ... | ... | ... | ... | ... |

**Not selected** (add any with `+ID`):
{List unmatched auditors, grouped by category}

Adjust selection? [proceed / +ADD_ID / -REMOVE_ID / customize]
```

Wait for user confirmation. They can add (`+CHAIN-05`) or remove (`-FE-03`) auditors.

### Step 7: Model Selection for Phase 1

After auditor confirmation, present model selection:

```markdown
### Phase 1 Model Selection

Phase 1 deploys **{N} auditor agents**, each analyzing the codebase through a specialized security lens.

  → **Opus** (recommended for deep tier): Maximum novel discovery.
  → **Sonnet**: Strong structured analysis. ~50-60% cheaper.
```

Store choice in STATE.json under `config.models.phase1`.

---

## Phase 0.5: Static Pre-Scan

### Step 1: Run Available Static Tools

Only run tools that are already installed. Never force installation.

**Dependency audit (Node.js):**
```bash
command -v npm >/dev/null 2>&1 && npm audit --json 2>/dev/null | head -100
command -v yarn >/dev/null 2>&1 && yarn audit --json 2>/dev/null | head -100
```

**Dependency audit (Python):**
```bash
command -v pip-audit >/dev/null 2>&1 && pip-audit --format=json 2>/dev/null | head -100
```

**Secret scanning:**
```bash
# Check for obvious secrets in tracked files
git ls-files | xargs grep -l 'PRIVATE_KEY\|private_key\|mnemonic\|secret_key\|SECRET_KEY' 2>/dev/null
# Check .env files not in .gitignore
git ls-files --cached -- '.env*' 2>/dev/null
```

**Semgrep (if available):**
```bash
command -v semgrep >/dev/null 2>&1 && semgrep --config=auto --json . 2>/dev/null | head -200
```

### Step 2: Build Index

Spawn a Haiku agent to generate `.bulwark/INDEX.md`:

```
Task(
  subagent_type="general-purpose",
  model="haiku",
  prompt="
    Build a structured index of all off-chain source files.

    Scan ALL source files (*.ts, *.tsx, *.js, *.jsx, *.py, *.rs — excluding
    node_modules, target, dist, .bulwark).

    For each file, extract:
    - Path
    - Language
    - Purpose (1-line)
    - Exports/entry points
    - Focus area tags (from the selected auditor IDs: SEC-01, AUTH-01, INJ-01, etc.)
    - Risk markers (sensitive operations, external calls, user input handling)

    Write to .bulwark/INDEX.md with:
    - Summary section (file count, LOC by language)
    - Per-file entries sorted by risk marker count (highest first)
    - Focus area cross-reference table
  "
)
```

### Step 3: Generate KB Manifest

Write `.bulwark/KB_MANIFEST.md` listing which knowledge base patterns are relevant per component:

```markdown
# KB-MANIFEST

Generated by Phase 0 on {date}.

## Detected Configuration
- **Languages:** {list}
- **Frameworks:** {list}
- **Tier:** {tier}
- **Components:** {list}
- **Selected Auditors:** {N}

## Phase 1 Agents (Context Building)

Each agent loads its focus manifest from the knowledge base:

| # | Agent ID | Focus Manifest |
|---|----------|---------------|
{For each selected auditor:}
| {N} | {ID} | knowledge-base/focus-manifests/{id-slug}.md |

### All agents also load:
- knowledge-base/core/common-false-positives.md
- knowledge-base/core/secure-patterns.md
- knowledge-base/core/severity-calibration.md

### AI Pitfalls (per agent):
- Each agent loads knowledge-base/ai-pitfalls/{category-slug}.md for its domain
- Categories map: SEC→secrets, AUTH→auth, INJ→injection, WEB→web,
  CHAIN→blockchain, API→api, DATA→data, FE→frontend, INFRA→infra,
  DEP→supply-chain, BOT→automation, ERR→error-handling, CRYPTO→crypto,
  LOGIC→business-logic
```

### Step 4: Build HOT_SPOTS Map

For each selected auditor, run its trigger patterns from the catalog against the codebase. Build a per-auditor map of which files had the most trigger hits — these are the "hot spots" that deserve the deepest scrutiny.

```
For each selected_auditor in STATE.json:
  1. Read auditor's trigger patterns from auditor-catalog.md
  2. Run each trigger pattern via Grep (files_with_matches mode)
  3. Count matches per file
  4. Build ranked file list (highest match count first)
```

Write `.bulwark/HOT_SPOTS.md`:

```markdown
# Hot Spots Map

Generated by Phase 0.5 on {date}.

## Per-Auditor Hot Files

### {AUDITOR_ID}: {Auditor Name}

| File | Trigger Hits | Matched Patterns |
|------|-------------|------------------|
| `{path}` | {N} | `{pattern1}`, `{pattern2}` |
| `{path}` | {N} | `{pattern1}` |

{repeat for each selected auditor}

## Global Hot Files (All Auditors Combined)

Files ranked by total trigger hits across all auditors. These files sit at
security-critical intersections and warrant cross-auditor attention.

| File | Total Hits | Auditors Interested |
|------|-----------|-------------------|
| `{path}` | {N} | SEC-01, AUTH-01, INJ-02 |
| `{path}` | {N} | DATA-01, ERR-01 |
```

Each Phase 1 auditor agent receives its section of HOT_SPOTS.md so it knows where to focus deepest analysis.

### Step 5: Update State

Update `.bulwark/STATE.json`:

If this is a **stacked audit** (Phase -1 found a previous audit), include stacking metadata:

```json
{
  "phases": {
    "scan": {
      "status": "complete",
      "completed_at": "<ISO-8601>",
      "files_scanned": {N},
      "loc_estimated": {N}
    }
  },
  "stacking": {
    "is_stacked": true,
    "handover_generated": true,
    "massive_rewrite": false,
    "delta": {
      "modified": {N},
      "new": {N},
      "deleted": {N},
      "unchanged": {N}
    }
  },
  "previous_audit": {
    "audit_number": {N},
    "date": "{date}",
    "git_ref": "{PREV_REF}",
    "archive_path": "{ARCHIVE_DIR}",
    "confirmed_count": {N},
    "potential_count": {N}
  }
}
```

For **first-time audits**, `stacking.is_stacked` is `false` and `previous_audit` is `null`.

---

## Phase Complete — Present Results

```markdown
---

## Phase 0 + 0.5 Complete

### What was produced:
- `.bulwark/INDEX.md` — Structured codebase index ({N} files, {N} LOC)
- `.bulwark/HOT_SPOTS.md` — Per-auditor hot file map (trigger-based)
- `.bulwark/KB_MANIFEST.md` — Knowledge base loading manifest
- `.bulwark/STATE.json` — Audit state tracking
{If stacked: "- `.bulwark/HANDOVER.md` — Findings digest, delta analysis, false positive log from audit #{N}"}

### Static Pre-Scan Results:
- Dependency vulnerabilities: {N found / tool not available}
- Potential secrets: {N files flagged}
- Semgrep findings: {N / not available}

### Configuration:
- Tier: {tier}
- Phase 1 model: {config.models.phase1}
- Selected auditors: {N} (of 51 in catalog)
{If stacked: "- Stacked audit: #N (previous: #{N-1} @ {short_hash})"}
{If massive_rewrite: "- MASSIVE REWRITE — verification agents will be skipped"}

### Cross-Skill Context:
- SOS: {available — trust boundary context loaded / not found}
- GL: {available — spec oracle loaded / not found}

### Next Step:
Run **`/clear`** then **`/DB:analyze`** to deploy {N} parallel off-chain auditor agents.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
