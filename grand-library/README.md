# Grand Library

A full-stack documentation skill for [SVK (Solana Vibes Kit)](../README.md) that transforms project ideas into comprehensive specification suites.

## What It Does

Grand Library guides you from "I have an idea" to "I have a complete spec suite" through an adaptive, research-backed pipeline:

1. **Survey** — Discover your project (greenfield or existing code)
2. **Interview** — Deep topic-by-topic Q&A that captures every decision
3. **Draft** — Generate documents in waves with Opus
4. **Reconcile** — Cross-check everything for contradictions

## Installation

```bash
cd grand-library
./install.sh /path/to/your-project
```

This copies Grand Library into your project's `.claude/` directory.

## Commands

| Command | Description |
|---------|-------------|
| `/GL:survey` | Start here — discover project, build doc manifest |
| `/GL:interview` | Deep-dive Q&A, capture decisions |
| `/GL:status` | Check progress, get next-step guidance |
| `/GL:draft` | Generate documents in waves with Opus |
| `/GL:reconcile` | Cross-check all docs for contradictions and gaps |
| `/GL:repos` | Browse forkable open source repo catalogue |
| `/GL:update` | Re-interview a topic and regenerate affected docs |
| `/GL:add` | Add a new document to an existing suite |

## Design

See [Grand Library Design Document](../docs/plans/2026-02-15-grand-library-design.md) for the full architecture.

## License

See [LICENSE](../LICENSE).
