# Forge

SVK Skill Builder. A 5-phase pipeline for building SVK skills with automated convention enforcement and a 20-item shipping checklist.

## Install

```bash
cd forge && ./install.sh /path/to/your-project
```

This creates:
- `.claude/skills/forge/` — Skill definition and resources
- `.claude/commands/Forge/` — Command files (one per phase)

## Usage

```
/Forge:brainstorm    Phase 1 — Design a new skill
/Forge:plan          Phase 2 — Write implementation plan
/Forge:build         Phase 3 — Execute with scaffolding
/Forge:validate      Phase 4 — Two-pass checklist validation
/Forge:ship          Phase 5 — Commit, test, clean up
```

## Pipeline

Each phase wraps existing Superpowers skills with SVK context:

| Phase | Wraps | Adds |
|-------|-------|------|
| brainstorm | superpowers:brainstorming | SVK patterns, naming conventions, decision matrix |
| plan | superpowers:writing-plans | 20-item shipping checklist as plan requirements |
| build | superpowers:executing-plans | Directory scaffolding, version-check block |
| validate | (SVK-specific) | Automated checks + guided review |
| ship | (SVK-specific) | Commit, install test, cleanup |

## State

Forge uses ephemeral state in `.forge/STATE.json` during the build process. This is cleaned up on ship — the skill it built is the artifact.
