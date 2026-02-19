---
name: BOK
version: "1.0.0"
description: >
  Book of Knowledge: Math verification and economic invariant proving for Solana/Anchor programs.
  Uses Kani (formal proof), LiteSVM (runtime tests), and Proptest (property-based testing).
  Run /BOK for a getting-started guide, or /BOK:scan to begin.
user-invocable: true
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<!-- SVK Version Check — runs once per session on first skill invocation -->
<svk-version-check>
**On first invocation this session**, silently perform a version check:

1. Look for `.claude/svk-meta.json` in the current project. If it doesn't exist, skip this check entirely.
2. Read the `svk_repo` path and `installed_version` from the metadata file.
3. Run: `git -C <svk_repo> fetch --tags --quiet 2>/dev/null`
4. Run: `git -C <svk_repo> tag --sort=-v:refname | head -1` to get the latest tag.
5. Compare the installed version against the latest tag (strip the leading `v`).
6. If they match, skip — the user is up to date.
7. If the latest tag is newer, show this message ONCE (never repeat in this session):

> **SVK Update Available:** v{latest} is available (you're on v{installed}).
> - **Update now:** I can pull and reinstall the changed skills in this session
> - **Update later:** Start a new chat and run `/SVK:update`

8. If the git commands fail (offline, repo moved, etc.), skip silently. Never show errors from version checking.

**Important:** Do NOT block or delay the user's actual command. Perform this check, show the notification if needed, then proceed with the command they invoked.
</svk-version-check>

# Book of Knowledge

Math verification and economic invariant proving for Solana/Anchor programs.

> *"Knowledge is the greatest weapon."*

---

## What BOK Does

BOK systematically verifies that your program's arithmetic is correct and economic properties hold. It uses three verification tools in layers: Kani for formal proofs (checks ALL possible inputs), LiteSVM for runtime tests against the actual SVM, and Proptest for rapid property-based stress testing with thousands of random inputs. Every invariant comes with a plain-English explanation and concrete exploit scenario so you learn something from every run.

## When to Use

- **Pre-deployment math review** — Verify arithmetic before shipping
- **After SOS flags arithmetic issues** — BOK can formally prove or refute SOS findings
- **New DeFi math** — Swaps, fees, staking, LP, oracles, liquidations, bonding curves
- **Token economics verification** — Prove conservation of value, share fairness, rate consistency

## Pipeline Overview

| Command | Phase | What It Does |
|---------|-------|-------------|
| `/BOK:scan` | 0 | Index codebase, identify math-heavy code, check Kani prerequisites |
| `/BOK:analyze` | 1 | Match against verification patterns, propose invariants with plain-language explanations |
| `/BOK:confirm` | 2 | Interactive gate — review, adjust, or add properties before generation |
| `/BOK:generate` | 3 | Create isolated worktree, generate Kani harnesses + LiteSVM tests + Proptest suites |
| `/BOK:execute` | 4 | Run all verification tools in the worktree, collect results |
| `/BOK:report` | 5 | Compile findings, suggest fixes, offer to merge tests back |
| `/BOK:status` | — | Check progress, get guidance on next step |

## Verification Tools

| Tool | What It Does | When BOK Uses It |
|------|-------------|-----------------|
| **Kani** | Formal proof — checks ALL possible inputs | Pure arithmetic: overflow, precision, rounding, division-by-zero |
| **LiteSVM** | Runtime tests against actual SVM | Economic invariants involving multiple accounts/CPI |
| **Proptest** | Property-based testing — thousands of random inputs | Everything — fast sanity layer that catches obvious failures |

## Graceful Degradation

If Kani is not installed and the user declines installation, BOK runs with LiteSVM + Proptest only. The report clearly flags that results are probabilistic (stress-tested), not formally proven, and recommends Kani for full assurance.

## Worktree Workflow

All generated verification code lives in an isolated git worktree — your working tree is never touched. After execution, you choose: merge all tests, cherry-pick specific ones, or discard everything and keep only the report.

## Cross-Skill Integration

- **Reads GL docs** — Uses specs to understand intended behavior, making invariant proposals more accurate
- **Reads SOS findings** — Prioritizes verification around areas SOS flagged as risky
- **SOS reads BOK reports** — Skips re-analyzing formally verified math, focuses on non-math attack vectors

## Getting Started

```
/BOK:scan       — Start here. Indexes your code and checks prerequisites.
/BOK:analyze    — Proposes invariants with explanations.
/BOK:confirm    — You review and approve before any code is generated.
/BOK:generate   — Creates verification code in an isolated worktree.
/BOK:execute    — Runs Kani, LiteSVM, and Proptest.
/BOK:report     — Compiles results, suggests fixes, offers test merge.
```
