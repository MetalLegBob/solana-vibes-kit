---
name: SOS
version: "1.3.0"
description: >
  Stronghold of Security: Comprehensive adversarial security audit for Solana/Anchor smart contracts.
  Run /SOS for a getting-started guide, or /SOS:scan to begin an audit.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<!-- SVK Version Check — runs once per session on first skill invocation -->
<svk-version-check>
**On first invocation this session**, silently perform a version check:

1. Look for `.claude/svk-meta.json` in the current project. If it doesn't exist, skip this check entirely.
2. Read the `svk_repo` path and `installed_version` from the metadata file.
3. Run: `git -C <svk_repo> fetch --tags --quiet 2>/dev/null`
4. Run: `git -C <svk_repo> tag --sort=-v:refname | head -1` to get the latest tag.
5. Compare the installed version against the latest tag (strip the leading `v`).
6. If they match, skip — the user is up to date.
7. If the latest tag is newer, show this message ONCE (never repeat in this session):

> **SVK Update Available:** v{latest} is available (you're on v{installed}).
> - **Update now:** I can pull and reinstall the changed skills in this session
> - **Update later:** Start a new chat and run `/SVK:update`

8. If the git commands fail (offline, repo moved, etc.), skip silently. Never show errors from version checking.

**Important:** Do NOT block or delay the user's actual command. Perform this check, show the notification if needed, then proceed with the command they invoked.
</svk-version-check>

# Stronghold of Security

A comprehensive, multi-agent adversarial security audit pipeline for Solana/Anchor smart contracts.

> *"The best defense is a thorough offense."*

---

## Getting Started

Stronghold of Security runs as a multi-phase pipeline. Each phase is a separate command with its own fresh context window, ensuring maximum quality throughout the entire audit.

### Quick Start

```
/SOS:scan
```

This begins the audit by analyzing your codebase and generating a hot-spots map. Follow the prompts — each phase tells you what was produced and what command to run next.

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STRONGHOLD OF SECURITY v1.0                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /SOS:scan         Phase 0 + 0.25 + 0.5                    │
│  ═══════════════════        Pre-flight analysis                    │
│  Detect ecosystem, protocols, risk indicators                      │
│  Build codebase INDEX.md, generate KB manifest, run pre-scan       │
│  Output: INDEX.md, KB_MANIFEST.md, HOT_SPOTS.md                    │
│                          │                                          │
│                          ▼                                          │
│  /SOS:analyze      Phase 1 + 1.5                          │
│  ════════════════════       Parallel context building               │
│  8-9 specialized auditors analyze the ENTIRE codebase              │
│  Each through a different security lens                            │
│  Output: .audit/context/ (8-9 deep analysis files)                 │
│                          │                                          │
│                          ▼                                          │
│  /SOS:strategize   Phase 2 + 3                            │
│  ═════════════════════      Synthesis + strategy generation        │
│  Merge context into unified architecture                           │
│  Generate 50-100+ attack hypotheses from KB + novel analysis       │
│  Output: ARCHITECTURE.md, STRATEGIES.md                            │
│                          │                                          │
│                          ▼                                          │
│  /SOS:investigate  Phase 4 + 4.5                          │
│  ══════════════════════     Hypothesis investigation               │
│  Priority-ordered batch investigation                              │
│  Coverage verification against knowledge base                      │
│  Output: .audit/findings/ (one per hypothesis), COVERAGE.md        │
│                          │                                          │
│                          ▼                                          │
│  /SOS:report       Phase 5                                │
│  ═════════════════          Final synthesis                        │
│  Combination matrix, attack trees, severity calibration            │
│  Output: FINAL_REPORT.md                                           │
│                                                                     │
│  /SOS:verify       Post-fix verification                  │
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
| `/SOS` | This help guide |
| `/SOS:scan` | Scan codebase, detect config, generate KB manifest, build index, run static pre-scan |
| `/SOS:index` | Build codebase INDEX.md with per-file metadata and focus relevance |
| `/SOS:analyze` | Deploy 8-9 parallel context auditors + quality gate |
| `/SOS:strategize` | Synthesize context + generate prioritized attack strategies |
| `/SOS:investigate` | Investigate hypotheses in priority-ordered batches + coverage check |
| `/SOS:report` | Generate final report with combination analysis and attack trees |
| `/SOS:status` | Check audit progress and get next-step guidance |
| `/SOS:verify` | Verify fixes after addressing reported vulnerabilities |

### Typical Workflow

Run `/clear` between each phase to give the next phase a fresh context window. This is critical for quality — each phase produces large outputs that would otherwise consume context.

1. **`/SOS:scan`** — Analyze your codebase
2. `/clear`
3. **`/SOS:analyze`** — Deploy auditors
4. `/clear`
5. **`/SOS:strategize`** — Generate attack strategies
6. `/clear`
7. **`/SOS:investigate`** — Run investigations
8. `/clear`
9. **`/SOS:report`** — Generate final report
10. *(Fix vulnerabilities)*
11. **`/SOS:verify`** — Confirm fixes are effective

Check progress anytime with **`/SOS:status`**.

---

## Audit Tiers

| Tier | Focus Areas | Strategies | Best For |
|------|-------------|------------|----------|
| `quick` | 4 | 25-40 | Rapid sanity check, small changes, < 10 files |
| `standard` | 8 | 50-75 | Normal audits, medium codebases, 10-50 files |
| `deep` | 8+ | 100-150 | Pre-mainnet, high-value protocols, 50+ files |

The tier is auto-detected based on codebase size and complexity. Override with:
```
/SOS:scan --tier deep
```

---

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
  INDEX.md              — Structured codebase index with focus relevance tags
  KB_MANIFEST.md        — Knowledge base loading manifest
  HOT_SPOTS.md          — Phase 0.5 static pre-scan results
  context/              — 8-9 deep context analyses
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
cp -R stronghold-of-security/ your-project/.claude/skills/stronghold-of-security/
cp -R stronghold-of-security/commands/ your-project/.claude/commands/SOS/

# Option 2: Install script
./stronghold-of-security/install.sh your-project/
```

Both the `skills/` and `commands/` directories are required:
- `skills/stronghold-of-security/` — Skill definition, agents, knowledge base, resources
- `commands/SOS/` — Subcommand orchestration files

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
