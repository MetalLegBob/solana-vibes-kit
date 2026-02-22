---
name: GL:update
description: "Re-interview a specific topic and regenerate all documents affected by the changed decisions"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# Grand Library — Update Topic

Re-interview a specific topic and cascade changes through affected documents.

## What This Command Does

1. Re-run the interview for one specific topic
2. Update the DECISIONS file for that topic
3. Identify all documents that reference this topic's decisions
4. Regenerate those documents with the updated decisions
5. Run a targeted reconciliation on the affected documents

## Arguments

**Required:** `--topic <topic-slug>` — Which topic to re-interview

Parse from the user's message. If no topic specified, show the list of completed topics and ask which one.

---

## Step 1: Load Context

1. Read `.docs/STATE.json` — verify interview is complete
2. Read `.docs/PROJECT_BRIEF.md`
3. Read `.docs/DOC_MANIFEST.md`
4. Read `.docs/DECISIONS/{topic-slug}.md` — the existing decisions for this topic

### Error if missing:
If interview phase is not complete:
"The interview hasn't been completed yet. Run `/GL:interview` to finish the initial interview first."

If the topic slug doesn't match any DECISIONS file:
"No decisions file found for topic '{topic-slug}'. Available topics: {list}"

## Step 2: Show Current Decisions

Display the current decisions for this topic:

```
## Updating Topic: {Topic Name}

Current decisions for this topic:
{list each decision with D-number and choice}

What would you like to change? I'll re-interview this topic, keeping existing decisions as defaults unless you want to change them.
```

## Step 3: Re-Interview

Follow the same interview flow as `/GL:interview` (Step 3: Per-Topic Interview Flow), but:
- Pre-fill existing decisions as defaults — "Currently: {choice}. Keep this or change?"
- Only ask about things the user wants to change
- Allow adding new decisions not in the original interview
- Support the same research fork for new trade-offs

## Step 4: Update Decisions File

Write the updated `DECISIONS/{topic-slug}.md`:
- Preserve unchanged decisions
- Update changed decisions with new rationale
- Add new decisions if any
- Update the `interview_date` to now
- Update `decisions_count`

Show the updated decisions to the user for validation.

## Step 5: Update PROJECT_BRIEF.md

Update the one-line decision summaries for this topic.

## Step 6: Identify Affected Documents

Read DOC_MANIFEST.md and all generated docs. Find documents that:
- List this DECISIONS file in their `decisions_referenced` frontmatter
- Have content that references decisions from this topic

```
## Affected Documents

These documents reference decisions from {topic}:
- {doc_id}: {title}
- {doc_id}: {title}

I'll regenerate these with your updated decisions. Proceed?
```

## Step 7: Regenerate Affected Documents

**Context Budget:** Apply GL:draft Step 2.5 context budget rules when assembling context for each regenerated document. This includes:
- Trim DECISIONS to choices + first-sentence rationales (max ~2000 tokens each)
- Pass non-regenerated docs as summaries only (frontmatter + executive summary + headings, ~100-150 tokens each)
- Pre-spawn enforcement with 80K hard cap per doc writer
- Disk-read fallback if context exceeds budget

Since update regenerates only affected docs, the unchanged docs serve as "prior wave" equivalents and must be summarized, not inlined in full.

For each affected document, follow the same process as `/GL:draft` Step 3a:
- Spawn an Opus doc writer with updated decisions
- Write the regenerated doc to `.docs/{doc_id}.md`
- Update DOC_MANIFEST.md status

## Step 8: Targeted Reconciliation

Run a lightweight consistency check on just the affected documents:
- Verify new decisions are reflected in regenerated docs
- Check for contradictions between regenerated docs and unchanged docs
- Report any issues

```markdown
## Update Complete

**Topic:** {topic name}
**Decisions changed:** {N}
**Documents regenerated:** {N}

### Changes
- {summary of what changed}

### Reconciliation
{clean | N issues to review}

Your documentation suite has been updated to reflect the new decisions.
```
