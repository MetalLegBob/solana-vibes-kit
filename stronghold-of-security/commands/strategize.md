---
name: SOS:strategize
description: "Phase 2+3: Synthesize context into architecture doc, then generate attack strategies"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Stronghold of Security — Phase 2 + 3: Synthesize & Strategize

**Model:** This phase runs in the main context (no subagents). Recommended: Opus for best creative synthesis of cross-cutting concerns and novel strategy generation. Read `config.models.strategize` from STATE.json.

Merge all context auditor findings into a unified architecture document, then generate prioritized attack hypotheses.

## Prerequisites

1. Read `.audit/STATE.json` — check that `phases.analyze.status === "completed"`
2. Verify `.audit/context/` contains context files

If prerequisites are missing:
```
Phase 1 (analyze) has not been completed yet.
Run /SOS:analyze first to deploy context auditors.
```

---

## Phase 2: Context Synthesis

### Goal

Merge all Phase 1 context documents into a unified architectural understanding. The key quality innovation: read ONLY the condensed summaries (~88KB total) instead of the full analysis files (~3.7MB+).

### Step 1: Extract Condensed Summaries

For each file in `.audit/context/NN-*.md`:

1. Read the file
2. Extract content between `<!-- CONDENSED_SUMMARY_START -->` and `<!-- CONDENSED_SUMMARY_END -->` markers
3. If markers are not found, fall back to reading the first 200 lines of the file (graceful degradation)
4. Collect all summaries

This should yield ~8KB per agent x 10-11 agents = ~80-88KB of concentrated security context.

### Step 2: Synthesize Architecture Document

With all condensed summaries loaded, perform synthesis:

1. **Identify common themes** — What concerns appear across multiple focus areas?
2. **Deduplicate observations** — Multiple agents may flag the same concern. Merge duplicates into a single observation with citations from each focus that found it.
3. **Map trust boundaries** — Combine trust models from all agents into a unified trust map
4. **Identify critical intersections** — Where do different focus areas overlap? (e.g., access control + token flow, arithmetic + oracle)
5. **Catalog all invariants** — Merge invariant lists from all agents, noting enforcement status
6. **Catalog all assumptions** — Merge assumption lists, noting validation status
7. **Priority risk ranking** — Rank all risk observations by frequency (how many agents flagged it) and severity
8. **Novel attack surfaces** — Collect all novel observations from agents — these are the most valuable because they're codebase-specific

### Step 3: Write Architecture Document

Write `.audit/ARCHITECTURE.md` using the template from the skill's templates directory.

Find the template:
```bash
find ~/.claude -name "ARCHITECTURE.md" -path "*/stronghold-of-security/templates/*" 2>/dev/null | head -1
```

The architecture document should contain:
- Program overview (what the protocol does, how it's structured)
- Trust model (unified from all agents)
- Instruction map (all externally-callable instructions with analysis coverage)
- Account structure (all account types and relationships)
- Critical invariants (merged, with enforcement status)
- Critical assumptions (merged, with validation status)
- Cross-cutting concerns (themes that span multiple focus areas)
- Risk heat map (top concerns by priority)
- Novel attack surface observations (codebase-specific)
- Deduplicated observations (with source citations)

---

## Phase 3: Strategy Generation

### Goal

Generate 50-100 attack hypotheses based on the architectural understanding and knowledge base.

### Step 1: Load Knowledge Base (Index-First)

Read `.audit/KB_MANIFEST.md` for Phase 3 KB loading instructions, then:

**1. Read the patterns index (~500 tokens):**
```bash
find ~/.claude -name "PATTERNS_INDEX.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
```
This lightweight catalog lists all 128 EPs with name, severity, and file path.

**2. Cross-reference with ARCHITECTURE.md findings:**
- Identify which EP categories are relevant to this codebase's architecture
- Match risk observations and invariants to specific EPs from the index

**3. Load individual pattern files for matched EPs only:**
For each relevant EP identified in step 2, read its individual file from `knowledge-base/patterns/{category}/EP-NNN-*.md`. Only load patterns that are relevant — not all 128.

**4. Load reference files (always):**
```bash
find ~/.claude -name "audit-firm-findings.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
find ~/.claude -name "bug-bounty-findings.md" -path "*/stronghold-of-security/knowledge-base/*" 2>/dev/null | head -1
```

**5. Load matched protocol playbooks** from KB_MANIFEST.

**Context budget:** This index-first approach loads ~50-100KB instead of ~300KB+ (monolithic files). Read PATTERNS_INDEX.md first, then selectively load individual pattern files.

### Step 2: Generate Attack Hypotheses

Read `.audit/ARCHITECTURE.md` for the architectural understanding.

**Sources for strategy generation:**
1. **Historical exploits** — Use PATTERNS_INDEX.md to identify relevant EPs, then read their individual pattern files for attack details
2. **Architectural weaknesses** — Risk observations from the architecture document
3. **Protocol-specific patterns** — Attack vectors from matched protocol playbooks
4. **Novel attack surfaces** — Codebase-specific concerns that don't match any known EP (from architecture doc's novel observations section)

**Novel strategy requirement:** At least 20% of generated strategies MUST be "Novel" — not directly derived from any EP. These come from:
- Unique business logic interactions
- Unusual architectural patterns
- Creative "what if" scenarios
- Emergent behaviors from instruction combinations

### Step 3: Document Each Strategy

For each strategy, document:
- `ID`: H001, H002, etc.
- `Name`: Short descriptive name
- `Category`: Which focus area(s) it relates to
- `Estimated Priority`: **Tier 1** (CRITICAL potential), **Tier 2** (HIGH), or **Tier 3** (MEDIUM-LOW)
- `Hypothesis`: What the attacker would try to achieve
- `Attack Vector`: How the attack would be executed
- `Target Code`: Specific functions/modules to investigate
- `Potential Impact`: What damage could occur
- `Historical Precedent`: Similar past exploits (EP-XXX reference) or "Novel"
- `Requires`: Which Phase 1 focus area findings are needed to investigate this (e.g., [cpi-findings, access-control-findings]). Used by Phase 4 for automatic context routing.
- `Investigation Approach`: How to validate/invalidate this hypothesis

### Step 4: Deduplication Check

Before finalizing strategies, scan for:
- Overlapping strategies targeting the same code path with the same attack type
- Merge overlapping strategies into single broader hypotheses
- Remove any strategies that are clearly subsets of others

### Step 5: Write Strategies

Write `.audit/STRATEGIES.md` using the template from the skill directory.

Find the template:
```bash
find ~/.claude -name "STRATEGIES.md" -path "*/stronghold-of-security/templates/*" 2>/dev/null | head -1
```

Organize strategies by priority tier:
1. Tier 1 (CRITICAL) — investigate first
2. Tier 2 (HIGH) — investigate second
3. Tier 3 (MEDIUM-LOW) — investigate last

Include a "Supplemental Strategies" section (initially empty — populated after Phase 4 Batch 1).

### Step 6: Determine Strategy Count by Tier

For configuration:
- `quick` tier: 25-40 total strategies
- `standard` tier: 50-75 total strategies
- `deep` tier: 100-150 total strategies

---

## Update State

Update `.audit/STATE.json`:
```json
{
  "phases": {
    "strategize": {
      "status": "completed",
      "completed_at": "{ISO-8601}",
      "strategies_generated": {N},
      "tier_1_count": {N},
      "tier_2_count": {N},
      "tier_3_count": {N},
      "novel_count": {N}
    }
  }
}
```

Update `.audit/PROGRESS.md` with strategize phase marked as completed.

---

## Phase Complete — Present Results

```markdown
---

## Phase 2 + 3 Complete

### What was produced:
- `.audit/ARCHITECTURE.md` — Unified architectural understanding synthesized from {N} context analyses
- `.audit/STRATEGIES.md` — {N} attack hypotheses ready for investigation

### Strategy Breakdown:
| Priority | Count | Description |
|----------|-------|-------------|
| Tier 1 (CRITICAL) | {N} | Investigated first — highest potential impact |
| Tier 2 (HIGH) | {N} | Investigated second |
| Tier 3 (MEDIUM-LOW) | {N} | Investigated last |
| Novel | {N} | Codebase-specific (not from known EPs) |

### Key Themes:
- {Top 2-3 attack themes identified}

### Architecture Highlights:
- {1-2 key cross-cutting concerns}
- {1-2 notable novel observations}

### Phase Stats:
- **Model:** {config.models.strategize} (main context — no subagents)
- **Estimated tokens:** ~{context_summaries + KB_loaded}K input

### Next Step:
Run **`/clear`** then **`/SOS:investigate`** to investigate all {N} hypotheses
in priority-ordered batches of 5 parallel investigators.
(`/clear` gives the next phase a fresh context window — critical for quality.)

---
```
