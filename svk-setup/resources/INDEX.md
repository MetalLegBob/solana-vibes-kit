---
skill: svk-setup
type: resource-index
version: "1.3.0"
---

# SVK Setup Resources

## Files

| File | Purpose | When to Load |
|------|---------|--------------|
| tool-catalog.md | Master registry of all tools, MCPs, plugins, and skills | Phase 2 (recommendations), Phase 3 (installation) |

## Templates

| File | Purpose | When to Load |
|------|---------|--------------|
| templates/reference-doc.md | Template for the personalized reference document | Phase 4 (reference generation) |

## State Files (generated at runtime)

| File | Purpose | Created By |
|------|---------|------------|
| .svk/SETUP_PROFILE.json | User profile from interview answers | Phase 1 (interview) |
| .svk/SETUP_RECOMMENDATIONS.json | Tiered tool recommendations | Phase 2 (recommend) |
| .svk/SETUP_INSTALLED.json | Installation results (installed/skipped per tool) | Phase 3 (install) |
