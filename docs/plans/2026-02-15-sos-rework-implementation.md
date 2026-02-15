# Stronghold of Security Rework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework The Fortress into Stronghold of Security with full SVK Foundation pattern alignment, smart model selection, and ~80-85% token cost reduction.

**Architecture:** Phase-based transformation — rename first, then restructure KB into indexed individual files, add codebase INDEX.md generation, implement model selection and provides/requires routing, slim orchestrators, add context budgeting, consolidate focus areas, and enhance UX. All work happens in the `.worktrees/sos-rework/` worktree on branch `feature/sos-rework`.

**Tech Stack:** Markdown skill files, bash scripts, Claude Code skill architecture

**Design doc:** `docs/plans/2026-02-15-sos-rework-design.md`

**Working directory:** `/Users/mlbob/Projects/SVK/.worktrees/sos-rework/`

---

## Task 1: Rename Directory & All References

**Files:**
- Rename: `the-fortress/` → `stronghold-of-security/`
- Modify: Every `.md` file in the skill + root `README.md`

**Step 1: Rename the directory**

```bash
cd /Users/mlbob/Projects/SVK/.worktrees/sos-rework
git mv the-fortress stronghold-of-security
```

**Step 2: Update SKILL.md frontmatter and content**

In `stronghold-of-security/SKILL.md`:
- Frontmatter `name:` → `stronghold-of-security`
- Frontmatter `description:` → replace "The Fortress" with "Stronghold of Security", `/the-fortress` with `/SOS`
- All body references: "The Fortress" → "Stronghold of Security", `/the-fortress:` → `/SOS:`, `the-fortress` paths → `stronghold-of-security`
- Pipeline diagram: update header and all command references
- Installation section: update all paths
- Version header: `THE FORTRESS v2.0` → `STRONGHOLD OF SECURITY v3.0`

**Step 3: Update all 7 command file frontmatters and content**

For each file in `stronghold-of-security/commands/`:
- `scan.md`: frontmatter `name:` → `SOS:scan`, all body "The Fortress" → "Stronghold of Security", `/the-fortress:` → `/SOS:`, path patterns `*/the-fortress/*` → `*/stronghold-of-security/*`
- `analyze.md`: same pattern
- `strategize.md`: same pattern
- `investigate.md`: same pattern
- `report.md`: same pattern
- `verify.md`: same pattern
- `status.md`: same pattern

**Step 4: Update all 4 agent templates**

For each file in `stronghold-of-security/agents/`:
- `context-auditor.md`: "The Fortress" → "Stronghold of Security"
- `hypothesis-investigator.md`: same
- `economic-model-analyzer.md`: same
- `final-synthesizer.md`: same

**Step 5: Update all 4 report templates**

For each file in `stronghold-of-security/templates/`:
- `ARCHITECTURE.md`: "The Fortress" → "Stronghold of Security"
- `STRATEGIES.md`: same
- `FINAL_REPORT.md`: same
- `VERIFICATION_REPORT.md`: same

**Step 6: Update install.sh**

- All directory paths: `the-fortress` → `stronghold-of-security`
- Echo messages: "The Fortress" → "Stronghold of Security"
- Command references: `/the-fortress` → `/SOS`

**Step 7: Update root README.md**

- Section header: "The Fortress" → "Stronghold of Security"
- Link: `the-fortress/` → `stronghold-of-security/`
- All command references: `/the-fortress` → `/SOS`
- Installation paths: `the-fortress` → `stronghold-of-security`

**Step 8: Update stronghold-of-security/README.md**

- All "The Fortress" → "Stronghold of Security"
- All `/the-fortress:` → `/SOS:`
- All directory paths

**Step 9: Update resources files**

- `resources/focus-areas.md`: any "The Fortress" or "the-fortress" references
- `resources/exploit-patterns.md`: check for references
- `resources/phase-05-patterns.md`: check for path references

**Step 10: Verify no remaining old references**

```bash
cd /Users/mlbob/Projects/SVK/.worktrees/sos-rework
grep -ri "the-fortress" --include="*.md" --include="*.sh" --include="*.yaml" . | grep -v ".git/"
grep -ri "the.fortress" --include="*.md" --include="*.sh" . | grep -v ".git/" | grep -v "Stronghold"
```

Expected: No matches (except possibly in research/ archive files which we leave as-is).

**Step 11: Commit**

```bash
git add -A
git commit -m "Rename The Fortress to Stronghold of Security with /SOS: commands"
```

---

## Task 2: Split KB Into Individual Pattern Files

**Files:**
- Read: `stronghold-of-security/knowledge-base/core/exploit-patterns-core.md` (EP-001 to EP-067)
- Read: `stronghold-of-security/knowledge-base/core/exploit-patterns-advanced.md` (EP-068 to EP-097)
- Read: `stronghold-of-security/knowledge-base/core/exploit-patterns-incidents.md` (EP-098 to EP-118)
- Read: `stronghold-of-security/knowledge-base/core/exploit-patterns-recent.md` (EP-119 to EP-128)
- Create: `stronghold-of-security/knowledge-base/patterns/` directory tree with 128 individual `.md` files
- Create: `stronghold-of-security/knowledge-base/PATTERNS_INDEX.md`

**Step 1: Create the category directory structure**

```bash
cd /Users/mlbob/Projects/SVK/.worktrees/sos-rework/stronghold-of-security/knowledge-base
mkdir -p patterns/{account-validation,arithmetic,oracle,access-control,state-machine,cpi,token-spl,economic-defi,key-management,initialization,upgrade-governance,resource-dos,race-conditions-mev,advanced-bypass,audit-incident,bug-bounty,niche-exploits,cross-chain,protocol-specific,infrastructure,gap-analysis}
```

**Step 2: Write a splitter script**

Create `stronghold-of-security/scripts/split-patterns.sh` — a bash script that:
1. Reads each of the 4 monolithic EP files
2. Splits on `### EP-NNN:` boundaries (each pattern starts with `### EP-NNN:` and ends at the next `---` before another `### EP-`)
3. Creates individual files named `EP-NNN-slugified-name.md`
4. Places them in the correct category subdirectory based on the category mapping from the index

Category mapping (from `exploit-patterns-index.md`):
```
EP-001 to EP-014 → account-validation/
EP-015 to EP-020 → arithmetic/
EP-021 to EP-025 → oracle/
EP-026 to EP-032 → access-control/
EP-033 to EP-041 → state-machine/
EP-042 to EP-050 → cpi/
EP-051 to EP-057 → token-spl/
EP-058 to EP-067 → economic-defi/
EP-068 to EP-074 → key-management/
EP-075 to EP-078 → initialization/
EP-079 to EP-083 → upgrade-governance/
EP-084 to EP-088 → resource-dos/
EP-089 to EP-090 → race-conditions-mev/
EP-091 to EP-097 → advanced-bypass/
EP-098 to EP-105 → audit-incident/
EP-106 to EP-110 → bug-bounty/
EP-111 to EP-113 → niche-exploits/
EP-114 to EP-118 → cross-chain/
EP-119 to EP-122 → protocol-specific/
EP-123 to EP-125 → infrastructure/
EP-126 to EP-128 → gap-analysis/
```

**Step 3: Run the splitter and verify**

```bash
bash stronghold-of-security/scripts/split-patterns.sh
find stronghold-of-security/knowledge-base/patterns/ -name "EP-*.md" | wc -l
```

Expected: 128 files

**Step 4: Generate PATTERNS_INDEX.md**

Create `stronghold-of-security/knowledge-base/PATTERNS_INDEX.md` — a compact one-liner-per-pattern catalog (~500 tokens total):

```markdown
# Exploit Patterns Index
<!-- Master catalog — ~500 tokens. Agents read this to identify relevant patterns, then load individual files. -->

## Account Validation
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-001 | Missing Signer Check | CRITICAL | patterns/account-validation/EP-001-missing-signer-check.md |
| EP-002 | Missing Owner Check | CRITICAL | patterns/account-validation/EP-002-missing-owner-check.md |
...
```

Each row: EP number, name, severity, relative file path. Organized by category with category headers.

**Step 5: Verify index completeness**

Count lines in PATTERNS_INDEX.md vs count of EP files. Should be 128 entries.

**Step 6: Keep original monolithic files for reference but move them**

```bash
mkdir -p stronghold-of-security/knowledge-base/core/archive
mv stronghold-of-security/knowledge-base/core/exploit-patterns-core.md stronghold-of-security/knowledge-base/core/archive/
mv stronghold-of-security/knowledge-base/core/exploit-patterns-advanced.md stronghold-of-security/knowledge-base/core/archive/
mv stronghold-of-security/knowledge-base/core/exploit-patterns-incidents.md stronghold-of-security/knowledge-base/core/archive/
mv stronghold-of-security/knowledge-base/core/exploit-patterns-recent.md stronghold-of-security/knowledge-base/core/archive/
```

Keep `exploit-patterns-index.md` in core/ — it's still useful as the cross-reference by incident.

**Step 7: Commit**

```bash
git add -A
git commit -m "Split 128 exploit patterns into individual indexed files

Restructures knowledge base from 4 monolithic files into 128 individual
pattern files organized by category. Adds PATTERNS_INDEX.md for
lightweight agent loading. Original files archived in core/archive/."
```

---

## Task 3: Create Focus Manifests

**Files:**
- Create: `stronghold-of-security/knowledge-base/focus-manifests/` with 8 manifest files (one per consolidated focus area)

**Step 1: Create focus manifests directory**

```bash
mkdir -p /Users/mlbob/Projects/SVK/.worktrees/sos-rework/stronghold-of-security/knowledge-base/focus-manifests
```

**Step 2: Write 8 focus manifest files**

Each manifest lists the specific EP pattern files + core/solana/protocol KB files that focus area's agent should load.

Source the EP assignments from `resources/focus-areas.md` "Knowledge Base Priority" sections, mapped to the new individual file paths.

Files to create:
- `01-access-control.md` — EPs from Access Control + Account Validation categories (EP-001–014, EP-026–032, EP-068–074, EP-075–078, EP-126) + `secure-patterns.md` + `common-false-positives.md`
- `02-arithmetic.md` — EPs from Arithmetic category (EP-015–020) + relevant advanced (EP-091) + `secure-patterns.md` + `common-false-positives.md`
- `03-state-machine.md` — EPs from State Machine + Error Handling categories (EP-033–041, EP-084–088) + `secure-patterns.md` + `common-false-positives.md`
- `04-cpi.md` — EPs from CPI category (EP-042–050) + `secure-patterns.md` + `common-false-positives.md`
- `05-token-economic.md` — EPs from Token/SPL + Economic/DeFi categories (EP-051–067) + `secure-patterns.md` + `common-false-positives.md`
- `06-oracle.md` — EPs from Oracle category (EP-021–025, EP-096) + `secure-patterns.md` + `common-false-positives.md`
- `07-upgrade-admin.md` — EPs from Upgrade/Governance category (EP-079–083, EP-094) + `secure-patterns.md` + `common-false-positives.md`
- `08-timing-ordering.md` — EPs from Race Conditions/MEV category (EP-089–090) + `secure-patterns.md` + `common-false-positives.md`

Each manifest format:
```markdown
# Focus Manifest: Access Control & Account Validation

## Core Patterns (always load)
- patterns/account-validation/EP-001-missing-signer-check.md
- patterns/account-validation/EP-002-missing-owner-check.md
- patterns/account-validation/EP-003-account-type-cosplay.md
...
- patterns/access-control/EP-026-xxx.md
...

## Core Reference (always load)
- core/secure-patterns.md
- core/common-false-positives.md

## Solana Reference (always load)
- solana/solana-runtime-quirks.md
- solana/anchor-version-gotchas.md

## Conditional (load if detected)
- solana/token-extensions.md (if Token-2022)
- protocols/{detected}-attacks.md (if protocol matched)
```

**Step 3: Verify all 128 EPs are covered**

Write a quick check: every EP file in `patterns/` should appear in at least one focus manifest. Cross-reference.

**Step 4: Commit**

```bash
git add -A
git commit -m "Add per-focus KB loading manifests for targeted agent context

Each of 8 focus areas gets a manifest listing only its relevant patterns.
Agent KB load drops from 80-120KB (all patterns) to 15-30KB (focus-specific)."
```

---

## Task 4: Add /SOS:index Command — Codebase INDEX.md Generation

**Files:**
- Create: `stronghold-of-security/commands/index.md`
- Modify: `stronghold-of-security/commands/scan.md` (integrate index step)
- Modify: `stronghold-of-security/SKILL.md` (add /SOS:index to command table)

**Step 1: Write the index command**

Create `stronghold-of-security/commands/index.md`:

Frontmatter:
```yaml
---
name: SOS:index
description: "Build structured codebase INDEX.md with per-file metadata and focus relevance tags"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---
```

Body: Instructions for spawning a Haiku indexer agent that:
1. Scans all `.rs` files in `programs/` (excluding `target/`, `.audit/`)
2. For each file extracts: LOC, struct names, function names, external calls, risk markers
3. Tags each file with focus relevance based on risk markers and content signals
4. Writes `.audit/INDEX.md` in the standard format from the design doc
5. Model: `model: "haiku"` in the Task() call

Include the full INDEX.md output format specification from the design doc.

**Step 2: Update scan.md to call index**

In `stronghold-of-security/commands/scan.md`, after Phase 0 pre-flight and before Phase 0.5:
- Add a step: "Spawn indexer agent to build INDEX.md"
- Reference the index command logic or inline it
- The indexer runs as a Haiku Task() agent

**Step 3: Update SKILL.md command table**

Add `/SOS:index` row to the commands table in SKILL.md:
```
| `/SOS:index` | Build codebase INDEX.md with per-file metadata and focus relevance |
```

Update the pipeline diagram to show index as part of scan phase.

**Step 4: Verify command frontmatter is valid**

Check that the frontmatter `name:` matches what Claude Code expects for skill command routing.

**Step 5: Commit**

```bash
git add -A
git commit -m "Add /SOS:index command for 3-layer codebase search

Generates structured INDEX.md with per-file metadata and focus relevance
tags. Agents use this to load only relevant files instead of the entire
codebase. Runs on Haiku for cost efficiency."
```

---

## Task 5: Implement Model Selection

**Files:**
- Modify: `stronghold-of-security/commands/scan.md` (add model choice prompt + store in STATE.json)
- Modify: `stronghold-of-security/commands/analyze.md` (read model choice, pass to Task calls)
- Modify: `stronghold-of-security/commands/strategize.md` (set model: opus)
- Modify: `stronghold-of-security/commands/investigate.md` (set model: sonnet, haiku for Tier 3)
- Modify: `stronghold-of-security/commands/report.md` (set model: opus)
- Modify: `stronghold-of-security/commands/verify.md` (set model: sonnet)

**Step 1: Add model selection to scan.md**

After presenting pre-flight results and before Phase 0.5, add a model selection prompt:

```markdown
### Model Selection for Phase 1

Present to user after scan results:

Phase 1 model selection:
  → Opus (recommended for deep tier): Maximum novel discovery,
    strongest cross-file reasoning. Higher cost.
  → Sonnet: Strong structured analysis guided by KB and hot-spots.
    ~50-60% cheaper. Slightly weaker on novel/creative findings.

Default: Opus for deep tier, Sonnet for quick tier, user choice for standard.

Store choice in STATE.json under config.phase1_model.
```

Also add the full model selection table to STATE.json config:
```json
{
  "config": {
    "models": {
      "index": "haiku",
      "phase1": "{user_choice}",
      "quality_gate": "haiku",
      "strategize": "opus",
      "investigate": "sonnet",
      "investigate_tier3": "haiku",
      "coverage": "sonnet",
      "report": "opus",
      "verify": "sonnet"
    }
  }
}
```

**Step 2: Update analyze.md Task() calls**

Add `model: "{model_from_state}"` parameter to each Task() call:
```
Task(
  subagent_type="general-purpose",
  model="{config.models.phase1}",  // Read from STATE.json
  prompt="..."
)
```

Also update quality gate agents to use Haiku.

**Step 3: Update strategize.md**

This phase doesn't spawn agents (it's direct synthesis), but note at the top:
"This phase runs in the main context. Recommended: Opus mode for best creative synthesis."

**Step 4: Update investigate.md Task() calls**

- Tier 1 + Tier 2 investigators: `model: "sonnet"`
- Tier 3 investigators: `model: "haiku"` with condensed context (confirm/deny only, no full writeup)
- Coverage verification agent: `model: "sonnet"`

**Step 5: Update report.md Task() call**

Final synthesizer: `model: "opus"`

**Step 6: Update verify.md Task() calls**

Verification agents: `model: "sonnet"`

**Step 7: Commit**

```bash
git add -A
git commit -m "Add smart model selection — Opus/Sonnet/Haiku per phase

Phase 1: user choice (Opus default for deep). Strategize + Report: Opus.
Investigate: Sonnet (Haiku for Tier 3). Index + quality gate: Haiku.
~50-60% cost reduction on investigation phase alone."
```

---

## Task 6: Orchestrator Slimming + Provides/Requires Routing

**Files:**
- Modify: All command files in `stronghold-of-security/commands/`
- Modify: Agent templates in `stronghold-of-security/agents/`
- Modify: Context auditor output format to include provides/requires frontmatter

**Step 1: Add frontmatter to context auditor output format**

In `stronghold-of-security/agents/context-auditor.md`, update the output format to include structured frontmatter at the very top of the output file:

```yaml
---
task_id: sos-phase1-{focus_area}
provides: [{focus_area}-findings, {focus_area}-invariants]
focus_area: {focus_area}
files_analyzed: [list]
finding_count: N
severity_breakdown: {critical: N, high: N, medium: N, low: N}
---
```

**Step 2: Add requires field to strategy format**

In `stronghold-of-security/commands/strategize.md`, update the per-strategy documentation to include:
```
- `Requires`: Which Phase 1 focus area findings are needed to investigate this (e.g., [cpi-findings, access-control-findings])
```

This gets written into STRATEGIES.md and used by Phase 4 for routing.

**Step 3: Update investigate.md with routing logic**

Replace the current approach (manually listing relevant context files) with automatic routing:

```markdown
### Routing Logic

For each hypothesis to investigate:
1. Read the hypothesis `Requires` field from STRATEGIES.md
2. Scan all .audit/context/NN-*.md frontmatter for matching `provides`
3. Build the context file list: only files whose `provides` matches the hypothesis `requires`
4. Pass only those 1-3 context files to the investigator agent
```

**Step 4: Slim down command files**

For each command file, move detailed domain instructions into agent templates. Command files should become thin coordination:

- **scan.md**: Keep the step-by-step orchestration. Move detailed HOT_SPOTS format and KB_MANIFEST template into separate resource files if they're large (or keep inline if under ~50 lines each — they're templates, not logic).
- **analyze.md**: Remove the full quality gate criteria from the command file. Move validation criteria into a new `agents/quality-gate.md` template that the quality gate Haiku agent reads.
- **investigate.md**: Remove the detailed strategy supplement logic. Keep it concise — "after Batch 1, if CONFIRMED/POTENTIAL found, generate up to 10 supplemental strategies."
- **report.md**: The current approach inlines the final-synthesizer.md content. Change to file path reference — agents read the template themselves.

**Step 5: Create quality-gate agent template**

Create `stronghold-of-security/agents/quality-gate.md` containing the validation criteria currently in analyze.md (the table of checks, thresholds, and methods).

**Step 6: Verify command files are under ~100 lines each**

```bash
wc -l stronghold-of-security/commands/*.md
```

Target: each under 120 lines (currently 200+).

**Step 7: Commit**

```bash
git add -A
git commit -m "Slim orchestrators, add provides/requires routing

Command files reduced from 200+ to ~80-100 lines. Domain logic moved
to agent templates. Phase 4 investigators receive only relevant context
files via automatic provides/requires frontmatter matching."
```

---

## Task 7: Context Budget Estimation + Adaptive Batching

**Files:**
- Modify: `stronghold-of-security/commands/analyze.md`
- Modify: `stronghold-of-security/commands/investigate.md`

**Step 1: Add context budget estimation to analyze.md**

Before spawning agents, estimate per-agent token cost:

```markdown
### Context Budget Estimation

Before spawning, estimate per-agent input:
1. Agent template: ~3,000 tokens (fixed, known)
2. Focus manifest KB: Read the manifest, count listed files, estimate ~500 tokens per KB pattern file + known sizes for core reference files
3. INDEX.md: Read .audit/INDEX.md, count LOC for files tagged with this focus area, estimate ~3 tokens per LOC
4. Hot-spots: Count entries for this focus area in HOT_SPOTS.md

If estimated total > 120K tokens for any agent:
- Split that agent's file list across 2 agents covering the same focus area
- Each gets half the relevant files, full KB manifest
- Both write to the same output file (first writes, second appends)

### Adaptive Batch Sizing

Calculate batch size based on per-agent estimate:
- If avg estimate < 40K tokens: batch size = 8
- If avg estimate 40-80K tokens: batch size = 5
- If avg estimate > 80K tokens: batch size = 3
```

**Step 2: Add adaptive batching to investigate.md**

Similar estimation for investigators:
- Agent template + hypothesis text + architecture doc + 1-3 context files + KB files
- Adjust batch size accordingly
- Tier 3 hypotheses with Haiku get condensed context (confirm/deny template only, no full investigation methodology)

**Step 3: Add Tier 3 lightweight investigation template**

In `stronghold-of-security/agents/`, create `lightweight-investigator.md` — a condensed version of `hypothesis-investigator.md` for Tier 3 Haiku agents:
- Confirm or deny only
- No devil's advocate
- No full PoC sequence
- Short output format: status + 1 paragraph rationale + code reference

**Step 4: Commit**

```bash
git add -A
git commit -m "Add context budget estimation and adaptive batching

Estimates per-agent token cost before spawning. Auto-splits large agents.
Adaptive batch size: 3-8 based on estimated context. Tier 3 hypotheses
get lightweight Haiku investigation."
```

---

## Task 8: Consolidate Focus Areas (10 → 8)

**Files:**
- Modify: `stronghold-of-security/SKILL.md` (update focus area list)
- Modify: `stronghold-of-security/README.md` (update focus area list)
- Modify: `stronghold-of-security/resources/focus-areas.md` (merge sections)
- Modify: `stronghold-of-security/commands/analyze.md` (update agent table)
- Modify: focus manifests if needed

**Step 1: Update SKILL.md focus area list**

Replace the 10-item list with the consolidated 8:

```markdown
1. **Access Control & Account Validation** — Authority, signer checks, PDA derivation, type cosplay, ownership
2. **Arithmetic Safety** — Overflow, precision loss, rounding
3. **State Machine & Error Handling** — Transitions, race conditions, invariants, panic paths, error propagation
4. **CPI & External Calls** — Cross-program invocation, program validation, privilege propagation
5. **Token & Economic** — Token flows, economic invariants, MEV
6. **Oracle & External Data** — Price feeds, staleness, manipulation
7. **Upgrade & Admin** — Upgradeability, admin functions, timelocks
8. **Timing & Ordering** — Front-running, transaction ordering, atomicity
```

**Step 2: Merge focus-areas.md sections**

In `resources/focus-areas.md`:
- Merge "Account Validation" section content into "Access Control" section
- Merge "Error Handling" section content into "State Machine" section
- Remove the now-empty standalone sections
- Update all cross-focus handoff references (e.g., "→ Account Validation agent" becomes part of same agent)

**Step 3: Update analyze.md agent table**

Replace the 10-agent table with 8:

```markdown
| # | Focus Area | Output File |
|---|------------|-------------|
| 01 | Access Control & Account Validation | .audit/context/01-access-control.md |
| 02 | Arithmetic Safety | .audit/context/02-arithmetic.md |
| 03 | State Machine & Error Handling | .audit/context/03-state-machine.md |
| 04 | CPI & External Calls | .audit/context/04-cpi-external.md |
| 05 | Token & Economic | .audit/context/05-token-economic.md |
| 06 | Oracle & External Data | .audit/context/06-oracle-data.md |
| 07 | Upgrade & Admin | .audit/context/07-upgrade-admin.md |
| 08 | Timing & Ordering | .audit/context/08-timing-ordering.md |
```

Update batching: "Batch 1: Agents 01-05, Batch 2: Agents 06-08 + conditional Agent 09 (economic model)"

For `quick` tier: Only agents 01, 02, 04, 05 (4 core areas).

**Step 4: Update focus manifests**

Verify the 8 focus manifests from Task 3 align with the consolidated areas. The Account Validation manifest should be merged into Access Control manifest (combine EP lists).

**Step 5: Update README.md**

Same focus area list update.

**Step 6: Update hot-spots focus area tags**

In `scan.md`, update the Phase 0.5 hot-spots generation to use the 8 consolidated focus area names for tagging.

**Step 7: Commit**

```bash
git add -A
git commit -m "Consolidate 10 focus areas to 8 — merge Account Validation + Error Handling

Account Validation merged into Access Control (same agent sees full picture).
Error Handling merged into State Machine (error paths are state transitions).
20% fewer Phase 1 agents, cleaner boundaries, fewer duplicates."
```

---

## Task 9: Enhanced /SOS:status Dashboard

**Files:**
- Modify: `stronghold-of-security/commands/status.md`

**Step 1: Rewrite status.md with enhanced dashboard**

Replace the current status display with the design's dashboard format:

```
Stronghold of Security — Audit Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Phase 0   Scan & Index         complete
✓ Phase 1   Context Analysis     8/8 agents complete
▸ Phase 2+3 Strategize           in progress
○ Phase 4   Investigation        pending
○ Phase 5   Report               pending

Model: Phase 1 ran Opus | Phase 4 will use Sonnet
Tier: deep (27,000 LOC, 95 files)
Next: Wait for strategize to complete, then /clear → /SOS:investigate
```

Include:
- Model selection info from STATE.json
- Tier and codebase metrics
- For investigation phase: show batch progress (e.g., "Batch 3/14, 15/67 investigated")
- Token usage estimates if available
- Clear "you are here" with exact next command

**Step 2: Commit**

```bash
git add -A
git commit -m "Enhance /SOS:status with visual dashboard and model info"
```

---

## Task 10: Phase 4 Resume Support + Progress Reporting

**Files:**
- Modify: `stronghold-of-security/commands/investigate.md` (resume logic already partially exists — enhance it)
- Modify: All command files (add progress summary output section)

**Step 1: Enhance resume support in investigate.md**

The current investigate.md already has basic resume support. Enhance it:
- On resume, scan `.audit/findings/` for existing files
- Skip hypotheses that already have finding files
- Report: "Resuming: {N}/{total} already investigated, starting from batch {X}"
- Handle partial batches: if a batch was interrupted mid-way, re-run the incomplete hypotheses

**Step 2: Add progress summary to each phase's completion output**

For each command's "Phase Complete — Present Results" section, add:
- Estimated tokens used this phase (rough calculation based on agent count × estimated per-agent)
- Running total across phases (read from STATE.json)
- Model used this phase
- Clear next step with exact command

**Step 3: Commit**

```bash
git add -A
git commit -m "Add Phase 4 resume support and per-phase progress summaries

Investigation resumes from where it left off on re-run. Each phase
reports model used, estimated tokens, and clear next step."
```

---

## Task 11: Update analyze.md for 3-Layer Search

**Files:**
- Modify: `stronghold-of-security/commands/analyze.md`
- Modify: `stronghold-of-security/agents/context-auditor.md`

**Step 1: Update analyze.md agent prompts to use INDEX.md**

Replace "Analyze the ENTIRE codebase through your specific lens" with:

```markdown
=== STEP 1: READ YOUR INSTRUCTIONS ===
1. {AUDITOR_PATH} — Your full agent instructions
2. {FOCUS_MANIFEST_PATH} — Your KB loading manifest

=== STEP 2: READ CODEBASE INDEX ===
Read .audit/INDEX.md — identify files tagged with your focus area.
Prioritize files with high risk marker counts for your focus.

=== STEP 3: 3-LAYER SEARCH ===
Layer 1: You've read the index. Identify your 10-20 most relevant files.
Layer 2: For those files, read function signatures and struct definitions.
         Prioritize based on relevance to your focus.
Layer 3: Read full source ONLY for the 5-10 files needing deep analysis.
         For files with zero hot-spots for your focus, Layer 2 only.

=== STEP 4: READ KNOWLEDGE BASE ===
Read each file listed in your focus manifest.

=== STEP 5: READ HOT-SPOTS ===
Read .audit/HOT_SPOTS.md — find entries tagged with your focus area.
Analyze hot-spotted locations FIRST with extra scrutiny.
```

**Step 2: Update context-auditor.md for 3-layer methodology**

Add a section explaining the 3-layer search protocol to the agent template. Replace "Step 1: Discovery" with the 3-layer approach.

**Step 3: Commit**

```bash
git add -A
git commit -m "Integrate 3-layer search into Phase 1 agents

Agents read INDEX.md to identify relevant files, use layered loading
instead of reading entire codebase. Estimated 60-75% reduction in
per-agent codebase token consumption."
```

---

## Task 12: Update KB_MANIFEST Generation for New Structure

**Files:**
- Modify: `stronghold-of-security/commands/scan.md`

**Step 1: Update KB_MANIFEST format**

The scan phase generates KB_MANIFEST.md telling each phase what to load. Update it for the new structure:

- Phase 1 agents: Reference focus manifests instead of monolithic files. "Each agent reads its focus manifest from `knowledge-base/focus-manifests/NN-{focus}.md`"
- Phase 3 (strategy generation): Reference `PATTERNS_INDEX.md` for pattern matching, then individual pattern files for matches
- Phase 4 (investigation): Reference `PATTERNS_INDEX.md` + specific pattern files based on hypothesis category
- Phase 5 (report): Reference `core/severity-calibration.md`, `core/common-false-positives.md`, `PATTERNS_INDEX.md`

**Step 2: Remove references to old monolithic KB files**

Replace all references to `exploit-patterns-core.md`, `exploit-patterns-advanced.md`, etc. with references to the new structure.

**Step 3: Commit**

```bash
git add -A
git commit -m "Update KB_MANIFEST for new indexed pattern structure

References focus manifests and individual pattern files instead of
monolithic EP files. Each phase loads only what it needs."
```

---

## Task 13: Update strategize.md for New KB Structure

**Files:**
- Modify: `stronghold-of-security/commands/strategize.md`

**Step 1: Update Phase 3 KB loading**

Replace the current approach (load all 4 monolithic EP files) with:
1. Read `PATTERNS_INDEX.md` (~500 tokens)
2. Cross-reference against ARCHITECTURE.md findings to identify relevant EPs
3. Load only the specific individual pattern files for matched EPs
4. Still load `reference/audit-firm-findings.md` and `reference/bug-bounty-findings.md` (these aren't split)
5. Still load matched protocol playbooks

This should reduce Phase 3 KB load from ~300KB to ~50-100KB.

**Step 2: Commit**

```bash
git add -A
git commit -m "Optimize Phase 3 KB loading — index-first pattern matching

Reads PATTERNS_INDEX.md first, loads individual pattern files only for
EPs relevant to the codebase. ~60-70% KB token reduction for strategize."
```

---

## Task 14: Final Review + Cleanup

**Files:**
- All files in `stronghold-of-security/`

**Step 1: Full grep for consistency**

```bash
cd /Users/mlbob/Projects/SVK/.worktrees/sos-rework

# No remaining old references
grep -ri "the-fortress" --include="*.md" --include="*.sh" stronghold-of-security/ | grep -v archive/ | grep -v research/

# No remaining old focus area names used standalone
grep -ri "Account Validation" stronghold-of-security/commands/ stronghold-of-security/SKILL.md
grep -ri "Error Handling" stronghold-of-security/commands/ stronghold-of-security/SKILL.md

# All commands reference SOS: not the-fortress:
grep -r "the-fortress:" stronghold-of-security/

# Model parameter present in Task() calls
grep -r "model:" stronghold-of-security/commands/
```

**Step 2: Verify file structure**

```bash
# Expected structure
find stronghold-of-security/ -name "*.md" | sort | head -50
find stronghold-of-security/knowledge-base/patterns/ -name "EP-*.md" | wc -l  # Should be 128
ls stronghold-of-security/knowledge-base/focus-manifests/  # Should be 8 files
ls stronghold-of-security/commands/  # Should be 8 files (scan, index, analyze, strategize, investigate, report, verify, status)
ls stronghold-of-security/agents/  # Should be 5 files (auditor, investigator, lightweight-investigator, economic, synthesizer, quality-gate)
```

**Step 3: Update install.sh for new structure**

Make sure install.sh copies:
- The new `knowledge-base/patterns/` directory
- The new `knowledge-base/focus-manifests/` directory
- The new `knowledge-base/PATTERNS_INDEX.md`
- The `scripts/` directory (if we want users to have the splitter)
- Does NOT copy `knowledge-base/core/archive/`
- Does NOT copy `research/`

**Step 4: Final commit**

```bash
git add -A
git commit -m "Final cleanup and consistency verification for SOS v3.0"
```

---

## Task Summary

| Task | Description | Estimated Effort |
|------|-------------|-----------------|
| 1 | Rename directory + all references | Medium |
| 2 | Split 128 KB patterns into individual files | Medium-High |
| 3 | Create 8 focus manifests | Medium |
| 4 | Add /SOS:index command | Medium |
| 5 | Implement model selection | Medium |
| 6 | Orchestrator slimming + provides/requires routing | High |
| 7 | Context budget estimation + adaptive batching | Medium |
| 8 | Consolidate focus areas (10 → 8) | Medium |
| 9 | Enhanced /SOS:status dashboard | Low |
| 10 | Phase 4 resume support + progress reporting | Low-Medium |
| 11 | Update analyze.md for 3-layer search | Medium |
| 12 | Update KB_MANIFEST for new structure | Low-Medium |
| 13 | Update strategize.md for new KB structure | Low |
| 14 | Final review + cleanup | Low |

**Dependencies:**
- Task 1 must be first (all subsequent tasks work on renamed files)
- Task 2 must precede Tasks 3, 12, 13 (they reference the split pattern files)
- Task 4 must precede Task 11 (INDEX.md must exist for 3-layer search)
- Tasks 5, 6, 7, 8 can be done in any order relative to each other
- Task 14 must be last

**Parallelizable groups:**
- Tasks 3, 4, 5 (independent after Task 2)
- Tasks 6, 7, 8 (independent of each other)
- Tasks 9, 10, 11, 12, 13 (mostly independent)
