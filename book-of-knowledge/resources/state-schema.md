---
skill: book-of-knowledge
type: schema
for: .bok/STATE.json
---

# Book of Knowledge — State Schema

## Required Fields (SVK Convention)

| Field | Type | Description |
|-------|------|-------------|
| `skill` | string | Always `"BOK"` — discovery key |
| `version` | string | Skill version (e.g., `"1.0.0"`) |
| `updated` | string | ISO-8601 timestamp |

## BOK-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `kani_available` | boolean | Whether Kani is installed and usable |
| `degraded_mode` | boolean | True if running without Kani |
| `worktree_path` | string | Path to generated worktree (null if not created) |
| `worktree_branch` | string | Branch name of worktree |

## Phases

| Phase | Status Values | Description |
|-------|--------------|-------------|
| `scan` | pending / in_progress / complete | Codebase indexing and prereq check |
| `analyze` | pending / in_progress / complete | Pattern matching and invariant proposal |
| `confirm` | pending / in_progress / complete | Interactive user review |
| `generate` | pending / in_progress / complete | Worktree creation and code generation |
| `execute` | pending / in_progress / complete | Verification tool execution |
| `report` | pending / in_progress / complete | Report compilation and merge offer |

## Phase-Specific Metadata

### scan

| Field | Type | Description |
|-------|------|-------------|
| `phases.scan.math_regions_found` | number | Count of identified math regions |
| `phases.scan.files_indexed` | number | Total files scanned |

### analyze

| Field | Type | Description |
|-------|------|-------------|
| `phases.analyze.invariants_proposed` | number | Total invariants proposed |
| `phases.analyze.by_tool` | object | `{ kani: N, litesvm: N, proptest: N }` |

### confirm

| Field | Type | Description |
|-------|------|-------------|
| `phases.confirm.invariants_confirmed` | number | User-confirmed count |
| `phases.confirm.invariants_skipped` | number | User-skipped count |
| `phases.confirm.invariants_added` | number | User-added custom count |

### generate

| Field | Type | Description |
|-------|------|-------------|
| `phases.generate.harnesses_generated` | number | Kani harness count |
| `phases.generate.litesvm_tests_generated` | number | LiteSVM test count |
| `phases.generate.proptest_suites_generated` | number | Proptest suite count |

### execute

| Field | Type | Description |
|-------|------|-------------|
| `phases.execute.proven` | number | Kani proofs succeeded |
| `phases.execute.stress_tested` | number | Proptest+LiteSVM passed |
| `phases.execute.failed` | number | Verifications that found violations |
| `phases.execute.inconclusive` | number | Timeouts or errors |

### report

| Field | Type | Description |
|-------|------|-------------|
| `phases.report.report_path` | string | Path to final report |
| `phases.report.tests_merged` | boolean | Whether tests were merged back |

## Cross-Skill References

| Field | Type | Description |
|-------|------|-------------|
| `cross_skill.gl_docs` | boolean | Whether GL documentation was used |
| `cross_skill.sos_findings` | boolean | Whether SOS findings influenced priorities |

## Example

```json
{
  "skill": "BOK",
  "version": "1.0.0",
  "updated": "2026-02-19T14:30:00Z",
  "kani_available": true,
  "degraded_mode": false,
  "worktree_path": null,
  "worktree_branch": null,
  "phases": {
    "scan": { "status": "complete", "math_regions_found": 12, "files_indexed": 45 },
    "analyze": { "status": "complete", "invariants_proposed": 34, "by_tool": { "kani": 15, "litesvm": 10, "proptest": 9 } },
    "confirm": { "status": "complete", "invariants_confirmed": 28, "invariants_skipped": 4, "invariants_added": 2 },
    "generate": { "status": "pending" },
    "execute": { "status": "pending" },
    "report": { "status": "pending" }
  },
  "cross_skill": { "gl_docs": true, "sos_findings": false }
}
```
