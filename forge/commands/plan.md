---
name: Forge:plan
description: "Phase 2: Write implementation plan with shipping checklist — wraps superpowers:writing-plans"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
---

# Forge — Phase 2: Plan

Write an implementation plan for the skill designed in Phase 1, with SVK's 20-item shipping checklist baked in as requirements.

## Prerequisites

Check `.forge/STATE.json`:
- `phases.brainstorm.status` must be `"complete"`
- `current_build.design_doc` must point to a valid file

If no state exists, ask the user for the design doc path and initialize state.

## Procedure

### Step 1: Read inputs

1. Read the design doc from `current_build.design_doc` in STATE.json.
2. Read `forge/resources/shipping-checklist.md` for the full 20-item checklist.
3. Read `Documents/Skill_Foundation.md` — the Decision Matrix section.
4. Glob for `*/install.sh` and read one as a template (e.g., `svk-setup/install.sh`).

### Step 2: Determine checklist applicability

Based on the design doc, determine which of the 20 checklist items apply:

- **Multi-phase skill?** (has multiple commands that share state) → Items #3, #8, #14, #16 apply
- **Produces queryable artifacts?** (generates files other tools should access) → Item #7 applies
- **Has a knowledge base?** (ships with reference material in resources/) → Item #20 applies
- **All other items** → Always apply

Save the applicability determination to `.forge/STATE.json` under `checklist`:

```json
{
  "checklist": {
    "1": { "status": "pending", "applicable": true },
    "2": { "status": "pending", "applicable": true },
    "3": { "status": "pending", "applicable": false, "reason": "single-phase skill" },
    ...
  }
}
```

### Step 3: Invoke planning with checklist injection

Invoke the `superpowers:writing-plans` skill using the Skill tool. But BEFORE invoking it, present the following context:

---

**SVK Shipping Requirements for this plan:**

Every task in the plan must map to one or more checklist items. The plan MUST include tasks for all of the following:

**Skill Core:**
- [ ] #{applicable items from "Always Required" list, with exact file paths}

**Integration Points:**
- [ ] Update `README.md` — add skill section after the last skill entry
- [ ] Update `CHANGELOG.md` — add new version entry
- [ ] Update `svk-setup/resources/tool-catalog.md` — add catalog entry
- [ ] Update `svk-update/commands/update.md` line 61 — add skill name to grep pattern: `'^(grand-library|stronghold-of-security|svk-setup|svk-update|{new-skill})/'`
- [ ] Update `svk-mcp/tools/suggest.js` — add suggestion rules
- [ ] Update `Documents/Skill_Foundation.md` — add row to decision matrix

{If multi-phase:}
**State Management:**
- [ ] Update `.claude/hooks/svk-session-start.sh` — add case block
- [ ] Update `svk-mcp/tools/status.js` — add skill-specific formatting

**Install script template:** {paste the install.sh you read}

---

Then invoke the planning skill.

### Step 4: After planning completes

Once the plan is written:

1. Update `.forge/STATE.json`:
   - Set `current_build.plan_doc` to the plan path
   - Set `phases.plan.status` to `"complete"`
   - Update the `updated` timestamp

2. Tell the user:

```
Plan saved. Run /Forge:build to start building, or just say "continue".
```

## Principles

1. **The checklist is non-negotiable.** Every applicable item must appear as a plan task.
2. **Exact file paths.** The plan must reference the exact files that need changing — no vague "update the README".
3. **Integration tasks go last.** Core skill files first, cross-cutting updates after.
