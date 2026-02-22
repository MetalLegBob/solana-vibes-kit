---
name: GL:add
description: "Add a new document to an existing documentation suite"
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

# Grand Library — Add Document

Add a new document to an existing Grand Library documentation suite.

## What This Command Does

1. Let the user choose a document type or describe a custom one
2. Conduct a focused mini-interview for the new doc's requirements
3. Generate the document using an Opus subagent
4. Add it to the DOC_MANIFEST and update STATE.json
5. Run a targeted reconciliation against existing docs

## Arguments

Parse from the user's message:
- `--type <doc-id>` — Use a specific doc type from the catalog
- `--title "Custom Title"` — Create a custom document with this title
- No arguments = show available options

---

## Step 1: Load Context

1. Read `.docs/STATE.json` — verify draft phase is complete (or at least interview)
2. Read `.docs/PROJECT_BRIEF.md`
3. Read `.docs/DOC_MANIFEST.md` — what docs already exist
4. Read the skill's `resources/doc-catalog.md` — available doc types

## Step 2: Choose Document Type

### If `--type` provided:
Look up the doc type in the catalog. If found, use it. If not, offer similar options.

### If `--title` provided:
Create a custom document. Ask: "What should this document cover? What decisions does it depend on?"

### If no arguments:
Show available options:

```
## Add a Document

### From Catalog (not yet in your manifest)
{list doc types from catalog that aren't in the current manifest}

### Custom
Describe what you need and I'll create a custom document.

Which would you like to add?
```

## Step 3: Mini-Interview

Conduct a focused interview for the new document:

1. **What does this doc cover?** — Understand the scope
2. **What decisions feed it?** — Which DECISIONS files are relevant
3. **What existing docs should it be consistent with?** — Cross-reference targets
4. **What wave does it belong to?** — Where in the generation order (usually Wave 4 for additions)

Keep this short — 3-5 questions max.

## Step 3.5: Context Budget

Apply the same context budget rules as GL:draft Step 2.5 when assembling the doc writer prompt.

### DECISIONS File Trimming

For each relevant DECISIONS file:
- **Always include:** each decision's `choice` and `rationale` (first sentence only)
- **Always include:** `affects_docs` list and any `NEEDS_VERIFICATION` flags
- **Omit:** `alternatives_considered` details, `open_questions`, `raw_notes` sections

Target: max ~2000 tokens per DECISIONS file.

### Existing Doc Summaries

For `relevant_existing_doc_summaries`, do NOT pass full documents. For each existing doc referenced for consistency, extract only:
1. **Full YAML frontmatter** (as-is)
2. **Executive summary** — first paragraph under the top-level `#` heading
3. **Section headings only** — all `##` headings as a table of contents

Target: ~100-150 tokens per existing doc summary.

### Pre-Spawn Check

Estimate total context (PROJECT_BRIEF + trimmed DECISIONS + template + doc summaries). Hard cap: 80K tokens per doc writer.

- **Under 60K:** Proceed as normal.
- **60K–80K:** Drop decision rationales entirely, keep only `choice` lines. Warn user.
- **Over 80K:** Switch decisions to disk-read mode. Pass only decision IDs and choices inline. Add to prompt: "Read full decisions from .docs/DECISIONS/{topic}.md if needed."
- **Over 80K after disk-read fallback:** Also move existing doc summaries to disk reads. The doc writer reads them directly from `.docs/{doc_id}.md`.

**Hard cap on decision count:** If the new doc requires more than 8 DECISIONS files, automatically use disk-read mode for decisions.

## Step 4: Generate Document

1. Select or create a template
2. Gather relevant DECISIONS files and existing docs
3. Apply Step 3.5 trimming rules
4. Spawn an Opus doc writer:

```
Task(
  subagent_type="general-purpose",
  model="opus",
  prompt="You are a Grand Library doc writer agent.

  Read the agent instructions at: {skill_path}/agents/doc-writer.md

  ## Your Assignment

  Generate: {doc_title} (doc_id: {doc_id})

  ## Context Files

  PROJECT_BRIEF: {project_brief_content}

  DECISIONS (trimmed — choices + first-sentence rationales, max ~2000 tokens each):
  {trimmed_decisions_content}

  TEMPLATE:
  {template_content}

  EXISTING DOCS (summaries — frontmatter + executive summary + section headings):
  {existing_doc_summaries}

  Write the complete document following the template structure. Every section must have substantive content.
  If any summary is insufficient, read the full doc from .docs/{doc_id}.md for details."
)
```

5. Write the generated doc to `.docs/{doc_id}.md`

## Step 5: Update Manifest & State

1. Add the new document to DOC_MANIFEST.md with status `generated`
2. Update STATE.json: increment `docs_generated`, add to `artifacts.generated_docs`

## Step 6: Targeted Reconciliation

Run a lightweight check:
- Does the new doc contradict any existing docs?
- Is the new doc consistent with the decisions it references?

```markdown
## Document Added

**Title:** {title}
**File:** `.docs/{doc_id}.md`
**Wave:** {N}
**Decisions referenced:** {list}

{If reconciliation found issues:}
Note: {N} potential inconsistencies with existing docs. Run `/GL:reconcile` for a full check.

{If clean:}
Document is consistent with the existing suite.
```
