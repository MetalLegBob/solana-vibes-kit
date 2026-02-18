# Dinh's Bulwark — State Schema

Reference for `.bulwark/STATE.json` fields.

## Required Fields (SVK convention)

| Field | Type | Description |
|-------|------|-------------|
| `skill` | string | Always `"dinhs-bulwark"` — discovery key |
| `version` | string | Skill version (e.g., `"1.0.0"`) |
| `updated` | string | ISO-8601 timestamp of last state change |

## Phases

| Phase | Commands | Description |
|-------|----------|-------------|
| `scan` | `/DB:scan` | Component detection + static pre-scan |
| `analyze` | `/DB:analyze` | Dynamic parallel auditor agents (selected from catalog) |
| `strategize` | `/DB:strategize` | Architecture synthesis + attack hypotheses |
| `investigate` | `/DB:investigate` | Priority-ordered hypothesis investigation |
| `report` | `/DB:report` | Final synthesis and report generation |
| `verify` | `/DB:verify` | Post-fix verification |

Each phase: `{ "status": "pending" | "in_progress" | "complete" }`

## Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `config.tier` | string | `"quick"` / `"standard"` / `"deep"` |
| `config.models.index` | string | Model for indexer agent (default: haiku) |
| `config.models.phase1` | string | Model for Phase 1 auditors (user choice: opus or sonnet) |
| `config.models.quality_gate` | string | Model for quality gate (default: haiku) |
| `config.models.strategize` | string | Model for strategy synthesis (default: opus) |
| `config.models.investigate` | string | Model for Tier 1+2 investigators (default: sonnet) |
| `config.models.investigate_tier3` | string | Model for Tier 3 investigators (default: haiku) |
| `config.models.coverage` | string | Model for coverage verification (default: sonnet) |
| `config.models.report` | string | Model for report synthesis (default: opus) |
| `config.models.verify` | string | Model for fix verification (default: sonnet) |

## Auditor Selection (set during scan)

| Field | Type | Description |
|-------|------|-------------|
| `config.selected_auditors` | array | List of selected auditor objects |
| `config.selected_auditors[].id` | string | Auditor ID (e.g., `"SEC-01"`) |
| `config.selected_auditors[].name` | string | Auditor display name |
| `config.selected_auditors[].trigger_matches` | number | How many triggers matched in codebase |
| `config.selected_auditors[].always_select` | boolean? | True for core auditors (SEC-02, ERR-01, DEP-01, DATA-04, LOGIC-02) |
| `config.auditor_count` | number | Total auditors selected |

## Audit Tracking

| Field | Type | Description |
|-------|------|-------------|
| `audit_number` | number | Sequential audit count (for stacking) |
| `cross_skill.sos_available` | boolean | Whether SOS findings were detected |
| `cross_skill.gl_available` | boolean | Whether GL docs were detected |

## Stacking Metadata (set during scan Phase -1)

| Field | Type | Description |
|-------|------|-------------|
| `stacking.is_stacked` | boolean | Whether this audit builds on a previous one |
| `stacking.handover_generated` | boolean | Whether HANDOVER.md was generated (false if previous audit was incomplete) |
| `stacking.massive_rewrite` | boolean | True if >70% of files changed since previous audit |
| `stacking.delta.modified` | number | Files modified since previous audit |
| `stacking.delta.new` | number | New files since previous audit |
| `stacking.delta.deleted` | number | Files deleted since previous audit |
| `stacking.delta.unchanged` | number | Files unchanged since previous audit |

## Previous Audit Reference (set during scan Phase -1)

| Field | Type | Description |
|-------|------|-------------|
| `previous_audit` | object\|null | Null for first-time audits |
| `previous_audit.audit_number` | number | Previous audit's sequential number |
| `previous_audit.date` | string | Date of previous audit |
| `previous_audit.git_ref` | string | Git commit hash at time of previous audit |
| `previous_audit.archive_path` | string | Path to archived audit (e.g., `.bulwark-history/2026-02-15-abc1234`) |
| `previous_audit.confirmed_count` | number | CONFIRMED findings in previous audit |
| `previous_audit.potential_count` | number | POTENTIAL findings in previous audit |

## Scan Phase Detail

| Field | Type | Description |
|-------|------|-------------|
| `phases.scan.files_scanned` | number | Total source files indexed |
| `phases.scan.loc_estimated` | number | Estimated lines of code |

## Investigation Phase Detail

When `phases.investigate.status === "in_progress"`:

| Field | Type | Description |
|-------|------|-------------|
| `phases.investigate.batches_completed` | number | Batches finished |
| `phases.investigate.batches_total` | number | Total batches expected |
| `phases.investigate.strategies` | object | Per-strategy status map |
| `phases.investigate.results` | object | Tally: confirmed, potential, not_vulnerable, needs_manual_review |
