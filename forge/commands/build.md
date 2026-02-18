---
name: Forge:build
description: "Phase 3: Execute implementation plan with SVK scaffolding — wraps superpowers:executing-plans"
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

# Forge — Phase 3: Build

Execute the implementation plan with SVK structural scaffolding pre-applied.

## Prerequisites

Check `.forge/STATE.json`:
- `phases.plan.status` must be `"complete"`
- `current_build.plan_doc` must point to a valid file
- `current_build.skill_name` must be set

If no state exists, ask the user for the plan doc path and skill name.

## Procedure

### Step 1: Read the plan

Read the plan from `current_build.plan_doc`.

### Step 2: Scaffold the skill directory

Before handing off to the plan executor, create the directory skeleton. Read the skill name from `current_build.skill_name`.

```bash
SKILL_NAME="{from STATE.json}"
SKILL_ABBREV="{abbreviation from design doc}"
mkdir -p "$SKILL_NAME/commands" "$SKILL_NAME/resources"
```

Then write these starter files:

**`{skill_name}/SKILL.md`** — Copy the version-check block verbatim from `stronghold-of-security/SKILL.md` (or any existing skill). Fill in the frontmatter:

```yaml
---
name: {SKILL_ABBREV}
version: "1.0.0"
description: >
  {from design doc}
user-invocable: true
allowed-tools:
  - {from design doc}
---
```

Then paste the `<svk-version-check>` block, then the skill body (to be filled in by the plan executor).

**`{skill_name}/resources/INDEX.md`** — Stub:

```markdown
---
skill: {skill_name}
type: resource-index
version: "1.0.0"
---

# {Skill Display Name} Resources

## Files

| File | Purpose | When to Load |
|------|---------|--------------|
```

**`{skill_name}/install.sh`** — Template from existing skills. Use `svk-setup/install.sh` as the base, replacing:
- All `svk-setup` references → `{skill_name}`
- Commands directory → `.claude/commands/{SKILL_ABBREV}/`
- `cp -R` lines → match the actual subdirectories the skill has
- Final echo messages → skill-specific

Make it executable: `chmod +x {skill_name}/install.sh`

**`{skill_name}/README.md`** — Stub with standard sections:

```markdown
# {Skill Display Name}

{One-line description from design doc}

## Install

\`\`\`bash
cd {skill_name} && ./install.sh /path/to/your-project
\`\`\`

## Usage

\`\`\`
{commands list}
\`\`\`
```

### Step 3: Update checklist tracking

Mark scaffolded items as complete in `.forge/STATE.json`:
- #1 (directory structure) → `"complete"`
- #11 (version-check block) → `"complete"`
- #15 (resources/INDEX.md) → `"complete"`

### Step 4: Hand off to plan executor

Invoke `superpowers:executing-plans` (or `superpowers:subagent-driven-development` if the user prefers parallel execution) using the Skill tool, pointing it at the plan doc.

As the plan executor completes tasks, update the checklist items in STATE.json accordingly.

### Step 5: After build completes

1. Update `.forge/STATE.json`:
   - Set `phases.build.status` to `"complete"`
   - Update the `updated` timestamp

2. Tell the user:

```
Build complete. Run /Forge:validate to check everything against the shipping checklist, or just say "continue".
```

## Principles

1. **Scaffold first, implement second.** The skeleton ensures structural items are handled before creative work.
2. **Don't fight Superpowers.** The plan executor handles code review, TDD, etc. Forge just tracks checklist items.
3. **The version-check block is sacred.** Copy it verbatim, never hand-write it.
