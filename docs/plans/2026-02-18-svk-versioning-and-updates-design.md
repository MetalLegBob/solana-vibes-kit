# SVK Versioning, Auto-Updates, and Patch Notes — Design

**Date:** 2026-02-18
**Status:** Approved

## Summary

Add unified versioning, automatic update checking, a dedicated `/SVK:update` command, and hand-written patch notes to the SVK toolkit. Users get notified of updates on first skill use per session and can update selectively (only changed skills reinstalled).

---

## 1. Version Infrastructure

### Unified Versioning
- The entire SVK shares one version number, resetting to **v1.0.0**
- Every skill's `SKILL.md` frontmatter gets the same version value
- Releases are tagged once in git (e.g., `v1.0.0`, `v1.1.0`)
- Source of truth for "latest version" is **GitHub tags**

### Metadata File
Every `install.sh` writes/updates `.claude/svk-meta.json` in the target project:

```json
{
  "svk_repo": "/path/to/SVK",
  "installed_version": "1.0.0",
  "installed_skills": ["grand-library", "stronghold-of-security", "svk-setup"],
  "installed_at": "2026-02-18T12:00:00Z"
}
```

Both manual `install.sh` and `/SVK-setup:install` produce the same metadata.

### Changelog
Single `CHANGELOG.md` at the repo root with hand-written bullet points:

```markdown
# SVK Changelog

## v1.1.0 — 2026-02-25
- Added version checking and `/SVK:update` command
- SOS: Fixed false positives on PDA validation patterns

## v1.0.0 — 2026-02-18
- Initial unified release
- Grand Library, Stronghold of Security, SVK Setup
```

---

## 2. Auto-Check on First Invocation

Added to every skill's SKILL.md preamble. On first skill use per session:

1. Read `.claude/svk-meta.json` for installed version and repo path
2. Run `git -C <svk_repo> fetch --tags --quiet` (silent)
3. Compare installed version against latest tag
4. If outdated, show a **one-time notification**:

> SVK v1.2.0 is available (you're on v1.0.0).
> - Update now: I can pull and reinstall the changed skills in this session
> - Update later: Start a new chat and run `/SVK:update`

**Edge cases:**
- If offline or fetch fails: silently skip the check
- If `.svk-meta.json` is missing: silently skip (pre-metadata install)
- Only shown once per session, never on subsequent commands

---

## 3. `/SVK:update` Command

New skill at `svk-update/` with a single command. Full flow:

1. **Locate repo** — Read `.svk-meta.json`. If missing, ask the user where their SVK clone is and create the metadata file (self-healing)
2. **Fetch and compare** — `git fetch --tags`, compare installed vs latest tag. If up-to-date, say so and exit
3. **Show what changed** — Diff the two tags to identify changed skill directories. Show relevant CHANGELOG.md entries:

   > Updating SVK v1.0.0 → v1.2.0
   >
   > **What's new:**
   > - v1.2.0: GL domain pack for Cosmos ecosystems
   > - v1.1.0: SOS false positive fix on PDA validation
   >
   > **Skills to update:** Stronghold of Security, Grand Library
   > **Unchanged (skipping):** SVK Setup

4. **Checkout and selective reinstall** — Check out the new tag, re-run `install.sh` only for changed skills. Update `.svk-meta.json` with new version and timestamp
5. **Confirm** — Show summary, recommend starting a fresh chat so new skill files are picked up cleanly

---

## 4. CLAUDE.md and Release Workflow

### CLAUDE.md (local only, .gitignored)
Project conventions for working in this repo:
- Always update CHANGELOG.md before tagging a release
- Keep version numbers in sync across all SKILL.md frontmatter files
- Update relevant READMEs when changing skill behavior
- Use conventional commits (`feat(SOS):`, `fix:`, `docs:`)
- When bumping a version, update: all SKILL.md files, CHANGELOG.md, and any hardcoded version strings

### Release Workflow
1. Make changes, commit with conventional commits
2. Update CHANGELOG.md with bullet points
3. Bump version in every SKILL.md frontmatter
4. Commit: `chore: release v1.x.0`
5. Tag: `git tag v1.x.0`
6. Push: `git push && git push --tags`

### .gitignore
Add `CLAUDE.md` to `.gitignore` so it never gets pushed.

---

## 5. Cleanup (Part of v1.0.0 Reset)

- Reset all SKILL.md versions to `1.0.0`
- Fix SOS version drift: `scan.md` state writes `2.1.0`, `FINAL_REPORT.md` template hardcodes `2.1.0` — both reset to `1.0.0`
- Update all `install.sh` scripts to write `.svk-meta.json`

---

## Implementation Order

1. Create `.gitignore` and `CLAUDE.md`
2. Fix version drift and reset all versions to `1.0.0`
3. Update all `install.sh` scripts to write `.svk-meta.json`
4. Create `CHANGELOG.md` with the v1.0.0 entry
5. Build the version-check preamble block for SKILL.md files
6. Build the `svk-update/` skill
7. Tag `v1.0.0`
