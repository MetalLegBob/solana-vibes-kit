---
name: SVK-update
version: "1.0.0"
description: >
  SVK Update: Check for and install updates to SVK skills.
  Compares installed version against latest git tag and selectively
  reinstalls only the skills that changed.
user-invocable: false
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
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

# SVK Update

Update your installed SVK skills to the latest version.

## Command

| Command | Description |
|---------|-------------|
| `/SVK:update` | Check for updates and selectively reinstall changed skills |
