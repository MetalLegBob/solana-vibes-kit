---
name: Forge:ship
description: "Phase 5: Commit, test install, and clean up — ships the new skill"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Forge — Phase 5: Ship

Commit the new skill, test the install script, and clean up Forge state.

## Prerequisites

Check `.forge/STATE.json`:
- `phases.validate.status` must be `"complete"`
- All applicable checklist items must be `"pass"` or `"skipped"`

If validation hasn't passed, tell the user:
"Validation hasn't passed yet. Run `/Forge:validate` first."

## Procedure

### Step 1: Confirm integration points

Before committing, do a final check that the three cross-cutting files are in their final state:

1. Grep `svk-update/commands/update.md` for the new skill name in the grep pattern
2. Grep `svk-setup/resources/tool-catalog.md` for the new skill entry
3. Grep `svk-mcp/tools/suggest.js` for the new skill reference

If any are missing, flag them and ask the user to fix before continuing.

### Step 2: Generate commit

Read the skill name from STATE.json. Show the user what will be committed:

```bash
git status
git diff --stat
```

Draft a commit message:

```
feat({skill-name}): add {display name} skill

{One-line description from design doc}

- {N} commands: {list}
- {M} resources
- Integration: README, CHANGELOG, setup catalog, update pattern, MCP suggest, decision matrix
{If multi-phase: - State: hook, MCP status}
```

Present the commit message to the user for approval. Do NOT commit without approval.

After approval:

```bash
git add {skill-name}/ README.md CHANGELOG.md Documents/Skill_Foundation.md svk-setup/resources/tool-catalog.md svk-update/commands/update.md svk-mcp/tools/suggest.js
{If multi-phase: git add .claude/hooks/svk-session-start.sh svk-mcp/tools/status.js}
git commit -m "{approved message}"
```

### Step 3: Test install

Run the install script against a temp directory to verify it works:

```bash
TMPDIR=$(mktemp -d)
./{skill-name}/install.sh "$TMPDIR"
echo "Exit code: $?"
ls -la "$TMPDIR/.claude/skills/{skill-name}/"
ls -la "$TMPDIR/.claude/commands/{SKILL_ABBREV}/"
rm -rf "$TMPDIR"
```

If the install script fails, report the error but don't block — the commit is already done. Flag it as a post-ship fix.

### Step 4: Clean up Forge state

```bash
rm -rf .forge
```

Forge's state is ephemeral. The skill directory is the artifact.

### Step 5: Ship summary

```markdown
## Shipped: {Display Name}

- **Directory:** {skill-name}/
- **Commands:** {list of /Abbreviation:command}
- **Patterns:** {Foundation Patterns used}
- **Checklist:** {N}/{total} passed ({K} skipped — not applicable)

**Don't forget:**
- Tag a new SVK version when ready: `git tag v1.x.0`
- Test the full flow in a fresh project
- Run `/SVK:update` in a test project to verify the update mechanism picks it up
```

## Principles

1. **Never commit without approval.** Show the diff and message, wait for confirmation.
2. **Test the install.** A skill that can't install is a skill that can't ship.
3. **Clean up after yourself.** `.forge/` is temporary. Don't leave build artifacts behind.
