---
name: Forge:validate
description: "Phase 4: Two-pass validation against SVK shipping checklist"
allowed-tools:
  - Read
  - Glob
  - Grep
  - AskUserQuestion
---

# Forge — Phase 4: Validate

Two-pass validation of the built skill against the SVK shipping checklist.

## Prerequisites

Check `.forge/STATE.json`:
- `phases.build.status` must be `"complete"`
- `current_build.skill_name` must be set

If no state exists, ask the user for the skill name and initialize a validate-only state.

## Procedure

### Step 1: Load context

1. Read `.forge/STATE.json` to get the skill name and checklist applicability.
2. Read `forge/resources/shipping-checklist.md` for reference.
3. Note the skill directory name (`SKILL_NAME`) and abbreviation (`SKILL_ABBREV`) from state.

### Step 2: Pass 1 — Automated Checks

Run each applicable automated check. For each, report PASS, FAIL, or SKIP (not applicable).

**Check #1: Skill directory structure**
- Glob for `{SKILL_NAME}/SKILL.md` — must exist
- Glob for `{SKILL_NAME}/commands/*.md` — must have at least one file
- Glob for `{SKILL_NAME}/install.sh` — must exist
- Glob for `{SKILL_NAME}/README.md` — must exist

**Check #4: Top-level README.md**
- Grep `README.md` for the skill name or display name
- FAIL if not mentioned in the Skills section

**Check #5: CHANGELOG.md**
- Grep `CHANGELOG.md` for the skill name
- FAIL if no entry found

**Check #6: SVK-setup catalog**
- Grep `svk-setup/resources/tool-catalog.md` for the skill name or abbreviation
- FAIL if not found

**Check #9: Install script**
- Glob for `{SKILL_NAME}/install.sh`
- Check it's executable: `ls -la {SKILL_NAME}/install.sh` and verify `x` permission
- FAIL if missing or not executable

**Check #11: Version-check block**
- Grep `{SKILL_NAME}/SKILL.md` for `<svk-version-check>`
- FAIL if not found

**Check #12: svk-meta.json in install.sh**
- Grep `{SKILL_NAME}/install.sh` for `svk-meta`
- FAIL if not found

**Check #13: svk-update grep pattern**
- Grep `svk-update/commands/update.md` for the skill directory name
- FAIL if the skill name doesn't appear in the grep pattern on line ~61

**Check #15: resources/INDEX.md**
- Glob for `{SKILL_NAME}/resources/INDEX.md`
- FAIL if not found

**Check #17: MCP suggest.js**
- Grep `svk-mcp/tools/suggest.js` for the skill name, abbreviation, or output directory
- FAIL if no reference found

**Check #18: Name consistency**
- Grep the entire `{SKILL_NAME}/` directory for the full thematic name AND the abbreviation
- Flag if the abbreviation appears where the full name should be used (e.g., in directory references) or vice versa

**Conditional checks (only if applicable):**

**Check #3: STATE.json convention** (if multi-phase)
- Grep `{SKILL_NAME}/commands/` for `"skill":` in any STATE.json initialization code
- FAIL if state is initialized without the `"skill"` field

**Check #8: SessionStart hook** (if discoverable state)
- Grep `.claude/hooks/svk-session-start.sh` for the skill name
- FAIL if not found in the case block

**Check #14: MCP status command** (if multi-phase)
- Grep `svk-mcp/tools/status.js` for the skill name
- FAIL if not found

### Step 3: Report Pass 1 results

Display results as a table:

```
## Validation — Pass 1 (Automated)

| # | Check | Result |
|---|-------|--------|
| 1 | Directory structure | ✅ PASS |
| 4 | README.md | ✅ PASS |
| 5 | CHANGELOG.md | ❌ FAIL — no entry found |
| ... | ... | ... |

{N} passed, {M} failed, {K} skipped
```

If any checks failed, list the specific fixes needed:

```
### Fixes Needed

1. **#5 CHANGELOG.md** — Add entry for {skill name} under a new version heading
2. ...
```

If there are failures, tell the user to fix them and re-run `/Forge:validate`. Do NOT proceed to Pass 2 until Pass 1 is clean.

### Step 4: Pass 2 — Guided Review

For each non-automatable item, present the relevant content and ask the user to confirm.

**Review #2: Foundation Patterns**
- Read `{SKILL_NAME}/SKILL.md` and show the patterns claimed
- Read the relevant section of the design doc
- Ask: "Does this skill correctly implement the {pattern} pattern? Here's what I see: {summary}"

**Review #10: Version bump**
- Grep for `version:` across all files that reference versions
- Show all version strings found
- Ask: "Version is set to {version} across all files. Correct?"

**Review #19: Decision matrix**
- Read the current decision matrix from `Documents/Skill_Foundation.md`
- Propose a new row based on the design doc:
  ```
  | **{Skill Name} ({purpose})** | {pattern selections} |
  ```
- Ask: "Here's the decision matrix row I'd add. Does this look right?"

**Conditional reviews:**

**Review #14: Status command** (if multi-phase)
- Read `svk-mcp/tools/status.js` and show the skill-specific section
- Ask: "Does the status output format look right for this skill?"

**Review #16: State schema** (if multi-phase)
- Read the state schema documentation
- Ask: "Does the state schema cover all the fields this skill uses?"

**Review #20: MCP knowledge access** (if has knowledge base)
- Show the knowledge base file paths
- Ask: "Can the MCP server access these knowledge files?"

### Step 5: Update state

After both passes complete:

1. Update `.forge/STATE.json`:
   - Set each checklist item to `"pass"`, `"fail"`, or `"skipped"`
   - Set `phases.validate.status` to `"complete"` (only if all applicable items pass)
   - Update the `updated` timestamp

2. Display final summary:

```
## Validation Complete

✅ {N} passed | ⏭️ {K} skipped | ❌ {M} failed

{If all pass: "All checks passed! Run /Forge:ship to commit and ship, or say 'continue'."}
{If failures: "Fix the {M} failures above and re-run /Forge:validate."}
```

## Principles

1. **Automated first.** Don't ask humans to verify things a grep can check.
2. **Show, don't ask.** For guided reviews, show the actual content — don't just ask "did you do it?"
3. **Block on failures.** Don't let a skill ship with known issues. Pass 1 must be clean before Pass 2.
4. **Re-runnable.** The user can fix issues and re-run validate as many times as needed.
