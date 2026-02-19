# /SVK:update — Update SVK Skills

## Purpose
Check for SVK updates and selectively reinstall only the skills that changed.

## Procedure

### Step 1: Locate SVK Repository

1. Look for `.claude/svk-meta.json` in the current project root.
2. If found, read the `svk_repo` path and `installed_version`.
3. If NOT found, ask the user:

> I couldn't find SVK metadata in this project. Where is your SVK repository cloned?
> (e.g., `/Users/you/Projects/SVK`)

Once they provide the path, create `.claude/svk-meta.json`:

```json
{
  "svk_repo": "<user-provided-path>",
  "installed_version": "unknown",
  "installed_skills": [],
  "installed_at": "<current-timestamp>"
}
```

### Step 2: Fetch and Compare Versions

Run these commands:

```bash
# Fetch latest tags
git -C <svk_repo> fetch --tags --quiet

# Get latest tag
LATEST=$(git -C <svk_repo> tag --sort=-v:refname | head -1)

# Get installed version
INSTALLED=<from svk-meta.json installed_version>
```

If `LATEST` equals `v$INSTALLED` (or `INSTALLED` is the same as `LATEST` without the `v` prefix):

> **SVK is up to date** (v{installed}).

Stop here.

If no tags exist:

> **No SVK releases found.** The SVK repository has no version tags yet. No update available.

Stop here.

### Step 3: Show What Changed

Run:

```bash
# Find which skill directories changed between tags
git -C <svk_repo> diff --name-only v$INSTALLED..$LATEST | grep -E '^(grand-library|stronghold-of-security|svk-setup|svk-update|dinhs-bulwark|book-of-knowledge)/' | cut -d/ -f1 | sort -u
```

Read the `CHANGELOG.md` from the SVK repo at the latest tag to get release notes between the two versions.

Display:

> **Updating SVK v{installed} → {latest}**
>
> **What's new:**
> {Relevant CHANGELOG.md entries between installed and latest version}
>
> **Skills to update:** {list of changed skill directories}
> **Unchanged (skipping):** {list of unchanged skill directories}

### Step 4: Checkout and Selective Reinstall

```bash
# Checkout the new tag
git -C <svk_repo> checkout <LATEST> --quiet

# For each changed skill, re-run its install script
<svk_repo>/<skill>/install.sh <project_root>
```

Only run `install.sh` for skills that:
1. Appear in the diff (files changed between tags), AND
2. Are listed in `installed_skills` in `svk-meta.json` (don't install skills the user never had)

### Step 5: Confirm

After successful update, display:

> **SVK updated to {latest}**
>
> **Updated:** {list of reinstalled skills}
> **Skipped:** {list of unchanged or not-installed skills}
>
> For the best experience, start a fresh chat so the updated skill files are loaded cleanly.

### Error Handling

- **SVK repo path doesn't exist:** Ask the user to provide the correct path.
- **Git fetch fails (offline):** Show "Couldn't check for updates — are you online?" and stop.
- **No installed_skills in metadata:** Assume all skills that have directories in the SVK repo should be checked.
- **install.sh fails:** Report which skill failed, continue with remaining skills, suggest the user investigate.
