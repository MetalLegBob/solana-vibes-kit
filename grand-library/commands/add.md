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

## Step 4: Generate Document

1. Select or create a template
2. Gather relevant DECISIONS files and existing docs
3. Spawn an Opus doc writer:

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

  DECISIONS FILES:
  {relevant_decisions_content}

  TEMPLATE:
  {template_content}

  EXISTING DOCS FOR CONSISTENCY:
  {relevant_existing_doc_summaries}

  Write the complete document following the template structure. Every section must have substantive content."
)
```

4. Write the generated doc to `.docs/{doc_id}.md`

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
