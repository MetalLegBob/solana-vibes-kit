---
name: DBS:interview
description: "Deep interview mapping all changes and cascading effects"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Edit
  - AskUserQuestion
---

# Don't Break Shit — Phase 2: Interview

Deep interview to map every change, its cascading effects, and how the user wants each effect handled. The goal is to eliminate every micro-decision the LLM would otherwise make silently during implementation.

## Step 1: Check Prerequisites

Read `.dbs/STATE.json`:

- If file doesn't exist: Stop. Tell user to run `/DBS:brief` first.
- If `pipeline.brief.status` is NOT `"complete"`: Stop. Tell user to complete the brief phase first.
- If `pipeline.interview.status` is `"complete"`: Warn user interview is already done. Ask if they want to redo it.
- If `pipeline.interview.status` is `"in_progress"`: Previous interview was interrupted. Read `.dbs/INTERVIEW.md` if it exists to see what was already captured. Offer to resume or restart.

Update `pipeline.interview.status` to `"in_progress"`.

## Step 2: Load Context

Read these files to build interview context:

1. **Required:** `.dbs/BRIEF.md` — the project baseline and change brief
2. **If available:** SVK artifacts discovered during brief:
   - GL docs (architecture overview) — use to inform architecture questions
   - SOS/DB findings — use to warn about security-sensitive areas
   - BOK reports — use to warn about verified invariants
3. **If available:** GSD artifacts (`.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`)

**Important:** Use existing documentation to inform questions rather than re-asking the user things that are already documented.

## Step 3: Conduct Interview

Interview the user **one question at a time**, using **multiple choice where possible** (via AskUserQuestion tool). Cover these topics in order:

### Topic 1: Primary Changes
- What exactly is changing? (Files, modules, APIs, data structures)
- Why is this change needed?
- Are there any existing proposals, RFCs, or design docs for this change?

### Topic 2: First-Order Effects
- What directly depends on the things being changed?
- For each dependency: does it need to change too, or can it adapt?
- Are there API contracts, interfaces, or type signatures that will break?

### Topic 3: Second-Order Effects
- What depends on the things identified in first-order effects?
- Are there downstream consumers, tests, or integrations affected?
- Any data migrations or schema changes needed?

### Topic 4: Third-Order Effects
- Anything further downstream?
- Documentation that references changed behavior?
- Configuration files, environment variables, deployment scripts?
- External systems or services that interact with changed components?

### Topic 5: Decision Points
For each identified effect, ask the user how it should be handled:
- **Modify** — update to work with the new changes
- **Remove** — delete (no longer needed)
- **Replace** — swap with a new implementation
- **Leave as-is** — it will still work without changes (document why)

### Topic 6: Constraints
- What must NOT change? (Invariants, backward compatibility requirements)
- Are there performance requirements that must be maintained?
- Are there security boundaries that must be respected?
- Are there external contracts (APIs, file formats) that must remain stable?

### Topic 7: Testing Requirements
For each group of related changes:
- What constitutes "this worked"?
- Are there existing tests that should still pass?
- What new tests are needed?
- Are there manual verification steps?

### Interview Flow

- Ask one question at a time
- Use AskUserQuestion with multiple choice options where the possible answers are known
- Reference existing documentation instead of asking the user to re-explain
- If the user's answer reveals new effects, follow up before moving to the next topic
- Continue until both you and the user agree the change surface is fully mapped
- Summarize decisions periodically so the user can correct any misunderstandings

## Step 4: Write INTERVIEW.md

Write `.dbs/INTERVIEW.md` — the structured change manifest:

```markdown
---
skill: dbs
phase: interview
status: complete
updated: <ISO-8601>
key_outputs:
  - "<N> primary changes identified"
  - "<M> cascading effects mapped"
  - "<K> decision points resolved"
---

# DBS Change Manifest

## Primary Changes
<For each primary change: what, why, where>

## Effect Chain
### First-Order Effects
<What directly breaks/changes, with decisions>

### Second-Order Effects
<Downstream impacts, with decisions>

### Third-Order Effects
<Further downstream, with decisions>

## Decision Log
| # | Effect | Decision | Rationale |
|---|--------|----------|-----------|
| 1 | <description> | modify/remove/replace/leave | <why> |

## Constraints
<What must NOT change and why>

## Testing Requirements
| Change Group | Success Criteria | Existing Tests | New Tests Needed |
|-------------|-----------------|----------------|-----------------|

## Open Questions
<Anything unresolved — should be empty if interview is complete>
```

## Step 5: Update State and Report

Update `.dbs/STATE.json`:
- Set `pipeline.interview.status` to `"complete"`
- Update `updated` timestamp

Display summary:

```
Don't Break Shit — Interview Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes mapped:
  Primary changes:    <N>
  First-order effects:  <M>
  Second-order effects: <K>
  Third-order effects:  <J>
  Decision points:      <total>
  Constraints:          <count>

Artifacts:
  .dbs/INTERVIEW.md — structured change manifest

Next: /clear then /DBS:analyze
```
