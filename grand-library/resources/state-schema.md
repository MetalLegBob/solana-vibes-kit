---
skill: grand-library
type: schema
for: .docs/STATE.json
description: >
  Schema for the Grand Library state file. Every /GL:* command reads and
  updates this file. It tracks phase progress, configuration, and artifact inventory.
---

# STATE.json Schema

```json
{
  "skill": "grand-library",
  "version": "1.0.0",
  "project_name": "string",
  "mode": "greenfield | existing",
  "created": "ISO-8601",
  "updated": "ISO-8601",

  "phases": {
    "survey": {
      "status": "pending | in_progress | complete",
      "started": "ISO-8601 | null",
      "completed": "ISO-8601 | null",
      "mode_detected": "greenfield | existing | null",
      "docs_proposed": 0,
      "files_scanned": 0,
      "existing_docs_found": 0
    },
    "interview": {
      "status": "pending | in_progress | complete",
      "started": "ISO-8601 | null",
      "completed": "ISO-8601 | null",
      "topics_total": 0,
      "topics_completed": 0,
      "topics_remaining": [],
      "decisions_captured": 0,
      "research_queries": 0,
      "verification_items": 0
    },
    "draft": {
      "status": "pending | in_progress | complete",
      "started": "ISO-8601 | null",
      "completed": "ISO-8601 | null",
      "current_wave": 0,
      "waves_total": 0,
      "docs_generated": 0,
      "docs_validated": 0
    },
    "reconcile": {
      "status": "pending | in_progress | complete",
      "started": "ISO-8601 | null",
      "completed": "ISO-8601 | null",
      "conflicts_found": 0,
      "gaps_found": 0,
      "verification_items": 0,
      "resolved": 0
    }
  },

  "artifacts": {
    "project_brief": "path | null",
    "doc_manifest": "path | null",
    "decisions": [],
    "generated_docs": [],
    "reconciliation_report": "path | null"
  }
}
```

### Initialization

Phase 0 (/GL:survey) creates this file. All subsequent phases read + update it.

### Update Rules

1. Only the currently-running phase updates its own section
2. The `updated` timestamp is refreshed on every write
3. The `artifacts` section is append-only (new paths added, never removed)
4. If STATE.json doesn't exist when a phase runs, that phase should error with guidance to run /GL:survey first (except for /GL:survey itself)
