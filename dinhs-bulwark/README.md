# Dinh's Bulwark

Adversarial security and correctness audit for off-chain Solana code — backends, APIs, trading bots, frontends, infrastructure. Everything SOS doesn't cover.

## Install

```bash
cd dinhs-bulwark && ./install.sh /path/to/your-project
```

## Usage

```
/DB:scan          # Detect project components, run static tools, build index
/DB:analyze       # Deploy selected parallel auditor agents (from 51 in catalog)
/DB:strategize    # Synthesize into architecture doc + attack hypotheses
/DB:investigate   # Priority-ordered hypothesis investigation
/DB:report        # Final synthesis — findings, attack trees, remediation
/DB:verify        # Post-fix verification
/DB:status        # Check progress at any time
```

## Pipeline

```
scan → analyze → strategize → investigate → report → verify
```

Each phase runs in a separate context window. Run `/clear` between phases.

## Knowledge Base

- 312 Exa-researched off-chain exploit patterns (OC-001 through OC-312) across 14 categories
- 168 AI-generated code pitfalls across 14 domains
- Core reference: false positives, secure patterns, severity calibration, incident timeline
- 51 dynamic auditor definitions with trigger-based selection

## Auditor Selection

Phase 0 scans the codebase for technology indicators and auto-selects relevant auditors from a catalog of 51. Tier budgets: quick (8-10), standard (12-20), deep (all matched).

## Audit Stacking

Consecutive audits stack — findings are tracked across runs with evolution classification (NEW/RECURRENT/REGRESSION/RESOLVED). Regressions get automatic severity escalation.

## Cross-Skill Awareness

Reads SOS findings and GL documentation when available for cross-boundary analysis.
