---
name: the-fortress
version: "2.0.0"
description: >
  The Fortress: Comprehensive adversarial security audit for Solana/Anchor smart contracts.
  Run /the-fortress for a getting-started guide, or /the-fortress:scan to begin an audit.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# The Fortress

A comprehensive, multi-agent adversarial security audit pipeline for Solana/Anchor smart contracts.

> *"The best defense is a thorough offense."*

---

## Getting Started

The Fortress runs as a multi-phase pipeline. Each phase is a separate command with its own fresh context window, ensuring maximum quality throughout the entire audit.

### Quick Start

```
/the-fortress:scan
```

This begins the audit by analyzing your codebase and generating a hot-spots map. Follow the prompts — each phase tells you what was produced and what command to run next.

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE FORTRESS v2.0                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /the-fortress:scan         Phase 0 + 0.5                          │
│  ═══════════════════        Pre-flight analysis                    │
│  Detect ecosystem, protocols, risk indicators                      │
│  Generate KB manifest, run static pre-scan                         │
│  Output: KB_MANIFEST.md, HOT_SPOTS.md                              │
│                          │                                          │
│                          ▼                                          │
│  /the-fortress:analyze      Phase 1 + 1.5                          │
│  ════════════════════       Parallel context building               │
│  10-11 specialized auditors analyze the ENTIRE codebase            │
│  Each through a different security lens                            │
│  Output: .audit/context/ (10-11 deep analysis files)               │
│                          │                                          │
│                          ▼                                          │
│  /the-fortress:strategize   Phase 2 + 3                            │
│  ═════════════════════      Synthesis + strategy generation        │
│  Merge context into unified architecture                           │
│  Generate 50-100+ attack hypotheses from KB + novel analysis       │
│  Output: ARCHITECTURE.md, STRATEGIES.md                            │
│                          │                                          │
│                          ▼                                          │
│  /the-fortress:investigate  Phase 4 + 4.5                          │
│  ══════════════════════     Hypothesis investigation               │
│  Priority-ordered batch investigation                              │
│  Coverage verification against knowledge base                      │
│  Output: .audit/findings/ (one per hypothesis), COVERAGE.md        │
│                          │                                          │
│                          ▼                                          │
│  /the-fortress:report       Phase 5                                │
│  ═════════════════          Final synthesis                        │
│  Combination matrix, attack trees, severity calibration            │
│  Output: FINAL_REPORT.md                                           │
│                                                                     │
│  /the-fortress:verify       Post-fix verification                  │
│  ═════════════════          (after developer applies fixes)        │
│  Re-check findings, regression scan                                │
│  Output: VERIFICATION_REPORT.md                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/the-fortress` | This help guide |
| `/the-fortress:scan` | Scan codebase, detect config, generate KB manifest, run static pre-scan |
| `/the-fortress:analyze` | Deploy 10-11 parallel context auditors + quality gate |
| `/the-fortress:strategize` | Synthesize context + generate prioritized attack strategies |
| `/the-fortress:investigate` | Investigate hypotheses in priority-ordered batches + coverage check |
| `/the-fortress:report` | Generate final report with combination analysis and attack trees |
| `/the-fortress:status` | Check audit progress and get next-step guidance |
| `/the-fortress:verify` | Verify fixes after addressing reported vulnerabilities |

### Typical Workflow

1. **`/the-fortress:scan`** — Analyze your codebase (~2 min)
2. **`/the-fortress:analyze`** — Deploy auditors (~5-15 min depending on codebase size)
3. **`/the-fortress:strategize`** — Generate attack strategies (~3-5 min)
4. **`/the-fortress:investigate`** — Run investigations (~10-30 min depending on strategy count)
5. **`/the-fortress:report`** — Generate final report (~3-5 min)
6. *(Fix vulnerabilities)*
7. **`/the-fortress:verify`** — Confirm fixes are effective

Check progress anytime with **`/the-fortress:status`**.

---

## Audit Tiers

| Tier | Focus Areas | Strategies | Best For |
|------|-------------|------------|----------|
| `quick` | 5 | 25-40 | Rapid sanity check, small changes, < 10 files |
| `standard` | 10 | 50-75 | Normal audits, medium codebases, 10-50 files |
| `deep` | 10+ | 100-150 | Pre-mainnet, high-value protocols, 50+ files |

The tier is auto-detected based on codebase size and complexity. Override with:
```
/the-fortress:scan --tier deep
```

---

## Focus Areas

The 10 parallel context auditors each analyze through one lens:

1. **Access Control** — Authority, signer checks, role matrices
2. **Arithmetic** — Overflow, precision loss, rounding
3. **State Machine** — Transitions, race conditions, invariants
4. **CPI & External** — Cross-program invocation, program validation
5. **Token & Economic** — Token flows, economic invariants, MEV
6. **Account Validation** — PDA derivation, type cosplay, ownership
7. **Oracle & Data** — Price feeds, staleness, manipulation
8. **Upgrade & Admin** — Upgradeability, admin functions, timelocks
9. **Error Handling** — Panics, error propagation, DoS
10. **Timing & Ordering** — Front-running, transaction ordering, atomicity

Plus a conditional **Economic Model Analyzer** for DeFi protocols.

---

## Knowledge Base

128 exploit patterns across 17 files (~480KB), built from 200+ research searches across 10 waves:

| Category | Files | Content |
|----------|-------|---------|
| **Core** | 7 files | 128 EPs with CVSS, PoC outlines, detection rules, fix patterns |
| **Solana** | 4 files | Anchor gotchas, runtime quirks, vulnerable deps, token extensions |
| **Protocols** | 7 files | AMM/DEX, lending, staking, bridge, NFT, oracle, governance playbooks |
| **Reference** | 2 files | Bug bounty findings, audit firm patterns |

### Key Incidents Covered

Wormhole ($320M), Mango Markets ($114M), Cashio ($52M), Crema Finance ($8.7M), MarginFi ($160M), Solend ($1.26M), Step Finance ($30-40M), Candy Machine V2 CVE, Metaplex pNFT bypasses, pump.fun exploits, Agave validator crashes, Ed25519 offset bypass, and 100+ more.

---

## Output Structure

All audit outputs go to `.audit/`:

```
.audit/
  KB_MANIFEST.md        — Knowledge base loading manifest
  HOT_SPOTS.md          — Phase 0.5 static pre-scan results
  context/              — 10-11 deep context analyses
  ARCHITECTURE.md       — Unified architecture understanding
  STRATEGIES.md         — Generated attack hypotheses
  findings/             — Individual investigation results
  COVERAGE.md           — Coverage verification report
  FINAL_REPORT.md       — The complete audit report
  VERIFICATION_REPORT.md — Post-fix verification (after /verify)
  PROGRESS.md           — Human-readable progress tracking
  STATE.json            — Machine-readable audit state
```

---

## Why Phase-Based?

Each phase runs as a separate command with a **fresh context window**. This is critical for quality:

- **Phase 1 agents** produce 300-500KB of analysis each (~3-5MB total)
- **No single context window** can hold all of that for synthesis
- Each phase reads only what it needs (e.g., Phase 2 reads ~88KB of condensed summaries, not ~3.7MB of full analysis)
- Investigators in Phase 4 can deep-dive into specific focus areas' full analysis when needed
- **Result:** Higher quality at every stage of the pipeline

---

## Installation

Copy the skill and commands to your project:

```bash
# Option 1: Manual copy
cp -R the-fortress/ your-project/.claude/skills/the-fortress/
cp -R the-fortress/commands/ your-project/.claude/commands/the-fortress/

# Option 2: Install script
./the-fortress/install.sh your-project/
```

Both the `skills/` and `commands/` directories are required:
- `skills/the-fortress/` — Skill definition, agents, knowledge base, resources
- `commands/the-fortress/` — Subcommand orchestration files

---

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- A Solana/Anchor codebase to audit
- Optional: [semgrep](https://semgrep.dev/) for enhanced Phase 0.5 scanning

---

## Non-Goals

This skill does NOT:
- Generate exploit code
- Automatically fix vulnerabilities
- Replace human auditor judgment
- Guarantee completeness

The output is a comprehensive starting point for security hardening, not a certification of security. Security is a continuous process, not a one-time event.
