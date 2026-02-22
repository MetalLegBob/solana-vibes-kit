# SVK Changelog

All notable changes to the Security Vulnerability Kit are documented here.

## v1.3.2 — 2026-02-20

### Context Budget Protections (all skills)

Comprehensive audit and fix for "prompt too long" errors across all skill phases that spawn subagents. Shared constants: 80K soft cap, 120K hard cap, 3-tier progressive fallback (full inline → partial disk → disk-heavy).

#### Dinh's Bulwark
- **DB:investigate**: Added adaptive batch sizing (3/5/8) based on token estimation. Added 120K auto-split rule. Enforce condensed-summary-first reading for large context files.
- **DB:report**: Replaced soft 200KB advisory with enforced 3-tier budget. NOT_VULNERABLE findings always trimmed to summaries. Hard cap at 120K with progressive fallback to disk reads.
- **DB:analyze**: Added adaptive batch sizing and 120K auto-split, ported from SOS:analyze pattern.

#### Stronghold of Security
- **SOS:investigate**: Added 120K auto-split rule matching SOS:analyze pattern. Added pre-spawn validation for strategy text size.
- **SOS:report**: Replaced soft 200KB advisory with enforced 3-tier budget matching DB:report pattern. NOT_VULNERABLE always trimmed.

#### Grand Library
- **GL:reconcile**: Added inline/slim mode split — suites over 6 docs or 4+ DECISIONS files use summary-first reconciliation with disk access fallback.
- **GL:draft**: Added hard-cap enforcement to existing Step 2.5 budget rules. 80K per doc writer with progressive disk-read fallback. Hard cap of 8 DECISIONS files before automatic disk-read mode.
- **GL:update**: Added explicit context budget reference for doc regeneration (defers to GL:draft Step 2.5).
- **GL:add**: Added full context budget section — DECISIONS trimming, existing doc summaries, 80K hard cap with disk-read fallback.

---

## v1.3.1 — 2026-02-20

### Grand Library
- Fix "prompt is too long" error in `/GL:draft` by adding context budget rules
- Prior wave docs now passed as summaries (~100-150 tokens each) instead of full content
- DECISIONS files trimmed to choices + first-sentence rationales (max ~2000 tokens each)
- Pre-spawn check with progressive trimming when context is still too large
- Doc writers can fall back to reading full files from disk when summaries are insufficient

---

## v1.3.0 — 2026-02-19

### Book of Knowledge (NEW)
- Math verification and economic invariant proving skill for Solana/Anchor programs
- 7-phase pipeline: scan → analyze → confirm → generate → execute → report
- 101 verification patterns (VP-001 through VP-101) across 19 DeFi math categories
- Kani formal proofs, LiteSVM runtime tests, Proptest property-based testing
- Isolated git worktree workflow — tests generated in separate branch, user chooses merge/cherry-pick/discard
- Educational approach: plain-English explanations and concrete exploit scenarios for every invariant
- Graceful degradation: runs with LiteSVM + Proptest only if Kani unavailable
- Cross-skill integration: reads GL docs and SOS findings, SOS reads BOK reports

### Awareness Layer
- MCP `svk_suggest` now recommends BOK for math-heavy Solana code
- MCP `svk_read_knowledge` can access BOK verification patterns
- SessionStart hook shows BOK verification progress
- MCP `status.js` formats BOK phase progression and verification tallies

---

## v1.2.0 — 2026-02-18

### Dinh's Bulwark (NEW)
- Off-chain adversarial security audit skill — backends, APIs, bots, frontends, infrastructure
- 51 dynamic auditor agents with trigger-based selection across 14 security domains
- 312 Exa-researched off-chain exploit patterns (OC-001 through OC-312)
- 168 AI-generated code pitfalls across 14 domains
- Audit stacking with finding evolution (NEW/RECURRENT/REGRESSION/RESOLVED) and regression escalation
- Cross-skill awareness — reads SOS findings and GL documentation for cross-boundary analysis
- Combination attack analysis with attack trees and critical fix node identification
- Devil's Advocate methodology and invariant-first investigation
- Hot-spots map for per-auditor file prioritization

### Awareness Layer
- MCP `svk_get_audit` now supports `.bulwark/` and `.bulwark-history/` directories
- MCP `svk_search` indexes Dinh's Bulwark artifacts
- MCP `svk_suggest` adds off-chain audit suggestions
- MCP `svk_list_knowledge` / `svk_read_knowledge` expose DB knowledge base
- SessionStart hook shows DB audit progress
- MCP `svk_project_status` formats DB phase progress

---

## v1.1.0 — 2026-02-18

### Awareness Layer (Hook + MCP)
- SessionStart hook that injects SVK project status on new sessions — shows in-progress audits, doc generation status, and next steps (zero cost when no SVK state exists)
- SVK MCP server with 8 tools: `svk_project_status`, `svk_get_doc`, `svk_get_decisions`, `svk_get_audit`, `svk_search`, `svk_suggest`, `svk_list_knowledge`, `svk_read_knowledge`
- Knowledge access layer: `svk_list_knowledge` catalogs SVK's built-in knowledge bases (SOS exploit patterns, GL domain packs, SVK core docs) and `svk_read_knowledge` reads specific files with path traversal protection
- Standalone install script at `svk-mcp/install.sh`
- Automatic installation via `/SVK-setup:install` (Step 5.5)

---

## v1.0.0 — 2026-02-18

Initial unified release. All skills reset to shared v1.0.0 versioning.

### Grand Library
- Full-stack documentation skill with survey, interview, draft, and reconcile pipeline
- Solana domain pack with 97+ knowledge files

### Stronghold of Security
- Adversarial security audit skill with 8-command pipeline
- 128 exploit patterns across 23 vulnerability categories
- Audit stacking and lineage tracking

### SVK Setup
- Guided onboarding with 4-phase pipeline (interview, recommend, install, reference)
- 28-tool catalog across 3 tiers

### Infrastructure
- Unified version tracking via git tags
- Automatic version checking on first skill use per session
- `/SVK:update` command for selective skill updates
- Install scripts write `.claude/svk-meta.json` for version tracking
