---
name: DB
version: "1.0.0"
description: >
  Dinh's Bulwark: Adversarial security and correctness audit for off-chain Solana code —
  backends, APIs, bots, frontends, infrastructure. Everything SOS doesn't cover.
  Run /DB for a getting-started guide, or /DB:scan to begin.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<!-- SVK Version Check — runs once per session on first skill invocation -->
<svk-version-check>
**On first invocation this session**, silently perform a version check:

1. Look for `.claude/svk-meta.json` in the current project. If it doesn't exist, skip this check entirely.
2. Read the `svk_repo` path and `installed_version` from the metadata file.
3. Run: `git -C <svk_repo> fetch --tags --quiet 2>/dev/null`
4. Run: `git -C <svk_repo> tag --sort=-v:refname | head -1` to get the latest tag.
5. Compare the installed version against the latest tag (strip the leading `v`).
6. If they match, skip — the user is up to date.
7. If the latest tag is newer, show this message ONCE (never repeat in this session):

> **SVK Update Available:** v{latest} is available (you're on v{installed}).
> - **Update now:** I can pull and reinstall the changed skills in this session
> - **Update later:** Start a new chat and run `/SVK:update`

8. If the git commands fail (offline, repo moved, etc.), skip silently. Never show errors from version checking.

**Important:** Do NOT block or delay the user's actual command. Perform this check, show the notification if needed, then proceed with the command they invoked.
</svk-version-check>

# Dinh's Bulwark

A comprehensive, multi-agent adversarial security audit for off-chain Solana code.

> *"The shield that guards everything beyond the chain."*

---

## Getting Started

Dinh's Bulwark runs as a multi-phase pipeline. Each phase is a separate command with its own fresh context window, ensuring maximum quality throughout the entire audit.

### Quick Start

```
/DB:scan          # Detect project components, run static tools, build index
/DB:analyze       # Deploy selected auditor agents (dynamic count)
/DB:strategize    # Synthesize into architecture doc + attack hypotheses
/DB:investigate   # Priority-ordered hypothesis investigation
/DB:report        # Final synthesis — findings, attack trees, remediation
/DB:verify        # Post-fix verification
/DB:status        # Check progress at any time
```

### Full Pipeline

```
scan (0+0.5) → analyze (1+1.5) → strategize (2+3) → investigate (4+4.5) → report (5) → verify (post)
```

Each phase reads the output of the previous phase from `.bulwark/` and writes its own artifacts there. Run `/clear` between phases for a fresh context window.

---

## Scope

**In scope:** All off-chain code with financial or operational impact — backends, APIs, trading bots, keepers/cranks, frontends, wallet integrations, transaction construction logic, infrastructure configuration, indexers, webhook handlers, RPC clients.

**Out of scope:** Anchor/Rust on-chain programs (that's SOS's domain). Pure code quality issues (naming, style, dead code, non-impactful performance).

**Hard boundary with SOS:** DB explicitly skips Anchor programs and on-chain Rust code. If it detects a `programs/` directory with Anchor code, it notes "run SOS for on-chain audit" and moves on.

---

## Auditor Agents — Dynamic Catalog

Unlike SOS (which has 10 fixed on-chain auditors), DB uses a **dynamic selection** system. Off-chain codebases vary enormously — a trading bot, a full-stack dApp, and a keeper service need very different security lenses.

**51 auditor definitions** across 14 categories:

| Category | Auditors | Examples |
|----------|----------|---------|
| Secrets & Credentials | 2 | Private key management, credential handling |
| Authentication & Authorization | 4 | Auth mechanisms, sessions, access control, API tokens |
| Input & Injection | 6 | SQL/NoSQL, command injection, SSRF, path traversal, prototype pollution, SSTI |
| Web Application Security | 4 | XSS, CORS/CSP/headers, CSRF, open redirects |
| Blockchain Interaction | 6 | Transaction construction, RPC trust, wallet adapters, state sync, MEV, PDA interaction |
| API & Network | 5 | REST, GraphQL, WebSocket, webhooks, email/SMS |
| Data Security | 6 | Database, cache, file upload, logging, encryption, PII/privacy |
| Frontend & Client | 3 | Client storage, third-party scripts, mobile/deep links |
| Infrastructure | 5 | Containers, CI/CD, cloud config, TLS, monitoring exposure |
| Dependencies | 1 | Package & supply chain security |
| Automation & Bots | 3 | Keepers/cranks, trading bots, queue processing |
| Error Handling | 3 | Fail modes, race conditions, rate limiting/DoS |
| Cryptography | 1 | RNG, nonces, algorithm selection |
| Business Logic | 2 | Workflow bypass, financial/economic logic |

### How Selection Works

1. `/DB:scan` detects technologies, frameworks, and patterns in the codebase
2. Each auditor has **trigger patterns** — the scan matches them against the codebase
3. Matched auditors are auto-selected; user can add/remove before deployment
4. Tier budget sets the range: quick (8-10), standard (12-20), deep (15+, can be 30+)

See `resources/auditor-catalog.md` for the full catalog with triggers and focus guidance.

Each auditor also receives the AI-generated code pitfalls checklist for its domain.

---

## Cross-Skill Awareness

DB participates in the SVK skill ecosystem:

- **Reads SOS findings** — SOS findings inform off-chain risk assessment ("the program trusts this input — does the backend validate it?")
- **Reads GL documentation** — GL docs serve as the spec oracle for intended behavior ("the spec says withdrawals require 2FA — does the API enforce it?")
- **Detection:** During scan, DB checks for `.audit/` and `.docs/` directories. If found, it reads the architecture doc and findings summary for cross-boundary analysis.

---

## Model Selection

| Task Type | Model | Reasoning |
|-----------|-------|-----------|
| Indexing, quality gates, Tier 3 investigations | Haiku | Mechanical extraction, confirm/deny checks |
| Context auditors (Phase 1) | User choice: Opus or Sonnet | The big cost/quality tradeoff — user decides |
| Strategy synthesis, report generation | Opus | Creative synthesis, cross-cutting reasoning |
| Hypothesis investigation (Tier 1+2), verification | Sonnet | Structured analysis with KB guidance |

---

## State

State lives in `.bulwark/STATE.json` (SVK convention: `"skill": "dinhs-bulwark"`).
History archives in `.bulwark-history/`.

## Knowledge Base

- **160+ exploit patterns** (OC-001 through OC-160) across off-chain categories
- **AI-generated code pitfalls** — common LLM mistakes per auditor domain
- **Core reference** — false positives, secure patterns, severity calibration
- **51 auditor definitions** — full catalog with detection triggers
