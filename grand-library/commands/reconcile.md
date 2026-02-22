---
name: GL:reconcile
description: "Phase 3: Cross-check all generated documents for contradictions, gaps, and missing decisions"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# Grand Library — Phase 3: Reconcile

You are running the reconciliation phase. This is the final quality gate — an Opus-powered cross-check of the entire documentation suite.

## What This Phase Does

1. Load all generated documents, decisions, and the project brief
2. Spawn a single Opus reconciliation agent to run four passes
3. Present the reconciliation report to the user
4. Help the user resolve any issues found
5. Optionally re-run to verify a clean bill of health

## Arguments

Parse any arguments from the user's message:
- `--recheck` — Re-run reconciliation after fixes (expects prior report exists)
- No arguments = full reconciliation

---

## Step 1: Load Context

### Required files:
1. `.docs/STATE.json` — Check phase status
2. `.docs/PROJECT_BRIEF.md`
3. `.docs/DOC_MANIFEST.md`
4. All `.docs/DECISIONS/*.md` files
5. All generated docs (`.docs/*.md` excluding STATE, BRIEF, MANIFEST, and DECISIONS/)

### Error if missing:
If draft phase is not complete:
"The draft phase isn't complete yet. Run `/GL:draft` to generate documents first."

### Count and announce:
```
## Reconciliation — Phase 3

Documents to review: {N}
Decision files: {N}
Total decisions to trace: {N}

Spawning reconciliation agent...
```

## Step 1.5: Context Budget Assessment

Before spawning the reconciliation agent, estimate whether the full document suite fits comfortably in a single prompt.

### Sizing Rules

1. **Count generated documents** (excluding STATE.json, PROJECT_BRIEF, DOC_MANIFEST, DECISIONS/)
2. **Threshold: 6 generated docs OR 4+ DECISIONS files**
   - **At or below threshold → Inline mode:** proceed to Step 2a (all content inline)
   - **Above threshold → Slim mode:** proceed to Step 2b (summaries inline + disk access)

If in doubt, prefer slim mode. A slightly slower reconciliation is always better than a prompt overflow.

### Summary Extraction (Slim mode only)

For each generated document, extract:

1. **Full YAML frontmatter** (as-is)
2. **Executive summary** — the first paragraph under the top-level `#` heading
3. **All section headings** — every `##` and `###` heading as a table of contents (no body content)

Target: ~100–150 tokens per doc summary.

### DECISIONS Trimming (Slim mode only)

For each DECISIONS file:

- **Always include:** each decision's `choice` and `rationale` (first sentence only)
- **Always include:** `affects_docs` list and any `NEEDS_VERIFICATION` flags
- **Omit:** `alternatives_considered` details, `open_questions`, `raw_notes` sections

Target: max ~2000 tokens per DECISIONS file.

### Announce mode to user:

```
{If slim mode:}
Large documentation suite ({N} docs, {N} decision files) — using summary-first reconciliation.
The agent will read full documents from disk as needed for detailed checks.

{If inline mode:}
Documentation suite fits comfortably in context — running full inline reconciliation.
```

---

## Step 2a: Spawn Reconciliation Agent (Inline Mode)

For small suites where everything fits. Pass all content directly.

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="You are a Grand Library reconciliation agent.

  Read the agent instructions at: {skill_path}/agents/reconciler.md

  ## Documents to Review

  PROJECT BRIEF:
  {brief_content}

  DECISIONS:
  {all_decisions_content}

  DOC MANIFEST:
  {manifest_content}

  GENERATED DOCUMENTS:
  {all_generated_docs_content}

  Perform all four passes and produce the RECONCILIATION_REPORT.md"
)
```

## Step 2b: Spawn Reconciliation Agent (Slim Mode)

For large suites. Pass summaries inline; the agent reads full docs from disk.

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="You are a Grand Library reconciliation agent running in SLIM CONTEXT MODE.

  Read the agent instructions at: {skill_path}/agents/reconciler.md
  Pay special attention to the 'Slim Context Mode' section.

  ## Context (summaries — read full docs from disk as needed)

  PROJECT BRIEF:
  {brief_content}

  DECISIONS (trimmed — choices + first-sentence rationales + affects + verification flags):
  {trimmed_decisions_content}

  DOC MANIFEST:
  {manifest_content}

  DOCUMENT SUMMARIES:
  {for each generated doc:}
  ### {doc_id}
  {frontmatter}
  {executive_summary}
  Sections: {list of ## headings}
  Full path: .docs/{doc_id}.md
  ---

  You have summaries of {N} documents above. Read the full documents from disk
  using the Read tool when you need detailed content for any pass.

  Perform all four passes and produce the RECONCILIATION_REPORT.md"
)
```

## Step 3: Present Report

Write the reconciliation report to `.docs/RECONCILIATION_REPORT.md`.

Display summary to user:

```markdown
## Reconciliation Complete

| Pass | Result |
|------|--------|
| Completeness | {N}/{N} decisions traced ({M} missing) |
| Consistency | {N} conflicts found |
| Gaps | {N} gaps identified |
| Verification | {N} items need verification |

### {If issues found:}
Review the full report at `.docs/RECONCILIATION_REPORT.md`.

I can help you resolve these issues interactively:
- For **conflicts**, I'll show both sides and ask which is correct
- For **gaps**, I'll draft the missing content
- For **verification items**, I'll suggest how to verify each one

Would you like to work through the issues now?

### {If clean:}
All documents are consistent, complete, and verified. Your documentation suite is ready.
```

## Step 4: Interactive Resolution (if issues found)

If the user wants to resolve issues:

### For Conflicts:
1. Show the conflict — both sides with context
2. Ask which version is correct (or if neither is)
3. Update the affected document(s)
4. Mark the conflict as resolved

### For Gaps:
1. Show the gap description and impact
2. Draft the missing content
3. Show it to the user for approval
4. Insert into the appropriate document (or create a new one if needed)
5. Mark the gap as addressed

### For Missing Decisions:
1. Show which decision is missing and from which documents
2. Add the decision to the appropriate document(s)
3. Mark as complete

### For Verification Items:
1. Present the item and suggested verification approach
2. Let the user verify or defer
3. Mark as verified or keep as NEEDS_VERIFICATION

After resolving issues, update STATE.json and offer to re-run:
"Issues resolved. Want me to run reconciliation again to verify everything is clean? (`/GL:reconcile --recheck`)"

## Step 5: Finalize

1. Update STATE.json: set reconcile status to `complete`, record findings
2. Update artifact paths
3. Display final summary:

```markdown
## Reconciliation Complete

**Status:** {clean | N issues remaining}
**Documents reviewed:** {N}
**Decisions traced:** {N}/{N}

### Report
`.docs/RECONCILIATION_REPORT.md`

### Documentation Suite
Your documentation is {complete / complete with N verification items remaining}.

{If all clean:}
The full documentation suite is ready for use. Every decision from the interview is reflected in the documents, and all documents are internally consistent.
```
