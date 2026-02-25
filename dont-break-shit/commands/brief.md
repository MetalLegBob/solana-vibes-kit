---
name: DBS:brief
description: "Scan project baseline and capture change brief"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - AskUserQuestion
---

# Don't Break Shit — Phase 1: Brief

Capture the user's change brief and scan the project to build a baseline understanding.

## Step 1: Check Prerequisites

```bash
test -f .dbs/STATE.json && echo "STATE_EXISTS" || echo "NO_STATE"
```

### If state exists:

Read `.dbs/STATE.json` and check `pipeline.brief.status`:

- If `"complete"`: Warn the user that a DBS session already exists. Show the existing brief. Ask if they want to:
  1. **Restart** — delete `.dbs/` and start fresh
  2. **Resume** — continue from where they left off (suggest `/DBS:status` for guidance)
  3. **Cancel** — abort
- If `"in_progress"`: The previous brief scan was interrupted. Ask if they want to restart or resume.

### If no state:

Proceed to Step 2.

## Step 2: Capture User Brief

Check if the user provided a brief as an argument to the command. If so, use it. Otherwise, ask:

> What changes do you want to make to this project? Describe the scope — what's changing, why, and any high-level constraints you already know about.

Capture their response as the project brief. Keep a condensed version (1-2 sentences) for `STATE.json`.

## Step 3: Initialize State

Create the `.dbs/` directory and initialize `STATE.json`:

```bash
mkdir -p .dbs
```

Write `.dbs/STATE.json` with this exact schema:

```json
{
  "skill": "dbs",
  "version": "1.4.0",
  "updated": "<ISO-8601 timestamp>",
  "project": {
    "brief": "<condensed 1-2 sentence brief>",
    "total_phases": null,
    "current_phase": null
  },
  "pipeline": {
    "brief": { "status": "in_progress" },
    "interview": { "status": "pending" },
    "analyze": { "status": "pending" },
    "map": { "status": "pending" }
  },
  "phases": {},
  "gsd_available": null
}
```

**Critical:** The `"skill": "dbs"` field is the discovery key for the SessionStart hook and MCP server. It must be present.

## Step 4: Scan Project Baseline

Use **signal-based indexing** — structure first, targeted reads of high-signal files only. No blanket file reads.

### 4a: Directory Structure

```bash
# Get top-level structure (2 levels deep, ignore hidden dirs except .claude)
find . -maxdepth 2 -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/target/*' -not -path '*/dist/*' | head -100
```

Also check:
```bash
# Language/framework detection
ls package.json Cargo.toml go.mod pyproject.toml Anchor.toml Makefile CMakeLists.txt 2>/dev/null
```

### 4b: Check for SVK Artifacts

Check for each SVK skill's state directory. Use MCP tools (`svk_get_doc`, `svk_get_audit`) if available, fall back to direct file reads:

| Artifact | State File | What to Read |
|----------|-----------|--------------|
| Grand Library (GL) | `.docs/STATE.json` | Architecture overview, data model summaries |
| Stronghold of Security (SOS) | `.audit/STATE.json` | Critical/high findings summary |
| Dinh's Bulwark (DB) | `.bulwark/STATE.json` | Off-chain security findings |
| Book of Knowledge (BOK) | `.bok/STATE.json` | Verified invariants |

For each that exists, record it was found and extract a brief summary. Do NOT read full artifacts — just confirm existence and capture high-level metadata.

### 4c: Check for GSD Artifacts

```bash
test -f .planning/PROJECT.md && echo "GSD_PROJECT" || echo "NO_GSD_PROJECT"
test -f .planning/REQUIREMENTS.md && echo "GSD_REQUIREMENTS" || echo "NO_GSD_REQUIREMENTS"
```

If found, read the project description and key requirements (first 50 lines of each).

### 4d: Check for Non-SVK Documentation

```bash
# Check for common doc locations
ls README.md ARCHITECTURE.md docs/ architecture.* DESIGN.md 2>/dev/null
```

Read README.md if it exists (first 80 lines for project overview).

## Step 5: Write BRIEF.md

Write `.dbs/BRIEF.md` with structured frontmatter:

```markdown
---
skill: dbs
phase: brief
status: complete
updated: <ISO-8601>
key_outputs:
  - "Project baseline captured"
  - "Change brief recorded"
---

# DBS Brief

## Change Brief

<User's full brief description>

## Project Baseline

### Structure
<Directory structure summary — key directories and their purposes>

### Technology
<Language, framework, build system detected>

### Existing Documentation
<What was found: SVK artifacts, GSD context, READMEs, etc.>

### SVK Artifacts
<Table of found/not-found for each SVK skill>

## Context for Next Phase
<Condensed summary of what the interviewer needs to know>
```

## Step 6: Update State and Report

Update `.dbs/STATE.json`:
- Set `pipeline.brief.status` to `"complete"`
- Update `updated` timestamp

Display a console summary:

```
Don't Break Shit — Brief Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Brief: "<condensed brief>"

Project Baseline:
  Structure:     <N> directories, <M> files detected
  Technology:    <language/framework>
  Documentation: <what was found>
  SVK Artifacts: <list of found artifacts, or "none detected">

Artifacts:
  .dbs/STATE.json  — initialized
  .dbs/BRIEF.md    — project baseline + change brief

Next: /clear then /DBS:interview
```
