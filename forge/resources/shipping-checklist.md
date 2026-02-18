# SVK Shipping Checklist

The 20-item checklist that Forge enforces for every new SVK skill. Items are grouped by applicability.

## Always Required

| # | Item | Validate Method |
|---|------|----------------|
| 1 | Skill directory with correct structure (`SKILL.md`, `commands/`, `install.sh`) | Glob for expected files |
| 2 | Follows relevant Foundation Patterns (from design doc) | Read SKILL.md frontmatter + guided review |
| 4 | Top-level SVK `README.md` updated with new skill section | Grep README.md for skill name |
| 5 | `CHANGELOG.md` updated with new version entry | Grep CHANGELOG.md for skill name |
| 6 | SVK-setup catalog updated (`svk-setup/resources/tool-catalog.md`) | Grep catalog for skill entry |
| 9 | `install.sh` exists and is executable | Check file exists + permissions |
| 10 | Version bump in SKILL.md | Guided review of version numbers |
| 11 | SKILL.md includes SVK version-check block | Grep for `<svk-version-check>` |
| 12 | `install.sh` writes to `svk-meta.json` | Grep install.sh for svk-meta |
| 13 | `svk-update/commands/update.md` grep pattern includes new skill | Grep for skill directory name in pattern |
| 15 | `resources/INDEX.md` exists (Level 2 Progressive Disclosure) | Glob for file |
| 17 | MCP `suggest.js` has rules for new skill | Grep suggest.js for skill reference |
| 18 | Name consistency (thematic name + abbreviation used correctly) | Grep skill directory for both names |
| 19 | Skill Foundation decision matrix updated | Guided review of new row |

## Conditional: Multi-Phase Skills

| # | Item | When Required | Validate Method |
|---|------|--------------|----------------|
| 3 | STATE.json artifact convention (`"skill"` field) | Skill has multiple phases | Grep for `"skill"` in STATE.json init |
| 8 | SessionStart hook updated | Skill has discoverable state | Grep hook script for skill name |
| 14 | MCP status command handles skill | Skill has phases to report | Grep `svk-mcp/tools/status.js` for skill |
| 16 | State schema documentation | Skill produces STATE.json | Check for schema doc in resources |

## Conditional: Other

| # | Item | When Required | Validate Method |
|---|------|--------------|----------------|
| 7 | MCP server updated for queryable artifacts | Skill produces query-worthy output | Check svk-mcp for new tool |
| 20 | MCP knowledge base accessibility | Skill has built-in knowledge base | Guided review of access paths |
