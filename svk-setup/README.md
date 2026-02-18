# SVK Setup

Guided onboarding skill that interviews users about their experience and project scope, recommends tools from a tiered catalog, walks through installation, and generates a personalized reference document.

The first thing a new SVK user runs.

## Install

```bash
cd svk-setup && ./install.sh /path/to/your-project
```

This creates:
- `.claude/skills/svk-setup/` — Skill definition and resources
- `.claude/commands/svk-setup/` — Command files (one per phase)

## Usage

```
/SVK-setup              Full guided flow (interview → recommend → install → reference)
/SVK-setup:interview    Phase 1 — Experience & project interview
/SVK-setup:recommend    Phase 2 — Tiered tool recommendations
/SVK-setup:install      Phase 3 — Installation walkthrough
/SVK-setup:reference    Phase 4 — Generate personalized reference doc
```

## What It Sets Up

SVK Setup recommends and installs from a catalog of 28 tools across 10 categories:

| Category | Example Tools |
|----------|--------------|
| Dev Workflow | GSD, Superpowers |
| Safety | Safety Net |
| Solana | Solana Dev MCP, Helius |
| Search | Brave, Exa, Tavily |
| Memory | CMEM, Supermemory |
| Security | Trail of Bits |
| Frontend | Context7, Playwright, Figma, Magic |
| Backend | Supabase, Neon, Upstash |
| DevOps | Vercel, Cloudflare, Docker |
| Utility | Sequential Thinking, Browser Tools |

Tools are organized into three tiers:
- **Essential** — Always recommended
- **Recommended** — Based on experience and project type
- **Optional** — Available but not pushed

## Output

After setup completes:
- `.svk/SETUP_PROFILE.json` — User profile from interview
- `.svk/SETUP_RECOMMENDATIONS.json` — Tiered recommendations
- `.svk/SETUP_INSTALLED.json` — Installation results
- `docs/svk-setup-reference.md` — Personalized reference document
