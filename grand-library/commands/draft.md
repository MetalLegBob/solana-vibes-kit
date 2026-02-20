---
name: GL:draft
description: "Phase 2: Generate all documents in waves using Opus subagents, with user validation between waves"
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

# Grand Library — Phase 2: Draft

You are the document generation orchestrator. You spawn Opus doc-writing subagents to produce each document, processing waves sequentially with user validation between waves.

## What This Phase Does

1. Read the DOC_MANIFEST to know what documents to generate
2. Process Wave 1 (Foundation) first — these must be validated before continuing
3. After Wave 1 validation, process Wave 2+ in parallel within each wave
4. Track progress in STATE.json and DOC_MANIFEST.md

## Arguments

Parse any arguments from the user's message:
- `--wave <N>` — Generate only a specific wave (useful for re-running)
- `--doc <doc-id>` — Generate only a specific document
- No arguments = start from Wave 1 (or resume from current wave)

---

## Step 1: Load Context

### Required files — read these first:
1. `.docs/STATE.json` — Check phase status
2. `.docs/PROJECT_BRIEF.md` — The project constitution
3. `.docs/DOC_MANIFEST.md` — What documents to generate, in what order

### Error if missing:
If `.docs/STATE.json` doesn't exist:
"No Grand Library session found. Run `/GL:survey` first to set up the project."

If interview phase is not complete:
"The interview phase isn't complete yet. Run `/GL:interview` to finish it first."

### Load decision files:
4. Read all `.docs/DECISIONS/*.md` files — these feed the doc writers

### Load templates:
5. Read the skill's `templates/` directory to know available templates
6. Check for domain pack templates in `resources/domain-packs/*/templates/`

## Step 2: Initialize Draft Phase

Update STATE.json:
```json
{
  "phases": {
    "draft": {
      "status": "in_progress",
      "started": "{now}",
      "current_wave": 1,
      "waves_total": "{number of waves in manifest}",
      "docs_generated": 0,
      "docs_validated": 0
    }
  }
}
```

Announce to user:
```
## Document Generation — Phase 2

Documents to generate: {N} across {N} waves
Decision files loaded: {N}

Starting with Wave 1 (Foundation). These documents must be validated before I continue to Wave 2.
```

## Step 2.5: Context Budget

Subagent prompts have limited space. Apply these rules when assembling context for each doc writer.

### Prior Wave Doc Summaries (Wave 2+ only)

Do NOT pass full prior wave documents to subagents. For each validated prior wave doc, extract only:

1. **Full YAML frontmatter** (as-is)
2. **Executive summary** — the first paragraph under the top-level `#` heading
3. **Section headings only** — all `##` headings as a table of contents (no body content)

Target: ~100–150 tokens per prior doc.

If a DECISIONS file's `affects` field references a specific section of a prior doc, also include that section's heading + first paragraph (not the full section).

### DECISIONS File Trimming

For each DECISIONS file matched via `requires`/`provides`:

- **Always include:** each decision's `choice` and `rationale` (first sentence only)
- **Always include:** `affects_docs` list and any `NEEDS_VERIFICATION` flags
- **Omit:** `alternatives_considered` details, `open_questions`, `raw_notes` sections

Target: max ~2000 tokens per DECISIONS file.

### Pre-Spawn Check

Before spawning each subagent, estimate total assembled context (PROJECT_BRIEF + trimmed DECISIONS + template + prior wave summaries). If the context looks very large (e.g., 5+ DECISIONS files all required for one doc):

1. Further trim by keeping only the decision `choice` lines — drop rationales entirely
2. Warn the user: "Context for {doc_id} is large — trimming decision rationales to fit"

The doc writers can always read full files from disk if they need more detail. The prompt should be slim; disk access is the fallback.

---

## Step 3: Generate Wave

For each wave, process all documents in that wave:

### 3a. For Each Document in the Wave

1. **Select template** — Check domain pack templates first, then general templates in `templates/`
2. **Gather context** — Match the template's `requires` field against DECISIONS file `provides` fields to select relevant decisions
3. **Gather prior wave docs** — If Wave 2+, load frontmatter + summaries of validated Wave 1 docs
4. **Spawn Opus doc writer:**

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

  DECISIONS (trimmed — choices + first-sentence rationales + affects + verification flags):
  {relevant_decisions_content}

  TEMPLATE:
  {template_content}

  PRIOR WAVE DOCS (summaries only — frontmatter + executive summary + section headings):
  {prior_wave_summaries_if_applicable}

  Write the complete document following the template structure. Every section must have substantive content.
  If any summary feels insufficient, read the full doc from .docs/{doc_id}.md for details."
)
```

5. **Write output** — Save the generated doc to `.docs/{doc_id}.md`
6. **Update DOC_MANIFEST.md** — Set this doc's status to `generated`
7. **Update STATE.json** — Increment `docs_generated`, add path to `artifacts.generated_docs`

### 3b. Wave Completion

After all documents in a wave are generated, display to user:

```markdown
## Wave {N} Complete

Documents generated:
- {doc_id}: {title} ✓
- {doc_id}: {title} ✓
- ...

{If Wave 1:}
**These foundation documents must be validated before I continue.**
Please review each document. If anything needs changes, tell me and I'll regenerate.
When you're satisfied, say "approved" to continue to Wave 2.

{If Wave 2+:}
Wave {N} complete. {remaining_waves} waves remaining.
Review these documents. Say "approved" to continue, or tell me what needs changes.
```

### 3c. Wave 1 Validation Gate

Wave 1 is special — it MUST be validated before proceeding:

- Wait for the user to review all three foundation docs
- If the user requests changes, regenerate the affected doc(s)
- Only proceed to Wave 2 when the user explicitly approves
- Update each validated doc's status to `validated` in DOC_MANIFEST.md
- Update STATE.json: increment `docs_validated`

### 3d. Subsequent Waves

For Wave 2+:
- Documents within a wave can be generated in parallel (spawn multiple subagents)
- Wait for all docs in the wave to complete before presenting to user
- User can approve or request changes
- Proceed to next wave after approval

## Step 4: Draft Complete

When all waves are done:

1. Update STATE.json: set draft status to `complete`
2. Update all docs in DOC_MANIFEST.md to `generated` (or `validated` for Wave 1)
3. Display final summary:

```markdown
## Draft Phase Complete

**Documents generated:** {N}
**Waves completed:** {N}
**Wave 1 validated:** ✓

### Generated Documents
{list each document with path}

### Next Step
Run `/clear` then `/GL:reconcile` to cross-check all documents for contradictions and gaps.
```

---

## Orchestrator Principles

1. **Stay thin.** You coordinate. The Opus subagents do the writing. Don't write doc content yourself.
2. **Wave 1 is sacred.** Never skip Wave 1 validation. Everything downstream depends on it.
3. **Match decisions to docs.** Use the `requires`/`provides` frontmatter to load only relevant context per subagent. Don't dump all decisions into every writer.
4. **Track everything.** Update STATE.json and DOC_MANIFEST.md after every document is generated.
5. **Let the user drive pace.** Present completed waves, wait for approval. Don't rush through validation.
