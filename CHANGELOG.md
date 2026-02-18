# SVK Changelog

All notable changes to the Security Vulnerability Kit are documented here.

## v1.2.0 — 2026-02-18

### Forge
- SVK Skill Builder: 5-phase pipeline for building skills with convention enforcement
- Wraps Superpowers brainstorming, planning, and execution skills with SVK context
- 20-item shipping checklist with automated validation (Pass 1) and guided review (Pass 2)
- Directory scaffolding with pre-filled version-check block and install script template
- Install script testing in temp directory before ship

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
