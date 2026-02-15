---
name: SOS:index
description: "Build structured codebase INDEX.md with per-file metadata and focus relevance tags"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---

# Stronghold of Security — Codebase Indexer

Build a structured codebase INDEX.md with per-file metadata and focus relevance tags.
Agents use this to load only relevant files instead of the entire codebase.

## What This Produces

`.audit/INDEX.md` — A structured catalog of every source file with:
- LOC, struct names, function names, external calls
- Risk markers (raw_account_info, cpi_calls, seeds, unsafe, etc.)
- Focus relevance tags (which of the 8 focus areas each file is relevant to)

## Step 1: Pre-flight

```bash
mkdir -p .audit
```

Check if INDEX.md already exists:
```bash
test -f .audit/INDEX.md && echo "INDEX_EXISTS" || echo "NO_INDEX"
```

If it exists, ask user: "INDEX.md already exists. Regenerate? [y/N]"

## Step 2: Spawn Indexer Agent

Spawn a single Haiku agent to build the index:

```
Task(
  subagent_type="general-purpose",
  model="haiku",
  prompt="
    You are a codebase indexer for Stronghold of Security security audit.
    Your job is to build a structured INDEX.md cataloging every source file.

    === STEP 1: FIND ALL SOURCE FILES ===
    Use Glob to find all .rs files excluding target/ and .audit/:
    - Pattern: 'programs/**/*.rs'
    - Also check: 'src/**/*.rs' (if no programs/ directory)

    === STEP 2: FOR EACH FILE, EXTRACT METADATA ===
    Read each file and extract:
    1. LOC (line count)
    2. Struct names (lines matching 'pub struct' or 'struct')
    3. Function names (lines matching 'pub fn' or 'fn ')
    4. External calls:
       - CPI: invoke, invoke_signed, CpiContext
       - Token: token::transfer, token::mint_to, token::burn
       - System: system_instruction::transfer, create_account
    5. Risk markers (count occurrences):
       - raw_account_info: AccountInfo used without Anchor validation
       - cpi_calls: invoke/invoke_signed/CpiContext count
       - seeds: seeds = [...] patterns (PDA derivation)
       - unsafe: unsafe blocks or functions
       - unchecked_math: checked_add/sub/mul/div absence near arithmetic
       - external_oracle: pyth/switchboard imports or calls
       - authority_checks: has_one, constraint, require! on authority/admin
       - token_operations: transfer/mint/burn operations

    === STEP 3: TAG FOCUS RELEVANCE ===
    Based on risk markers and content, tag each file with relevant focus areas:
    - access-control: authority_checks > 0, seeds > 0, has_one/constraint patterns
    - arithmetic: unchecked_math > 0, or contains mul/div/mod operations
    - state-machine: multiple instruction handlers, state transitions, close operations
    - cpi: cpi_calls > 0, invoke/invoke_signed
    - token-economic: token_operations > 0, pool/vault/reserve patterns
    - oracle: external_oracle > 0
    - upgrade-admin: upgrade/migrate/set_authority patterns
    - timing-ordering: slot/clock checks, deadline patterns

    A file can have multiple tags. Files with zero risk markers get tagged
    based on their content (e.g., a lib.rs with program ID gets all tags).

    === STEP 4: WRITE INDEX.md ===
    Write to .audit/INDEX.md in this exact format:

    ---
    generated: {ISO-8601 date}
    total_files: {N}
    total_loc: {N}
    programs: [{list of program directory names}]
    ---

    # Codebase Index

    <!-- Structured catalog for agent file selection. ~3 tokens/LOC estimated. -->

    ## Summary
    | Metric | Value |
    |--------|-------|
    | Total files | {N} |
    | Total LOC | {N} |
    | Programs | {comma-separated list} |
    | Files with HIGH risk markers (5+) | {N} |

    ## Files by Risk Density

    ### {program_name}/src/{path/to/file.rs}
    - LOC: {N}
    - Structs: {comma-separated list}
    - Functions: {comma-separated list}
    - External calls: {comma-separated list or 'none'}
    - Risk markers: {marker}({count}), {marker}({count}), ...
    - Focus relevance: [{comma-separated focus area tags}]

    {Repeat for each file, sorted by total risk marker count descending}

    ## Focus Area File Map

    ### Access Control & Account Validation
    | File | LOC | Risk Markers | Key Functions |
    |------|-----|-------------|---------------|
    | {path} | {N} | {summary} | {top 3 functions} |

    ### Arithmetic Safety
    {same table format}

    ### State Machine & Error Handling
    {same table format}

    ### CPI & External Calls
    {same table format}

    ### Token & Economic
    {same table format}

    ### Oracle & External Data
    {same table format}

    ### Upgrade & Admin
    {same table format}

    ### Timing & Ordering
    {same table format}

    === IMPORTANT ===
    - Process files in batches if there are many (read 10-15 at a time)
    - Keep the index compact — one section per file, no full code
    - Sort files by risk density (most risk markers first)
    - Every .rs file must appear in the index, even if it has zero risk markers
  "
)
```

## Step 3: Verify Output

After the indexer completes:

```bash
test -f .audit/INDEX.md && echo "INDEX_CREATED" || echo "INDEX_MISSING"
```

Count indexed files and compare to actual file count:
```bash
grep -c "^### " .audit/INDEX.md
find . -name '*.rs' -not -path '*/target/*' -not -path '*/.audit/*' | wc -l
```

## Step 4: Update State

If `.audit/STATE.json` exists, update it:
```json
{
  "phases": {
    "index": {
      "status": "completed",
      "completed_at": "{ISO-8601}",
      "files_indexed": "{N}",
      "total_loc": "{N}"
    }
  }
}
```

## Complete

```markdown
## Codebase Index Complete

### What was produced:
- `.audit/INDEX.md` — Structured catalog of {N} files ({N} LOC)

### Risk Summary:
- {N} files with HIGH risk marker density (5+)
- Top risk files: {top 3 by marker count}

### Focus Area Coverage:
| Focus Area | Files | Total LOC |
|------------|-------|-----------|
| Access Control | {N} | {N} |
| Arithmetic | {N} | {N} |
| State Machine | {N} | {N} |
| CPI | {N} | {N} |
| Token & Economic | {N} | {N} |
| Oracle | {N} | {N} |
| Upgrade & Admin | {N} | {N} |
| Timing & Ordering | {N} | {N} |

This index is used by Phase 1 agents for targeted file loading.
```
