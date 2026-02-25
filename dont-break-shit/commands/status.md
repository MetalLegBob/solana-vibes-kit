---
name: DBS:status
description: "Check DBS progress and get guidance on next steps"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Don't Break Shit — Status & Progress

Check the current state of a DBS change management session and get guidance on what to do next.

## Step 1: Check for State

```bash
test -f .dbs/STATE.json && echo "DBS_EXISTS" || echo "NO_DBS"
```

### If no state exists:

```
No Active DBS Session
━━━━━━━━━━━━━━━━━━━━━

No `.dbs/STATE.json` found. No change management session is in progress.

To start a new session:
  /DBS:brief — Describe the changes you want to make and scan the project baseline

DBS Pipeline:
  /DBS:brief     → Capture change brief + scan project
  /DBS:interview → Map all changes and cascading effects
  /DBS:analyze   → Full codebase impact analysis
  /DBS:map       → Generate multi-phase execution plan
  /DBS:discuss N → Tactical decisions per phase (requires GSD)
  /DBS:plan N    → Implementation plan per phase (requires GSD)
  /DBS:execute N → Implement changes per phase (requires GSD)
```

Then stop.

## Step 2: Read and Parse State

Read `.dbs/STATE.json` and extract:
- `project.brief` — the change brief
- `pipeline` — status of each pipeline phase
- `phases` — status of each execution phase (if any)
- `project.total_phases` — total execution phases planned
- `project.current_phase` — current execution phase
- `gsd_available` — whether GSD is installed

## Step 3: Display Dashboard

```
Don't Break Shit — Change Management Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Brief: "<project.brief>" (truncated to 80 chars)

Pipeline:
{for each of brief, interview, analyze, map:}
  {icon} Phase {N}   {Name}              {status} {detail if applicable}

Where icons are:
  ✓ = complete
  ▸ = in_progress
  ○ = pending
```

If the analyze phase is in_progress, show batch progress:
```
  ▸ Phase 3   Analyze              in progress — {batches_completed}/{batches_total} batches
```

If execution phases exist:
```
Execution Phases: {total_phases} planned
{for each execution phase:}
  {icon} Phase {N}   "{title}"    {overall_status} (discuss {d} plan {p} execute {e})

Where each sub-status uses:
  ✓ = complete
  ▸ = in_progress
  ○ = pending
```

## Step 4: File Verification

Cross-check state against actual files:

```bash
# Check expected artifacts exist
test -f .dbs/BRIEF.md && echo "BRIEF_OK" || echo "BRIEF_MISSING"
test -f .dbs/INTERVIEW.md && echo "INTERVIEW_OK" || echo "INTERVIEW_MISSING"
test -d .dbs/analysis && echo "ANALYSIS_OK" || echo "ANALYSIS_MISSING"
test -f .dbs/IMPACT-MAP.md && echo "IMPACT_MAP_OK" || echo "IMPACT_MAP_MISSING"
test -f .dbs/MAP.md && echo "MAP_OK" || echo "MAP_MISSING"
```

If state says a phase is complete but the artifact file is missing, report the inconsistency.

## Step 5: Route to Next Action

Based on current state, provide specific guidance:

| Current State | Next Action |
|--------------|-------------|
| No state | `/DBS:brief` to start |
| Brief in_progress | `/DBS:brief` to resume |
| Brief complete, interview pending | `/clear` then `/DBS:interview` |
| Interview in_progress | `/DBS:interview` to resume |
| Interview complete, analyze pending | `/clear` then `/DBS:analyze` |
| Analyze in_progress | `/DBS:analyze` to resume (will continue from last batch) |
| Analyze complete, map pending | `/clear` then `/DBS:map` |
| Map in_progress | `/DBS:map` to resume |
| Map complete, no execution started | `/clear` then `/DBS:discuss` |
| Phase N discuss in_progress | `/DBS:discuss N` to resume |
| Phase N discuss complete | `/clear` then `/DBS:plan N` |
| Phase N plan in_progress | `/DBS:plan N` to resume |
| Phase N plan complete | `/clear` then `/DBS:execute N` |
| Phase N execute in_progress | `/DBS:execute N` to resume |
| Phase N execute complete, more phases | `/clear` then `/DBS:discuss {N+1}` |
| All phases complete | Session complete. `.dbs/` contains full audit trail. |

Display the next action prominently:
```
Next: <specific command to run>
```

## Step 6: SVK Awareness Status

Show what SVK artifacts DBS has detected (from the brief phase):

```
SVK Artifacts:
  GL (Grand Library):          {found / not found}
  SOS (Stronghold of Security): {found / not found}
  DB (Dinh's Bulwark):         {found / not found}
  BOK (Book of Knowledge):     {found / not found}
  GSD (Get Shit Done):         {installed / not installed}
```
