# Stronghold of Security

A comprehensive adversarial security audit system for Solana/Anchor smart contracts, built as a Claude Code skill.

## What It Does

Stronghold of Security performs a multi-phase security audit by deploying parallel specialized agents to analyze your codebase through different security lenses, then synthesizes findings into a prioritized report with attack trees and fix recommendations.

## Pipeline Overview

Each phase runs as a separate command with a fresh context window for maximum quality:

```
/SOS:scan         → Analyze codebase, detect protocols, generate hot-spots map
  └ /SOS:index    → Build structured codebase INDEX.md (runs automatically)
        │
        ▼
/SOS:analyze      → Deploy 8-9 parallel context auditors
        │
        ▼
/SOS:strategize   → Synthesize findings, generate 50-100+ attack hypotheses
        │
        ▼
/SOS:investigate  → Investigate hypotheses in priority-ordered batches
        │
        ▼
/SOS:report       → Generate final report with attack trees & severity calibration
        │
        ▼
/SOS:verify       → (After fixes) Verify vulnerabilities are resolved
```

Check progress anytime: `/SOS:status`

## Commands

| Command | Description |
|---------|-------------|
| `/stronghold-of-security` | Getting-started guide and command reference |
| `/SOS:scan` | Phase 0+0.25+0.5: Scan codebase, build index, generate KB manifest, static pre-scan |
| `/SOS:index` | Build codebase INDEX.md with per-file metadata and focus relevance tags |
| `/SOS:analyze` | Phase 1+1.5: Deploy 8-9 parallel context auditors + quality gate |
| `/SOS:strategize` | Phase 2+3: Synthesize context + generate attack strategies |
| `/SOS:investigate` | Phase 4+4.5: Investigate hypotheses + coverage verification |
| `/SOS:report` | Phase 5: Final report with combination analysis and attack trees |
| `/SOS:status` | Check audit progress and get next-step guidance |
| `/SOS:verify` | Verify fixes after addressing reported vulnerabilities |

## Smart Model Selection

Each phase uses the optimal model for its task type:

| Model | Phases | Why |
|-------|--------|-----|
| **Opus** | Strategize, Report | Creative synthesis, novel discovery, cross-cutting reasoning |
| **Sonnet** | Phase 1 (default), Investigate (Tier 1+2), Verify | Structured analysis guided by KB and hot-spots |
| **Haiku** | Index, Quality Gate, Investigate (Tier 3) | Mechanical extraction, confirm/deny checks |

During `/SOS:scan`, you choose the Phase 1 model (Opus or Sonnet). All other model assignments are automatic. Deep tier defaults to Opus for Phase 1; quick tier defaults to Sonnet.

## Knowledge Base

128 exploit patterns as individual indexed files, built from 200+ Exa research searches across 10 research waves:

| Category | Content |
|----------|---------|
| **Patterns** | 128 individual EP files organized by category (account-validation, arithmetic, oracle, CPI, etc.) |
| **PATTERNS_INDEX.md** | Lightweight master catalog (~500 tokens) — agents read this first, then load individual files |
| **Focus Manifests** | 8 per-focus loading lists — each agent loads only the 10-25 EPs relevant to its focus area |
| **Solana** | Anchor version gotchas, runtime quirks, known vulnerable deps, token extensions |
| **Protocols** | AMM/DEX, lending, staking, bridge, NFT, oracle, governance attack playbooks |
| **Reference** | Bug bounty findings, audit firm patterns |
| **Core** | Severity calibration, secure patterns, common false positives |

### Key Incidents Covered

- Wormhole ($320M), Mango Markets ($114M), Cashio ($52M), Crema Finance ($8.7M)
- MarginFi ($160M), Solend ($1.26M), Step Finance ($30-40M)
- Candy Machine V2 CVE, Metaplex pNFT bypasses, pump.fun exploits
- Agave validator crashes, Ed25519 offset bypass, multi-client divergence risks
- And 100+ more across DeFi, NFT, gaming, bridge, and infrastructure

## Focus Areas

The 8 parallel context auditors each analyze through one lens:

1. **Access Control & Account Validation** — Authority, signer checks, PDA derivation, type cosplay, ownership
2. **Arithmetic Safety** — Overflow, precision loss, rounding
3. **State Machine & Error Handling** — Transitions, race conditions, invariants, panic paths, error propagation
4. **CPI & External Calls** — Cross-program invocation, program validation, privilege propagation
5. **Token & Economic** — Token flows, economic invariants, MEV
6. **Oracle & External Data** — Price feeds, staleness, manipulation
7. **Upgrade & Admin** — Upgradeability, admin functions, timelocks
8. **Timing & Ordering** — Front-running, transaction ordering, atomicity

Plus a conditional **Economic Model Analyzer** for DeFi protocols.

## File Structure

```
stronghold-of-security/
  SKILL.md                          # Help/router — run /stronghold-of-security for guide
  commands/
    scan.md                         # Phase 0+0.25+0.5 orchestration
    index.md                        # Standalone codebase indexer
    analyze.md                      # Phase 1+1.5 orchestration
    strategize.md                   # Phase 2+3 orchestration
    investigate.md                  # Phase 4+4.5 orchestration
    report.md                       # Phase 5 orchestration
    status.md                       # Progress checker
    verify.md                       # Post-fix verification
  agents/
    context-auditor.md              # Phase 1 agent template
    economic-model-analyzer.md      # Conditional DeFi agent
    hypothesis-investigator.md      # Phase 4 investigation agent (Tier 1+2)
    lightweight-investigator.md     # Phase 4 lightweight agent (Tier 3, Haiku)
    quality-gate.md                 # Phase 1.5 validation agent
    final-synthesizer.md            # Phase 5 synthesis agent
  knowledge-base/
    PATTERNS_INDEX.md               # Master catalog of 128 exploit patterns
    patterns/                       # 128 individual pattern files by category
    focus-manifests/                # Per-focus KB loading lists (8 files)
    core/                           # Severity calibration, secure patterns, false positives
    solana/                         # Solana/Anchor-specific knowledge
    protocols/                      # Protocol-type attack playbooks
    reference/                      # Bug bounty and audit firm findings
  resources/
    focus-areas.md                  # Per-focus enrichment (8 areas x 9 sections)
    phase-05-patterns.md            # Grep pattern catalog for static pre-scan
    semgrep-rules/
      solana-anchor.yaml            # Custom Solana/Anchor semgrep rules
  templates/
    ARCHITECTURE.md                 # Phase 2 output template
    STRATEGIES.md                   # Phase 3 output template
    FINAL_REPORT.md                 # Phase 5 report template
    VERIFICATION_REPORT.md          # Verification report template
  research/                         # Raw research from 10 waves of Exa deep-dives
```

## Installation

Copy this directory into your project's `.claude/` directories:

```bash
# Both skills/ and commands/ directories are required

# 1. Copy the skill (agents, KB, resources, templates)
mkdir -p your-project/.claude/skills/stronghold-of-security
cp -R agents knowledge-base resources templates SKILL.md your-project/.claude/skills/stronghold-of-security/

# 2. Copy the commands (subcommand orchestration)
mkdir -p your-project/.claude/commands/stronghold-of-security
cp commands/*.md your-project/.claude/commands/stronghold-of-security/
```

Or use the install script:
```bash
./install.sh your-project/
```

### Why Two Directories?

- `.claude/skills/stronghold-of-security/` — Skill definition (SKILL.md), agent templates, knowledge base, and resources. This is what `/stronghold-of-security` loads.
- `.claude/commands/stronghold-of-security/` — Subcommand files. This is what `/SOS:scan`, `/SOS:analyze`, etc. load. Each gets a fresh context window.

## Usage

### Running an Audit

```
/SOS:scan
```

Follow the prompts. Each phase tells you what was produced and what command to run next.

### Audit Tiers

| Tier | Strategies | Agents | Use Case |
|------|-----------|--------|----------|
| Quick | 25-40 | 4 | Fast pre-commit check |
| Standard | 50-75 | 8-9 | Pre-launch audit |
| Deep | 100-150 | 8-9 | Full security review |

### Output

The audit produces files in `.audit/`:

```
.audit/
  INDEX.md              — Structured codebase index with focus relevance tags
  KB_MANIFEST.md        — Knowledge base loading manifest
  HOT_SPOTS.md          — Phase 0.5 static scan results
  context/              — 8-9 focus area context documents
  ARCHITECTURE.md       — Unified architecture understanding
  STRATEGIES.md         — Generated attack hypotheses
  findings/             — Individual investigation results
  COVERAGE.md           — Coverage verification report
  FINAL_REPORT.md       — Prioritized findings with attack trees
  VERIFICATION_REPORT.md — Post-fix verification results
  PROGRESS.md           — Human-readable progress tracking
  STATE.json            — Machine-readable audit state
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- A Solana/Anchor codebase to audit
- Optional: [semgrep](https://semgrep.dev/) for enhanced Phase 0.5 scanning

## Architecture: Why Phase-Based?

Each phase runs as a separate command with its own fresh context window. This is critical:

- Phase 1 agents produce **300-500KB of analysis each** (~3-5MB total for a large codebase)
- No single context window can synthesize all of that
- Each phase reads only what it needs (Phase 2 reads ~64-72KB of condensed summaries, not ~3.7MB)
- Phase 4 investigators can deep-dive specific focus areas when needed
- **Result:** Higher quality at every stage of the pipeline

### Key v3.0 Optimizations

- **3-Layer Search:** Agents read INDEX.md first (Layer 1), then function signatures (Layer 2), then full source only for high-relevance files (Layer 3). ~60-75% reduction in per-agent codebase token consumption.
- **Provides/Requires Routing:** Phase 1 agents tag their output with `provides` fields. Phase 4 investigators receive only the 1-3 context files matching each hypothesis's `requires` — not all 8-9.
- **Context Budget Estimation:** Token cost estimated before spawning agents. Adaptive batch sizing (3-8 agents) based on estimate. Auto-splits agents exceeding 120K tokens.
- **Phase 4 Resume:** Investigation resumes from where it left off on re-run. File-based detection — if a finding file exists, that strategy is skipped.
- **Index-First KB Loading:** Phase 3 reads PATTERNS_INDEX.md (~500 tokens) first, then loads only the individual pattern files relevant to the codebase. ~60-70% KB token reduction.

## Research

The `research/` directory contains raw research notes from 10 waves of investigation that built the knowledge base:

- Wave 1-5: Core Solana vulnerabilities, DeFi patterns, exploit history
- Wave 6: Gaming exploits, NFT attacks, MEV data, wallet drainers
- Wave 7: Bridge exploits, flash loans, governance attacks, reentrancy
- Wave 8: Protocol-specific deep dives (Raydium, Orca, Solend, Wormhole, Metaplex)
- Wave 9: Academic papers, security tooling, Agave 3.0, validator vulnerabilities
- Wave 10: Gap analysis, 2026 incidents, accuracy verification
