# Book of Knowledge

Math verification and economic invariant proving for Solana/Anchor programs. Uses Kani (formal proof), LiteSVM (runtime tests), and Proptest (property-based testing) in a layered approach.

## Install

```bash
cd book-of-knowledge && ./install.sh /path/to/your-project
```

## Usage

```
/BOK:scan       — Index codebase, identify math-heavy code, check Kani prerequisites
/BOK:analyze    — Match against verification patterns, propose invariants
/BOK:confirm    — Interactive review — adjust or add properties before generation
/BOK:generate   — Create isolated worktree with Kani harnesses, LiteSVM tests, Proptest suites
/BOK:execute    — Run all verification tools, collect results
/BOK:report     — Compile findings, suggest fixes, offer test merge
/BOK:status     — Check progress, get guidance on next step
```
