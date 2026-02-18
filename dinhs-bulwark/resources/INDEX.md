---
skill: dinhs-bulwark
type: resource-index
version: "1.0.0"
---

# Dinh's Bulwark — Resources Index

Level 2 resources for the DB skill. Loaded on demand, never bulk-loaded.

## Resources

| File | Purpose | When Loaded |
|------|---------|-------------|
| `auditor-catalog.md` | 51 auditor definitions with triggers and focus guidance | During scan (selection) and analyze (agent prompts) |
| `state-schema.md` | STATE.json field reference | When initializing or debugging state |

## Templates

Output templates for each phase. Loaded when generating artifacts.

| Template | Phase | Output Path |
|----------|-------|-------------|
| `ARCHITECTURE.md` | strategize | `.bulwark/ARCHITECTURE.md` |
| `STRATEGIES.md` | strategize | `.bulwark/STRATEGIES.md` |
| `FINAL_REPORT.md` | report | `.bulwark/FINAL_REPORT.md` |
| `VERIFICATION_REPORT.md` | verify | `.bulwark/VERIFICATION_REPORT.md` |
| `HANDOVER.md` | scan (Phase -1) | `.bulwark/HANDOVER.md` |

## Knowledge Base

See `knowledge-base/PATTERNS_INDEX.md` for the full exploit pattern catalog.
See `knowledge-base/ai-pitfalls/INDEX.md` for AI-generated code pitfalls.
