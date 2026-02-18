# Solana Vibes Kit (SVK)

A collection of Claude Code skills for development on Solana.

## Skills

### [SVK Setup](svk-setup/)

A guided onboarding skill that interviews users about their experience and project scope, recommends tools from a tiered catalog, walks through installation, and generates a personalized reference document. The first thing a new SVK user runs.

**Features:**
- 4-phase pipeline: interview → recommend → install → reference
- 5-7 question adaptive interview producing beginner/intermediate/advanced profiles
- 28-tool catalog across 10 categories with 3 tiers (essential/recommended/optional)
- Choice groups for search (Brave/Exa/stacked) and memory (CMEM/Supermemory)
- Personalized reference doc with use cases tailored to project type

### [Grand Library](grand-library/)

A full-stack documentation skill that transforms project ideas into comprehensive specification suites. Eliminates coin-flip decisions by making every choice explicit, validated, and written down.

**Features:**
- 4-phase pipeline: survey → interview → draft → reconcile — each phase gets a fresh context window
- Adaptive interview engine with topic-tree pruning and research-backed options for micro-decisions
- Wave-based document generation with Opus subagents and user validation gates
- 4-pass reconciliation: completeness, consistency, gap analysis, and verification audit
- Creative doc discovery — suggests non-obvious documents you wouldn't think to write
- Solana domain pack with 97 pre-researched knowledge files across 18 categories
- Forkable repo catalogue with 80+ curated open source repos — fork-opportunity detection during interviews, `/GL:repos` browser with live verification

### [Stronghold of Security](stronghold-of-security/)

A comprehensive adversarial security audit system for Solana/Anchor smart contracts. Uses parallel multi-agent analysis with a 128-pattern exploit knowledge base built from 200+ real-world incidents.

**Features:**
- Phase-based pipeline with 7 subcommands — each phase gets a fresh context window for maximum quality
- 10+ specialized security agents analyzing through different lenses (access control, arithmetic, state machine, CPI, token economics, oracle, etc.)
- 128 exploit patterns with CVSS scoring, PoC outlines, and fix recommendations
- Protocol-specific playbooks (AMM/DEX, lending, staking, bridge, NFT, oracle, governance)
- Attack trees, combination matrix analysis, and severity re-calibration
- Condensed summary system for efficient cross-phase synthesis

### [SVK Update](svk-update/)

Check for and install SVK updates. Compares your installed version against the latest release and selectively reinstalls only the skills that changed.

## Awareness Layer (Hook + MCP)

SVK includes a project awareness layer that makes skill artifacts visible across sessions and tools:

- **SessionStart Hook** — Injects a brief SVK project status summary when you start a new Claude Code session. Shows in-progress audits, documentation status, and next steps. Zero cost when no SVK state exists.
- **SVK MCP Server** — Exposes 8 tools for querying SVK artifacts:
  - `svk_project_status` — Current state of all active skills
  - `svk_get_doc` — Retrieve GL-generated documentation
  - `svk_get_decisions` — Retrieve architectural decisions
  - `svk_get_audit` — Retrieve SOS audit findings and reports
  - `svk_search` — Full-text search across all SVK artifacts
  - `svk_suggest` — Get recommendations for what to run next
  - `svk_list_knowledge` — Catalog SVK knowledge bases (exploit patterns, domain packs, core docs)
  - `svk_read_knowledge` — Read specific knowledge files by skill and path

### Manual Installation

The awareness layer is installed automatically during `/SVK-setup:install`. For manual installation:

```bash
cd /path/to/SVK
./svk-mcp/install.sh /path/to/your/project
```

## Installation

These skills are designed for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# Install SVK Setup
cd svk-setup && ./install.sh /path/to/your-project

# Install Grand Library
cd grand-library && ./install.sh /path/to/your-project

# Install Stronghold of Security
cd stronghold-of-security && ./install.sh /path/to/your-project

# Install SVK Update
cd svk-update && ./install.sh /path/to/your-project
```

## Updating

SVK uses unified versioning — all skills share one version number.

When you use any SVK skill, it automatically checks for updates once per session. If a new version is available, you'll see a notification with the option to update immediately or later.

To manually check for updates, run `/SVK:update` in any project where SVK is installed.

## License

MIT
