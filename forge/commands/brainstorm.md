---
name: Forge:brainstorm
description: "Phase 1: Design a new SVK skill — wraps superpowers:brainstorming with SVK context"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
---

# Forge — Phase 1: Brainstorm

Design a new SVK skill by wrapping `superpowers:brainstorming` with SVK-specific context.

## Before Starting

### Step 1: Check for existing Forge state

Check if `.forge/STATE.json` exists.

**If it exists:** Ask the user:
"I found an existing Forge session for `{skill name from state}`. Want to continue where you left off, or start fresh?"

If starting fresh, delete `.forge/STATE.json`.

**If it doesn't exist:** Continue to Step 2.

### Step 2: Pre-read SVK context

Read these files to understand the current state of SVK:

1. `Documents/Skill_Foundation.md` — Read the **5 Foundation Patterns table** (lines 9-17) and the **Decision Matrix** (search for "## Decision Matrix"). You don't need the full document.
2. `README.md` — Read the **Skills** section to understand what exists.
3. `Documents/VISION.md` — Read for project direction (if it exists; skip if not).
4. Glob for `*/SKILL.md` and read the **frontmatter only** (first ~15 lines) of each to understand naming conventions and pattern precedent.

### Step 3: Initialize Forge state

Create `.forge/` directory and write `.forge/STATE.json`:

```json
{
  "skill": "forge",
  "version": "1.0.0",
  "updated": "{ISO-8601}",
  "current_build": {
    "skill_name": null,
    "design_doc": null,
    "plan_doc": null
  },
  "phases": {
    "brainstorm": { "status": "in_progress" },
    "plan": { "status": "pending" },
    "build": { "status": "pending" },
    "validate": { "status": "pending" },
    "ship": { "status": "pending" }
  },
  "checklist": {}
}
```

### Step 4: Invoke brainstorming with SVK context

Invoke the `superpowers:brainstorming` skill using the Skill tool. But BEFORE invoking it, present the following context to the user as part of your message (this primes the brainstorming session):

---

**SVK Context for this brainstorming session:**

**5 Foundation Patterns:**
1. **Thin Orchestrator** — Never do heavy work in main context. Spawn subagents.
2. **Signal-Based Indexing** — Index first, identify relevance, fetch only what matters.
3. **Adversarial Multi-Perspective** — Multiple agents examine from different angles.
4. **Progressive Disclosure** — 3-level loading: metadata → instructions → resources.
5. **Structured Handoff Notes** — Agents communicate via structured files with frontmatter.

**Decision Matrix (existing skills):**
{Paste the decision matrix table you read from Skill_Foundation.md}

**Naming Conventions:**
- Directory name = full thematic name (e.g., `stronghold-of-security`, `grand-library`)
- SKILL.md `name` field = short abbreviation (e.g., `SOS`, `GL`)
- Commands directory = matches `name` field (e.g., `.claude/commands/SOS/`)
- RuneScape-themed names preferred but not required

**Existing skills:** {list from README}

**When the design is ready**, save it to `docs/plans/YYYY-MM-DD-<skill-name>-design.md`.

---

Then invoke the brainstorming skill with the user's idea.

### Step 5: After brainstorming completes

Once the design doc is written:

1. Update `.forge/STATE.json`:
   - Set `current_build.skill_name` to the new skill's directory name
   - Set `current_build.design_doc` to the design doc path
   - Set `phases.brainstorm.status` to `"complete"`
   - Update the `updated` timestamp

2. Tell the user:

```
Design saved. Run /Forge:plan to create the implementation plan, or just say "continue".
```

## Principles

1. **Don't replace brainstorming.** Forge adds context, it doesn't change how brainstorming works.
2. **Inject, don't overwhelm.** The SVK context is a primer, not a lecture. Keep it concise.
3. **The design doc is the artifact.** Everything else (STATE.json, context) is scaffolding.
