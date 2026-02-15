---
name: GL:survey
description: "Phase 0: Discover the project — greenfield or existing code — and build project brief + doc manifest"
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

# Grand Library — Phase 0: Survey

You are starting a Grand Library documentation session. This phase discovers the project and produces the planning artifacts that drive all subsequent phases.

## What This Phase Does

1. **Detect mode** — Is this a greenfield project or an existing codebase?
2. **Gather vision** — Ask the user high-level questions about what they're building
3. **Scan (existing only)** — Scan the codebase to understand what exists and what's documented
4. **Build PROJECT_BRIEF.md** — The condensed "constitution" (must stay under 500 tokens)
5. **Build DOC_MANIFEST.md** — The list of documents GL will produce, with wave assignments
6. **Initialize STATE.json** — Create the state tracking file

## Arguments

Parse any arguments from the user's message:
- `--mode <greenfield|existing>` — Override auto-detection
- No arguments = auto-detect

---

## Step 1: Check for Existing State

```bash
test -f .docs/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

**If STATE.json already exists:** Read it and inform the user:
- If survey is already complete, ask: "Survey was already completed. Run `/GL:interview` to continue, or should I re-run the survey from scratch?"
- If survey is in progress, offer to resume or restart

**If no STATE.json:** Continue to Step 2.

## Step 2: Detect Mode

Check for signs of an existing codebase:

```bash
# Check for common project indicators
ls package.json Cargo.toml go.mod pyproject.toml Makefile 2>/dev/null
# Check for source directories
ls -d src/ lib/ programs/ app/ pages/ components/ 2>/dev/null
# Check for existing docs
ls -d docs/ documentation/ wiki/ 2>/dev/null
ls README.md ARCHITECTURE.md DESIGN.md 2>/dev/null
```

**Decision logic:**
- If source files exist → `existing` mode
- If no source files → `greenfield` mode
- If `--mode` argument provided → use that

Announce the detected mode to the user:
- **Greenfield:** "This looks like a new project. I'll ask you about your vision and plans."
- **Existing:** "I see an existing codebase. I'll scan it first, then fill documentation gaps."

## Step 3: Initialize .docs/ Directory

```bash
mkdir -p .docs/DECISIONS
```

Create `.docs/STATE.json` with initial state:

```json
{
  "skill": "grand-library",
  "version": "1.0.0",
  "project_name": "",
  "mode": "{detected_mode}",
  "created": "{now}",
  "updated": "{now}",
  "phases": {
    "survey": { "status": "in_progress", "started": "{now}", "completed": null, "mode_detected": "{detected_mode}", "docs_proposed": 0, "files_scanned": 0, "existing_docs_found": 0 },
    "interview": { "status": "pending", "started": null, "completed": null, "topics_total": 0, "topics_completed": 0, "topics_remaining": [], "decisions_captured": 0, "research_queries": 0, "verification_items": 0 },
    "draft": { "status": "pending", "started": null, "completed": null, "current_wave": 0, "waves_total": 0, "docs_generated": 0, "docs_validated": 0 },
    "reconcile": { "status": "pending", "started": null, "completed": null, "conflicts_found": 0, "gaps_found": 0, "verification_items": 0, "resolved": 0 }
  },
  "artifacts": { "project_brief": null, "doc_manifest": null, "decisions": [], "generated_docs": [], "reconciliation_report": null }
}
```

## Step 4A: Greenfield Survey

Ask the user these questions conversationally (not all at once — adapt based on answers):

### Essential Questions (always ask)
1. **What are you building?** — Get a one-sentence description
2. **What problem does it solve?** — Understand the motivation
3. **Who are the target users?** — Understand the audience
4. **What's the tech stack?** — Languages, frameworks, platforms
5. **What's the scope for v1?** — What's in, what's explicitly out

### Adaptive Questions (ask based on answers)
- If web app → "Frontend framework? SSR or SPA? Auth approach?"
- If smart contracts/blockchain → "Which chain? What programs/contracts? Token involved?"
- If API/backend → "REST or GraphQL? Database? Expected scale?"
- If mobile → "Native or cross-platform? iOS, Android, or both?"

### Context-Gathering Tips
- Listen for complexity signals: multiple components, external integrations, financial logic
- Note any decisions the user has already made — capture these, don't re-ask
- Watch for uncertainty — these become topics for deeper interview later
- If the user already has a design doc or spec, ask them to point you to it and read it

After the conversation, proceed to Step 5.

## Step 4B: Existing Code Survey

Spawn a **Haiku** subagent to scan the codebase:

```
Task(subagent_type="Bash", model="haiku", prompt="...")
```

**Scan agent instructions:**
1. Count files and LOC by language
2. Identify project structure (monorepo? multi-package? single app?)
3. Find all existing documentation (README, docs/, ARCHITECTURE, comments)
4. Identify major components/modules
5. Detect tech stack from config files (package.json, Cargo.toml, etc.)
6. List external dependencies

After the scan completes, present findings to the user:
- "Here's what I found in your codebase: {summary}"
- "These docs already exist: {list}"
- "These areas have no documentation: {gaps}"

Ask the user:
- "Is this an accurate picture? Anything I missed?"
- "What's the project's purpose in one sentence?"
- "What documentation gaps are most important to you?"

## Step 5: Build PROJECT_BRIEF.md

Using the information gathered, write `.docs/PROJECT_BRIEF.md` following the template in `resources/project-brief-template.md`.

**Rules:**
- Must stay under 500 tokens
- One-line summaries only — details go in DECISIONS files later
- Mark topics_remaining based on what still needs deep-dive in the interview

Show the brief to the user for validation.

## Step 6: Build DOC_MANIFEST.md

Read `resources/doc-catalog.md` to know what documents are available. Based on the project, select which documents this project needs and assign them to waves.

Write `.docs/DOC_MANIFEST.md`:

```markdown
---
project: "{project_name}"
mode: "{greenfield|existing}"
created: "{date}"
total_docs: {N}
waves: {N}
status: proposed
---

# Document Manifest

## Wave 1 — Foundation
| Doc ID | Title | Status |
|--------|-------|--------|
| project-overview | Project Overview | pending |
| architecture | Architecture | pending |
| data-model | Data Model | pending |

## Wave 2 — Core Specs
| Doc ID | Title | Requires | Status |
|--------|-------|----------|--------|
| {doc-id} | {title} | {Wave 1 deps} | pending |
| ... | ... | ... | ... |

## Wave 3 — Cross-cutting
| Doc ID | Title | Requires | Status |
|--------|-------|----------|--------|
| ... | ... | ... | ... |

## Wave 4 — Creative / Exploratory
| Doc ID | Title | Trigger | Status |
|--------|-------|---------|--------|
| ... | ... | ... | ... |
```

### Creative Doc Discovery

This is where Grand Library adds unique value. Based on what you learned about the project, propose 2-4 non-obvious documents from Wave 4 that the user probably wouldn't think to write. Explain WHY each one matters.

Example: "I noticed you're integrating with 3 external APIs. I'd recommend a **Service Degradation Playbook** — when one of those APIs goes down at 2am, this doc tells your on-call engineer exactly what breaks and what the fallback is."

Show the manifest to the user. Let them add, remove, or modify before finalizing.

## Step 7: Plan the Interview

Read `resources/topic-tree.md`. Based on the project brief, determine:
1. Which topics are relevant (prune irrelevant branches)
2. Estimated number of topics (for the user's time expectation)
3. Recommended topic order

Update STATE.json with the planned topics:

```json
{
  "phases": {
    "interview": {
      "topics_total": N,
      "topics_remaining": ["core-vision", "architecture", "backend", ...]
    }
  }
}
```

## Step 8: Finalize & Hand Off

1. Update STATE.json: set survey status to `complete`, record artifact paths
2. Display summary to user:

```markdown
## Survey Complete

**Mode:** {greenfield|existing}
**Project:** {name}
**Documents planned:** {N} across {N} waves
**Interview topics:** {N} topics, estimated {N} sessions

### Artifacts Created
- `.docs/PROJECT_BRIEF.md` — Project constitution
- `.docs/DOC_MANIFEST.md` — Document plan
- `.docs/STATE.json` — Progress tracking

### Next Step
Run `/clear` then `/GL:interview` to begin the deep-dive interview.
```
