---
name: DB:strategize
description: "Phase 2+3: Synthesize context into architecture doc, then generate attack strategies"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Dinh's Bulwark — Phase 2 + 3: Synthesize & Strategize

**Model:** This phase runs in the main context (no subagents). Recommended: Opus for creative synthesis. Read `config.models.strategize` from STATE.json.

Merge all off-chain context auditor findings into a unified architecture document, then generate prioritized attack hypotheses.

## Prerequisites

1. Read `.bulwark/STATE.json` — check that `phases.analyze.status === "complete"`
2. Verify `.bulwark/context/` contains context files

If prerequisites are missing:
```
Phase 1 (analyze) has not been completed yet.
Run /DB:analyze first to deploy context auditors.
```

---

## Phase 2: Context Synthesis

### Step 1: Extract Condensed Summaries

For each file in `.bulwark/context/NN-*.md`:

1. Read the file
2. Extract content between `<!-- CONDENSED_SUMMARY_START -->` and `<!-- CONDENSED_SUMMARY_END -->`
3. If markers not found, fall back to reading the first 200 lines
4. Collect all summaries (~8KB per agent × 8 agents = ~64KB)

### Step 2: Check for Cross-Skill Context

Read `.bulwark/STATE.json` for `cross_skill` flags.

**If SOS available:** Read `.audit/ARCHITECTURE.md` — extract trust boundaries and on-chain assumptions. These inform off-chain attack surfaces ("the on-chain program trusts this input — does the API validate it?").

**If GL available:** Read relevant `.docs/` spec documents. These serve as the ground truth for intended behavior ("the spec says withdrawals require 2FA — does the backend enforce it?").

### Step 2.5: Load Handover Context (Stacked Audits)

```bash
test -f .bulwark/HANDOVER.md && echo "STACKED_AUDIT" || echo "FIRST_AUDIT"
```

**If STACKED_AUDIT:**
1. Read `.bulwark/HANDOVER.md`
2. Extract the **Architecture Snapshot** — previous trust zone model and invariants
3. Extract the **Previous Findings Digest** — RECHECK/VERIFY/RESOLVED_BY_REMOVAL tags
4. Extract the **False Positive Log** — previous NOT_VULNERABLE dismissals for UNCHANGED files
5. These feed into synthesis (verify previous trust zones still hold) and strategy generation (RECHECK findings get dedicated strategies)

### Step 3: Synthesize Architecture Document (8-Step Cross-Cutting Synthesis)

With all summaries loaded, perform the structured 8-step synthesis:

1. **Deduplicate findings** — Multiple auditors may flag the same code location. Merge duplicates, keep the most detailed version.
2. **Map trust boundaries** — Build unified trust zone model. If SOS context available, include on-chain/off-chain boundary. If stacked audit, verify previous trust zones still hold against current code.
3. **Catalog all invariants** — Merge from all auditors with enforcement status (Enforced / Partially Enforced / Not Enforced). If stacked audit, compare against previous invariants — flag new or changed ones.
4. **Catalog all assumptions** — Merge with validation status (Validated / Unvalidated / Contradicted).
5. **Identify critical intersections** — Where focus areas overlap creates the highest risk: auth + API endpoints, secrets + infrastructure, bots + transaction signing, frontend + wallet integration. Map these intersections explicitly.
6. **Synthesize data flows** — Trace 3-5 critical data flows end-to-end (e.g., user input → API → database → RPC → on-chain). Mark trust boundary crossings.
7. **Priority risk ranking** — Rank by frequency across auditors and severity. Concerns flagged by 3+ auditors get automatic Tier 1 escalation.
8. **Novel attack surface identification** — Codebase-specific concerns that don't map to any known pattern. Creative attacker thinking: "What would a sophisticated attacker see in THIS specific architecture?"

### Step 4: Write Architecture Document

Find the template:
```bash
find ~/.claude -name "ARCHITECTURE.md" -path "*/dinhs-bulwark/templates/*" 2>/dev/null | head -1
```

Write `.bulwark/ARCHITECTURE.md` containing:
- Project overview (components, frameworks, architecture)
- Component map (what talks to what)
- Trust boundaries (unified from all agents + SOS boundary if available)
- API surface map (all externally-accessible endpoints/routes)
- Critical invariants (merged, with enforcement status)
- Critical assumptions (merged, with validation status)
- Cross-cutting concerns (themes spanning multiple focus areas)
- On-chain/off-chain boundary analysis (if SOS context available)
- Risk heat map (top concerns by priority)
- Novel attack surface observations

---

## Phase 3: Strategy Generation

### Step 1: Load Knowledge Base (Index-First)

Read `.bulwark/KB_MANIFEST.md` for Phase 3 KB loading instructions.

1. **Read patterns index:**
   ```bash
   find ~/.claude -name "PATTERNS_INDEX.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   ```
   Lightweight catalog of all 312 OC patterns.

2. **Cross-reference with ARCHITECTURE.md:**
   Identify which OC categories are relevant to this codebase.

3. **Load individual pattern files for matched OCs only.**

4. **Load reference files:**
   ```bash
   find ~/.claude -name "severity-calibration.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   find ~/.claude -name "incident-timeline.md" -path "*/dinhs-bulwark/knowledge-base/*" 2>/dev/null | head -1
   ```

### Step 2: Generate Attack Hypotheses

**Sources:**
1. **Historical exploits** — matched OC patterns from KB → origin: `KB`
2. **Architectural weaknesses** — from architecture document → origin: `Novel`
3. **Cross-boundary chains** — on-chain/off-chain boundary exploits (if SOS available) → origin: `Novel`
4. **Spec deviations** — implementation vs spec gaps (if GL available) → origin: `Novel`
5. **Novel attack surfaces** — codebase-specific creative thinking → origin: `Novel`
6. **RECHECK findings** (stacked audit) — previous findings in modified files → origin: `RECHECK`

**Origin Tracking — MANDATORY.** Every strategy must have an `Origin` field:
- `KB` — Derived from a specific OC pattern (cite OC-XXX)
- `Novel` — Creative/architectural, not from any KB pattern
- `RECHECK` — Derived from a previous audit's finding in a modified file

**Novel strategy enforcement:** At least **20%** must be `Novel`. If you fall short after initial generation, force-generate novel strategies by:
1. Re-examining critical intersections from Step 3.5
2. Asking "what would a creative attacker do with THIS architecture that nobody thought to check?"
3. Looking for emergent risks from the combination of components (not just individual weaknesses)

**False Positive Memory (Stacked Audits):**
If HANDOVER.md contains a false positive log, check each generated strategy against it. If a strategy maps to a previous NOT_VULNERABLE dismissal in an UNCHANGED file:
- Still include the strategy (dismissals are inputs, not gospel)
- Add note: `Previous audit classified NOT_VULNERABLE: "{dismissal reason}"`
- Investigator will decide whether dismissal still holds

**Cross-boundary hypotheses (if SOS available):**
- On-chain program trusts input → off-chain API doesn't validate it
- Off-chain bot has signing authority → insufficient authorization checks
- On-chain state changes → off-chain indexer race condition

### Step 3: Document Each Strategy

For each strategy:
- `ID`: H001, H002, etc.
- `Name`: Short descriptive name
- `Category`: Focus area(s)
- `Origin`: **KB** (cite OC-XXX) / **Novel** / **RECHECK** (cite previous finding ID)
- `Estimated Priority`: **Tier 1** (CRITICAL), **Tier 2** (HIGH), **Tier 3** (MEDIUM-LOW)
- `Hypothesis`: What the attacker would achieve
- `Attack Vector`: How the attack works
- `Target Code`: Specific files/modules
- `Potential Impact`: Damage assessment (fund loss, data breach, service disruption)
- `Requires`: Which focus area findings are needed
- `Investigation Approach`: How to validate/invalidate
- `Previous Audit Note` (stacked only): `RECHECK: {finding}` / `Previously NOT_VULNERABLE: {reason}` / empty

### Step 4: Deduplication

Scan for overlapping strategies. Merge duplicates. Remove subsets.

### Step 5: Write Strategies

Find the template:
```bash
find ~/.claude -name "STRATEGIES.md" -path "*/dinhs-bulwark/templates/*" 2>/dev/null | head -1
```

Write `.bulwark/STRATEGIES.md` organized by tier:
1. Tier 1 (CRITICAL)
2. Tier 2 (HIGH)
3. Tier 3 (MEDIUM-LOW)
4. Supplemental (populated after Phase 4 Batch 1)

### Step 6: Strategy Count by Tier

- `quick`: 25-40 total
- `standard`: 50-75 total
- `deep`: 100-150 total

---

## Update State

```json
{
  "phases": {
    "strategize": {
      "status": "complete",
      "completed_at": "<ISO-8601>",
      "strategies_generated": {N},
      "tier_1_count": {N},
      "tier_2_count": {N},
      "tier_3_count": {N},
      "novel_count": {N}
    }
  }
}
```

---

## Phase Complete

```markdown
---

## Phase 2 + 3 Complete

### What was produced:
- `.bulwark/ARCHITECTURE.md` — Unified off-chain architecture understanding
- `.bulwark/STRATEGIES.md` — {N} attack hypotheses

### Strategy Breakdown:
| Priority | Count |
|----------|-------|
| Tier 1 (CRITICAL) | {N} |
| Tier 2 (HIGH) | {N} |
| Tier 3 (MEDIUM-LOW) | {N} |

### Origin Breakdown:
| Origin | Count | % |
|--------|-------|---|
| KB (pattern-based) | {N} | {%} |
| Novel (creative) | {N} | {%} |
| RECHECK (stacked) | {N} | {%} |
{If Novel % < 20%: "WARNING: Novel strategies below 20% target. Consider generating more creative hypotheses."}

{If cross-boundary strategies generated:}
### Cross-Boundary Analysis:
- {N} on-chain/off-chain boundary hypotheses generated from SOS context

### Next Step:
Run **`/clear`** then **`/DB:investigate`** to investigate all {N} hypotheses.

---
```
