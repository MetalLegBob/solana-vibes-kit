---
name: SOS:scan
description: "Phase 0+0.5: Scan codebase, detect configuration, generate KB manifest, run static pre-scan"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Stronghold of Security — Phase 0 + 0.5: Scan & Pre-Scan

You are starting a comprehensive security audit using Stronghold of Security pipeline.
This command performs the initial codebase scan and static pre-analysis.

## What This Phase Does

1. **Phase 0: Pre-Flight Analysis** — Analyze the codebase to determine audit configuration
2. **Phase 0.5: Static Pre-Scan** — Run grep patterns (+ optional semgrep) to build a hot-spots map

## Arguments

Parse any arguments from the user's message:
- `--tier <quick|standard|deep>` — Override auto-detected tier
- `--batch-size <N>` — Set investigation batch size (default: 5)
- `--strategy-count <N>` — Target strategy count (default: auto per tier)

If no arguments provided, use auto-detection for all settings.

---

## Phase -1: Archive Detection & Handover Generation

**When:** Always runs first, before any codebase analysis.
**Goal:** Check for a previous completed audit. If found, archive it and generate a handover document.

### Step 1: Check for Previous Audit

```bash
test -f .audit/STATE.json && echo "PREVIOUS_AUDIT_EXISTS" || echo "NO_PREVIOUS_AUDIT"
```

**If NO_PREVIOUS_AUDIT:** Skip to Phase 0. First-time users see zero behavior change.

**If PREVIOUS_AUDIT_EXISTS:**

### Step 2: Validate Previous Audit is Complete

Read `.audit/STATE.json`. Check that `phases.report.status === "completed"`.

If the previous audit is **not** complete (e.g., abandoned mid-pipeline):
```
⚠ Incomplete audit detected in .audit/ (stopped at {last_completed_phase}).
This audit will be archived as-is. Findings from incomplete audits are not
carried forward in the handover.
```
Archive it anyway but skip handover generation (no FINAL_REPORT.md to extract findings from).

### Step 3: Read Previous Audit Metadata

From the previous `.audit/STATE.json`, extract:
- `audit_id`
- `started_at`
- `config.tier`
- `phases.scan.files_scanned`
- `phases.scan.loc_estimated`

Get the git ref at the time of the previous audit:
```bash
# Get the commit hash from when the audit was created
git log --format="%H" -1 --before="{started_at}" 2>/dev/null || git rev-parse HEAD
```

If `phases.report.status === "completed"`, also extract findings summary from `.audit/FINAL_REPORT.md`:
- Count of CONFIRMED findings
- Count of POTENTIAL findings

### Step 4: Archive the Previous Audit

```bash
# Generate archive directory name: YYYY-MM-DD-<short-hash>
PREV_DATE=$(date -j -f "%Y-%m-%dT%H:%M:%S" "{started_at}" "+%Y-%m-%d" 2>/dev/null || echo "{started_at_date_part}")
SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
ARCHIVE_DIR=".audit-history/${PREV_DATE}-${SHORT_HASH}"

mkdir -p .audit-history
mv .audit "$ARCHIVE_DIR"
```

Report to user:
```
Previous Audit Archived
  Moved .audit/ → ${ARCHIVE_DIR}
```

### Step 5: Compute Delta

```bash
# Get previous audit's git ref
PREV_REF="{git_ref_from_step_3}"

# Compute what changed
git diff --name-status "${PREV_REF}..HEAD" -- '*.rs' 2>/dev/null
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

Calculate massive rewrite detection:
- Count total source files (from previous INDEX.md or current filesystem)
- If MODIFIED + NEW > 70% of total files → flag as massive rewrite

### Step 6: Generate HANDOVER.md

**Only if previous audit was complete** (had `phases.report.status === "completed"`):

Create a fresh `.audit/` directory:
```bash
mkdir -p .audit/{context,findings}
```

Read the HANDOVER.md template from the skill:
```bash
find ~/.claude -name "HANDOVER.md" -path "*/stronghold-of-security/templates/*" 2>/dev/null | head -1
```

Generate `.audit/HANDOVER.md` by filling the template with:

**Delta Summary section:**
- Build the file status table from Step 5 results

**Previous Findings Digest section:**
- Read `{ARCHIVE_DIR}/FINAL_REPORT.md`
- Extract all CONFIRMED and POTENTIAL findings
- For each finding, check its file against the delta:
  - File is MODIFIED → tag: `RECHECK`
  - File is UNCHANGED → tag: `VERIFY`
  - File is DELETED → tag: `RESOLVED_BY_REMOVAL`

**Previous False Positive Log section:**
- Read `{ARCHIVE_DIR}/STRATEGIES.md`
- Read all `{ARCHIVE_DIR}/findings/*.md` files
- Collect hypotheses where the finding status is `NOT VULNERABLE` or `NOT_VULNERABLE`
- For each, check the target file against the delta:
  - File is UNCHANGED → retain (include in log)
  - File is MODIFIED or DELETED → drop (dismissal no longer applies)
- Write one-line compressed entries: hypothesis ID, description, file, dismissal reason

**Architecture Snapshot section:**
- Read `{ARCHIVE_DIR}/ARCHITECTURE.md`
- Extract and condense:
  - Trust boundaries (from Trust Model section)
  - Top 5-10 invariants (from Key Mechanisms / Critical Invariants sections)
  - Key data flow assertions (from Data Flow Diagram / State Management sections)
- Target: ~1-2K tokens for this section

**Audit Lineage section:**
- If the archived audit's STATE.json has a `previous_audit` field, follow the chain to build full lineage
- Add one row per previous audit: number, date, git ref, confirmed count, potential count, files scanned
- Add the current audit as the latest entry (with "—" for counts since it hasn't run yet)

### Step 7: Display Handover Summary

After normal pre-flight info, display:

```markdown
Previous Audit Detected
  Audit #{N} — {date} @ commit {short_hash}
  Found: {confirmed} confirmed, {potential} potential, {files_scanned} files scanned
  Since then: {N_MODIFIED} files modified, {N_NEW} new files, {N_DELETED} deleted
  Handover generated → .audit/HANDOVER.md
```

If massive rewrite detected:
```markdown
⚠ Massive Rewrite Detected (>{percent}% files changed)
  Verification agents will be skipped for this audit.
  Previous findings carried forward for evolution tracking only.
```

---

## Phase 0: Pre-Flight Analysis

### Step 1: Analyze Codebase

Perform these checks by scanning the codebase:

1. **Count source files and estimate LOC:**
   ```bash
   find . -name '*.rs' -not -path '*/target/*' -not -path '*/.audit/*' | wc -l
   find . -name '*.rs' -not -path '*/target/*' -not -path '*/.audit/*' -exec cat {} + | wc -l
   ```

2. **Detect ecosystem:**
   - Check for `Anchor.toml` or `Cargo.toml` with `anchor-lang` → Solana/Anchor
   - Check for `foundry.toml` or `hardhat.config` → EVM
   - Check for `Move.toml` → Move
   - Default: Solana/Anchor (this skill is Solana-focused)

3. **Identify protocol patterns** by grepping for:
   - AMM/DEX: `swap`, `liquidity`, `pool`, `amm`, `constant_product`
   - Lending: `borrow`, `lend`, `collateral`, `liquidat`, `interest_rate`
   - Staking: `stake`, `unstake`, `delegation`, `validator`, `epoch`
   - Bridge: `bridge`, `relay`, `message`, `guardian`, `vaa`
   - NFT: `metadata`, `mint_nft`, `collection`, `royalt`
   - Oracle: `oracle`, `price_feed`, `switchboard`, `pyth`, `chainlink`
   - Governance: `proposal`, `vote`, `governance`, `timelock`, `quorum`

4. **Detect risk indicators:**
   - Uses external oracles (Pyth, Switchboard imports)
   - Has upgrade mechanism (`upgrade`, `set_authority`, `BpfUpgradeableLoader`)
   - Cross-program calls (`invoke`, `invoke_signed`, CPI contexts)
   - Token transfers/DeFi logic (`transfer`, `Transfer`, `token::`)
   - Token-2022/Extensions (`spl_token_2022`, `transfer_hook`, `TransferFee`)
   - Unsafe blocks (`unsafe {`, `unsafe fn`)

5. **Auto-detect tier** (if not overridden):
   - `quick`: < 10 source files OR < 2,000 LOC
   - `standard`: 10-50 files OR 2,000-20,000 LOC
   - `deep`: > 50 files OR > 20,000 LOC OR complex protocol patterns

6. **Check if codebase builds:**
   ```bash
   # Try anchor build, fall back to cargo build-sbf, fall back to cargo check
   anchor build 2>&1 | tail -5 || cargo build-sbf 2>&1 | tail -5 || cargo check 2>&1 | tail -5
   ```
   Note build status but don't block the audit if it fails.

### Step 2: Generate KB-MANIFEST

Based on detected protocol types and tier, determine which knowledge base files each phase needs.

Write `.audit/KB_MANIFEST.md`:

```markdown
# KB-MANIFEST

Generated by Phase 0 on {date}. This file tells each audit phase which knowledge base files to load.

## Detected Configuration
- **Ecosystem:** {ecosystem}
- **Protocol Types:** {list}
- **Tier:** {tier}
- **Risk Indicators:** {list}

## Phase 1 Agents (Context Building)

Each agent loads its **focus manifest** (contains only the EPs relevant to that focus area):

| Agent | Focus Manifest |
|-------|---------------|
| 01 | knowledge-base/focus-manifests/01-access-control.md |
| 02 | knowledge-base/focus-manifests/02-arithmetic.md |
| 03 | knowledge-base/focus-manifests/03-state-machine.md |
| 04 | knowledge-base/focus-manifests/04-cpi.md |
| 05 | knowledge-base/focus-manifests/05-token-economic.md |
| 06 | knowledge-base/focus-manifests/06-oracle.md |
| 07 | knowledge-base/focus-manifests/07-upgrade-admin.md |
| 08 | knowledge-base/focus-manifests/08-timing-ordering.md |

Each focus manifest lists the specific individual pattern files (from `knowledge-base/patterns/`) plus core reference files the agent should read.

### All agents also load:
- knowledge-base/solana/solana-runtime-quirks.md
- knowledge-base/solana/anchor-version-gotchas.md
- knowledge-base/solana/known-vulnerable-deps.md

### Conditional:
{- knowledge-base/solana/token-extensions.md (if Token-2022 detected)}

### Protocol playbooks:
{- knowledge-base/protocols/{detected}-attacks.md for each detected protocol}

## Phase 3 (Strategy Generation)
- knowledge-base/PATTERNS_INDEX.md — Master catalog (~500 tokens), identify relevant EPs
- Then load individual pattern files from knowledge-base/patterns/ for matched EPs only
- knowledge-base/reference/audit-firm-findings.md
- knowledge-base/reference/bug-bounty-findings.md
- {All protocol playbooks from Phase 1}

## Phase 4 Agents (Investigation)
- knowledge-base/PATTERNS_INDEX.md — Identify relevant EPs for the hypothesis
- Specific individual pattern files from knowledge-base/patterns/ based on hypothesis category
- knowledge-base/core/common-false-positives.md
- Relevant protocol playbook (if hypothesis is protocol-specific)

## Phase 5 (Final Synthesis)
- knowledge-base/core/severity-calibration.md
- knowledge-base/core/common-false-positives.md
- knowledge-base/PATTERNS_INDEX.md
```

### Step 3: Present configuration to user

Display the pre-flight analysis results and ask for confirmation:

```markdown
## Pre-Flight Analysis Complete

**Codebase Metrics:**
- Source files: {N}
- Estimated LOC: ~{N}
- Ecosystem: {detected}
- Protocol patterns: {list}

**Risk Indicators:**
- [x/] Uses external oracles
- [x/] Has upgrade mechanism
- [x/] Cross-program calls
- [x/] Token transfers/DeFi logic
- [x/] Token-2022/Extensions
- [x/] Unsafe blocks

**Recommended Configuration:**
- Tier: {tier}
- Batch Size: {N}
- Strategy Count: {N}
- Estimated agents: {N}
- DeFi Economic Model Agent: {Yes/No}

Proceed with these settings? [Y/n/customize]
```

Wait for user confirmation before proceeding.

### Step 4: Model Selection for Phase 1

After user confirms settings, present model selection:

```markdown
### Phase 1 Model Selection

Phase 1 agents analyze the entire codebase through specialized security lenses.
Choose the model for these agents:

  → **Opus** (recommended for deep tier): Maximum novel discovery,
    strongest cross-file reasoning. Higher cost.
  → **Sonnet**: Strong structured analysis guided by KB and hot-spots.
    ~50-60% cheaper. Slightly weaker on novel/creative findings.
```

**Defaults by tier:**
- `deep`: Opus (recommend Opus, user can override to Sonnet)
- `standard`: User choice (present both options equally)
- `quick`: Sonnet (recommend Sonnet, user can override to Opus)

Store choice in STATE.json under `config.models.phase1`.

---

## Phase 0.25: Codebase Indexing

**Goal:** Build a structured INDEX.md for agents to use 3-layer search instead of reading the entire codebase.

### Spawn Indexer Agent

```
Task(
  subagent_type="general-purpose",
  model="haiku",
  prompt="... (see /SOS:index command for full prompt)"
)
```

Use the exact prompt from `stronghold-of-security/commands/index.md` Step 2. The indexer runs on Haiku for cost efficiency — this is mechanical extraction, not reasoning.

After completion, verify `.audit/INDEX.md` was created. Report file count and LOC to user.

---

## Phase 0.5: Static Pre-Scan (Hot-Spots Map)

**Goal:** Build a hot-spots map using pattern-based static analysis. This gives Phase 1 agents concrete leads instead of searching blind.

### Step 1: Check semgrep availability

```bash
which semgrep >/dev/null 2>&1 && echo "SEMGREP_AVAILABLE" || echo "SEMGREP_NOT_AVAILABLE"
```

### Step 2: Run pattern scan

Read the pattern catalog from the skill's resources directory. The file is at the skill installation path — find it with:
```bash
find ~/.claude -name "phase-05-patterns.md" -path "*/stronghold-of-security/*" 2>/dev/null | head -1
```

For each pattern category in the catalog, run the grep commands against the source files. Collect all matches.

If semgrep is available, also run the custom rules:
```bash
# Find the semgrep rules file
RULES_PATH=$(find ~/.claude -name "solana-anchor.yaml" -path "*/stronghold-of-security/*" 2>/dev/null | head -1)
if [ -n "$RULES_PATH" ]; then
  semgrep --config "$RULES_PATH" --json programs/ 2>/dev/null
fi
```

### Step 3: Generate HOT_SPOTS.md

Write `.audit/HOT_SPOTS.md` organized two ways:

1. **By file** — Sorted by risk density (files with most HIGH patterns first)
2. **By focus area** — So each Phase 1 agent can quickly find their relevant hot-spots

Format:
```markdown
# Hot-Spots Map

Generated by Phase 0.5 static pre-scan.

## Summary
- Total patterns matched: {N}
- HIGH risk matches: {N}
- MEDIUM risk matches: {N}
- Files with matches: {N}
- Semgrep: {available/not available}

## By File (Risk Density Order)

### {file_path} — {N} HIGH, {N} MEDIUM
| Line | Pattern | Risk | Focus Area |
|------|---------|------|------------|
| {N} | {pattern_id}: {description} | HIGH | Arithmetic |

### {file_path} — ...

## By Focus Area

### Access Control & Account Validation
| File | Line | Pattern | Risk |
|------|------|---------|------|
| {path} | {N} | {id}: {desc} | HIGH |

### Arithmetic Safety
...

### State Machine & Error Handling
...
{etc. for all 8 focus areas}
```

---

## State Initialization

### Create .audit/ directory structure
```bash
mkdir -p .audit/{context,findings}
```

### Initialize STATE.json

Write `.audit/STATE.json`:
```json
{
  "version": "1.0.0",
  "audit_id": "{generated-uuid}",
  "audit_number": {N},
  "started_at": "{ISO-8601}",
  "last_updated": "{ISO-8601}",
  "git_ref": "{current HEAD hash}",
  "previous_audit": {
    "path": ".audit-history/{YYYY-MM-DD}-{short-hash}",
    "audit_id": "{previous audit_id}",
    "git_ref": "{previous git ref}",
    "date": "{previous date}",
    "complete": true,
    "summary": {
      "confirmed": {N},
      "potential": {N},
      "files_scanned": {N}
    }
  },
  "stacking": {
    "is_stacked": true,
    "handover_generated": true,
    "massive_rewrite": false,
    "delta": {
      "new_files": {N},
      "modified_files": {N},
      "unchanged_files": {N},
      "deleted_files": {N}
    }
  },
  "config": {
    "tier": "{tier}",
    "batch_size": {N},
    "strategy_count": {N},
    "ecosystem": "{ecosystem}",
    "protocol_types": ["{list}"],
    "defi_economic_agent": {true/false},
    "models": {
      "index": "haiku",
      "phase1": "{user_choice — opus or sonnet}",
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
    "scan": {
      "status": "completed",
      "completed_at": "{ISO-8601}",
      "files_scanned": {N},
      "loc_estimated": {N},
      "hot_spots_found": {N}
    },
    "analyze": { "status": "pending" },
    "strategize": { "status": "pending" },
    "investigate": { "status": "pending" },
    "report": { "status": "pending" }
  }
}
```

**Notes on stacking fields:**
- When `previous_audit` is `null` (first audit), omit the field entirely. Same for `stacking` — omit when not a stacked audit.
- `audit_number`: If previous audit has an `audit_number`, increment by 1. If there's a previous audit but no `audit_number`, set to 2. If no previous audit, set to 1.
```

### Initialize PROGRESS.md

Write `.audit/PROGRESS.md`:
```markdown
# Stronghold of Security — Audit Progress

**Audit ID:** {uuid}
**Started:** {date}
**Tier:** {tier}
**Codebase:** {directory name}

## Phase Progress

| Phase | Command | Status | Output |
|-------|---------|--------|--------|
| Scan | `/SOS:scan` | Completed | KB_MANIFEST.md, HOT_SPOTS.md |
| Analyze | `/SOS:analyze` | Pending | — |
| Strategize | `/SOS:strategize` | Pending | — |
| Investigate | `/SOS:investigate` | Pending | — |
| Report | `/SOS:report` | Pending | — |

## Last Updated
{timestamp}
```

---

## Phase Complete — Present Results

After all Phase 0 + 0.5 work is done, present this to the user:

```markdown
---

## Phase 0 + 0.5 Complete

### What was produced:
- `.audit/INDEX.md` — Structured codebase index ({N} files, {N} LOC)
- `.audit/KB_MANIFEST.md` — Knowledge base loading manifest for all phases
- `.audit/HOT_SPOTS.md` — Static pre-scan results ({N} patterns found across {N} files)
- `.audit/STATE.json` — Audit state tracking
- `.audit/PROGRESS.md` — Human-readable progress

### Hot-Spots Summary:
- {N} HIGH risk patterns found
- {N} MEDIUM risk patterns found
- Top files by risk density: {top 3 files}

### Configuration:
- Tier: {tier}
- Phase 1 model: {config.models.phase1}
- Focus areas: {N} (+ Economic Model: {yes/no})
- Target strategies: {N}

### Phase Stats:
- **Model:** Haiku (indexer)
- **Agents spawned:** 1 indexer
- **Estimated tokens:** ~{indexer_estimate}K input

{If stacked audit:}
### Audit Stacking:
- Previous audit: #{prev_number} ({prev_date} @ {prev_ref})
- Delta: {N} modified, {N} new, {N} deleted, {N} unchanged files
- Handover: `.audit/HANDOVER.md` ({N} previous findings carried forward)
- Lineage: {N} audits in chain

### Next Step:
Run **`/clear`** then **`/SOS:analyze`** to deploy {N} parallel context auditors.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
