# Solana Domain Pack — Forkable Repo Catalogue

**Date:** 2026-02-16
**Status:** Design
**Scope:** Grand Library (GL) Solana domain pack extension

---

## Summary

Add a curated catalogue of verified open source repositories to the Solana domain pack. The catalogue helps builders make informed decisions about forking existing code vs. building from scratch, and serves three use cases: fork candidates, reference implementations, and reusable components.

## Motivation

The existing Solana domain pack (87 knowledge files, 18 categories) provides excellent decision guidance ("should I use Anchor or Native?") but stops short of pointing builders to production-ready code they can start from. Builders who fork battle-tested repos avoid weeks of work and critical security bugs — but only if they fork the *right* repos with eyes open about licensing, maintenance status, and complexity.

## Design

### Catalogue File Structure

Catalogue files live alongside existing knowledge files:

```
grand-library/resources/domain-packs/solana/knowledge/repos-<category>.md
```

One file per logical grouping:

| File | Covers |
|------|--------|
| `repos-defi-primitives.md` | AMMs, lending, escrow, vaults, liquidation engines |
| `repos-token-infrastructure.md` | Token launches, vesting, distribution, airdrops |
| `repos-governance.md` | Multisig, DAO frameworks, access control |
| `repos-nft-gaming.md` | NFT minting, marketplaces, gaming primitives |
| `repos-client-frontend.md` | Wallet adapters, Next.js starters, transaction builders |
| `repos-developer-tooling.md` | Testing frameworks, CLI tools, IDL generators |
| `repos-infrastructure.md` | Indexers, webhooks, RPC tooling, monitoring |

Categories are added or removed organically — if a category doesn't have meaningful forkable repos, it doesn't get a file.

Each file uses the standard domain pack YAML frontmatter:

```yaml
---
pack: solana
topic: "Forkable Repos — DeFi Primitives"
type: repo-catalogue
confidence: 8/10
sources_checked: 25
last_verified: "2026-02-16"
---
```

The `type: repo-catalogue` field distinguishes these from decision files so GL knows to treat them as lookup resources rather than decision guidance.

### Per-Repo Entry Schema

Each entry within a catalogue file:

```markdown
### Orca Whirlpools

- **URL:** https://github.com/orca-so/whirlpools
- **Framework:** Anchor
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** AMM, concentrated liquidity, CLMM

**Trust signals:**
- Audited by Kudelski Security (2023), OtterSec (2024)
- Last meaningful commit: 2026-01-28
- 450+ forks, production-proven (billions TVL)
- No known unpatched exploits

**Builder notes:**
> Well-structured Anchor program with clean CPI interfaces. Good fork
> candidate for concentrated liquidity AMMs. If forking, you'll likely
> want to customize the fee tier logic and pool creation permissions.
> Complex math library — study `sqrt_price` calculations carefully
> before modifying curve behavior.

**Complexity:** High — multi-program architecture, non-trivial math
**Confidence:** 9/10
**Last verified:** 2026-02-16
```

Key design choices:

- **Builder notes are opinionated.** Not just metadata — practical advice answering "what would I need to change if forking?" This is the highest-value field.
- **License field is first-class.** GL actively warns builders about restrictive licenses (BSL, AGPL, proprietary) before recommending a fork. A builder can't fork a BSL-licensed repo for a competing product, and GL should flag this prominently.
- **Complexity rating** is a simple High/Medium/Low tag so builders can self-select based on experience level.
- **Use case tags** indicate whether the repo is best as a fork candidate, reference implementation, reusable component, or multiple.

### Freshness Strategy — Live-Research Hybrid

The catalogue uses a two-layer freshness approach:

**Layer 1 — Curated static list:** Hand-picked repos with opinionated builder notes, confidence scores, and `last_verified` dates. Periodically updated by manual review.

**Layer 2 — Live research verification:** Before GL surfaces a recommendation (during interviews, drafting, or `/GL:repos`), a research agent runs a quick live check:

**Freshness checks:**
- Last commit date — warn if >6 months stale
- Open issues count and trend — spike in issues signals problems
- Dependency status — are Anchor/Solana SDK versions current?

**Safety checks:**
- Any new audit reports or disclosed vulnerabilities since `last_verified`
- License changes — repos occasionally switch from permissive to restrictive
- Maintainer status — has the core team moved on?

**Presentation to builder:**

When live check passes:
> **Orca Whirlpools** — Confidence: 9/10 (catalogue) → 9/10 (live-verified 2026-02-16)
> Last commit: 12 days ago. No new vulnerabilities. Anchor 0.30.x compatible.

When live check raises concerns:
> **[Repo Name]** — Confidence: 8/10 (catalogue) → ⚠️ 5/10 (live check)
> ⚠️ Last commit: 9 months ago. Anchor 0.28 — two major versions behind.
> Still useful as reference, but forking would require significant updates.

**Fallback:** If live research can't reach GitHub (rate limits, network), GL surfaces the catalogue entry but flags it as cached data with the `last_verified` date prominently displayed.

### GL Integration

#### During Interviews

When a builder describes functionality that matches a catalogue category, GL interrupts with a lightweight suggestion:

> "There are 3 battle-tested open source AMMs you could fork instead of building from scratch. Want me to walk through them before we continue designing?"

If the builder says yes, GL pulls matching entries, runs live verification, and presents options. If they say no, the interview continues as normal.

#### Trigger Logic

New entries in `creative-triggers.md`:

| Signal | Action | Example Trigger |
|--------|--------|-----------------|
| Builder describes AMM/DEX | Suggest repo catalogue | "Building a bonding curve" |
| Builder describes lending | Suggest repo catalogue | "Users deposit collateral" |
| Builder describes vesting | Suggest repo catalogue | "Token unlock schedule" |
| Builder describes NFT mint | Suggest repo catalogue | "Minting NFT collection" |
| Builder describes governance | Suggest repo catalogue | "DAO voting mechanism" |
| Builder describes escrow | Suggest repo catalogue | "Funds held until conditions met" |

#### During Drafting

When GL generates architecture or feature spec documents, it includes a "Recommended Starting Points" section referencing matching repos with trust signals and builder notes inline.

#### Standalone Command — `/GL:repos`

Lets builders browse the catalogue directly without going through an interview:

- `/GL:repos` — lists all categories with entry counts
- `/GL:repos amm` — shows AMM-related repos with live-verified status
- `/GL:repos --fork-ready` — filters to only repos tagged as fork candidates
- `/GL:repos --license permissive` — filters to Apache 2.0, MIT, etc.

### Model Selection

| Task | Model | Rationale |
|------|-------|-----------|
| Catalogue browsing (`/GL:repos`) | Haiku | Structured lookup, filtering, formatting |
| Live research verification | Haiku | Structured GitHub checks, data comparison |
| Interview integration (fork detection) | Sonnet | Contextual judgment — matching builder intent to catalogue |
| Initial catalogue curation | Human + Opus/Sonnet | Opinionated builder notes require real expertise |

Principle: cheapest model that can do the job reliably. Haiku handles most runtime work. Sonnet steps in where contextual judgment matters.

## Implementation Phases

### Phase 1 — Catalogue Creation
- Define the catalogue file template with agreed schema
- Research and curate repos for each category
- Write opinionated builder notes for each entry
- Add `type: repo-catalogue` support to GL's resource loading

### Phase 2 — GL Integration
- Add fork-opportunity triggers to `creative-triggers.md`
- Update interview agents to detect catalogue matches and offer the redirect
- Update drafting agents to include "Recommended Starting Points" in generated docs
- Wire up live research verification (Haiku agent checks GitHub before presenting)

### Phase 3 — Standalone Command
- Implement `/GL:repos` command with category browsing and filtering
- Add command to `SKILL.md` and `README.md`

### Phase 4 — Ongoing Maintenance
- Periodic manual review of catalogue entries
- Track `last_verified` dates, flag anything >3 months stale for re-review
- Add new repos as the ecosystem evolves
