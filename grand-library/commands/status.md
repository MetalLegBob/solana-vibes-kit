---
name: GL:status
description: "Check Grand Library progress and get guidance on next steps"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Grand Library — Status & Progress

Check the current state of a Grand Library documentation session and get guidance on what to do next.

## Step 1: Check for State

```bash
test -f .docs/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

### If no state exists:

```markdown
## No Grand Library Session Found

No `.docs/STATE.json` found in this directory.

### Getting Started
Run `/GL:survey` to begin a new documentation session.

### Full Pipeline
| Step | Command | Description |
|------|---------|-------------|
| 1 | `/GL:survey` | Discover project, build brief + doc manifest |
| 2 | `/GL:interview` | Topic-by-topic deep-dive Q&A |
| 3 | `/GL:draft` | Generate all documents in waves (Milestone 2) |
| 4 | `/GL:reconcile` | Cross-check docs for contradictions (Milestone 2) |

Run `/grand-library` for a detailed getting-started guide.
```

### If state exists:

## Step 2: Parse State & Display Dashboard

Read `.docs/STATE.json` and display:

```markdown
Grand Library — Documentation Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Status icons based on STATE.json:}
{Completed: ✓, Current: ▸, Pending: ○}

✓ Phase 0   Survey          {complete|in_progress|pending}
▸ Phase 1   Interview       {topics_completed}/{topics_total} topics
○ Phase 2   Draft           pending
○ Phase 3   Reconcile       pending

Project: {project_name}
Mode: {greenfield|existing}
```

## Step 3: Phase-Specific Details

**If interview is in progress:**
```
Interview Progress:
  Topics completed: {list of completed topics}
  Current/next topic: {next in topics_remaining}
  Decisions captured: {decisions_captured}
  Research queries: {research_queries}
  Verification items: {verification_items}
```

**If interview is complete:**
```
Interview Complete:
  {topics_total} topics covered
  {decisions_captured} decisions captured
  {verification_items} items need verification
```

## Step 4: File Verification

Cross-check state against actual files:

```bash
test -f .docs/PROJECT_BRIEF.md && echo "PROJECT_BRIEF: exists" || echo "PROJECT_BRIEF: MISSING"
test -f .docs/DOC_MANIFEST.md && echo "DOC_MANIFEST: exists" || echo "DOC_MANIFEST: MISSING"
ls .docs/DECISIONS/*.md 2>/dev/null | wc -l
test -f .docs/STATE.json && echo "STATE: exists" || echo "STATE: MISSING"
```

If state says a phase is complete but its output files are missing, warn the user.

## Step 5: Route to Next Action

```markdown
### Next Step
{clear instruction with exact command}
```

**Routing table:**

| Current State | Next Action |
|---------------|-------------|
| No state | `/GL:survey` to start |
| survey in_progress | `/GL:survey` to finish |
| survey complete | `/clear` then `/GL:interview` |
| interview in_progress | `/GL:interview --resume` (or `/clear` then `/GL:interview --resume`) |
| interview complete | `/clear` then `/GL:draft` *(Milestone 2)* |
| draft complete | `/clear` then `/GL:reconcile` *(Milestone 2)* |
| reconcile complete | Review `.docs/RECONCILIATION_REPORT.md` |
