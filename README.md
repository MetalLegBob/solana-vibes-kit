# Solana Vibes Kit (SVK)

A collection of Claude Code skills for development on Solana.

## Skills

### [The Fortress](the-fortress/)

A comprehensive adversarial security audit system for Solana/Anchor smart contracts. Uses parallel multi-agent analysis with a 128-pattern exploit knowledge base built from 200+ real-world incidents.

**Features:**
- Phase-based pipeline with 7 subcommands — each phase gets a fresh context window for maximum quality
- 10+ specialized security agents analyzing through different lenses (access control, arithmetic, state machine, CPI, token economics, oracle, etc.)
- 128 exploit patterns with CVSS scoring, PoC outlines, and fix recommendations
- Protocol-specific playbooks (AMM/DEX, lending, staking, bridge, NFT, oracle, governance)
- Attack trees, combination matrix analysis, and severity re-calibration
- Condensed summary system for efficient cross-phase synthesis

## Installation

These skills are designed for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# Install The Fortress
cd the-fortress && ./install.sh /path/to/your-project
```

Or manually:
```bash
# Copy skill files
cp -R the-fortress/agents the-fortress/knowledge-base the-fortress/resources \
      the-fortress/templates the-fortress/SKILL.md \
      your-project/.claude/skills/the-fortress/

# Copy command files
mkdir -p your-project/.claude/commands/the-fortress
cp the-fortress/commands/*.md your-project/.claude/commands/the-fortress/
```

## License

MIT
