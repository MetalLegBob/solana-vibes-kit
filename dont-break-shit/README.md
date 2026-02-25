# Don't Break Shit (DBS)

Controlled change management for large-scope codebase modifications. When a project has significant existing code and needs sweeping changes, DBS ensures nothing gets missed and the LLM makes as few unsupervised micro-decisions as possible.

## Pipeline

```
/DBS:brief → /DBS:interview → /DBS:analyze → /DBS:map
    → /DBS:discuss N → /DBS:plan N → /DBS:execute N (repeats per phase)
```

## Commands

| Command | Description |
|---------|-------------|
| `/DBS:brief` | Scan project baseline and capture change brief |
| `/DBS:interview` | Deep interview mapping changes and cascading effects |
| `/DBS:analyze` | Parallel codebase sweep + Opus synthesis for impact map |
| `/DBS:map` | Generate multi-phase execution plan with testing gates |
| `/DBS:discuss N` | Wraps GSD discuss for a specific execution phase |
| `/DBS:plan N` | Wraps GSD plan for a specific execution phase |
| `/DBS:execute N` | Wraps GSD execute for a specific execution phase |
| `/DBS:status` | Check progress and get next-step guidance |

## Installation

```bash
cd dont-break-shit && ./install.sh /path/to/your-project
```

## Dependencies

- **GSD** (soft): Only required for execution phases (`/DBS:discuss`, `/DBS:plan`, `/DBS:execute`). Phases 1-4 work without GSD.

## State

DBS writes to `.dbs/` in the project root. See `resources/INDEX.md` for the full state schema.
