# SVK Changelog

All notable changes to the Security Vulnerability Kit are documented here.

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
