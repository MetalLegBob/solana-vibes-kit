---
name: SVK-setup
version: "1.0.0"
description: >
  SVK Setup: Guided onboarding skill that interviews users about their experience
  and project scope, recommends tools from a tiered catalog (MCPs, plugins, skills),
  walks through installation, and generates a personalized reference document.
  The first thing a new SVK user runs.
  Run /SVK-setup for the full guided flow, or /SVK-setup:interview to begin.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# SVK Setup

A guided onboarding skill that sets up your entire Solana development environment — not just SVK, but the full ecosystem of plugins, MCPs, and skills needed for productive Solana development.

> *"The first 30 minutes determine whether someone stays or bounces. Make them count."*

---

## Getting Started

SVK Setup runs as a 4-phase guided flow. The full command runs all phases in sequence; sub-commands let you re-run individual phases.

### Quick Start

```
/SVK-setup
```

This begins with a short interview about your experience and project, then recommends tools, walks through installation, and generates a reference doc. Follow the prompts.

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SVK SETUP v1.0                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /SVK-setup:interview    Phase 1 — User Interview                  │
│  ═══════════════════     5-7 questions, one at a time               │
│  Experience gauging: git, Solana, Claude Code                       │
│  Project scoping: new/existing, type, frontend/backend, team       │
│  Output: .svk/SETUP_PROFILE.json                                    │
│                          │                                          │
│                          ▼                                          │
│  /SVK-setup:recommend    Phase 2 — Tiered Recommendations          │
│  ═══════════════════     Three tiers based on profile               │
│  Essential: always recommended (GSD, Superpowers, Safety Net, etc) │
│  Recommended: profile-dependent (Trail of Bits, Context7, etc)     │
│  Optional: shown but not pushed (Figma, Vercel, Docker, etc)       │
│  Output: .svk/SETUP_RECOMMENDATIONS.json                           │
│                          │                                          │
│                          ▼                                          │
│  /SVK-setup:install      Phase 3 — Installation Walkthrough        │
│  ═══════════════════     One category at a time                     │
│  Explain → choose → install → verify per tool                      │
│  Category order: Workflow → Safety → Solana → Search → Memory →    │
│    Security → Frontend → Backend → DevOps → Utility                │
│  Output: .svk/SETUP_INSTALLED.json                                  │
│                          │                                          │
│                          ▼                                          │
│  /SVK-setup:reference    Phase 4 — Reference Document              │
│  ═══════════════════     Personalized setup reference               │
│  Getting started, installed tools, skipped tools, quick reference  │
│  Output: docs/svk-setup-reference.md                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Typical Workflow

For first-time users, just run `/SVK-setup` and follow the prompts. The full flow takes 10-20 minutes depending on how many tools you install.

To re-run individual phases later:
- **`/SVK-setup:interview`** — Re-do the interview (resets profile)
- **`/SVK-setup:recommend`** — Re-generate recommendations from existing profile
- **`/SVK-setup:install`** — Install additional tools
- **`/SVK-setup:reference`** — Re-generate the reference document

---

## Foundation Patterns

| Pattern | How SVK Setup Uses It |
|---------|----------------------|
| Progressive Disclosure | Tool catalog indexed by category, loaded per-category during walkthrough |
| Signal-Based Indexing | Interview answers drive which catalog entries are surfaced |

---

## Output Structure

SVK Setup writes state to `.svk/` in the project root and the reference doc to `docs/`:

```
.svk/
├── SETUP_PROFILE.json          # User profile from interview
├── SETUP_RECOMMENDATIONS.json  # Tiered tool recommendations
└── SETUP_INSTALLED.json        # What was installed/skipped

docs/
└── svk-setup-reference.md      # Personalized reference document
```

---

## User Profiles

The interview produces one of three profiles that tune all subsequent behavior:

| Profile | Git | Solana | Claude Code | Behavior |
|---------|-----|--------|-------------|----------|
| **Beginner** | None/Basic | No/Learning | New | Extra explanations, guardrails emphasized, learning resources |
| **Intermediate** | Comfortable | Learning/Shipped | Some | Standard explanations, full recommended tier |
| **Advanced** | Comfortable | Shipped | Power user | Minimal hand-holding, full catalog available, cherry-pick |

---

## Tool Tiers

| Tier | Selection Logic |
|------|----------------|
| **Essential** | Always recommended regardless of profile |
| **Recommended** | Shown based on project type and experience |
| **Optional** | Listed for awareness, not pushed |

See `resources/tool-catalog.md` for the complete registry.
