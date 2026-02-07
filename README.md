# Bob's Bazaar

A collection of Claude Code skills for development on Solana.

## Skills

### [The Fortress](the-fortress/)

A comprehensive adversarial security audit system for Solana/Anchor smart contracts. Uses parallel multi-agent analysis with a 128-pattern exploit knowledge base built from 200+ real-world incidents.

**Features:**
- 10-phase pipeline (architecture scan, static pre-scan, parallel context building, strategy generation, parallel investigation, final synthesis)
- 10+ specialized security agents analyzing through different lenses (access control, arithmetic, state machine, CPI, token economics, oracle, etc.)
- 128 exploit patterns with CVSS scoring, PoC outlines, and fix recommendations
- Protocol-specific playbooks (AMM/DEX, lending, staking, bridge, NFT, oracle, governance)
- Attack trees, combination matrix analysis, and severity re-calibration

## Installation

These skills are designed for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). To use a skill:

1. Copy the skill directory into your project's `.claude/skills/` directory
2. The skill will be automatically available via Claude Code's skill system

```bash
# Example: Install The Fortress
cp -R the-fortress/ your-project/.claude/skills/the-fortress/
```

## License

MIT
