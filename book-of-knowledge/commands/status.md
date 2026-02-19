---
name: BOK:status
description: "Check BOK verification progress and get guidance on next step"
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Book of Knowledge — Status & Progress

Check the current state of a BOK verification run and get guidance on what to do next.

## Step 1: Check for BOK State

```bash
test -f .bok/STATE.json && echo "BOK_EXISTS" || echo "NO_BOK"
```

### If no state exists:

```markdown
## No Book of Knowledge Session Found

No `.bok/STATE.json` found in this directory.

### Getting Started:
Run `/BOK:scan` to begin math verification.

### Full Pipeline:
| Step | Command | Description |
|------|---------|-------------|
| 1 | `/BOK:scan` | Index codebase, identify math-heavy code, check Kani |
| 2 | `/BOK:analyze` | Match against patterns, propose invariants |
| 3 | `/BOK:confirm` | Review and approve proposed invariants |
| 4 | `/BOK:generate` | Generate verification code in isolated worktree |
| 5 | `/BOK:execute` | Run Kani, LiteSVM, and Proptest |
| 6 | `/BOK:report` | Compile report, suggest fixes, offer test merge |

Run `/BOK` for a detailed getting-started guide.
```

### If state exists:

## Step 2: Parse State & Display Dashboard

Read `.bok/STATE.json` and display:

```markdown
Book of Knowledge — Verification Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{For each phase, show status icon:}
{✓ complete, ▸ current, ○ pending}

✓ Phase 0   Scan & Index         complete — {math_regions_found} regions found
▸ Phase 1   Analyze              in progress
○ Phase 2   Confirm              pending
○ Phase 3   Generate             pending
○ Phase 4   Execute              pending
○ Phase 5   Report               pending

Verification Mode: {Kani + LiteSVM + Proptest / LiteSVM + Proptest (degraded)}
Cross-Skill: GL {available/not found} | SOS {available/not found}
```

## Step 3: Phase-Specific Details

**If analyze is complete:**
```
Invariants proposed: {N} (Kani: {N}, LiteSVM: {N}, Proptest: {N})
```

**If confirm is complete:**
```
Invariants confirmed: {N} | Skipped: {N} | User-added: {N}
```

**If execute is complete or in progress:**
```
Verification Results:
  Proven (Kani):        {N}
  Stress-tested (PT+LS): {N}
  Failed:               {N}
  Inconclusive:         {N}
```

**If report is complete:**
```
Report: {report_path}
Tests merged: {yes/no}
```

## Step 4: Route to Next Action

| Current State | Next Action |
|---------------|-------------|
| scan complete | `/clear` then `/BOK:analyze` |
| analyze complete | `/clear` then `/BOK:confirm` |
| confirm complete | `/clear` then `/BOK:generate` |
| generate complete | `/clear` then `/BOK:execute` |
| execute complete | `/clear` then `/BOK:report` |
| report complete | Review `.bok/reports/` — verification complete |

```markdown
Next: {clear instruction with exact command}
```
