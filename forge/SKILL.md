---
name: Forge
version: "1.0.0"
description: >
  Forge: SVK Skill Builder. A 5-phase pipeline for building SVK skills
  with automated convention enforcement and shipping checklist validation.
  Run /Forge:brainstorm to start designing a new skill.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
  - Task
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

# Forge — SVK Skill Builder

A meta-skill for building SVK skills. Wraps Superpowers skills with SVK-specific context injection and enforces a 20-item shipping checklist.

## Commands

| Command | Description |
|---------|-------------|
| `/Forge:brainstorm` | Phase 1 — Design a new skill (wraps superpowers:brainstorming) |
| `/Forge:plan` | Phase 2 — Write implementation plan (wraps superpowers:writing-plans) |
| `/Forge:build` | Phase 3 — Execute the plan with scaffolding (wraps superpowers:executing-plans) |
| `/Forge:validate` | Phase 4 — Two-pass validation against shipping checklist |
| `/Forge:ship` | Phase 5 — Commit, test install, and clean up |

## Pipeline

```
/Forge:brainstorm → /Forge:plan → /Forge:build → /Forge:validate → /Forge:ship
```

Each phase is a separate command. You can enter at any phase if you already have the prerequisite artifacts (e.g., skip brainstorm if you have a design doc). Validate and ship enforce the full checklist regardless.

## Resources

Load resources from `resources/INDEX.md` when needed — don't read them all upfront.
