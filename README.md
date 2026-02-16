# Solana Vibes Kit (SVK)

A collection of Claude Code skills for development on Solana.

## Skills

### [Stronghold of Security](stronghold-of-security/)

A comprehensive adversarial security audit system for Solana/Anchor smart contracts. Uses parallel multi-agent analysis with a 128-pattern exploit knowledge base built from 200+ real-world incidents.

**Features:**
- Phase-based pipeline with 7 subcommands — each phase gets a fresh context window for maximum quality
- 10+ specialized security agents analyzing through different lenses (access control, arithmetic, state machine, CPI, token economics, oracle, etc.)
- 128 exploit patterns with CVSS scoring, PoC outlines, and fix recommendations
- Protocol-specific playbooks (AMM/DEX, lending, staking, bridge, NFT, oracle, governance)
- Attack trees, combination matrix analysis, and severity re-calibration
- Condensed summary system for efficient cross-phase synthesis

### [Grand Library](grand-library/)

A full-stack documentation skill that transforms project ideas into comprehensive specification suites. Eliminates coin-flip decisions by making every choice explicit, validated, and written down.

**Features:**
- 4-phase pipeline: survey → interview → draft → reconcile — each phase gets a fresh context window
- Adaptive interview engine with topic-tree pruning and research-backed options for micro-decisions
- Wave-based document generation with Opus subagents and user validation gates
- 4-pass reconciliation: completeness, consistency, gap analysis, and verification audit
- Creative doc discovery — suggests non-obvious documents you wouldn't think to write
- Solana domain pack with 97 pre-researched knowledge files across 18 categories

## Installation

These skills are designed for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# Install Stronghold of Security
cd stronghold-of-security && ./install.sh /path/to/your-project

# Install Grand Library
cd grand-library && ./install.sh /path/to/your-project
```

## License

MIT
