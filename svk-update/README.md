# SVK Update

Check for and install updates to SVK skills. Compares installed version against the latest git tag and selectively reinstalls only the skills that changed.

## Install

```bash
cd svk-update && ./install.sh /path/to/your-project
```

This creates:
- `.claude/skills/svk-update/` — Skill definition
- `.claude/commands/SVK/update.md` — Update command

## Usage

```
/SVK:update    Check for updates and selectively reinstall changed skills
```

## How It Works

1. Reads `.claude/svk-meta.json` to find the SVK repo path and installed version
2. Fetches the latest git tag from the SVK repo
3. Diffs between installed and latest versions to find changed skill directories
4. Re-runs `install.sh` only for skills that changed and are currently installed
5. Updates `svk-meta.json` with the new version

Skills that haven't changed are skipped entirely.
