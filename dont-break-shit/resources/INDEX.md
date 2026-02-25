---
skill: dbs
type: resource-index
version: "1.3.3"
---

# DBS Resources

## State Files (generated at runtime)

| File | Purpose | Created By |
|------|---------|------------|
| .dbs/STATE.json | Overall progress tracking — discovery key for hooks/MCP | /DBS:brief (init), all commands (update) |
| .dbs/BRIEF.md | User's change brief + project baseline summary | /DBS:brief |
| .dbs/INTERVIEW.md | Structured change manifest with all decisions | /DBS:interview |
| .dbs/analysis/batch-NNN.md | Per-batch Sonnet impact reports | /DBS:analyze (Pass 1) |
| .dbs/IMPACT-MAP.md | Consolidated impact map from Opus synthesis | /DBS:analyze (Pass 2) |
| .dbs/MAP.md | Multi-phase execution plan with testing gates | /DBS:map |
| .dbs/phases/N-CONTEXT.md | Per-phase tactical context from GSD discuss | /DBS:discuss N |
| .dbs/phases/N-PLAN.md | Per-phase implementation plan from GSD plan | /DBS:plan N |

## State Schema

### .dbs/STATE.json

```json
{
  "skill": "dbs",
  "version": "1.3.3",
  "updated": "ISO-8601 timestamp",
  "project": {
    "brief": "Short description of the intended changes",
    "total_phases": "Number of execution phases (set by /DBS:map)",
    "current_phase": "Current execution phase number (null if in pipeline)"
  },
  "pipeline": {
    "brief":     { "status": "pending | in_progress | complete" },
    "interview": { "status": "pending | in_progress | complete" },
    "analyze":   { "status": "pending | in_progress | complete",
                   "batches_total": "Number of Sonnet agent batches",
                   "batches_completed": "Completed batches" },
    "map":       { "status": "pending | in_progress | complete" }
  },
  "phases": {
    "1": { "discuss": "pending|complete", "plan": "pending|complete", "execute": "pending|in_progress|complete" },
    "2": { "discuss": "pending", "plan": "pending", "execute": "pending" }
  },
  "gsd_available": "null (unchecked) | true | false"
}
```

### Phase handoff files

All `.dbs/*.md` files use structured frontmatter following the Structured Handoff Notes pattern:

```yaml
---
skill: dbs
phase: brief | interview | analyze | map
status: complete
updated: ISO-8601
key_outputs:
  - "Summary of what this phase produced"
---
```

## SVK Integration (Additive)

DBS checks for these artifacts during /DBS:brief and uses them in subsequent phases:

| Artifact | Directory | How DBS Uses It |
|----------|-----------|-----------------|
| GL documentation | .docs/ | Reference during interview — context for architecture questions |
| SOS audit findings | .audit/ | Flags if changes touch areas with known vulnerabilities |
| BOK verification | .bok/ | Warns if changes affect verified invariants |
| DB audit findings | .bulwark/ | Flags if changes touch areas with off-chain security issues |
| GSD project context | .planning/ | Reads PROJECT.md and REQUIREMENTS.md for baseline |
