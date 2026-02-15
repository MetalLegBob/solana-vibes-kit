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

## Installation

These skills are designed for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# Install Stronghold of Security
cd stronghold-of-security && ./install.sh /path/to/your-project
```

Or manually:
```bash
# Copy skill files
cp -R stronghold-of-security/agents stronghold-of-security/knowledge-base stronghold-of-security/resources \
      stronghold-of-security/templates stronghold-of-security/SKILL.md \
      your-project/.claude/skills/stronghold-of-security/

# Copy command files
mkdir -p your-project/.claude/commands/stronghold-of-security
cp stronghold-of-security/commands/*.md your-project/.claude/commands/stronghold-of-security/
```

## License

MIT
