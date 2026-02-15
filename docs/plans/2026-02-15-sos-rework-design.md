# Stronghold of Security — Rework Design

**Date:** 2026-02-15
**Status:** Approved
**Scope:** Full rework of The Fortress → Stronghold of Security with Foundation pattern alignment

---

## Goals

1. Rename "The Fortress" to "Stronghold of Security" with `/SOS:` commands
2. Fix prompt-too-long errors occurring across multiple phases
3. Reduce token usage by ~80-85% through structural optimizations and smart model selection
4. Align implementation with all 5 SVK Foundation Patterns

---

## 1. Rename & Command Structure

**Display name:** "Stronghold of Security" everywhere (READMEs, docs, reports, templates)
**Commands:** `/SOS:` prefix

```
/SOS              → full audit (orchestrator sequences all phases)
/SOS:scan         → Phase 0+0.5: Pre-flight + static pre-scan
/SOS:index        → NEW: Build codebase INDEX.md (standalone, reusable)
/SOS:analyze      → Phase 1+1.5: Parallel context auditors
/SOS:strategize   → Phase 2+3: Synthesis + strategy generation
/SOS:investigate  → Phase 4+4.5: Hypothesis investigation
/SOS:report       → Phase 5: Final report with attack trees
/SOS:verify       → Post-fix verification
/SOS:status       → Enhanced progress dashboard
```

**Files to touch:** SKILL.md, README.md, all 7 command files, all 4 agent templates, all 4 report templates, Documents/Skill_Foundation.md references, root README.md.

**Output directory:** Stays `.audit/` (no branding needed in working files).

**Handoff frontmatter:** `skill: stronghold-of-security`

---

## 2. Knowledge Base Restructuring

**Problem:** 128 exploit patterns packed into 4 monolithic files. Every Phase 1 agent loads all of them — 80-120KB per agent. Agents load patterns irrelevant to their focus area.

**Solution:** Split into indexed individual files with per-focus loading manifests.

```
knowledge-base/
├── PATTERNS_INDEX.md              ← ~500 tokens, master catalog
├── patterns/                      ← 128 individual pattern files
│   ├── account-validation/
│   │   ├── EP-001-missing-signer-check.md
│   │   ├── EP-002-missing-owner-check.md
│   │   └── ...
│   ├── arithmetic/
│   │   ├── EP-015-integer-overflow.md
│   │   └── ...
│   ├── cpi/
│   ├── state-machine/
│   ├── token-economic/
│   ├── oracle/
│   ├── upgrade-admin/
│   ├── error-handling/
│   ├── timing-ordering/
│   └── account-general/
├── focus-manifests/               ← NEW: per-focus KB loading lists
│   ├── 01-access-control.md       ← "Load these 15 patterns + these core files"
│   ├── 02-arithmetic.md           ← "Load these 12 patterns + these core files"
│   └── ... (one per focus area)
├── core/                          ← Stays: non-pattern reference files
│   ├── secure-patterns.md
│   ├── common-false-positives.md
│   └── severity-calibration.md
├── solana/                        ← Stays as-is
├── protocols/                     ← Stays as-is
└── reference/                     ← Stays as-is
```

**Focus manifests** list ~12-20 patterns relevant to each focus area plus which core/solana/protocol files to load. Agent KB load drops from 80-120KB to **15-30KB**.

**PATTERNS_INDEX.md** is a one-liner-per-pattern catalog (~500 tokens). Phase 3 reads this to match patterns to architecture, loads full files only for matches.

**Migration:** Script to split the 4 monolithic files, auto-categorize by EP numbering and category tags, generate index + focus manifests. Review each pattern during split for outdated/redundant content.

---

## 3. Phase 0 Enhancement — INDEX.md & 3-Layer Search

**Problem:** Every Phase 1 agent reads all 27,000 lines of source code (~80K tokens per agent x 10+ agents = 800K+ tokens of duplicated reads).

**Solution:** New `/SOS:index` command generates a structural codebase index. Agents use 3-layer search to load only what they need.

### INDEX.md Format

```markdown
---
generated: 2026-02-15
total_files: 95
total_loc: 27000
programs: [amm, tax-program, staking, epoch, transfer-hook]
---

## programs/tax-program/src/instructions/swap_sol_buy.rs
- LOC: 420
- Structs: SwapSolBuyAccounts
- Functions: swap_sol_buy, distribute_tax
- External calls: amm_program::swap, staking_program::deposit_rewards
- Risk markers: raw_account_info(5), cpi_calls(4), seeds(2)
- Focus relevance: [cpi, token-economic, access-control]
```

**Focus relevance tags** are the key addition — the indexer tags each file with which focus areas it's most relevant to based on risk markers and content signals. Each Phase 1 agent gets a filtered file list.

### 3-Layer Search Protocol

- **Layer 1:** Agent reads INDEX.md (~1,500 tokens). Identifies 10-20 relevant files.
- **Layer 2:** Agent reads function signatures + struct definitions for those files (~200-500 tokens per file). Prioritizes.
- **Layer 3:** Agent reads full source only for the 5-10 files needing deep analysis.

**Token impact:** Agent codebase input drops from ~80K to ~20-40K tokens. Across 8 agents: **~400-600K tokens saved in Phase 1 alone.**

**Standalone value:** `/SOS:index` produces a reusable artifact. Other SVK skills can consume the same INDEX.md.

**Model:** Haiku — this is mechanical extraction (structs, functions, risk markers), not reasoning.

---

## 4. Model Selection Strategy

**Problem:** No model selection anywhere. Every agent inherits user's default (Opus). 100+ hypothesis investigators all running Opus for structured code tracing.

**Solution:** Skill auto-selects per phase. User chooses for Phase 1.

| Phase | Default Model | Rationale |
|-------|--------------|-----------|
| 0 (scan) | Sonnet | Pattern matching, categorization |
| 0 (index) | Haiku | Mechanical extraction |
| 1 (analyze) | **User choice** | See below |
| 1.5 (quality gate) | Haiku | Checklist validation |
| 2+3 (strategize) | Opus | Creative synthesis, novel strategies |
| 4 (investigate) | Sonnet | Structured code tracing with clear output format |
| 4.5 (coverage) | Sonnet | Systematic gap checking |
| 5 (report) | Opus | Combination matrix, attack trees |
| verify | Sonnet | Diff comparison, fix verification |

### Phase 1 User Choice

Presented after `/SOS:scan` completes:

```
Phase 1 model selection:
  → Opus (recommended for deep tier): Maximum novel discovery,
    strongest cross-file reasoning. Higher cost.
  → Sonnet: Strong structured analysis guided by KB and hot-spots.
    ~50-60% cheaper. Slightly weaker on novel/creative findings.
```

Defaults: Opus for `deep` tier, Sonnet for `quick` tier, user choice for `standard`.

Phase 1 choice stored in `.audit/STATE.json`.

### Tier 3 Lightweight Investigation

For deep tier audits with 100+ hypotheses: Tier 1 and Tier 2 get full Sonnet investigation. Tier 3 gets Haiku with condensed context — confirm/deny only, no full writeup. Keeps deep audits from ballooning.

---

## 5. Provides/Requires Routing

**Problem:** Phase handoffs are hardcoded. Phase 4 investigators get all Phase 1 context files when they only need 1-3 relevant ones.

**Solution:** Automatic routing via frontmatter matching.

### Agent Output Frontmatter

```yaml
---
task_id: sos-phase1-cpi-analysis
provides: [cpi-findings, privilege-escalation-map, cpi-call-graph]
focus_area: cpi
files_analyzed: [swap_sol_buy.rs, swap_sol_sell.rs, ...]
finding_count: 7
severity_breakdown: {critical: 2, high: 3, medium: 1, low: 1}
---
```

### Routing Logic

When spawning a Phase 4 investigator for hypothesis H023:
1. Read H023's `requires: [cpi-findings, access-control-findings]`
2. Scan Phase 1 output frontmatter for matching `provides`
3. Pass only matching context files (1-3) to the investigator

**Token impact:** Each investigator gets targeted context instead of all 8 files.

---

## 6. Orchestrator Slimming

**Problem:** Command files are 200+ lines of inline instructions. Orchestrator context fills up from its own instructions.

**Solution:** Command files become thin coordination (~50-80 lines):
- Read STATE.json
- Determine what to spawn
- Spawn agents with: agent template path + relevant file paths
- Collect results, update state

All domain logic (quality criteria, output formats, investigation methodology) moves into agent template files that only the spawned agents read. The orchestrator passes file paths, never reads the templates itself.

---

## 7. Context Budget Estimation & Adaptive Batching

**Problem:** Fixed batches of 5 agents. Prompt-too-long errors on large codebases with heavy KB.

### Context Budget Estimation

Each command estimates token cost before spawning:

```
Per agent budget:
  Agent template:     ~3,000 tokens (fixed)
  Focus manifest KB:  ~8,000-15,000 tokens (known from manifest)
  Index + file reads: ~10,000-20,000 tokens (estimated from INDEX.md LOC)
  Hot-spots section:  ~1,000-3,000 tokens (known from HOT_SPOTS.md size)
  ────────────────
  Estimated total:    ~22,000-41,000 tokens
```

### Adaptive Batching

Calculate batch size based on estimated per-agent prompt size:
- Small agents (quick tier): batch 8-10
- Medium agents (standard tier): batch 5-6
- Large agents (deep tier, heavy KB): batch 3-4

Goal: total prompt tokens across all agents in a batch stays under the limit.

### Auto-Split for Large Scopes

If estimated total for one agent exceeds 120K tokens, automatically split that agent's file list across two agents covering the same focus area. Two Access Control agents each covering half the files is better than one that blows up.

### Graceful Degradation

If investigation count exceeds 100, Tier 3 hypotheses get lightweight Haiku checks instead of full Sonnet investigation.

---

## 8. Focus Area Consolidation (10 → 8)

**Merges:**

### Account Validation → Access Control
Account validation (PDA checks, owner checks) is fundamentally an access control concern. A merged agent sees the full picture: "this account has no signer check AND no PDA constraint" — reasons about the combination immediately instead of relying on synthesis.

### Error Handling → State Machine
An unchecked Result that leaves state half-updated is a state machine concern. Merged agent traces the full path: "if this fails here, what state do we end up in?"

### Final 8 Focus Areas

1. **Access Control & Account Validation** — Authority, signer checks, PDA derivation, type cosplay, ownership
2. **Arithmetic Safety** — Overflow, precision loss, rounding
3. **State Machine & Error Handling** — Transitions, race conditions, invariants, panic paths, error propagation
4. **CPI & External Calls** — Cross-program invocation, program validation, privilege propagation
5. **Token & Economic** — Token flows, economic invariants, MEV
6. **Oracle & External Data** — Price feeds, staleness, manipulation
7. **Upgrade & Admin** — Upgradeability, admin functions, timelocks
8. **Timing & Ordering** — Front-running, transaction ordering, atomicity

Plus conditional **Economic Model Analyzer** for DeFi protocols.

**Impact:** 20% fewer Phase 1 agents, fewer duplicate findings for synthesis, cleaner agent boundaries.

---

## 9. Enhanced Status Dashboard & Resume Support

### `/SOS:status` Dashboard

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

### Phase 4 Resume Support

On re-run, the orchestrator checks `.audit/findings/` for existing hypothesis files. Already-investigated hypotheses are skipped. Allows safe resume after interruption.

### Progress Reporting Between Phases

Each phase outputs a clear summary before recommending `/clear`:
- How many agents completed
- Key stats (findings count, severity breakdown)
- Estimated tokens used
- What's next

---

## 10. Estimated Token Impact

### Per-Phase Comparison (27K LOC deep audit)

| Phase | Current | After Rework | Saving |
|-------|---------|-------------|--------|
| Phase 0+index | ~30K | ~40K | -10K (investment) |
| Phase 1 (8 agents vs 10) | ~2.5M | ~500K | **~80%** |
| Phase 2+3 | ~200K | ~150K | ~25% |
| Phase 4 (100 hypotheses) | ~15M | ~4M | **~73%** |
| Phase 5 | ~120K | ~100K | ~17% |
| **Total** | **~17.8M** | **~4.8M** | **~73%** |

Additional savings from Sonnet/Haiku pricing on applicable phases brings real cost reduction to **~80-85%**.

---

## Implementation Order

1. **Rename** — all references from The Fortress → Stronghold of Security, commands → `/SOS:`
2. **KB restructuring** — split 128 patterns into individual files, create index + focus manifests
3. **INDEX.md generation** — new `/SOS:index` command with 3-layer search
4. **Model selection + orchestrator slimming + provides/requires routing**
5. **Context budgeting + adaptive batching**
6. **Focus area consolidation** (10 → 8)
7. **Status dashboard + resume support + progress reporting**
8. **Testing** against 27K LOC codebase
